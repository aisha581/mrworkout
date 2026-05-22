import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendDripEmail1, sendDripEmail2, sendDripEmail3 } from '@/lib/resend';

/**
 * 3-Email Savage Drip Sequence
 * Runs daily at 8 AM via vercel.json cron.
 *
 * Day 3:  Email 1 — The #1 Training Mistake (CNS load)
 * Day 7:  Email 2 — Overtraining test (CNS recovery)
 * Day 14: Email 3 — App download CTA
 *
 * Uses created_at from Supabase waitlist table. No schema changes needed.
 */

export const dynamic = 'force-dynamic';

function daysAgo(n: number): { from: string; to: string } {
    const to = new Date();
    to.setDate(to.getDate() - n);
    to.setHours(23, 59, 59, 999);

    const from = new Date(to);
    from.setHours(0, 0, 0, 0);

    return {
        from: from.toISOString(),
        to: to.toISOString(),
    };
}

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    console.log('[DRIP_CRON] Starting savage drip check…');

    const results = { email1: 0, email2: 0, email3: 0, errors: 0 };

    // ── Email 1: Day 3 ────────────────────────────────────────────────────────
    const day3 = daysAgo(3);
    const { data: day3Users, error: e1 } = await supabase
        .from('waitlist')
        .select('email, name')
        .gte('created_at', day3.from)
        .lte('created_at', day3.to);

    if (e1) console.error('[DRIP_CRON] Day 3 query failed:', e1);

    for (const user of day3Users || []) {
        const r = await sendDripEmail1(user.email, user.name || '');
        if (r.success) { results.email1++; }
        else { results.errors++; console.error('[DRIP] Email1 fail:', user.email, r.error); }
    }

    // ── Email 2: Day 7 ────────────────────────────────────────────────────────
    const day7 = daysAgo(7);
    const { data: day7Users, error: e2 } = await supabase
        .from('waitlist')
        .select('email, name')
        .gte('created_at', day7.from)
        .lte('created_at', day7.to);

    if (e2) console.error('[DRIP_CRON] Day 7 query failed:', e2);

    for (const user of day7Users || []) {
        const r = await sendDripEmail2(user.email, user.name || '');
        if (r.success) { results.email2++; }
        else { results.errors++; console.error('[DRIP] Email2 fail:', user.email, r.error); }
    }

    // ── Email 3: Day 14 ───────────────────────────────────────────────────────
    const day14 = daysAgo(14);
    const { data: day14Users, error: e3 } = await supabase
        .from('waitlist')
        .select('email, name')
        .gte('created_at', day14.from)
        .lte('created_at', day14.to);

    if (e3) console.error('[DRIP_CRON] Day 14 query failed:', e3);

    for (const user of day14Users || []) {
        const r = await sendDripEmail3(user.email, user.name || '');
        if (r.success) { results.email3++; }
        else { results.errors++; console.error('[DRIP] Email3 fail:', user.email, r.error); }
    }

    console.log('[DRIP_CRON] Done:', results);
    return NextResponse.json({ success: true, ...results });
}
