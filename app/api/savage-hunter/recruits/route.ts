import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const auth = req.headers.get('x-dashboard-secret');
    if (auth !== process.env.CRON_SECRET) {
        return new Response('Unauthorized', { status: 401 });
    }

    // auth.users is only accessible via the admin API
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: 1, perPage: 100,
    });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const recruits = (data.users ?? [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(u => ({
            id:         u.id,
            email:      u.email ?? '—',
            name:       u.user_metadata?.name ?? '',
            created_at: u.created_at,
            source:     u.app_metadata?.provider ?? 'email',
            confirmed:  !!u.email_confirmed_at,
        }));

    return NextResponse.json({ total: recruits.length, recruits });
}
