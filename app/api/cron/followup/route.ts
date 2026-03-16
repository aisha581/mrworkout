import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { sendFollowupEmail } from '@/lib/resend';

/**
 * Automated 24-Hour Follow-Up Cron Job
 * Logic:
 * 1. Fetch all waitlist athletes.
 * 2. Filter for those who joined > 24 hours ago AND haven't received followup_1.
 * 3. Send email and mark as sent.
 * 
 * Schedule: Hourly via vercel.json
 */
export async function GET(req: Request) {
    try {
        // 1. Security Check (Vercel Cron Secret)
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        console.log('[CRON] Starting 24h follow-up check...');

        // 2. Fetch the full waitlist
        const athletes = await kv.lrange('waitlist_athletes', 0, -1);
        const now = Date.now();
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

        let processedCount = 0;
        let sentCount = 0;

        for (const email of athletes) {
            const userData = await kv.hgetall(`user:${email}`);
            
            if (!userData) continue;

            const joinedAt = parseInt(userData.joinedAt as string || "0");
            const hasSentFollowup = userData.sent_followup_1 === "true";

            // If user joined > 24 hours ago and hasn't received follow-up
            if (joinedAt > 0 && (now - joinedAt) >= TWENTY_FOUR_HOURS_MS && !hasSentFollowup) {
                console.log(`[CRON] Dispatching follow-up to eligible athlete: ${email}`);
                
                const { success } = await sendFollowupEmail(email);
                
                if (success) {
                    await kv.hset(`user:${email}`, { sent_followup_1: "true" });
                    sentCount++;
                }
            }
        processedCount++;
        }

        console.log(`[CRON] 24h follow-up complete. Processed: ${processedCount} | Sent: ${sentCount}`);

        // --- NEW: MASS OUTREACH DRIP LOGIC (20 per hour) ---
        console.log('[CRON] Starting Mass Outreach Drip (20/hr)...');
        let massSentCount = 0;
        
        // Pop 20 leads from the queue
        for (let i = 0; i < 20; i++) {
            const leadStr = await kv.rpop('MASS_OUTREACH_QUEUE') as string | null;
            if (!leadStr) break;

            try {
                const lead = JSON.parse(leadStr);
                let dispatch;

                if (lead.segment === 'influencer') {
                    dispatch = await import('@/lib/resend').then(m => m.sendGodfatherOffer(lead.email, lead.name, lead.platform, lead.topic));
                } else {
                    dispatch = await import('@/lib/resend').then(m => m.sendEnlistmentEmail(lead.email, lead.name, lead.topic));
                }

                if (dispatch.success) {
                    await kv.hincrby('marketing_metrics', 'total_sent', 1);
                    massSentCount++;
                }
            } catch (e) {
                console.error('[CRON_MASS_ERROR]', e);
            }
        }

        console.log(`[CRON] Mass Drip Complete. Sent: ${massSentCount}`);

        return NextResponse.json({
            success: true,
            followups_sent: sentCount,
            mass_drip_sent: massSentCount
        });

    } catch (error: any) {
        console.error('[CRON_CRITICAL_FAIL]', error);
        return NextResponse.json({ error: 'Cron job failed', details: error.message }, { status: 500 });
    }
}
