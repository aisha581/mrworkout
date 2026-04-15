import type { LiveExercise } from '@/app/library/page';

// ── Types ─────────────────────────────────────────────────────────────────────
export type Goal      = 'MASS' | 'SHRED' | 'POWER';
export type FocusArea = 'UPPER' | 'LOWER' | 'FULL';

export interface UserProfile {
    goal:      Goal;
    focusArea: FocusArea;
}

// ── localStorage helpers ──────────────────────────────────────────────────────
const PROFILE_KEY = 'mw_profile';

export function saveProfile(profile: UserProfile): void {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
}

export function loadProfile(): UserProfile | null {
    try {
        const raw = localStorage.getItem(PROFILE_KEY);
        return raw ? (JSON.parse(raw) as UserProfile) : null;
    } catch { return null; }
}

// ── Goal → category priority lists ───────────────────────────────────────────
// Each goal gets categories ordered by relevance.
// We fill 5 slots by walking the list, taking up to 2 per category.
const GOAL_CATEGORIES: Record<Goal, string[]> = {
    MASS:  ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],   // hypertrophy push/pull
    SHRED: ['Legs', 'Core', 'Chest', 'Back', 'Shoulders'],   // metabolic full body
    POWER: ['Back', 'Legs', 'Core', 'Chest', 'Shoulders'],   // compound heavy
};

// Focus-area modifier: further filter categories after goal selection
const FOCUS_OVERRIDE: Record<FocusArea, string[] | null> = {
    UPPER: ['Chest', 'Back', 'Shoulders', 'Arms'],
    LOWER: ['Legs', 'Core'],
    FULL:  null, // no override — use goal list as-is
};

// ── Goal label helpers ────────────────────────────────────────────────────────
export const GOAL_LABELS: Record<Goal, string> = {
    MASS:  'BUILD MASS',
    SHRED: 'SHRED',
    POWER: 'BUILD POWER',
};

export const GOAL_MESSAGES: Record<Goal, string> = {
    MASS:  'Time to build. These 5 moves target maximum hypertrophy.',
    SHRED: 'Full-body metabolic assault. Burn everything.',
    POWER: 'Compound strength work. Lift heavy or go home.',
};

// ── Core generator ────────────────────────────────────────────────────────────
export function generateDailyMission(
    profile: UserProfile,
    exercises: LiveExercise[],
): LiveExercise[] {
    const focusCats  = FOCUS_OVERRIDE[profile.focusArea];
    let categories   = GOAL_CATEGORIES[profile.goal];

    // If focus area restricts categories, intersect with goal list
    if (focusCats) {
        const restricted = categories.filter(c => focusCats.includes(c));
        if (restricted.length > 0) categories = restricted;
    }

    // Seed today's date so the mission changes daily but is deterministic
    const today  = new Date();
    const seed   = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const shuffle = <T>(arr: T[]): T[] => {
        const a = [...arr];
        let s = seed;
        for (let i = a.length - 1; i > 0; i--) {
            s = (s * 1664525 + 1013904223) & 0xffffffff;
            const j = Math.abs(s) % (i + 1);
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    };

    const result: LiveExercise[] = [];
    const usedIds = new Set<string>();

    for (const cat of categories) {
        if (result.length >= 5) break;
        const pool = shuffle(
            exercises.filter(ex => ex.category === cat && ex.videoUrl && !usedIds.has(ex.id))
        );
        const take = Math.min(2, 5 - result.length);
        pool.slice(0, take).forEach(ex => { result.push(ex); usedIds.add(ex.id); });
    }

    return result.slice(0, 5);
}
