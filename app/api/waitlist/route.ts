import { NextResponse } from 'next/server';
import { UnifiedMailer } from '@/lib/mailer';
import { supabase } from '@/lib/supabase';
import { customAlphabet } from 'nanoid';

const generateCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

export async function POST(req: Request) {
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

        // 1. Check if user already exists
        const { data: existingUser, error: fetchError } = await supabase
            .from('waitlist')
            .select('*')
            .eq('email', normalizedEmail)
            .single();

        let userData = existingUser;
        let isNewSignup = false;
        
        if (!existingUser) {
            isNewSignup = true;
            
            // 2. Check current waitlist length for Founder Status (first 150)
            const { count, error: countError } = await supabase
                .from('waitlist')
                .select('*', { count: 'exact', head: true });
            
            const currentCount = count || 0;
            const isFounder = currentCount < 150;
            const userCode = generateCode();

            userData = {
                email: normalizedEmail,
                name: normalizedName,
                code: userCode,
                referrals: 0,
                referred_by: normalizedReferredBy,
                founder: isFounder,
                founder_id: isFounder ? (currentCount + 1).toString().padStart(3, '0') : null,
                source: source,
                role: role
            };

            // 3. Save User Data to Supabase (Master Data)
            const { data: insertedUser, error: insertError } = await supabase
                .from('waitlist')
                .insert([userData])
                .select()
                .single();

            if (insertError) throw insertError;
            userData = insertedUser;

            // 4. Handle Referral Logic
            if (normalizedReferredBy) {
                await supabase
                    .from('waitlist')
                    .update({ referrals: supabase.rpc('increment', { row_id: normalizedReferredBy }) as any }) // Note: Direct update is simpler
                    .eq('code', normalizedReferredBy);
                
                // Better: Update via atomic increment if possible, or just fetch/update
                const { data: recruiter } = await supabase.from('waitlist').select('referrals').eq('code', normalizedReferredBy).single();
                if (recruiter) {
                    await supabase.from('waitlist').update({ referrals: (recruiter.referrals || 0) + 1 }).eq('code', normalizedReferredBy);
                }
            }

            // 5. GOOGLE SHEETS SYNC (Fallback Mirror)
            const GOOGLE_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;
            if (GOOGLE_URL) {
                try {
                    await fetch(GOOGLE_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            email: normalizedEmail, 
                            name: normalizedName, 
                            role, 
                            source,
                            timestamp: new Date().toISOString() 
                        })
                    });
                } catch (sheetErr) {
                    console.error('[SHEETS_SYNC_FAIL]', sheetErr);
                }
            }

            // 6. Trigger Welcome Email via Unified Mailer (Brevo Priority)
            console.log(`[SIGNUP_FLOW] Attempting Brevo dispatch for: ${normalizedEmail}`);
            console.log(`[SIGNUP_FLOW] BREVO_API_KEY present: ${!!process.env.BREVO_API_KEY}`);
            
            const welcomeHtml = `
                <div style="font-family: sans-serif; background: #050505; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid rgba(0, 255, 255, 0.1);">
                    <h1 style="color: #00ffff; font-style: italic; text-transform: uppercase; font-size: 24px; letter-spacing: 2px;">Entry Granted: Welcome to the Clinic</h1>
                    <p style="font-size: 16px; line-height: 1.6; color: #888;">Athlete ${normalizedName}, you're officially on the list.</p>
                    ${userData.founder ? `
                    <div style="background: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); padding: 30px; margin: 30px 0; border-radius: 16px; text-align: center;">
                        <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 4px; color: #00ffff; margin-bottom: 10px;">Status: Secured</p>
                        <h2 style="font-size: 32px; font-weight: 900; margin: 0; color: #ffffff;">FOUNDING ATHLETE #${userData.founder_id}</h2>
                    </div>
                    ` : ''}
                    <p style="margin-top: 40px; font-weight: bold; color: #00ffff;">— Mr. Workout</p>
                </div>
            `;

            const mailResult = await UnifiedMailer.send({
                to: normalizedEmail,
                subject: userData.founder ? 'Entry Granted: Founder Status Secured' : 'Entry Granted: Welcome to the Clinic',
                html: welcomeHtml
            }, 'signup');

            console.log(`[SIGNUP_FLOW] Mail Result: ${mailResult.success ? 'SUCCESS' : 'FAIL'} via ${mailResult.pipe}`);
        }

        const redirectUrl = userData.founder 
            ? `/welcome?code=${userData.code}&name=${encodeURIComponent(userData.name as string)}` 
            : `/founders-closed?email=${encodeURIComponent(normalizedEmail)}`;

        return NextResponse.json({ 
            success: true, 
            code: userData.code,
            redirect: redirectUrl,
            message: isNewSignup ? "ENTRY GRANTED." : "ACCESS RESTORED."
        });

    } catch (globalError: any) {
        console.error('[API_CRITICAL_FAIL]', globalError);
        return NextResponse.json({ 
            success: false, 
            error: 'System error. Try again.', 
            details: globalError.message 
        }, { status: 500 });
    }
}
