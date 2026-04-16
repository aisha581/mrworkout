import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
    const { email, plan } = await req.json();

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://mrworkout.vercel.app";

    // Select the price based on plan: "monthly" | "annual"
    const priceId = plan === "annual"
        ? process.env.STRIPE_ANNUAL_PRICE_ID!
        : process.env.STRIPE_MONTHLY_PRICE_ID ?? process.env.STRIPE_PRICE_ID!;

    try {
        const session = await stripe.checkout.sessions.create({
            mode:                  "subscription",
            payment_method_types:  ["card"],
            ...(email ? { customer_email: email } : {}),
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
                trial_period_days: 7,
                metadata: { plan: plan ?? "monthly" },
            },
            success_url: `${baseUrl}/join/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${baseUrl}/join`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error("[Stripe Checkout]", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
