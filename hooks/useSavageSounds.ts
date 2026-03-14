"use client";

import { useCallback, useRef } from 'react';

export function useSavageSounds() {
    const audioContextRef = useRef<AudioContext | null>(null);

    const initAudio = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }, []);

    const playThud = useCallback(() => {
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }, [initAudio]);

    const playPing = useCallback(() => {
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.5);
    }, [initAudio]);

    const playEntryClang = useCallback(() => {
        initAudio();
        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Low thud layer
        const thudOsc = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thudOsc.type = 'sine';
        thudOsc.frequency.setValueAtTime(100, ctx.currentTime);
        thudOsc.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);
        thudGain.gain.setValueAtTime(1, ctx.currentTime);
        thudGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
        thudOsc.connect(thudGain);
        thudGain.connect(ctx.destination);

        // High metallic layer
        const clangOsc = ctx.createOscillator();
        const clangGain = ctx.createGain();
        clangOsc.type = 'sawtooth';
        clangOsc.frequency.setValueAtTime(800, ctx.currentTime);
        clangOsc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
        clangGain.gain.setValueAtTime(0.2, ctx.currentTime);
        clangGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        clangOsc.connect(clangGain);
        clangGain.connect(ctx.destination);

        thudOsc.start();
        clangOsc.start();
        thudOsc.stop(ctx.currentTime + 0.8);
        clangOsc.stop(ctx.currentTime + 0.4);
    }, [initAudio]);

    return { playThud, playPing, playEntryClang };
}
