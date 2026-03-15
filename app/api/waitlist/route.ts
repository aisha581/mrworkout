import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend';
import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';

// 6-character alphanumeric code (uppercase)
const generateCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

export async function POST(req: Request) {
    try {
        const { email, name, referredBy } = await req.json();

        // Basic validation
        if (!email || !email.includes('@') || !name) {
            return NextResponse.json({ error: 'Valid email and name are required' }, { status: 400 });
        }

        // Data Normalization: All inputs to lowercase for cleaner DB
        const normalizedEmail = email.toLowerCase().trim();
        const normalizedName = name.toLowerCase().trim();
        const normalizedReferredBy = referredBy ? referredBy.toUpperCase().trim() : "";

        try {
            // 1. Check if user already exists (Re-entry Logic)
            let userData = await kv.hgetall(`user:${normalizedEmail}`);
            
            if (!userData) {
                // 2. Check current waitlist length for Founder Status (first 150)
                const currentCount = await kv.llen('waitlist_athletes');
                const isFounder = currentCount < 150;

                // 3. Generate unique referral code
                // Use Name as base if possible, otherwise random
                const userCode = generateCode();
                
                userData = {
                    email: normalizedEmail,
                    name: normalizedName,
                    code: userCode,
                    referrals: "0",
                    referredBy: normalizedReferredBy,
                    founder: isFounder ? "true" : "false",
                    founderId: isFounder ? (currentCount + 1).toString().padStart(3, '0') : ""
                };

                // 4. Save User Data and Code Lookup
                await kv.hset(`user:${normalizedEmail}`, userData);
                await kv.set(`code:${userCode}`, normalizedEmail);
                
                // 5. Record in general waitlist list
                await kv.lpush('waitlist_athletes', normalizedEmail);

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
                // Pass founderId if they are a founder
                sendWelcomeEmail(normalizedEmail, isFounder ? (userData as any).founderId : undefined).catch(e => console.error('[RESEND_ASYNC_FAIL]', e));
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
