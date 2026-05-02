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

// GET /api/checkout/verify?session_id=cs_xxx
// Returns { isPro: boolean, email: string | null }
// Called by the success page to confirm the webhook actually fired.
export async function GET(req: NextRequest) {
    const sessionId = req.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
        return NextResponse.json({ isPro: false, error: "Missing session_id" }, { status: 400 });
    }

    try {
        // Retrieve the Stripe checkout session to get the confirmed email
        const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
        const email = stripeSession.customer_email ?? stripeSession.customer_details?.email ?? null;

        if (!email) {
            return NextResponse.json({ isPro: false, error: "No email on session" });
        }

        // Check our DB — source of truth is mw_subscribers
        const { data } = await supabase
            .from("mw_subscribers")
            .select("is_pro")
            .eq("email", email)
            .maybeSingle();

        const isPro = data?.is_pro ?? false;

        // If Stripe says checkout is complete but DB hasn't updated yet,
        // backfill it here so the user isn't stuck waiting for the webhook
        if (!isPro && stripeSession.status === "complete") {
            console.log(`[verify] Backfilling is_pro for ${email} — webhook likely delayed`);
            await Promise.all([
                supabase.from("mw_subscribers").upsert(
                    {
                        email,
                        is_pro:             true,
                        stripe_customer_id: stripeSession.customer as string,
                        stripe_session_id:  stripeSession.id,
                        subscribed_at:      new Date().toISOString(),
                    },
                    { onConflict: "email" }
                ),
                supabase.from("mw_users").update({ is_pro: true }).eq("email", email),
            ]);
            return NextResponse.json({ isPro: true, email, source: "backfill" });
        }

        return NextResponse.json({ isPro, email, source: "webhook" });
    } catch (err: any) {
        console.error("[verify]", err.message);
        return NextResponse.json({ isPro: false, error: err.message }, { status: 500 });
    }
}
