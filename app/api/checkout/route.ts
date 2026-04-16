import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-03-25.dahlia",
});

export async function POST(req: NextRequest) {
    const { email } = await req.json();

    const baseUrl = process.env.NEXTAUTH_URL ?? "https://mrworkout.vercel.app";

    try {
        const session = await stripe.checkout.sessions.create({
            mode:               "subscription",
            payment_method_types: ["card"],

            // Pre-fill email if user is signed in
            ...(email ? { customer_email: email } : {}),

            line_items: [
                {
                    price:    process.env.STRIPE_PRICE_ID!,
                    quantity: 1,
                },
            ],

            subscription_data: {
                trial_period_days: 7,
            },

            success_url: `${baseUrl}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url:  `${baseUrl}/upgrade`,
        });

        return NextResponse.json({ url: session.url });
    } catch (err: any) {
        console.error("[Stripe Checkout]", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
