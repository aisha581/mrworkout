import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
    try {
        // 1. Fetch from KV (Athletes)
        let emails: any[] = [];
        try {
            emails = await kv.lrange('waitlist_athletes', 0, -1) || [];
        } catch (kvErr) {
            console.error('[API_KV_FAIL_LITERAL]', kvErr);
        }

        // 2. Fetch full user data for each email
        let waitlistData: any[] = [];
        try {
            if (emails.length > 0) {
                const userPromises = emails.map(email => kv.hgetall(`user:${email}`));
                const users = await Promise.all(userPromises);
                waitlistData = users
                    .filter(user => user !== null)
                    .sort((a: any, b: any) => parseInt(b.joinedAt || '0') - parseInt(a.joinedAt || '0'));
            }
        } catch (dataErr) {
            console.error('[API_DATA_PARSE_FAIL]', dataErr);
        }

        // 3. Fetch from Google Sheets (Proxy)
        const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzXz13ekRsxGtJoBg0l0zx2GsNFX5DbzaummNivLtA0dzIRERW38wFhFIQc0Zcu3cny/exec";
        let googleData: any[] = [];
        let googleStatus = "PENDING";
        
        try {
            const sheetRes = await fetch(GOOGLE_SHEETS_URL, { signal: AbortSignal.timeout(5000) });
            if (sheetRes.ok) {
                const sheetJson: any = await sheetRes.json();
                googleData = sheetJson.waitlist || [];
                googleStatus = "SUCCESS";
            } else {
                googleStatus = `FAIL_${sheetRes.status}`;
            }
        } catch (sheetErr) {
            console.warn('[DASHBOARD_PROXY_WARNING] Google Sheets Fetch failed:', sheetErr);
            googleStatus = "TIMEOUT_OR_ERR";
        }

        // 4. Return SAFE response (Always 200 if possible)
        return NextResponse.json({
            waitlist: waitlistData,
            googleSheets: googleData,
            total: Math.max(waitlistData.length, googleData.length),
            status: { kv: emails.length > 0 ? "OK" : "EMPTY", google: googleStatus },
            timestamp: new Date().toISOString()
        });

    } catch (globalError: any) {
        console.error('[DASHBOARD_WAITLIST_CRITICAL]', globalError);
        return NextResponse.json({ 
            error: 'Critical system failure.', 
            details: globalError.message,
            waitlist: [],
            googleSheets: [] 
        }, { status: 200 }); // Return 200 even on global catch to keep UI alive
    }
}
