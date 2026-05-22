// ─────────────────────────────────────────────────────────────────────────────
//  workoutSession.ts — persist in-progress workout to localStorage
//  Lets users pick up exactly where they left off after closing the app.
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = 'mw_workout_session';
const MAX_AGE_MS  = 2 * 60 * 60 * 1000; // discard sessions older than 2 h

export interface WorkoutSession {
    playlist:    any[];        // LiveExercise[] serialised
    activeIndex: number;
    currentSet:  number;
    isResting:   boolean;
    restTimer:   number | null;
    savedAt:     number;       // unix ms
}

export function saveWorkoutSession(
    data: Omit<WorkoutSession, 'savedAt'>,
): void {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
    } catch {}
}

export function loadWorkoutSession(): WorkoutSession | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw) as WorkoutSession;
        if (Date.now() - s.savedAt > MAX_AGE_MS) { clearWorkoutSession(); return null; }
        return s;
    } catch { return null; }
}

export function clearWorkoutSession(): void {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
}
