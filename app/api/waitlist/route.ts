import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        // Basic validation
        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        const supabase = getSupabaseClient();
        // 1. Permanent Storage: Supabase Only
        const { error: supabaseError } = await supabase
            .from('waitlist')
            .insert([{ email }]);

        if (supabaseError) {
            // Log EXACT error to Vercel console for troubleshooting
            console.log('SUPABASE_ERROR: ' + supabaseError.message);
            return NextResponse.json({ 
                success: false, 
                error: 'Database insertion failed.',
                details: supabaseError.message 
            }, { status: 500 });
        }

        console.log(`[SUPABASE_SUCCESS] Athlete persisted: ${email}`);
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
