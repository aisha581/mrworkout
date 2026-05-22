import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    // ── Guard: webhook secret must be configured ──────────────────────────────
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is not set — all webhook calls will fail");
        return NextResponse.json({ error: "Webhook secret not configured." }, { status: 500 });
    }

    const body      = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        console.error("[Stripe Webhook] Missing stripe-signature header");
        return NextResponse.json({ error: "Missing signature." }, { status: 400 });
    }

    // ── Verify signature ──────────────────────────────────────────────────────
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
        // This fires when STRIPE_WEBHOOK_SECRET doesn't match the endpoint secret
        // in the Stripe Dashboard. Fix: copy the exact whsec_... from
        // Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} id=${event.id}`);

    switch (event.type) {

        // ── Fired immediately when checkout completes (including trial starts) ──
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const email   = session.customer_email ?? session.customer_details?.email ?? null;

            console.log(`[Stripe Webhook] checkout.session.completed — email=${email} session=${session.id}`);

            if (!email) {
                console.error("[Stripe Webhook] No email on checkout session — cannot update DB");
                break;
            }

            const [subResult, userResult] = await Promise.all([
                supabase.from("mw_subscribers").upsert(
                    {
                        email,
                        is_pro:             true,
                        stripe_customer_id: session.customer as string,
                        stripe_session_id:  session.id,
                        subscribed_at:      new Date().toISOString(),
                    },
                    { onConflict: "email" }
                ),
                supabase
                    .from("mw_users")
                    .update({ is_pro: true })
                    .eq("email", email),
            ]);

            if (subResult.error)  console.error("[Stripe Webhook] mw_subscribers upsert failed:", subResult.error.message);
            if (userResult.error) console.error("[Stripe Webhook] mw_users update failed:", userResult.error.message);

            if (!subResult.error && !userResult.error) {
                console.log(`[Stripe Webhook] ✓ is_pro=true set for ${email}`);
            }
            break;
        }

        // ── Fired when a subscription is cancelled / expires ─────────────────
        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customer     = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
            const email        = customer.email ?? null;

            console.log(`[Stripe Webhook] customer.subscription.deleted — email=${email}`);

            if (!email) {
                console.error("[Stripe Webhook] No email on customer — cannot revoke pro");
                break;
            }

            const [subResult, userResult] = await Promise.all([
                supabase.from("mw_subscribers").update({ is_pro: false }).eq("email", email),
                supabase.from("mw_users").update({ is_pro: false }).eq("email", email),
            ]);

            if (subResult.error)  console.error("[Stripe Webhook] mw_subscribers update failed:", subResult.error.message);
            if (userResult.error) console.error("[Stripe Webhook] mw_users update failed:", userResult.error.message);

            if (!subResult.error && !userResult.error) {
                console.log(`[Stripe Webhook] ✓ is_pro=false set for ${email}`);
            }
            break;
        }

        default:
            console.log(`[Stripe Webhook] Ignored event type: ${event.type}`);
            break;
    }

    return NextResponse.json({ received: true });
}
