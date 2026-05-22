// ─────────────────────────────────────────────────────────────────────────────
//  prTracker.ts — all-time PR storage and detection via localStorage
// ─────────────────────────────────────────────────────────────────────────────

const PR_KEY = 'mw_exercise_prs';

export interface ExercisePR {
    weight: number;
    reps:   number;
    date:   string; // YYYY-MM-DD
}

type PRStore = Record<string, ExercisePR>;

export interface PRCheckResult {
    isNewPR:      boolean;
    previousBest: ExercisePR | null;
    newBest:      ExercisePR;
}

function normalize(name: string): string {
    return name.toLowerCase().trim();
}

function loadStore(): PRStore {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(PR_KEY);
        return raw ? (JSON.parse(raw) as PRStore) : {};
    } catch { return {}; }
}

function saveStore(store: PRStore): void {
    try { localStorage.setItem(PR_KEY, JSON.stringify(store)); } catch {}
}

/**
 * Compare logged weight/reps against the all-time best for this exercise.
 * Persists the new record if it beats the old one.
 * Returns whether it was a new PR and what the previous best was.
 */
export function checkAndUpdatePR(
    exerciseName: string,
    weight: number,
    reps: number,
): PRCheckResult {
    const key   = normalize(exerciseName);
    const store = loadStore();
    const prev  = store[key] ?? null;

    // A new PR if: no previous record, heavier weight, or same weight with more reps
    const isNewPR =
        !prev ||
        weight > prev.weight ||
        (weight === prev.weight && reps > prev.reps);

    const newBest: ExercisePR = {
        weight,
        reps,
        date: new Date().toISOString().split('T')[0],
    };

    if (isNewPR) {
        store[key] = newBest;
        saveStore(store);

        // Broadcast so any component can react (PRCelebrationModal, notifications)
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('mw:new-pr', {
                    detail: { exerciseName, weight, reps, previousBest: prev },
                }),
            );
        }
    }

    return { isNewPR, previousBest: prev, newBest: isNewPR ? newBest : prev! };
}

export function getExercisePR(exerciseName: string): ExercisePR | null {
    const store = loadStore();
    return store[normalize(exerciseName)] ?? null;
}
