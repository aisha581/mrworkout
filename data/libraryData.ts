export interface Exercise {
    id: string;
    name: string;
    category: 'Chest' | 'Back' | 'Legs' | 'Arms' | 'Core';
    targetMuscle: string;
    savageTip: string;
    imagePlaceholder: string;
    videoUrl?: string;
}

export const EXERCISE_LIBRARY: Exercise[] = [
    // --- CHEST ---
    {
        id: 'pushup',
        name: 'Pushups',
        category: 'Chest',
        targetMuscle: 'Pectorals, Triceps, Anterior Delts',
        savageTip: 'Break parallel. If your chest doesn\'t touch the floor, it doesn\'t count.',
        imagePlaceholder: '/images/bench-placeholder.jpg',
        videoUrl: '/videos/exercises/pushup.mp4'
    },
    {
        id: 'bench_press',
        name: 'Bench Press',
        category: 'Chest',
        targetMuscle: 'Pectorals, Triceps, Anterior Delts',
        savageTip: 'Plant your feet, arch your back slightly, explode up.',
        imagePlaceholder: '/images/bench-placeholder.jpg',
        videoUrl: '/videos/exercises/bench_press.mp4'
    },
    {
        id: 'incline_dumbbell_press',
        name: 'Incline DB Press',
        category: 'Chest',
        targetMuscle: 'Upper Pectorals, Anterior Delts',
        savageTip: 'Get a deep stretch at the bottom. Don\'t lock out at the top.',
        imagePlaceholder: '/images/incline-db-placeholder.jpg',
        videoUrl: '/videos/exercises/incline_dumbbell_press.mp4'
    },

    // --- BACK ---
    {
        id: 'deadlift',
        name: 'Deadlift',
        category: 'Back',
        targetMuscle: 'Lower Back, Glutes, Hamstrings',
        savageTip: 'Keep the bar close to your shins. Drive through the floor.',
        imagePlaceholder: '/images/deadlift-placeholder.jpg',
        videoUrl: '/videos/exercises/deadlift.mp4'
    },
    {
        id: 'lat_pulldown',
        name: 'Lat Pulldown',
        category: 'Back',
        targetMuscle: 'Latissimus Dorsi',
        savageTip: 'Pull with your elbows, not your hands. Squeeze at the bottom.',
        imagePlaceholder: '/images/pulldown-placeholder.jpg',
        videoUrl: '/videos/exercises/lat_pulldown.mp4'
    },

    // --- LEGS ---
    {
        id: 'lunge',
        name: 'Lunges',
        category: 'Legs',
        targetMuscle: 'Quads, Glutes, Hamstrings',
        savageTip: 'Kiss the floor with your back knee. Keep your torso upright.',
        imagePlaceholder: '/images/legpress-placeholder.jpg',
        videoUrl: '/videos/exercises/lunge.mp4'
    },
    {
        id: 'squat',
        name: 'Squats',
        category: 'Legs',
        targetMuscle: 'Quads, Glutes, Hamstrings',
        savageTip: 'Drop low. If it doesn\'t burn, you\'re just stretching.',
        imagePlaceholder: '/images/squat-placeholder.jpg',
        videoUrl: '/videos/exercises/squat.mp4'
    },
    {
        id: 'leg_press',
        name: 'Leg Press',
        category: 'Legs',
        targetMuscle: 'Quads, Glutes',
        savageTip: 'Don\'t bounce at the bottom. Control the weight.',
        imagePlaceholder: '/images/legpress-placeholder.jpg',
        videoUrl: '/videos/exercises/leg_press.mp4'
    },

    // --- ARMS ---
    {
        id: 'barbell_curl',
        name: 'Barbell Curls',
        category: 'Arms',
        targetMuscle: 'Biceps Brachii',
        savageTip: 'No swinging. Control the eccentric phase for maximum tear.',
        imagePlaceholder: '/images/curl-placeholder.jpg',
        videoUrl: '/videos/exercises/barbell_curl.mp4'
    },
    {
        id: 'tricep_pushdown',
        name: 'Tricep Pushdowns',
        category: 'Arms',
        targetMuscle: 'Triceps Brachii',
        savageTip: 'Keep elbows locked to your sides. Squeeze at extension.',
        imagePlaceholder: '/images/pushdown-placeholder.jpg',
        videoUrl: '/videos/exercises/tricep_pushdown.mp4'
    },

    // --- CORE ---
    {
        id: 'cable_crunch',
        name: 'Cable Crunches',
        category: 'Core',
        targetMuscle: 'Rectus Abdominis',
        savageTip: 'Round your back, don\'t just hinge at the hips.',
        imagePlaceholder: '/images/cable-crunch-placeholder.jpg',
        videoUrl: '/videos/exercises/cable_crunch.mp4'
    },
    {
        id: 'hanging_leg_raise',
        name: 'Hanging Leg Raises',
        category: 'Core',
        targetMuscle: 'Lower Abs, Hip Flexors',
        savageTip: 'Control the swing. Lift with your abs, not momentum.',
        imagePlaceholder: '/images/leg-raise-placeholder.jpg',
        videoUrl: '/videos/exercises/hanging_leg_raise.mp4'
    }
];
