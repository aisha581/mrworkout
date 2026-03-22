import { NextResponse } from 'next/server';
import { UnifiedMailer } from '@/lib/mailer';
import { supabase } from '@/lib/supabase';

/**
 * APOLLO AUTOMATION ENGINE
 * 
 * Flow:
 * 1. Fetch 50 leads from Apollo (Gym Owners, USA, Verified)
 * 2. Deduplicate vs Supabase
 * 3. Sync New Leads to Google Sheets
 * 4. Trigger Brevo 'Entry Granted' Email
 */

const GOOGLE_URL = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_URL;
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // Security Check
    if (secret !== CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("[APOLLO_ENGINE] Initiating search for Gym Owners/USA...");

    const apiKey = (process.env.APOLLO_API_KEY || "").trim();
    if (!apiKey) {
        console.error("[APOLLO_ENGINE] APOLLO_API_KEY is missing from environment variables.");
        return NextResponse.json({ error: 'APOLLO_API_KEY missing' }, { status: 500 });
    }

    console.log(`[APOLLO_ENGINE] Using API Key starting with: ${apiKey.substring(0, 4)}...`);

    try {
        // 1. APOLLO SEARCH
        const apolloRes = await fetch('https://api.apollo.io/v1/people/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'X-Api-Key': apiKey,
                'api-key': apiKey
            },
            body: JSON.stringify({
                api_key: apiKey,
                // 1. KEYWORDS & INDUSTRY
                q_organization_keyword_tags: ["CrossFit", "Personal Training", "Yoga Studio", "Boutique Fitness", "Gym"],
                organization_industry_tag_ids: ["health, wellness and fitness", "wellness and fitness services"],
                
                // 2. PERSON FILTERS
                person_titles: ["Owner", "Founder", "CEO", "Gym Owner", "Studio Manager", "Head Coach"],
                q_person_title_exclude: ["Student", "Intern", "Retired", "Assistant"],
                person_locations: ["United States"],
                
                // 3. FIRMOGRAPHIC FILTERS
                organization_num_employees_ranges: ["1,10", "11,20", "21,50"],
                
                // 4. QUALITY CONTROL
                contact_email_status: ["verified"],
                
                // 5. PACING
                page: 1,
                display_mode: "regular",
                per_page: 50 
            })
        });

        const data = await apolloRes.json();
        
        if (data.error) {
            console.error("[APOLLO_ENGINE] APOLLO_API_FAIL", data.error);
            return NextResponse.json({ error: data.error }, { status: 400 });
        }

        const leadsRaw = data.people || [];

        console.log(`[APOLLO_ENGINE] Found ${leadsRaw.length} candidates.`);

        let processedCount = 0;
        let duplicateCount = 0;

        for (const lead of leadsRaw) {
            const email = lead.email;
            if (!email) continue;

            const normalizedEmail = email.toLowerCase().trim();

            // 2. DEDUPLICATION
            const { data: existing } = await supabase
                .from('waitlist')
                .select('email')
                .eq('email', normalizedEmail)
                .single();

            if (existing) {
                duplicateCount++;
                continue;
            }

            // 3. MASTER RECORD (Supabase)
            const firstName = lead.first_name || "Athlete";
            const lastName = lead.last_name || "";
            const name = `${firstName} ${lastName}`.trim();
            const linkedin_url = lead.linkedin_url || "";
            const title = lead.title || "";
            const company = lead.organization?.name || "";
            
            const { error: sbError } = await supabase
                .from('waitlist')
                .insert([{
                    email: normalizedEmail,
                    name: name,
                    source: 'apollo_automation',
                    role: 'partner',
                    status: 'staged',
                    linkedin_url: linkedin_url,
                    title: title,
                    company: company
                }]);

            if (sbError) {
                console.error(`[APOLLO_ENGINE] SB_INSERT_FAIL for ${normalizedEmail}:`, sbError);
                continue;
            }

            // 4. GOOGLE SHEETS SYNC
            if (GOOGLE_URL) {
                fetch(GOOGLE_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: normalizedEmail,
                        name: name,
                        role: 'partner',
                        source: 'apollo_automation',
                        linkedin: linkedin_url,
                        title: title,
                        company: company,
                        timestamp: new Date().toISOString()
                    })
                }).catch(e => console.error("[APOLLO_ENGINE] SHEETS_SYNC FAIL", e));
            }

            // 5. BREVO ENGAGEMENT
            const emailHtml = `
                <div style="font-family: sans-serif; background: #050505; color: #ffffff; padding: 40px; border-radius: 24px; border: 1px solid rgba(0, 255, 255, 0.1);">
                    <h1 style="color: #00ffff; font-style: italic; text-transform: uppercase; font-size: 24px; letter-spacing: 2px;">Entry Granted: Founder's Access</h1>
                    <p style="font-size: 16px; line-height: 1.6; color: #888;">Greetings ${firstName},</p>
                    <p style="font-size: 16px; line-height: 1.6; color: #888;">Your work in the fitness space caught our attention. We're granting you exclusive Founder access to the Mr. Workout 3D biometric platform.</p>
                    <p style="margin-top: 40px; font-weight: bold; color: #00ffff;">— Coach</p>
                </div>
            `;

            await UnifiedMailer.send({
                to: normalizedEmail,
                subject: "Entry Granted: Founder's Access",
                html: emailHtml
            }, 'signup');

            processedCount++;
            
            // Artificial delay to respect rate limits
            await new Promise(r => setTimeout(r, 200));
        }

        return NextResponse.json({
            success: true,
            results: {
                found: leadsRaw.length,
                processed: processedCount,
                duplicates: duplicateCount
            }
        });

    } catch (err: any) {
        console.error("[APOLLO_ENGINE] CRITICAL_FAIL", err);
        return NextResponse.json({ error: 'Automation Engine Failure' }, { status: 500 });
    }
}
