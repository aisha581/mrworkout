import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'waitlist.json');
        
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Waitlist is empty.' }, { status: 404 });
        }

        const fileData = fs.readFileSync(filePath, 'utf8');
        const waitlist = JSON.parse(fileData);

        if (!Array.isArray(waitlist) || waitlist.length === 0) {
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
