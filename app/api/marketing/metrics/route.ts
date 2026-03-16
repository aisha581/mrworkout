import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * Marketing Dashboard Metrics API
 * Returns aggregated stats for the outreach engine.
 */
export async function GET() {
    try {
        const metrics = await kv.hgetall('marketing_metrics');
        
        const totalSent = parseInt((metrics?.total_sent as string) || "0");
        const totalOpens = parseInt((metrics?.total_opens as string) || "0");
        const totalClicks = parseInt((metrics?.total_clicks as string) || "0");

        const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(2) : "0.00";
        const clickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(2) : "0.00";

        return NextResponse.json({
            sent: totalSent,
            opens: totalOpens,
            clicks: totalClicks,
            open_rate: `${openRate}%`,
            click_rate: `${clickRate}%`,
            campaigns: {
                godfather: {
                    opens: metrics?.['opens:godfather'] || 0,
                    clicks: metrics?.['clicks:godfather'] || 0
                },
                enlist: {
                    opens: metrics?.['opens:enlist'] || 0,
                    clicks: metrics?.['clicks:enlist'] || 0
                }
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
    }
}
