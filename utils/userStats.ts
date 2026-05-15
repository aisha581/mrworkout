// ─────────────────────────────────────────────────────────────────────────────
//  userStats.ts — persistent XP + streak tracking via localStorage
// ─────────────────────────────────────────────────────────────────────────────

const STATS_KEY     = 'mw_user_stats';
const XP_PER_WORKOUT = 100;
export const XP_PER_SET = 10;

export interface UserStats {
    totalWorkouts: number;
    totalXP: number;
    currentStreak: number;
    lastWorkoutDate: string | null;       // ISO date string YYYY-MM-DD
    lastWorkoutTimestamp: number | null;  // unix ms — for precise CNS decay
}

export interface RankInfo {
    level: number;
    levelName: string;
    minXP: number;
    maxXP: number | null;    // null = top tier
    progress: number;        // 0-100 % toward next level
    xpToNext: number | null; // null = max level
}

// ── Rank tiers ────────────────────────────────────────────────────────────────
const RANKS: { level: number; name: string; minXP: number }[] = [
    { level: 1, name: 'Iron',     minXP: 0    },
    { level: 2, name: 'Bronze',   minXP: 500  },
    { level: 3, name: 'Silver',   minXP: 1000 },
    { level: 4, name: 'Gold',     minXP: 2000 },
    { level: 5, name: 'Platinum', minXP: 3500 },
    { level: 6, name: 'Diamond',  minXP: 6000 },
];

export function getRankInfo(xp: number): RankInfo {
    let currentRank = RANKS[0];
    for (const rank of RANKS) {
        if (xp >= rank.minXP) currentRank = rank;
        else break;
    }

    const rankIndex = RANKS.indexOf(currentRank);
    const nextRank  = RANKS[rankIndex + 1] ?? null;

    const progress = nextRank
        ? Math.min(100, Math.round(((xp - currentRank.minXP) / (nextRank.minXP - currentRank.minXP)) * 100))
        : 100;

    const xpToNext = nextRank ? nextRank.minXP - xp : null;

    return {
        level:     currentRank.level,
        levelName: currentRank.name,
        minXP:     currentRank.minXP,
        maxXP:     nextRank ? nextRank.minXP : null,
        progress,
        xpToNext,
    };
}

// ── Read / write helpers ───────────────────────────────────────────────────────
function todayISO(): string {
    return new Date().toISOString().split('T')[0];
}

const EMPTY_STATS: UserStats = { totalWorkouts: 0, totalXP: 0, currentStreak: 0, lastWorkoutDate: null, lastWorkoutTimestamp: null };

export function getUserStats(): UserStats {
    if (typeof window === 'undefined') return EMPTY_STATS;
    try {
        const raw = localStorage.getItem(STATS_KEY);
        if (!raw) return EMPTY_STATS;
        const parsed = JSON.parse(raw) as UserStats;
        // Backfill field for old data
        if (parsed.lastWorkoutTimestamp === undefined) parsed.lastWorkoutTimestamp = null;
        return parsed;
    } catch {
        return EMPTY_STATS;
    }
}

/**
 * Returns a CNS recovery score 0–100.
 * - 100: no recent workout (fully recovered)
 * - 20: just finished a savage session
 * - Linear recovery over 24 hours
 */
export function computeCNSScore(stats: UserStats): number {
    if (!stats.lastWorkoutTimestamp) return 100;
    const hoursAgo = (Date.now() - stats.lastWorkoutTimestamp) / 3_600_000;
    if (hoursAgo >= 24) return 100;
    return Math.round(20 + (hoursAgo / 24) * 80);
}

/** Human-readable recovery window, e.g. "18h until 100%" */
export function getRecoveryWindow(stats: UserStats): string {
    if (!stats.lastWorkoutTimestamp) return "Fully Recovered";
    const hoursAgo = (Date.now() - stats.lastWorkoutTimestamp) / 3_600_000;
    if (hoursAgo >= 24) return "Fully Recovered";
    const remaining = Math.ceil(24 - hoursAgo);
    return `${remaining}h until 100%`;
}

/**
 * recordDailyVisit — call on every app open.
 * Increments streak if the user visited yesterday, resets if they missed a day.
 * No-ops if they already have an activity logged today.
 */
export function recordDailyVisit(): UserStats {
    if (typeof window === 'undefined') return getUserStats();
    const stats = getUserStats();
    const today = todayISO();

    // Already recorded activity today — nothing to change
    if (stats.lastWorkoutDate === today) return stats;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split('T')[0];

    const newStreak = stats.lastWorkoutDate === yesterdayISO
        ? stats.currentStreak + 1
        : 1;

    const updated: UserStats = {
        ...stats,
        currentStreak:        newStreak,
        lastWorkoutDate:      today,
        lastWorkoutTimestamp: stats.lastWorkoutTimestamp ?? null,
    };

    try { localStorage.setItem(STATS_KEY, JSON.stringify(updated)); } catch {}
    return updated;
}

/**
 * Returns the effective streak — 0 if the user hasn't logged a set in 48 h.
 * Non-destructive: does not write to storage.
 */
export function getEffectiveStreak(stats: UserStats): number {
    if (!stats.lastWorkoutTimestamp) return stats.currentStreak;
    const hoursAgo = (Date.now() - stats.lastWorkoutTimestamp) / 3_600_000;
    return hoursAgo > 48 ? 0 : stats.currentStreak;
}

/** Award XP for a single completed set without incrementing totalWorkouts. */
export function addSetXP(): UserStats {
    if (typeof window === 'undefined') return getUserStats();
    const stats = getUserStats();
    const updated: UserStats = { ...stats, totalXP: stats.totalXP + XP_PER_SET };
    try { localStorage.setItem(STATS_KEY, JSON.stringify(updated)); } catch {}
    return updated;
}

export function incrementWorkoutStats(xpGained = XP_PER_WORKOUT): UserStats {
    if (typeof window === 'undefined') return EMPTY_STATS;
    const stats  = getUserStats();
    const today  = todayISO();
    const last   = stats.lastWorkoutDate;

    // Streak logic: +1 if last workout was yesterday or today, else reset to 1
    let newStreak = stats.currentStreak;
    if (!last) {
        newStreak = 1;
    } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayISO = yesterday.toISOString().split('T')[0];

        if (last === today) {
            // Already worked out today — don't double-count streak
            newStreak = stats.currentStreak;
        } else if (last === yesterdayISO) {
            newStreak = stats.currentStreak + 1;
        } else {
            newStreak = 1; // streak broken
        }
    }

    const updated: UserStats = {
        totalWorkouts:        stats.totalWorkouts + 1,
        totalXP:              stats.totalXP + xpGained,
        currentStreak:        newStreak,
        lastWorkoutDate:      today,
        lastWorkoutTimestamp: Date.now(),
    };

    try { localStorage.setItem(STATS_KEY, JSON.stringify(updated)); } catch {}
    return updated;
}
