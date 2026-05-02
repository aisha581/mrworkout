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
    const body      = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error("[Stripe Webhook] Signature verification failed:", err.message);
        return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    switch (event.type) {
        case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const email   = session.customer_email ?? session.customer_details?.email;

            if (email) {
                await Promise.all([
                    supabase.from("mw_subscribers").upsert(
                        {
                            email,
                            is_pro:               true,
                            stripe_customer_id:   session.customer as string,
                            stripe_session_id:    session.id,
                            subscribed_at:        new Date().toISOString(),
                        },
                        { onConflict: "email" }
                    ),
                    supabase
                        .from("mw_users")
                        .update({ is_pro: true })
                        .eq("email", email),
                ]);
            }
            break;
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const customer     = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;

            if (customer.email) {
                await Promise.all([
                    supabase
                        .from("mw_subscribers")
                        .update({ is_pro: false })
                        .eq("email", customer.email),
                    supabase
                        .from("mw_users")
                        .update({ is_pro: false })
                        .eq("email", customer.email),
                ]);
            }
            break;
        }

        default:
            break;
    }

    return NextResponse.json({ received: true });
}
