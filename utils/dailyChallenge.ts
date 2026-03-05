export interface DailyChallenge {
    id: string;
    exerciseId: string;
    targetReps: number;
    goalType: string;
    quote: string;
    averageReps: number;
}

const QUOTES = [
    "The only easy day was yesterday.",
    "Pain is weakness leaving the body.",
    "Don't stop when you're tired, stop when you're done.",
    "No excuses. Just results.",
    "Obsession beats talent every time.",
    "Suffer the pain of discipline or the pain of regret.",
    "Your mind is the primary weapon."
];

const SAVAGE_AVERAGES: Record<string, number> = {
    "pushup": 45,
    "squat": 60,
    "lunge": 40,
    "burpee": 25,
    "pullup": 12
};

export function getDailyChallenge(libraryExercises: any[]): DailyChallenge {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    // Simple deterministic seed from date
    let seed = 0;
    for (let i = 0; i < dateString.length; i++) {
        seed += dateString.charCodeAt(i);
    }

    const availableIds = ['pushup', 'squat', 'lunge']; // Core exercises for challenge
    const exerciseId = availableIds[seed % availableIds.length];

    return {
        id: dateString,
        exerciseId,
        targetReps: 0, // AMRAP
        goalType: "AMRAP (60s)",
        quote: QUOTES[seed % QUOTES.length],
        averageReps: SAVAGE_AVERAGES[exerciseId] || 30
    };
}

export function getTimeUntilNextChallenge() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const diff = tomorrow.getTime() - now.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
