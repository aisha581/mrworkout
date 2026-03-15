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
        const email = await kv.get(`code:${code.toUpperCase()}`);
        
        if (!email) {
            return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
        }

        // 2. Fetch user stats
        const userData = await kv.hgetall(`user:${email}`);

        if (!userData) {
            return NextResponse.json({ error: 'Athlete data not found' }, { status: 404 });
        }

        return NextResponse.json({
            referrals: parseInt((userData.referrals as string) || "0"),
            isFounder: userData.founder === "true" || userData.founder === true,
            status: "active"
        });

    } catch (error: any) {
        console.error('[STATS_FAIL]', error);
        return NextResponse.json({ error: 'Failed to fetch stats.' }, { status: 500 });
    }
}
