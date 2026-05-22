import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json({ error: 'Code required' }, { status: 400 });
        }

        // 1. Resolve code to email
        const email = (await kv.get(`code:${code.toUpperCase()}`)) as string;
        
        if (!email) {
            return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
        }

        // 2. Fetch user stats
        const userData = await kv.hgetall(`user:${email}`);

        if (!userData) {
            return NextResponse.json({ error: 'Athlete data not found' }, { status: 404 });
        }

        // 3. Determine Founder ID (index in waitlist_athletes list)
        // Note: LPOS is not directly available in @vercel/kv yet, so we get the list and find index
        // Correct approach: When we saved the user, we should have saved their index.
        // Let's fallback to list retrieval if index isn't in userData.
        let founderId = userData.founderId as string || "???";
        
        if (userData.founder === "true" && (!userData.founderId)) {
            const list = await kv.lrange('waitlist_athletes', 0, -1);
            const index = list.indexOf(email);
            founderId = index !== -1 ? (index + 1).toString().padStart(3, '0') : "???";
            
            // Persist it for future calls
            await kv.hset(`user:${email}`, { founderId });
        }

        return NextResponse.json({
            email,
            name: (userData.name as string) || "ATHLETE",
            referrals: parseInt((userData.referrals as string) || "0"),
            isFounder: userData.founder === "true" || userData.founder === true,
            founderId: founderId,
            joinedAt: userData.joinedAt as string || Date.now().toString(),
            role: (userData.role as string) || "athlete",
            status: "active"
        });

    } catch (error: any) {
        console.error('[STATS_FAIL]', error);
        return NextResponse.json({ error: 'Failed to fetch stats.' }, { status: 500 });
    }
}
