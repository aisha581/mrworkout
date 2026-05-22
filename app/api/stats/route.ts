import { NextResponse } from 'next/server';

export async function GET() {
    console.log("[STATS_PROXY] FETCHING_FROM_GOOGLE");
    
    try {
        const GOOGLE_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;
        
        if (!GOOGLE_URL) {
            console.error("[STATS_PROXY] MISSING_URL");
            return NextResponse.json({ error: "Configuration missing" }, { status: 500 });
        }

        const res = await fetch(GOOGLE_URL);
        if (!res.ok) throw new Error(`Google API responded with ${res.status}`);
        
        const data = await res.json();
        
        return NextResponse.json(data);
    } catch (err: any) {
        console.error("[STATS_PROXY] CRITICAL_FAIL", err);
        return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
    }
}
