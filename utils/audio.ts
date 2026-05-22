/**
 * audio.ts — lightweight audio utilities for Mr. Workout
 *
 * Usage:
 *   playAudio("/audio/daily-brief.mp3")
 *   playBriefing()  — calls /api/coach/brief, streams ElevenLabs TTS
 */

let activeAudio: HTMLAudioElement | null = null;

/** Stop any currently playing audio. */
export function stopAudio() {
    if (activeAudio) {
        activeAudio.pause();
        activeAudio.src = "";
        activeAudio     = null;
    }
}

/**
 * Play an audio file from /public/audio/.
 * Returns a promise that resolves when playback ends (or rejects on error).
 */
export function playAudio(src: string): Promise<void> {
    stopAudio();
    return new Promise((resolve, reject) => {
        const audio  = new Audio(src);
        activeAudio  = audio;
        audio.onended  = () => { activeAudio = null; resolve(); };
        audio.onerror  = () => { activeAudio = null; reject(new Error(`Audio load failed: ${src}`)); };
        audio.play().catch(reject);
    });
}

/**
 * Fetch today's personalized briefing from /api/coach/brief.
 * If ElevenLabs is configured → plays TTS audio.
 * Otherwise → returns the text for display.
 */
export async function playBriefing(): Promise<{ text?: string; playing: boolean }> {
    stopAudio();

    try {
        const res = await fetch("/api/coach/brief");

        // JSON fallback (no TTS configured)
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
            const { text } = await res.json();
            return { text, playing: false };
        }

        // Audio stream
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const text = decodeURIComponent(res.headers.get("x-brief-text") ?? "");

        await new Promise<void>((resolve, reject) => {
            const audio  = new Audio(url);
            activeAudio  = audio;
            audio.onended  = () => { URL.revokeObjectURL(url); activeAudio = null; resolve(); };
            audio.onerror  = () => { URL.revokeObjectURL(url); activeAudio = null; reject(); };
            audio.play().catch(reject);
        });

        return { text, playing: true };
    } catch {
        return { playing: false };
    }
}
