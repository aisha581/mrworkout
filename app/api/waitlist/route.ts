import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend';
import { kv } from '@vercel/kv';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        // Basic validation
        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        // 1. Permanent Storage: Vercel KV (Redis)
        // We use lpush to add the email to a list named "waitlist_emails"
        try {
            await kv.lpush('waitlist_emails', email);
            console.log(`[KV_SUCCESS] Athlete persisted: ${email}`);
        } catch (kvError: any) {
            console.error('KV_ERROR: ' + kvError.message);
            return NextResponse.json({ 
                success: false, 
                error: 'Database storage failed.',
                details: kvError.message 
            }, { status: 500 });
        }

        console.log("WAITLIST_ENTRY:", email); // For log scanning backup

        // 2. Trigger Welcome Email (Non-blocking)
        sendWelcomeEmail(email).catch(e => console.error('[RESEND_ASYNC_FAIL]', e));

        return NextResponse.json({ 
            success: true, 
            message: "ENTRY GRANTED. Check your inbox for your Clinic credentials shortly."
        });

    } catch (globalError) {
        console.error('[API_CRITICAL_FAIL] Full System Error:', globalError);
        return NextResponse.json({ 
            success: false, 
            error: 'An unexpected error occurred.' 
        }, { status: 500 });
    }
}
