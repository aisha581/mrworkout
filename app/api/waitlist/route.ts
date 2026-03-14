import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
        }

        const filePath = path.join(process.cwd(), 'waitlist.json');
        
        let waitlist = [];
        try {
            if (fs.existsSync(filePath)) {
                const fileData = fs.readFileSync(filePath, 'utf8');
                waitlist = JSON.parse(fileData);
                if (!Array.isArray(waitlist)) waitlist = [];
            }
        } catch (readError) {
            console.error('Error reading waitlist file:', readError);
            waitlist = [];
        }

        if (!waitlist.includes(email)) {
            waitlist.push(email);
            fs.writeFileSync(filePath, JSON.stringify(waitlist, null, 2));
            console.log(`[WAITLIST] New athlete enroled: ${email}`);
        }

        return NextResponse.json({ success: true, message: "ENTRY GRANTED. Check your inbox for your Clinic credentials shortly." });
    } catch (error) {
        console.error('Waitlist submission error:', error);
        return NextResponse.json({ error: 'Server malfunction' }, { status: 500 });
    }
}
