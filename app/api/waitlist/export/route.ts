import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from '@/lib/supabase';

export async function GET() {
    try {
        const supabase = getSupabaseClient();
        // A. Primary Source: Supabase
        const { data: supabaseWaitlist, error: supabaseError } = await supabase
            .from('waitlist')
            .select('email')
            .order('created_at', { ascending: true });

        let waitlist = [];

        if (!supabaseError && supabaseWaitlist) {
            waitlist = supabaseWaitlist.map((row: { email: string }) => row.email);
        } else {
            // B. Fallback: Local JSON
            const filePath = path.join(process.cwd(), 'waitlist.json');
            if (fs.existsSync(filePath)) {
                const fileData = fs.readFileSync(filePath, 'utf8');
                waitlist = JSON.parse(fileData);
            }
        }

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
