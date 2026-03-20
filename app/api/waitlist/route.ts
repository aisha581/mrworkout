import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend';
import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';

// 6-character alphanumeric code (uppercase)
const generateCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, name, referredBy, source: bodySource, role: bodyRole } = body;

        const role = (bodyRole === 'partner' || bodyRole === 'athlete') ? bodyRole : 'athlete';

        // Basic validation
        if (!email || !email.includes('@') || !name) {
            return NextResponse.json({ error: 'Valid email and name are required' }, { status: 400 });
        }

        // Data Normalization
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedName = name.toLowerCase().trim();
        const normalizedReferredBy = referredBy ? referredBy.toUpperCase().trim() : "";
        const source = bodySource || 'direct';

        try {
            // 1. Check if user already exists (Re-entry Logic)
            let userData = await kv.hgetall(`user:${normalizedEmail}`);
            
            if (!userData) {
                // 2. Check current waitlist length for Founder Status (first 150)
                const currentCount = await kv.llen('waitlist_athletes');
                const isFounder = currentCount < 150;

                // 3. Generate unique referral code
                const userCode = generateCode();

                userData = {
                    email: normalizedEmail,
                    name: normalizedName,
                    code: userCode,
                    referrals: "0",
                    referredBy: normalizedReferredBy,
                    founder: isFounder ? "true" : "false",
                    founderId: isFounder ? (currentCount + 1).toString().padStart(3, '0') : "",
                    joinedAt: Date.now().toString(),
                    source: source,
                    role: role
                };

                // 4. Save User Data and Code Lookup
                await kv.hset(`user:${normalizedEmail}`, userData);
                await kv.set(`code:${userCode}`, normalizedEmail);
                
                // 5. Record in general waitlist list
                await kv.lpush('waitlist_athletes', normalizedEmail);

                // Track metric
                await kv.hincrby('marketing_metrics', `source:${source}`, 1);
                await kv.hincrby('marketing_metrics', `role:${role}`, 1);

                // 6. Handle Referral Logic
                if (normalizedReferredBy) {
                    const recruiterEmail = (await kv.get(`code:${normalizedReferredBy}`)) as string;
                    if (recruiterEmail && recruiterEmail !== normalizedEmail) {
                        await kv.hincrby(`user:${recruiterEmail}`, 'referrals', 1);
                        console.log(`[REFERRAL_TRACKED] Recruiter ${recruiterEmail} gained a point via ${normalizedEmail}`);
                    }
                }

                console.log(`[ATHLETE_JOINED] ${normalizedEmail} joined. Code: ${userCode} | Founder: ${isFounder}`);
                
                // 7. Trigger Welcome Email (only for NEW signups)
                await sendWelcomeEmail(normalizedEmail, isFounder ? (userData as any).founderId : undefined);

                // 8. EMERGENCY BCC NOTIFICATION (Hostinger Fallback)
                try {
                    await sendWelcomeEmail('sales@mrworkout.pro', undefined, {
                        subject: `NEW LEAD ENLISTED: ${normalizedName}`,
                        html: `<p><strong>Email:</strong> ${normalizedEmail}</p><p><strong>Role:</strong> ${role}</p><p><strong>Source:</strong> ${source}</p>`
                    });
                } catch (bccError) {
                    console.error('[BCC_FAIL]', bccError);
                }
            } else {
                console.log(`[ATHLETE_REENTRY] ${normalizedEmail} recognized. Redirecting...`);
                // Trigger email on re-entry just in case they missed it, or at least log it
                // sendWelcomeEmail(normalizedEmail, userData.founder === "true" ? userData.founderId : undefined).catch(e => console.error('[RESEND_ASYNC_FAIL]', e));
            }

            // 8. Success response with dynamic redirect (Works for new and re-entry)
            const isFounder = userData.founder === "true";
            const redirectUrl = isFounder 
                ? `/welcome?code=${userData.code}&name=${encodeURIComponent(userData.name as string)}` 
                : `/founders-closed?email=${encodeURIComponent(normalizedEmail)}`;

            return NextResponse.json({ 
                success: true, 
                code: (userData.code as string),
                redirect: redirectUrl,
                message: "ENTRY GRANTED."
            });

        } catch (kvError: any) {
            console.error('KV_ERROR: ' + kvError.message);
            return NextResponse.json({ 
                success: false, 
                error: 'Database storage failed.',
                details: kvError.message 
            }, { status: 500 });
        }

    } catch (globalError) {
        console.error('[API_CRITICAL_FAIL] Full System Error:', globalError);
        return NextResponse.json({ 
            success: false, 
            error: 'An unexpected error occurred.' 
        }, { status: 500 });
    }
}
