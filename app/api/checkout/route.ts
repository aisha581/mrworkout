import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
    // ── 1. Validate secret key ────────────────────────────────────────────────
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error("[Stripe Checkout] STRIPE_SECRET_KEY is not set");
        return NextResponse.json(
            { error: "STRIPE_SECRET_KEY is not configured. Add it to your Vercel environment variables." },
            { status: 503 }
        );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2026-03-25.dahlia",
    });

    const { email, plan } = await req.json() as { email?: string; plan?: string };

    // ── 2. Resolve and validate price ID ─────────────────────────────────────
    // Paste your price_... IDs from Stripe Dashboard →
    //   Products → your product → Pricing → copy the "Price ID"
    // into Vercel env vars:
    //   STRIPE_MONTHLY_PRICE_ID = price_xxxxxxxxxxxxxxxx
    //   STRIPE_ANNUAL_PRICE_ID  = price_xxxxxxxxxxxxxxxx
    const priceId = plan === "annual"
        ? process.env.STRIPE_ANNUAL_PRICE_ID
        : (process.env.STRIPE_MONTHLY_PRICE_ID ?? process.env.STRIPE_PRICE_ID);

    if (!priceId) {
        const missingVar = plan === "annual" ? "STRIPE_ANNUAL_PRICE_ID" : "STRIPE_MONTHLY_PRICE_ID";
        console.error(`[Stripe Checkout] ${missingVar} is not set`);
        return NextResponse.json(
            { error: `${missingVar} is not configured. Paste your price_... ID from the Stripe Dashboard into Vercel environment variables.` },
            { status: 503 }
        );
    }

    // ── 3. Derive base URL from request (works on both .vercel.app and .pro) ──
    const proto   = req.headers.get("x-forwarded-proto") ?? "https";
    const host    = req.headers.get("host") ?? "mrworkout.pro";
    const baseUrl = `${proto}://${host}`;

    // ── 4. Create Stripe Checkout session ─────────────────────────────────────
    try {
        const session = await stripe.checkout.sessions.create({
            mode:                 "subscription",
            payment_method_types: ["card"],
            ...(email ? { customer_email: email } : {}),
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
                trial_period_days: 7,
                metadata: { plan: plan ?? "monthly" },
            },
            success_url: `${baseUrl}/join/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${baseUrl}/join`,
        });

        console.log(`[Stripe Checkout] Session created: ${session.id} plan=${plan} email=${email}`);
        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error("[Stripe Checkout]", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
