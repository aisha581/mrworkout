import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend';
import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';

// 6-character alphanumeric code (uppercase)
const generateCode = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

export async function POST(req: Request) {
    try {
        const { email, referredBy } = await req.json();

        // Basic validation
        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        try {
            // 1. Check if user already exists
            let userData = await kv.hgetall(`user:${email}`);
            
            if (!userData) {
                // 2. Check current waitlist length for Founder Status (first 500)
                const currentCount = await kv.llen('waitlist_athletes');
                const isFounder = currentCount < 500;

                // 3. Generate new referral code for new user
                const userCode = generateCode();
                
                userData = {
                    email,
                    code: userCode,
                    referrals: "0",
                    referredBy: referredBy || "",
                    founder: isFounder ? "true" : "false"
                };

                // 4. Save User Data and Code Lookup
                await kv.hset(`user:${email}`, userData);
                await kv.set(`code:${userCode}`, email);
                
                // 5. Record in general waitlist list (for backward compatibility/export)
                await kv.lpush('waitlist_athletes', email);

                // 6. Handle Referral Logic (Increment Recruiter's Count)
                if (referredBy) {
                    const recruiterEmail = await kv.get(`code:${referredBy.toUpperCase()}`);
                    if (recruiterEmail && recruiterEmail !== email) {
                        await kv.hincrby(`user:${recruiterEmail}`, 'referrals', 1);
                        console.log(`[REFERRAL_TRACKED] Recruiter ${recruiterEmail} gained a point via ${email}`);
                    }
                }

                console.log(`[ATHLETE_JOINED] ${email} joined. Code: ${userCode} | Founder: ${isFounder}`);
            }

            // 7. Trigger Welcome Email (Non-blocking)
            sendWelcomeEmail(email).catch(e => console.error('[RESEND_ASYNC_FAIL]', e));

            return NextResponse.json({ 
                success: true, 
                code: (userData.code as string),
                message: "ENTRY GRANTED. Referral link activated."
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
