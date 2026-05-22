import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Brevo transactional webhook — fires on click, delivered, bounce, etc.
// Configure at: app.brevo.com → Transactional → Settings → Webhook
// Webhook URL: https://mrworkout.pro/api/webhooks/brevo?secret=YOUR_BREVO_WEBHOOK_SECRET
export async function POST(req: NextRequest) {
    const secret = req.nextUrl.searchParams.get('secret');
    if (process.env.BREVO_WEBHOOK_SECRET && secret !== process.env.BREVO_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try { body = await req.json(); } catch { return NextResponse.json({ ok: true }); }

    // Brevo can send a single event object or an array
    const events: any[] = Array.isArray(body) ? body : [body];

    for (const event of events) {
        if (event.event !== 'click') continue;

        const email = (event.email || '').toLowerCase().trim();
        if (!email || !email.includes('@')) continue;

        // Skip if already converted
        const { data: converted } = await supabase
            .from('waitlist')
            .select('id')
            .eq('email', email)
            .maybeSingle();
        if (converted) continue;

        // Look up lead for name + type
        const { data: lead } = await supabase
            .from('outbound_leads')
            .select('first_name, lead_type, interest_level')
            .eq('email', email)
            .maybeSingle();

        const leadType   = (lead?.lead_type as string) ?? 'recruit';
        const isFirstHit = lead?.interest_level !== 'high';

        // Tag high interest + schedule 24h follow-up
        const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await supabase
            .from('outbound_leads')
            .update({
                interest_level: 'high',
                clicked_at:     new Date().toISOString(),
                follow_up_at:   followUpAt,
                follow_up_sent: false,
            })
            .eq('email', email);

        // Log to communication_logs — feeds the live dashboard feed + triggers notification
        if (isFirstHit) {
            const link = (event.link as string) || 'mrworkout.pro';
            await supabase.from('communication_logs').insert({
                handle:       email,
                platform:     'email',
                message_text: `clicked ${link} — tagged high interest, nudge queued for ${new Date(followUpAt).toLocaleString('en', { timeStyle: 'short', dateStyle: 'short' })}`,
                lead_type:    leadType,
                status:       'sent',
            });
        }
    }

    return NextResponse.json({ ok: true });
}
