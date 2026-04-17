"use client";

import { useEffect, useRef } from "react";

/**
 * AudioManager — listens for global audio events and plays sounds.
 *
 * Dispatch from anywhere:
 *   window.dispatchEvent(new CustomEvent("mw:blip"))
 *   window.dispatchEvent(new CustomEvent("mw:mission-start"))
 */

// ── Web Audio blip ─────────────────────────────────────────────────────────────
function playBlip(
    freq  = 880,
    gain  = 0.07,
    decay = 0.06
) {
    try {
        const ctx  = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const amp  = ctx.createGain();
        osc.connect(amp);
        amp.connect(ctx.destination);
        osc.type      = "sine";
        osc.frequency.value = freq;
        amp.gain.setValueAtTime(gain, ctx.currentTime);
        amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + decay);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + decay);
        osc.onended = () => ctx.close();
    } catch {}
}

// ── Mission Initialized voice ─────────────────────────────────────────────────
let missionAudioCache: string | null = null; // object URL cached after first load

async function playMissionInitialized() {
    // Try ElevenLabs TTS first
    try {
        if (!missionAudioCache) {
            const res = await fetch("/api/tts", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ text: "Mission initialized. Let's get savage." }),
            });
            if (!res.ok) throw new Error("tts failed");
            const blob = await res.blob();
            missionAudioCache = URL.createObjectURL(blob);
        }
        const audio = new Audio(missionAudioCache);
        await audio.play();
        return;
    } catch {}

    // Fallback: synthetic two-tone blip sequence
    playBlip(660, 0.12, 0.08);
    setTimeout(() => playBlip(880, 0.12, 0.10), 120);
    setTimeout(() => playBlip(1100, 0.10, 0.15), 260);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AudioManager() {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        const onBlip = () => playBlip(800, 0.06, 0.05);
        const onMissionStart = () => { playMissionInitialized(); };

        window.addEventListener("mw:blip",          onBlip);
        window.addEventListener("mw:mission-start", onMissionStart);

        return () => {
            window.removeEventListener("mw:blip",          onBlip);
            window.removeEventListener("mw:mission-start", onMissionStart);
        };
    }, []);

    return null; // renders nothing
}

// ── Exported helpers (call from anywhere) ─────────────────────────────────────
export const dispatchBlip         = () => window.dispatchEvent(new CustomEvent("mw:blip"));
export const dispatchMissionStart = () => window.dispatchEvent(new CustomEvent("mw:mission-start"));
