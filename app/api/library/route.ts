import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic'; // Prevent caching so we get hot-reloading

export async function GET() {
    try {
        // Read Library.json metadata
        const libraryPath = path.join(process.cwd(), 'public', 'Library.json');
        let exercises = [];
        if (fs.existsSync(libraryPath)) {
            const libraryFile = fs.readFileSync(libraryPath, 'utf8');
            exercises = JSON.parse(libraryFile).exercises;
        }

        // Scan actual directories
        const videosDir = path.join(process.cwd(), 'public', 'videos', 'exercises');
        const audioDir = path.join(process.cwd(), 'public', 'audio', 'coaching');

        const availableVideos = fs.existsSync(videosDir) ? fs.readdirSync(videosDir) : [];
        const availableAudio = fs.existsSync(audioDir) ? fs.readdirSync(audioDir) : [];

        // Stitch the actual runtime status into the response
        const liveExercises = exercises.map((ex: any) => {
            const hasVideo = availableVideos.includes(`${ex.id}.mp4`);
            const hasAudio = availableAudio.includes(`${ex.id}.mp3`);

            return {
                ...ex,
                videoUrl: hasVideo ? `/videos/exercises/${ex.id}.mp4` : null,
                audioUrl: hasAudio ? `/audio/coaching/${ex.id}.mp3` : null,
                isAvailable: hasVideo, // If there's a video, the exercise is fully "playable"
                imagePlaceholder: `/images/${ex.id}-placeholder.jpg` // Fallback
            };
        });

        return NextResponse.json(liveExercises);
    } catch (error) {
        console.error('Library API Error:', error);
        return NextResponse.json({ error: 'Failed to load library data' }, { status: 500 });
    }
}
