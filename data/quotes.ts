export const SAVAGE_REST_QUOTES: string[] = [
    "Rest is a weapon. Load it.",
    "The body recovers. The mind sharpens. Use this moment.",
    "Champions aren't built in the set. They're built in the rest.",
    "Pain asked you to quit. You said next rep.",
    "Every second of recovery is a second of adaptation.",
    "Your future body is being forged right now.",
    "Weakness leaves the body through sweat.",
    "The only bad workout is the one you skipped.",
    "You don't get the body in the gym. You get it in the recovery.",
    "Hard work beats talent when talent doesn't work hard.",
    "The mind gives up before the body. Remind it who's in charge.",
    "Suffering now. Flexing later.",
    "Every rep you didn't skip is a debt your opponent owes you.",
    "The grind doesn't care how you feel.",
    "Average people rest when they're tired. Champions rest before they need to.",
    "This is where most people stop. This is where you begin.",
    "Your competition is resting. Rest smarter.",
    "Comfort is the enemy of growth.",
    "The clock doesn't negotiate. Neither do you.",
    "One more set separates you from the version you're trying to become.",
    "You came here to change something. Don't waste the rest.",
    "Breathe. Reset. Destroy the next set.",
    "The iron never lies. Neither does the mirror.",
    "Fatigue is temporary. The result is permanent.",
    "What you do in the rest defines who you are in the work.",
];

export function getRandomSavageQuote(): string {
    return SAVAGE_REST_QUOTES[Math.floor(Math.random() * SAVAGE_REST_QUOTES.length)];
}
