// ─────────────────────────────────────────────────────────────────────────────
//  referral.ts — unique referral code + URL for each user
// ─────────────────────────────────────────────────────────────────────────────

const REFERRAL_KEY = 'mw_referral_code';
const BASE_URL     = 'https://mrworkout.pro/join';

function generate(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export function getReferralCode(): string {
    if (typeof window === 'undefined') return 'SAVAGE01';
    try {
        const stored = localStorage.getItem(REFERRAL_KEY);
        if (stored) return stored;
        const code = generate();
        localStorage.setItem(REFERRAL_KEY, code);
        return code;
    } catch {
        return 'SAVAGE01';
    }
}

export function getReferralUrl(code: string): string {
    return `${BASE_URL}?ref=${code}`;
}
