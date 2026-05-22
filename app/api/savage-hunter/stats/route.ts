import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = req.headers.get('x-dashboard-secret');
    if (auth !== process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }

    // ── Totals ────────────────────────────────────────────────────────────────
    const { data: counts } = await supabaseAdmin
        .from('outbound_leads')
        .select('status');

    const total        = counts?.length ?? 0;
    const pending      = counts?.filter(r => r.status === 'pending').length ?? 0;
    const sent         = counts?.filter(r => r.status === 'sent').length ?? 0;
    const followup     = counts?.filter(r => r.status === 'followup_sent').length ?? 0;
    const converted    = counts?.filter(r => r.status === 'converted').length ?? 0;
    const contacted    = sent + followup + converted;

    // ── Last 5 sent ───────────────────────────────────────────────────────────
    const { data: recent } = await supabaseAdmin
        .from('outbound_leads')
        .select('email, first_name, status, last_sent_date')
        .neq('status', 'pending')
        .order('last_sent_date', { ascending: false })
        .limit(5);

    // ── Last 7 days activity ──────────────────────────────────────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: weekRows } = await supabaseAdmin
        .from('outbound_leads')
        .select('last_sent_date')
        .neq('status', 'pending')
        .gte('last_sent_date', sevenDaysAgo.toISOString());

    // Bucket by day
    const dayCounts: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dayCounts[d.toISOString().slice(0, 10)] = 0;
    }
    for (const row of weekRows || []) {
        const day = row.last_sent_date?.slice(0, 10);
        if (day && day in dayCounts) dayCounts[day]++;
    }

    const chart = Object.entries(dayCounts).map(([date, count]) => ({ date, count }));

    return NextResponse.json({
        total, pending, sent, followup, converted, contacted,
        recent: recent ?? [],
        chart,
    });
}
