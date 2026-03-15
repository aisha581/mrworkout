import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        // 1. Initialize Supabase directly inside handler (Runtime Only)
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 2. Primary Source: Supabase
        const { data: supabaseWaitlist, error: supabaseError } = await supabase
            .from('waitlist')
            .select('email')
            .order('created_at', { ascending: true });

        if (supabaseError || !supabaseWaitlist) {
            console.log('SUPABASE_EXPORT_ERROR: ' + (supabaseError?.message || 'No data'));
            return NextResponse.json({ error: 'No athletes found in database.' }, { status: 404 });
        }

        const waitlist = supabaseWaitlist.map((row: { email: string }) => row.email);

        if (waitlist.length === 0) {
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

    } catch (error) {
        console.error('[EXPORT_FAIL]', error);
        return NextResponse.json({ error: 'Failed to export list.' }, { status: 500 });
    }
}
