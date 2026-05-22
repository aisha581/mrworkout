import { NextResponse } from 'next/server';
import { UnifiedMailer } from '@/lib/mailer';
import { supabase } from '@/lib/supabase';
import { customAlphabet } from 'nanoid';

const generateCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

console.log("[API_BRIDGE] ENGINE_START: Vercel Logic Active");

export async function POST(req: Request) {
    console.log("[API_BRIDGE] INCOMING_SIGNUP_EVENT");
    
    try {
        const body = await req.json();
        const { email, name, referredBy, source: bodySource, role: bodyRole } = body;

        const role = (bodyRole === 'partner' || bodyRole === 'athlete') ? bodyRole : 'athlete';

        if (!email || !email.includes('@') || !name) {
            return NextResponse.json({ error: 'Valid email and name are required' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedName = name.trim();
        const normalizedReferredBy = referredBy ? referredBy.toUpperCase().trim() : "";
        const source = bodySource || 'direct';

        console.log(`[API_BRIDGE] Processing: ${normalizedEmail}`);

        // 1. Master Data Record (Supabase)
        const userCode = generateCode();
        const { data: userData, error: supabaseError } = await supabase
            .from('waitlist')
            .upsert([
                { 
                    email: normalizedEmail, 
                    name: normalizedName, 
                    code: userCode,
                    role: role,
                    source: source,
                    referred_by: normalizedReferredBy
                }
            ], { onConflict: 'email' })
            .select()
            .single();

        if (supabaseError) {
            console.error("[API_BRIDGE] SUPABASE_FAIL", supabaseError);
            // Non-blocking but logged
        }

        // 2. Google Sheets Mirror (Async)
        const GOOGLE_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;
        if (GOOGLE_URL) {
            fetch(GOOGLE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: normalizedEmail, 
                    name: normalizedName, 
                    role: role, 
                    source: source,
                    timestamp: new Date().toISOString() 
                })
            }).then(r => console.log(`[API_BRIDGE] SHEETS_SYNC STATUS: ${r.status}`))
              .catch(e => console.error("[API_BRIDGE] SHEETS_SYNC ERROR", e));
        }

        // 3. Brevo Transactional Email (SYNC)
        const welcomeHtml = `
            <div style="font-family: sans-serif; background: #050505; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid rgba(0, 255, 255, 0.1);">
                <h1 style="color: #00ffff; font-style: italic; text-transform: uppercase; font-size: 24px; letter-spacing: 2px;">Entry Granted: Welcome to the Clinic</h1>
                <p style="font-size: 16px; line-height: 1.6; color: #888;">Athlete ${normalizedName}, you're officially on the list.</p>
                <p style="margin-top: 40px; font-weight: bold; color: #00ffff;">— Coach</p>
            </div>
        `;

        const mailResult = await UnifiedMailer.send({
            to: normalizedEmail,
            subject: 'Entry Granted: Welcome to the Clinic',
            html: welcomeHtml
        }, 'signup');

        console.log(`[API_BRIDGE] BREVO_DELIVERY: ${mailResult.success ? 'SUCCESS' : 'FAIL'}`);

        return NextResponse.json({ 
            success: true, 
            message: "ENTRY GRANTED.",
            redirect: `/welcome?name=${encodeURIComponent(normalizedName)}&email=${encodeURIComponent(normalizedEmail)}`
        });

    } catch (err: any) {
        console.error("[API_BRIDGE] CRITICAL_FAIL", err);
        return NextResponse.json({ success: false, error: "System congestion. Try again." }, { status: 500 });
    }
}
