import { NextResponse } from 'next/server';
import { UnifiedMailer } from '@/lib/mailer';
import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

/**
 * APIFY WEBHOOK ENDPOINT
 * 
 * Expected Event: Individual Record Scraped (Google Maps Scraper)
 * 
 * Flow:
 * 1. Validate Secret
 * 2. Parse Lead (Name, Email, Company, LinkedIn)
 * 3. Deduplicate vs Supabase
 * 4. Sync to Google Sheets
 * 5. Trigger Brevo 'Entry Granted' Email
 */

const GOOGLE_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // Security Check
    if (secret !== CRON_SECRET && process.env.NODE_ENV === 'production') {
        console.warn("[APIFY_WEBHOOK] Unauthorized access attempt.");
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        console.log("[APIFY_WEBHOOK] Incoming Payload:", JSON.stringify(body).substring(0, 500));

        // Note: Apify sends either a single record or event data depending on config
        // If it's a 'RUN_SUCCEEDED' event, we might need to fetch results. 
        // But the user wants "as soon as the first lead is scraped", implying individual records.
        
        const lead = body; 
        const email = lead.email || lead.contactEmail || (lead.emails && lead.emails[0]);
        
        if (!email) {
            console.log("[APIFY_WEBHOOK] No email found in record, skipping.");
            return NextResponse.json({ status: 'skipped', reason: 'no_email' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const name = lead.title || lead.name || "Gym Owner";
        const company = lead.title || "";
        const linkedin = lead.linkedin || lead.linkedinUrl || "";
        const instagram = lead.instagram || lead.instagramUrl || "";
        const facebook = lead.facebook || lead.facebookUrl || "";
        const twitter = lead.twitter || lead.twitterUrl || "";
        const phone = lead.phone || lead.phoneNumber || "";
        const source = 'apify_google_maps_austin';

        // 1. Deduplication
        const { data: existing } = await supabase
            .from('waitlist')
            .select('email')
            .eq('email', normalizedEmail)
            .single();

        if (existing) {
            console.log(`[APIFY_WEBHOOK] Duplicate lead found: ${normalizedEmail}`);
            return NextResponse.json({ status: 'duplicate', email: normalizedEmail });
        }

        // 2. Insert into Supabase
        const { error: sbError } = await supabase
            .from('waitlist')
            .insert([{
                email: normalizedEmail,
                name: name,
                source: source,
                role: 'partner',
                status: 'staged',
                code: nanoid(10),
                company: company,
                linkedin_url: linkedin,
                instagram_url: instagram,
                facebook_url: facebook,
                twitter_url: twitter,
                phone: phone
            }]);

        if (sbError) {
            console.error("[APIFY_WEBHOOK] Supabase Insert Error Details:", JSON.stringify(sbError));
            return NextResponse.json({ error: 'Database error', details: sbError.message }, { status: 500 });
        }

        // 3. Sync to Google Sheets
        if (GOOGLE_URL) {
            fetch(GOOGLE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: normalizedEmail,
                    name: name,
                    role: 'partner',
                    source: source,
                    company: company,
                    phone: phone,
                    socials: { linkedin, instagram, facebook, twitter },
                    timestamp: new Date().toISOString()
                })
            }).catch(e => console.error("[APIFY_WEBHOOK] Sheets Sync Fail:", e));
        }

        // 4. Trigger Brevo Email
        const emailHtml = `
            <div style="font-family: sans-serif; background: #050505; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid rgba(0, 255, 255, 0.1);">
                <h1 style="color: #00ffff; font-style: italic; text-transform: uppercase; font-size: 24px; letter-spacing: 2px;">Entry Granted: Austin Founder's Access</h1>
                <p style="font-size: 16px; line-height: 1.6; color: #888;">Greetings,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #888;">We've spotted your work with <strong>${company}</strong> in Austin. We're granting you exclusive Founder access to the Mr. Workout 3D platform.</p>
                <p style="margin-top: 40px; font-weight: bold; color: #00ffff;">— Coach</p>
            </div>
        `;

        await UnifiedMailer.send({
            to: normalizedEmail,
            subject: "Entry Granted: Austin Founder's Access",
            html: emailHtml
        }, 'signup');

        console.log(`[APIFY_WEBHOOK] Lead processed and email sent: ${normalizedEmail}`);

        return NextResponse.json({
            success: true,
            lead: normalizedEmail,
            action: 'processed'
        });

    } catch (err: any) {
        console.error("[APIFY_WEBHOOK] Critical Fail:", err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
