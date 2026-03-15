import { Resend } from 'resend';

// Initialize Resend with API key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY);

export default resend;

/**
 * Sends a "Savage" welcome email to newly enrolled athletes.
 */
export async function sendWelcomeEmail(email: string) {
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
