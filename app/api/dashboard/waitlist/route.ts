import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
    try {
        // 1. Fetch all emails from the waitlist
        const emails = await kv.lrange('waitlist_athletes', 0, -1);

        if (!emails || emails.length === 0) {
            return NextResponse.json({ waitlist: [] });
        }

        // 2. Fetch full user data for each email
        const userPromises = emails.map(email => kv.hgetall(`user:${email}`));
        const users = await Promise.all(userPromises);

        // 3. Filter out any null entries and sort by joinedAt (newest first)
        const waitlistData = users
            .filter(user => user !== null)
            .sort((a: any, b: any) => parseInt(b.joinedAt) - parseInt(a.joinedAt));

        // 4. Also fetch from Google Sheets (Proxy to avoid CORS)
        const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzXz13ekRsxGtJoBg0l0zx2GsNFX5DbzaummNivLtA0dzIRERW38wFhFIQc0Zcu3cny/exec";
        let googleData = [];
        try {
            const sheetRes = await fetch(GOOGLE_SHEETS_URL);
            const sheetJson: any = await sheetRes.json();
            googleData = sheetJson.waitlist || [];
            console.log(`[DASHBOARD_PROXY] Fetched ${googleData.length} entries from Google Sheets.`);
        } catch (sheetErr) {
            console.warn('[DASHBOARD_PROXY_WARNING] Google Sheets Fetch failed, falling back to KV only:', sheetErr);
        }

        return NextResponse.json({
            waitlist: waitlistData,
            googleSheets: googleData,
            total: waitlistData.length
        });

    } catch (error: any) {
        console.error('[DASHBOARD_WAITLIST_FETCH_FAIL]', error);
        return NextResponse.json({ error: 'Failed to fetch waitlist.' }, { status: 500 });
    }
}
