import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * Marketing Tracking Endpoint
 * Records "Open" (via 1x1 pixel) and "Click" (via redirect).
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'open' or 'click'
    const email = searchParams.get('email');
    const campaignId = searchParams.get('id') || 'general';

    if (!email) {
        return new Response('Missing email', { status: 400 });
    }

    try {
        // Increment metrics in Upstash
        if (type === 'open') {
            await kv.hincrby('marketing_metrics', `opens:${campaignId}`, 1);
            await kv.hincrby('marketing_metrics', 'total_opens', 1);
            
            // Return 1x1 transparent GIF
            const buffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
            return new Response(buffer, {
                headers: {
                    'Content-Type': 'image/gif',
                    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            });
        }

        if (type === 'social_share') {
            await kv.hincrby('marketing_metrics', 'social_shares', 1);
            return NextResponse.json({ success: true });
        }

        if (type === 'click') {
            await kv.hincrby('marketing_metrics', `clicks:${campaignId}`, 1);
            await kv.hincrby('marketing_metrics', 'total_clicks', 1);
            
            // If it's a WhatsApp click from a partner, track as conversion
            if (campaignId === 'whatsapp' && searchParams.get('role') === 'partner') {
                await kv.hincrby('marketing_metrics', 'clicks:whatsapp_partner', 1);
            }

            // If it's a tracking pixel or internal click, return success
            if (campaignId === 'whatsapp') {
                return NextResponse.json({ success: true });
            }

            // Construct redirect URL with existing params (role, etc.)
            const redirectUrl = new URL('https://mrworkout.pro/welcome');
            searchParams.forEach((value, key) => {
                if (key !== 'type' && key !== 'id') {
                    redirectUrl.searchParams.set(key, value);
                }
            });

            return NextResponse.redirect(redirectUrl.toString());
        }

        return new Response('Invalid type', { status: 400 });

    } catch (error) {
        console.error('[TRACKING_FAIL]', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
