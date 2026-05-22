import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { rawData, source } = await req.json();

        if (!rawData) {
            return NextResponse.json({ error: 'No data provided' }, { status: 400 });
        }

        // 1. Parsing logic (CSV-style: email, name)
        const lines = rawData.split('\n').filter((l: string) => l.trim() !== '');
        const leads = lines.map((line: string) => {
            const parts = line.split(',').map(p => p.trim());
            const email = parts[0];
            const name = parts[1] || email.split('@')[0];
            
            // Auto-segmenting tags
            let tag = 'Service Seeker';
            if (source === 'Apollo') tag = 'Influencer';
            if (source === 'Reddit') tag = 'Reddit Lead';
            if (source === 'Twitter') tag = 'Twitter Lead';
            if (source === 'LinkedIn') tag = 'LinkedIn Lead';

            return { email, name, source, tag, status: 'INGESTED' };
        });

        // 2. Batch Save to Supabase (Master Audit)
        const { error: supabaseError } = await supabase
            .from('growth_leads')
            .insert(leads);

        if (supabaseError) {
            console.error('[IMPORT_SUPABASE_FAIL]', supabaseError);
        }

        // 3. Sync to Google Sheets (Master Record)
        const GOOGLE_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;
        if (GOOGLE_URL) {
            // Processing in batches or sequentially to avoid script timeout
            for (const lead of leads) {
                try {
                    await fetch(GOOGLE_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: lead.email,
                            name: lead.name,
                            role: lead.tag, // Using tag as role in the spreadsheet
                            source: lead.source,
                            timestamp: new Date().toISOString()
                        })
                    });
                } catch (sheetErr) {
                    console.error('[IMPORT_SHEET_SYNC_FAIL]', lead.email, sheetErr);
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            count: leads.length,
            message: `Ingested ${leads.length} leads successfully.`
        });

    } catch (err: any) {
        console.error('[IMPORT_CRITICAL_FAIL]', err);
        return NextResponse.json({ error: 'System processing failure', details: err.message }, { status: 500 });
    }
}
