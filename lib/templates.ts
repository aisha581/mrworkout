export const EMAIL_TEMPLATES = {
    DIAGNOSIS_HOOK: {
        subject: "The Diagnosis: Free 3D Analysis Tool for Your Community",
        html: (name: string, topic: string) => `
            <div style="font-family: sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #00ffff;">
                <h2 style="color: #00ffff; text-transform: uppercase; font-style: italic;">The Diagnosis Hook</h2>
                <p>Coach ${name},</p>
                <p>We've been watching your content on <strong>${topic}</strong>. Your audience clearly values precision.</p>
                <p>We're launching a <strong>Free 3D Biomechanics Analysis Tool</strong> and we want your followers to be the first to test the Alpha version. No catch—just elite data for your community.</p>
                <div style="background: rgba(0, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p style="margin: 0; font-weight: bold; color: #00ffff;">THE OFFER:</p>
                    <p style="margin: 5px 0;">Exclusive access link for your biomechanics-focused athletes.</p>
                </div>
                <p>Are you open to a quick partner-status briefing?</p>
                <p>Stay Savage,<br/><strong>MR. WORKOUT</strong></p>
            </div>
        `
    },
    PROBLEM_SOLVER: {
        subject: "FIXED: The specific movement issue you mentioned",
        html: (name: string, painPoint: string) => `
            <div style="font-family: sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #39ff14;">
                <h2 style="color: #39ff14; text-transform: uppercase; font-style: italic;">The Problem Solver</h2>
                <p>Athlete ${name},</p>
                <p>Saw your post about <strong>${painPoint}</strong>. Most "coaches" give you a stretch, but usually, it's a 3D stability failure in the chain.</p>
                <p>I built a protocol specifically for this. It's not public yet, but I'm opening the Clinic for a few people from the thread.</p>
                <p>Check the protocol here:</p>
                <center>
                    <a href="https://www.mrworkout.pro/welcome" style="display: inline-block; background: #39ff14; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 900; text-transform: uppercase; margin: 20px 0;">Access Protocol</a>
                </center>
                <p>Stay Savage,<br/><strong>MR. WORKOUT</strong></p>
            </div>
        `
    },
    GROWTH_PARTNER: {
        subject: "Strategic Partnership: 3D Movement Analytics",
        html: (name: string, company: string) => `
            <div style="font-family: sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #ffffff;">
                <h2 style="color: #ffffff; text-transform: uppercase; font-style: italic;">The Growth Partner</h2>
                <p>Hello ${name},</p>
                <p>I'm reaching out from Mr. Workout. We've developed a proprietary 3D analytics engine for high-performance athletes.</p>
                <p>Given your position at <strong>${company}</strong>, I believe there's a significant overlap in our mission to optimize human movement.</p>
                <p>I'd like to share our Q3 growth roadmap and discuss a potential integration.</p>
                <p>Best regards,<br/><strong>MR. WORKOUT</strong></p>
            </div>
        `
    }
};
