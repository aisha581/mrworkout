import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendSavageEmail1, sendSavageEmail2 } from '@/lib/resend';

/**
 * Savage Hunter — Cold Lead Drip
 * Runs daily at 09:00 UTC via vercel.json cron.
 *
 * Pass 1 (status='pending'):
 *   Grab 50 fresh leads → send Email 1 "Honestly? Your gym routine."
 *   → status='sent', last_sent_date=now
 *
 * Pass 2 (status='sent', last_sent_date ≥ 3 days ago):
 *   Send Email 2 "You still haven't shown up."
 *   → status='followup_sent', last_sent_date=now
 */

export const dynamic = 'force-dynamic';

const BATCH_EMAIL1    = 50;
const BATCH_EMAIL2    = 100;
const FOLLOWUP_DAYS   = 3;

function daysAgoIso(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
}

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    const results = { email1_sent: 0, email2_sent: 0, errors: 0 };
    const now = new Date().toISOString();

    // ── Pass 1: pending → Email 1 ─────────────────────────────────────────────
    const { data: freshLeads, error: e1q } = await supabaseAdmin
        .from('outbound_leads')
        .select('id, email, first_name')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(BATCH_EMAIL1);

    if (e1q) console.error('[SAVAGE-SEND] Pass1 query failed:', e1q.message);

    for (const lead of freshLeads || []) {
        const r = await sendSavageEmail1(lead.email, lead.first_name);
        if (r.success) {
            await supabaseAdmin
                .from('outbound_leads')
                .update({ status: 'sent', last_sent_date: now })
                .eq('id', lead.id);
            results.email1_sent++;
        } else {
            console.error('[SAVAGE-SEND] Email1 fail:', lead.email, r.error);
            results.errors++;
        }
    }

    // ── Pass 2: sent 3+ days ago → Email 2 ───────────────────────────────────
    const { data: followupLeads, error: e2q } = await supabaseAdmin
        .from('outbound_leads')
        .select('id, email, first_name')
        .eq('status', 'sent')
        .lte('last_sent_date', daysAgoIso(FOLLOWUP_DAYS))
        .order('last_sent_date', { ascending: true })
        .limit(BATCH_EMAIL2);

    if (e2q) console.error('[SAVAGE-SEND] Pass2 query failed:', e2q.message);

    for (const lead of followupLeads || []) {
        const r = await sendSavageEmail2(lead.email, lead.first_name);
        if (r.success) {
            await supabaseAdmin
                .from('outbound_leads')
                .update({ status: 'followup_sent', last_sent_date: now })
                .eq('id', lead.id);
            results.email2_sent++;
        } else {
            console.error('[SAVAGE-SEND] Email2 fail:', lead.email, r.error);
            results.errors++;
        }
    }

    console.log('[SAVAGE-SEND] Done:', results);
    return NextResponse.json({ success: true, ...results });
}
