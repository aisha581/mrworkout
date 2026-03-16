import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export default resend;

/**
 * Sends a "Savage" welcome email to newly enrolled athletes.
 */
export async function sendWelcomeEmail(email: string, founderNumber?: string) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[RESEND] API Key missing. Skipping email sent to:', email);
            return { success: false, error: 'API Key missing' };
        }

        const { data, error } = await resend.emails.send({
            from: 'Mr. Workout <coach@mrworkout.pro>',
            to: [email],
            replyTo: 'thebillion9@gmail.com',
            subject: 'Entry Granted: Welcome to the Clinic',
            html: `
                <div style="font-family: sans-serif; background: #121212; color: #ffffff; padding: 40px; border-radius: 20px;">
                    <h1 style="color: #00ffff; font-style: italic; text-transform: uppercase;">Entry Granted</h1>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Athlete, you're on the list.
                    </p>
                    ${founderNumber ? `
                    <div style="background: rgba(0, 255, 255, 0.1); border-left: 4px solid #00ffff; padding: 20px; margin: 20px 0;">
                        <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #00ffff; margin: 0;">Status Secured</p>
                        <h2 style="font-size: 32px; font-weight: 900; margin: 10px 0; color: #ffffff;">FOUNDING ATHLETE #${founderNumber}</h2>
                    </div>
                    ` : ''}
                    <p style="font-size: 16px; line-height: 1.6;">
                        The 3D coaching modules are being calibrated. You'll be the first to know when we go live.
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        In the meantime, get your mind right.
                    </p>
                    <p style="margin-top: 40px; font-weight: bold; color: #00ffff;">
                        — Mr. Workout
                    </p>
                    <hr style="border: none; border-top: 1px solid #333; margin: 40px 0;" />
                    <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px;">
                        Savage Protocol v.1 | Powered by Mr. Workout
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('[RESEND_ERROR] Detailed error response:', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('[RESEND] Welcome email dispatched successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('[RESEND] Failed to send welcome email:', error);
        return { success: false, error };
    }
}

/**
 * Sends a 24-hour follow-up email for the Day 01 Directive.
 */
export async function sendFollowupEmail(email: string) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[RESEND] API Key missing. Skipping follow-up email sent to:', email);
            return { success: false, error: 'API Key missing' };
        }

        const { data, error } = await resend.emails.send({
            from: 'Mr. Workout <coach@mrworkout.pro>',
            to: [email],
            replyTo: 'thebillion9@gmail.com',
            subject: 'FOUNDER STATUS: Your Day 01 Directive is live.',
            html: `
                <div style="font-family: sans-serif; background: #121212; color: #ffffff; padding: 40px; border-radius: 20px;">
                    <h1 style="color: #39ff14; font-style: italic; text-transform: uppercase;">Directive Dispatched</h1>
                    <p style="font-size: 18px; line-height: 1.6; font-weight: bold;">
                        Athlete,
                    </p>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Your spot in the Alpha Squad is secured, but the work has already begun.
                    </p>
                    <div style="background: rgba(57, 255, 20, 0.1); border-left: 4px solid #39ff14; padding: 20px; margin: 20px 0;">
                        <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #39ff14; margin: 0;">24-Hour Reminder</p>
                        <h2 style="font-size: 24px; font-weight: 900; margin: 10px 0; color: #ffffff;">YOUR DAY 01 DIRECTIVE IS LIVE.</h2>
                    </div>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Your Day 01 Directive is now waiting for you on the Clinic Dashboard. Log in to see your mission and check the Phase 2 countdown.
                    </p>
                    <a href="https://www.mrworkout.pro/welcome" style="display: inline-block; background: #00ffff; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 900; text-transform: uppercase; margin: 20px 0;">Access the Clinic</a>
                    <p style="font-size: 16px; line-height: 1.6;">
                        Stay Savage,<br />
                        <strong>MR. WORKOUT</strong>
                    </p>
                    <hr style="border: none; border-top: 1px solid #333; margin: 40px 0;" />
                    <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 2px;">
                        Savage Protocol v.1 | Alpha Squad
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error('[RESEND_FOLLOWUP_ERROR]', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('[RESEND] Follow-up email dispatched successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('[RESEND] Failed to send follow-up email:', error);
        return { success: false, error };
    }
}

/**
 * Sends a personalized Influencer Outreach email with Founder Equity offer.
 */
export async function sendInfluencerOutreachEmail(email: string, influencerName: string, topic: string) {
    try {
        if (!process.env.RESEND_API_KEY) {
            console.warn('[RESEND] API Key missing. Skipping outreach sent to:', email);
            return { success: false, error: 'API Key missing' };
        }

        const { data, error } = await resend.emails.send({
            from: 'Mr. Workout <coach@mrworkout.pro>',
            to: [email],
            replyTo: 'thebillion9@gmail.com',
            subject: 'PROPOSAL: Mr. Workout Founder Equity Status',
            html: `
                <div style="font-family: sans-serif; background: #060606; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #333;">
                    <div style="background: linear-gradient(135deg, #00ffff, #39ff14); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: #000; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">Founder Equity Protocol</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #39ff14; margin-bottom: 20px;">Priority: Level Alpha</p>
                        <p style="font-weight: bold;">Athlete ${influencerName},</p>
                        <p>We've been tracking your impact in the biomechanics and mobility space. Your recent insights on <strong>${topic}</strong> align perfectly with the mission we're building at Mr. Workout.</p>
                        <p>We are officially extending a <span style="color: #00ffff; font-weight: bold;">Founder Equity Status</span> offer for you to join our inner circle.</p>
                        <p>This isn't a sponsorship—it's an initiation into the Alpha Squad that will define the future of 3D Movement training.</p>
                        <center>
                            <a href="https://www.mrworkout.pro/welcome" style="display: inline-block; background: #39ff14; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 900; text-transform: uppercase; margin: 20px 0;">Claim Access</a>
                        </center>
                        <p>Your Day 01 Directive is ready. The 3D revolution doesn't wait for late adopters.</p>
                        <p>Stay Savage,<br /><strong>MR. WORKOUT</strong></p>
                    </div>
                    <div style="text-align: center; font-size: 10px; color: #666; padding-top: 20px; border-top: 1px solid #333;">
                        Savage Protocol v.1 | Confidential Outreach | 3D Movement Clinic
                    </div>
                </div>
            `,
        });

        if (error) {
            console.error('[OUTREACH_ERROR]', JSON.stringify(error, null, 2));
            return { success: false, error };
        }

        console.log('[RESEND] Outreach email dispatched successfully:', data);
        return { success: true, data };
    } catch (error) {
        console.error('[RESEND] Failed to send outreach email:', error);
        return { success: false, error };
    }
}

/**
 * Formats/Sanitizes the athlete's name for premium outreach.
 * Athlete_785 -> "Athlete"
 * Scott_Runs -> "Scott"
 */
function formatAthleteName(name: string): string {
    if (!name) return "Athlete";
    if (name.startsWith('Athlete_')) return "Athlete";
    if (name.includes('_')) return name.split('_')[0];
    return name;
}

/**
 * Sends the high-equity "Godfather Offer" to segmented influencers.
 */
export async function sendGodfatherOffer(email: string, name: string, platform: string, topic: string) {
    try {
        if (!process.env.RESEND_API_KEY) return { success: false, error: 'API Key missing' };

        const sanitizedName = formatAthleteName(name);
        const { data, error } = await resend.emails.send({
            from: 'Mr. Workout <coach@mrworkout.pro>',
            to: [email],
            replyTo: 'thebillion9@gmail.com',
            subject: 'PROPOSAL: The Godfather Offer',
            html: `
                <div style="font-family: sans-serif; background: #060606; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #00ffff;">
                    <div style="background: #00ffff; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: #000; margin: 0; font-size: 20px; text-transform: uppercase;">The Godfather Offer</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p><strong>Coach ${sanitizedName},</strong></p>
                        <p>I've been monitoring your impact on <strong>${platform}</strong>. Your authority in ${topic} is exactly what we need for the next phase of Mr. Workout.</p>
                        <p>I’m making you an offer you can't refuse: <span style="color: #00ffff; font-weight: bold;">Direct Founder Equity Status.</span></p>
                        <center>
                            <a href="https://www.mrworkout.pro/api/marketing/track?type=click&email=${email}&id=godfather" style="display: inline-block; background: #00ffff; color: #000; padding: 15px 30_link; text-decoration: none; border-radius: 10px; font-weight: 900; text-transform: uppercase; margin: 20px 0;">Review the Deed</a>
                        </center>
                        <p>Stay Savage,<br /><strong>MR. WORKOUT</strong></p>
                    </div>
                    <img src="https://www.mrworkout.pro/api/marketing/track?type=open&email=${email}&id=godfather" width="1" height="1" style="display:none;" />
                </div>
            `,
        });

        return error ? { success: false, error } : { success: true, data };
    } catch (error) {
        return { success: false, error };
    }
}

/**
 * Sends the "Enlistment" call to segmented athletes.
 */
export async function sendEnlistmentEmail(email: string, name: string, topic: string) {
    try {
        if (!process.env.RESEND_API_KEY) return { success: false, error: 'API Key missing' };

        const sanitizedName = formatAthleteName(name);
        const { data, error } = await resend.emails.send({
            from: 'Mr. Workout <coach@mrworkout.pro>',
            to: [email],
            replyTo: 'thebillion9@gmail.com',
            subject: 'Phase 1: Enlistment Initialized',
            html: `
                <div style="font-family: sans-serif; background: #060606; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #39ff14;">
                    <div style="background: #39ff14; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="color: #000; margin: 0; font-size: 20px; text-transform: uppercase;">Phase 1: Enlistment</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p><strong>Athlete ${sanitizedName},</strong></p>
                        <p>The 2D era of training is over. We’ve seen your dedication to ${topic} and it’s time to level up.</p>
                        <p>You are officially being recruited for the <span style="color: #39ff14; font-weight: bold;">Mr. Workout Alpha Squad.</span></p>
                        <center>
                            <a href="https://www.mrworkout.pro/api/marketing/track?type=click&email=${email}&id=enlist" style="display: inline-block; background: #39ff14; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 900; text-transform: uppercase; margin: 20px 0;">Enlist Now</a>
                        </center>
                        <p>Stay Savage,<br /><strong>MR. WORKOUT</strong></p>
                    </div>
                    <img src="https://www.mrworkout.pro/api/marketing/track?type=open&email=${email}&id=enlist" width="1" height="1" style="display:none;" />
                </div>
            `,
        });

        return error ? { success: false, error } : { success: true, data };
    } catch (error) {
        return { success: false, error };
    }
}
