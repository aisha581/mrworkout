import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendSavageEmail1, sendSavageEmail2 } from '@/lib/resend';

/**
 * Savage Hunter — Cold Lead Drip
 * Runs daily at 09:00 UTC via vercel.json cron.
 *
 * Pass 1 (email_step=0, status=pending):
 *   Grab 50 fresh leads → send Email 1 "The Clinic is waiting."
 *   → set email_step=1, status=active, last_sent_date=now
 *
 * Pass 2 (email_step=1, last_sent_date ≥ 3 days ago):
 *   Grab up to 100 leads → send Email 2 "You still haven't shown up."
 *   → set email_step=2, last_sent_date=now
 */

export const dynamic = 'force-dynamic';

const BATCH_EMAIL1 = 50;
const BATCH_EMAIL2 = 100;
const EMAIL2_DELAY_DAYS = 3;

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

    // ── Pass 1: fresh leads → Email 1 ────────────────────────────────────────
    const { data: freshLeads, error: e1q } = await supabaseAdmin
        .from('outbound_leads')
        .select('id, email, first_name')
        .eq('status', 'pending')
        .eq('email_step', 0)
        .order('created_at', { ascending: true })
        .limit(BATCH_EMAIL1);

    if (e1q) {
        console.error('[SAVAGE-SEND] Pass 1 query failed:', e1q.message);
        results.errors++;
    }

    for (const lead of freshLeads || []) {
        const r = await sendSavageEmail1(lead.email, lead.first_name);
        if (r.success) {
            await supabaseAdmin
                .from('outbound_leads')
                .update({ status: 'active', email_step: 1, last_sent_date: new Date().toISOString() })
                .eq('id', lead.id);
            results.email1_sent++;
        } else {
            console.error('[SAVAGE-SEND] Email1 fail:', lead.email, r.error);
            results.errors++;
        }
    }

    // ── Pass 2: active leads 3+ days since Email 1 → Email 2 ─────────────────
    const cutoff = daysAgoIso(EMAIL2_DELAY_DAYS);

    const { data: followupLeads, error: e2q } = await supabaseAdmin
        .from('outbound_leads')
        .select('id, email, first_name')
        .eq('status', 'active')
        .eq('email_step', 1)
        .lte('last_sent_date', cutoff)
        .order('last_sent_date', { ascending: true })
        .limit(BATCH_EMAIL2);

    if (e2q) {
        console.error('[SAVAGE-SEND] Pass 2 query failed:', e2q.message);
        results.errors++;
    }

    for (const lead of followupLeads || []) {
        const r = await sendSavageEmail2(lead.email, lead.first_name);
        if (r.success) {
            await supabaseAdmin
                .from('outbound_leads')
                .update({ email_step: 2, last_sent_date: new Date().toISOString() })
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
