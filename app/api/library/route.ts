import { NextResponse } from 'next/server';
import { EXERCISE_LIBRARY } from '@/data/libraryData';

export const dynamic = 'force-dynamic'; // Prevent caching so we get hot-reloading

export async function GET() {
    try {
        // We have migrated to Supabase Storage mapping.
        // We can safely assume they are available if they are in the library data.
        const liveExercises = EXERCISE_LIBRARY.map((ex) => ({
            ...ex,
            isAvailable: true, // Always allow play, VideoPlayer fetches from Supabase
            imagePlaceholder: `/images/${ex.id}-placeholder.jpg`
        }));

        return NextResponse.json(liveExercises);
    } catch (error) {
        console.error('Library API Error:', error);
        return NextResponse.json({ error: 'Failed to load library data' }, { status: 500 });
    }
}
