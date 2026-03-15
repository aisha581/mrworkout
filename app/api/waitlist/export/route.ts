import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
    try {
        // 1. Primary Source: Vercel KV
        // Retrieve all emails from the list
        const waitlist = await kv.lrange('waitlist_emails', 0, -1);

        if (!waitlist || waitlist.length === 0) {
            return NextResponse.json({ error: 'No athletes found.' }, { status: 404 });
        }

        // Convert array to CSV
        const csvContent = [
            'Email',
            ...waitlist
        ].join('\n');

        // Return as a downloadable CSV file
        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename=clinic_athletes_list.csv',
            },
        });

    } catch (error: any) {
        console.error('[EXPORT_FAIL]', error);
        return NextResponse.json({ error: 'Failed to export list.', details: error.message }, { status: 500 });
    }
}
