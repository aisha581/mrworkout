export interface WorkoutLog {
    id: string;
    title: string;
    sets: number;
    reps?: number;
    weight?: number;
    duration?: string;
    date: string;
    timestamp: number;
    isPR?: boolean;
}

export interface ParsedIntent {
    isValid: boolean;
    sets?: number;
    reps?: number;
    weight?: number;
    exercise?: string;
    exerciseType?: string; // Normalized exercise name for animation mapping
}

// Exercise name mapping for animations
const EXERCISE_MAP: Record<string, string> = {
    'bench': 'bench_press',
    'bench press': 'bench_press',
    'press': 'bench_press',
    'squat': 'squat',
    'squats': 'squat',
    'deadlift': 'deadlift',
    'deadlifts': 'deadlift',
    'curl': 'curl',
    'curls': 'curl',
    'bicep': 'curl',
    'row': 'row',
    'rows': 'row',
    'pull': 'pull_up',
    'pullup': 'pull_up',
    'pull up': 'pull_up',
    'chin': 'pull_up',
    'shoulder': 'shoulder_press',
    'shoulders': 'shoulder_press',
    'overhead': 'shoulder_press',
    'military': 'shoulder_press',
    'leg': 'squat',
    'legs': 'squat',
    'chest': 'bench_press',
    'push': 'push_up',
    'pushup': 'push_up',
    'push up': 'push_up',
};

export function parseWorkoutIntent(transcript: string): ParsedIntent {
    const lowerTranscript = transcript.toLowerCase();
    console.log('🔍 PARSING TRANSCRIPT:', transcript);

    // Check if it's a workout log command (fuzzy match)
    const hasLogKeyword = lowerTranscript.includes('log');
    console.log('   Has "log" keyword:', hasLogKeyword);

    if (!hasLogKeyword) {
        console.log('❌ No "log" keyword found - not a valid workout command');
        return { isValid: false };
    }

    const intent: ParsedIntent = { isValid: true };

    // Parse sets (e.g., "3 sets", "5 set")
    const setsMatch = lowerTranscript.match(/(\d+)\s*sets?/);
    if (setsMatch) {
        intent.sets = parseInt(setsMatch[1]);
        console.log('   ✅ Sets:', intent.sets);
    }

    // Parse reps (e.g., "10 reps", "of 12", "times 8")
    const repsMatch = lowerTranscript.match(/(?:of|times?|reps?)\s*(\d+)|(\d+)\s*reps?/);
    if (repsMatch) {
        intent.reps = parseInt(repsMatch[1] || repsMatch[2]);
        console.log('   ✅ Reps:', intent.reps);
    }

    // Parse weight (e.g., "100kg", "50 pounds", "at 75")
    const weightMatch = lowerTranscript.match(/(?:at|@|weight)\s*(\d+)\s*(?:kg|kilos?|pounds?|lbs?)?|(\d+)\s*(?:kg|kilos?|pounds?|lbs)/);
    if (weightMatch) {
        intent.weight = parseInt(weightMatch[1] || weightMatch[2]);
        console.log('   ✅ Weight:', intent.weight, 'kg');
    }

    // FUZZY MATCHING for exercise names
    console.log('   🔎 Checking for exercise keywords...');
    for (const [keyword, exerciseType] of Object.entries(EXERCISE_MAP)) {
        if (lowerTranscript.includes(keyword)) {
            intent.exerciseType = exerciseType;
            intent.exercise = keyword;
            console.log(`   ✅ EXERCISE MATCHED: "${keyword}" → ${exerciseType}`);
            break;
        }
    }

    if (!intent.exerciseType) {
        console.log('   ⚠️ No specific exercise detected, using generic workout');
        intent.exercise = 'workout';
    }

    console.log('📦 FINAL PARSED INTENT:', intent);
    return intent;
}

export function createWorkoutLog(intent: ParsedIntent): WorkoutLog {
    const now = new Date();
    const title = intent.exercise
        ? intent.exercise.charAt(0).toUpperCase() + intent.exercise.slice(1)
        : 'Quick Workout';

    return {
        id: `workout-${Date.now()}`,
        title,
        sets: intent.sets || 1,
        reps: intent.reps,
        weight: intent.weight,
        duration: intent.sets ? `${intent.sets * 2} min` : '5 min',
        date: 'Just now',
        timestamp: now.getTime(),
    };
}

export function formatWorkoutSummary(intent: ParsedIntent): string {
    const parts: string[] = [];

    if (intent.sets) parts.push(`${intent.sets}x${intent.reps || '?'}`);
    if (intent.weight) parts.push(`@ ${intent.weight}kg`);
    if (intent.exercise) parts.push(`- ${intent.exercise}`);

    return parts.length > 0 ? parts.join(' ') : 'Workout logged!';
}
