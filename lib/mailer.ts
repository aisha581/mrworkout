import nodemailer from 'nodemailer';

interface MailOptions {
    to: string;
    subject: string;
    html: string;
    from?: string;
}

export class UnifiedMailer {
    private static async sendViaBrevo(options: MailOptions) {
        const apiKey = process.env.BREVO_API_KEY;
        if (!apiKey) throw new Error('BREVO_API_KEY missing');

            const payload = {
                sender: { name: 'Coach', email: 'coach@mrworkout.pro' },
                to: [{ email: options.to }],
                subject: options.subject,
                htmlContent: options.html,
            };

            const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': apiKey as string,
                    'Content-Type': 'application/json',
                } as any,
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();
            const logStatus = response.status === 201 ? 'SUCCESS (201)' : `REJECTED (${response.status})`;
            console.log(`[BREVO_DEBUG] ${logStatus}`, JSON.stringify(responseData));
            console.log(`[BREVO_DEBUG] Payload:`, JSON.stringify(payload));

            if (response.status !== 201 && !response.ok) {
                throw new Error(`Brevo API Error: ${JSON.stringify(responseData)}`);
            }

            return responseData;
    }

    private static async sendViaSMTP(options: MailOptions) {
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER || 'coach@mrworkout.pro',
                pass: process.env.SMTP_PASS,
            },
        });

        return await transporter.sendMail({
            from: '"Coach" <coach@mrworkout.pro>',
            to: options.to,
            subject: options.subject,
            html: options.html,
        });
    }

    private static async sendViaGoogleBackup(options: MailOptions) {
        const googleScriptUrl = process.env.GOOGLE_MAIL_SCRIPT_URL;
        if (!googleScriptUrl) throw new Error('GOOGLE_MAIL_SCRIPT_URL missing');

        const response = await fetch(googleScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options),
        });

        if (!response.ok) throw new Error('Google Mail Backup Pipe failed');
        return await response.json();
    }

    /**
     * Sends email using the rotation strategy:
     * 1. Brevo (Immediate, Signup priority)
     * 2. Hostinger SMTP (Outreach priority)
     * 3. Google Backup (Emergency)
     */
    static async send(options: MailOptions, priority: 'signup' | 'outreach' | 'backup' = 'signup') {
        console.log(`[MAILER] Dispatching ${priority} email to: ${options.to}`);

        const pipes = priority === 'signup' 
            ? [this.sendViaBrevo, this.sendViaSMTP] // REMOVED GOOGLE BACKUP FOR SIGNUPS
            : [this.sendViaSMTP, this.sendViaBrevo, this.sendViaGoogleBackup];

        let lastError: any = null;

        for (const pipe of pipes) {
            try {
                const result = await pipe.bind(this)(options);
                console.log(`[MAILER] Dispatch successful via ${pipe.name}`);
                return { success: true, result, pipe: pipe.name };
            } catch (err: any) {
                console.warn(`[MAILER] Pipe ${pipe.name} failed: ${err.message}`);
                lastError = err;
            }
        }

        console.error('[MAILER] All pipes failed. Last error:', lastError);
        return { success: false, error: lastError?.message || 'All pipes failed' };
    }
}
