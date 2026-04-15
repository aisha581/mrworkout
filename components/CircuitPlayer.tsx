"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSavageSounds } from '@/hooks/useSavageSounds';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CircuitHUD from './CircuitHUD';
import RecoveryScreen from './RecoveryScreen';

const SET_DURATION = 45; // seconds per set

export default function CircuitPlayer() {
    const {
        isCircuitActive,
        isComplete,
        clearComplete,
        stopCircuit,
        startRest,
        completeWorkout,
        queue,
        currentIndex,
        isResting,
        restTimeRemaining,
    } = useCircuit();

    const { playThud, playPing } = useSavageSounds();
    const router = useRouter();

    const containerRef  = useRef<HTMLDivElement>(null);
    const videoRef      = useRef<HTMLVideoElement>(null);
    const audioRef      = useRef<HTMLAudioElement>(null);
    const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const [timeLeft,   setTimeLeft]   = useState(SET_DURATION);
    const [isPlaying,  setIsPlaying]  = useState(true);

    const currentExercise = queue[currentIndex];
    const nextExercise    = queue[currentIndex + 1] ?? null;

    // ── Fullscreen on start ───────────────────────────────────────────────────
    useEffect(() => {
        if (isCircuitActive && containerRef.current?.requestFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {});
        }
    }, [isCircuitActive]);

    // ── Workout countdown timer ───────────────────────────────────────────────
    // Resets when exercise changes. When it hits 0, triggers rest.
    useEffect(() => {
        if (!isCircuitActive || isResting) return;
        setTimeLeft(SET_DURATION);

        timerInterval.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timerInterval.current!);
                    // Skip rest if this is the last exercise
                    if (queue[currentIndex + 1]) {
                        startRest();
                    } else {
                        completeWorkout();
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentIndex, isCircuitActive, isResting]);

    // ── Countdown SFX ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isResting && timeLeft <= 3 && timeLeft > 0) playThud();
    }, [timeLeft, isResting, playThud]);

    useEffect(() => {
        if (isResting && restTimeRemaining <= 3 && restTimeRemaining > 0) playThud();
        if (isResting && restTimeRemaining === 0) playPing();
    }, [restTimeRemaining, isResting, playThud, playPing]);

    // ── Video: play/pause on exercise change ─────────────────────────────────
    useEffect(() => {
        if (isCircuitActive && !isResting && videoRef.current) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
        }
    }, [isCircuitActive, isResting, currentIndex]);

    // ── Video: fallback loop guard (mobile Safari) ────────────────────────────
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const restart = () => { v.currentTime = 0; v.play().catch(() => {}); };
        v.addEventListener('ended', restart);
        return () => v.removeEventListener('ended', restart);
    }, [currentIndex, isCircuitActive]);

    // ── Exit handler ──────────────────────────────────────────────────────────
    const handleExit = () => {
        if (timerInterval.current) clearInterval(timerInterval.current);
        stopCircuit();
        router.push('/vault');
    };

    const handleReturnHome = () => {
        clearComplete();
        router.push('/');
    };

    // ── Toggle play/pause ─────────────────────────────────────────────────────
    const togglePlay = () => {
        const v = videoRef.current;
        if (!v) return;
        if (isPlaying) {
            v.pause();
            audioRef.current?.pause();
            if (timerInterval.current) clearInterval(timerInterval.current);
        } else {
            v.play().catch(() => {});
            audioRef.current?.play().catch(() => {});
            // Resume timer from remaining time
            timerInterval.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerInterval.current!);
                        if (queue[currentIndex + 1]) {
                            startRest();
                        } else {
                            completeWorkout();
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        setIsPlaying(!isPlaying);
    };

    if (!isCircuitActive && !isComplete) return null;

    // ── Workout Complete overlay ──────────────────────────────────────────────
    if (isComplete) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[500] bg-[#060606] flex flex-col items-center justify-center px-8 text-center"
            >
                {/* Glow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,229,204,0.12) 0%, transparent 70%)' }}
                />
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="relative z-10 flex flex-col items-center gap-6"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">
                        Session Complete
                    </p>
                    <h1
                        className="text-6xl font-black uppercase leading-none"
                        style={{
                            fontFamily:   'var(--font-archivo-black), sans-serif',
                            letterSpacing: '-0.03em',
                            color:         '#00E5CC',
                            textShadow:   '0 0 60px rgba(0,229,204,0.5)',
                        }}
                    >
                        Workout<br />Complete
                    </h1>
                    <p className="text-sm opacity-40 font-medium">
                        {queue.length} exercise{queue.length !== 1 ? 's' : ''} destroyed.
                    </p>
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={handleReturnHome}
                        className="mt-4 flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black"
                        style={{
                            background:  'linear-gradient(135deg, #00E5CC 0%, #00B5A0 100%)',
                            boxShadow:   '0 0 40px rgba(0,229,204,0.4)',
                            touchAction: 'manipulation',
                        }}
                    >
                        <Home size={16} />
                        Return to Home
                    </motion.button>
                </motion.div>
            </motion.div>
        );
    }

    // ── Active workout ────────────────────────────────────────────────────────
    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center overflow-hidden"
            >
                {/* HUD */}
                {!isResting && (
                    <CircuitHUD
                        timeLeft={timeLeft}
                        totalTime={SET_DURATION}
                        nextExercise={nextExercise}
                    />
                )}

                {/* Recovery Screen */}
                <RecoveryScreen />

                {/* Main Video */}
                {!isResting && currentExercise && (
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        onClick={togglePlay}
                    >
                        {currentExercise.videoUrl ? (
                            <video
                                ref={videoRef}
                                src={currentExercise.videoUrl}
                                className="w-full h-full object-cover"
                                playsInline
                                preload="auto"
                                muted
                                autoPlay
                                loop
                            />
                        ) : (
                            <div className="text-[#00FFFF] text-center pointer-events-none">
                                <p className="text-2xl font-black uppercase italic mb-2">No Footage</p>
                                <p className="opacity-40 uppercase tracking-widest text-sm">{currentExercise.name}</p>
                            </div>
                        )}

                        {currentExercise.audioUrl && (
                            <audio ref={audioRef} src={currentExercise.audioUrl} autoPlay />
                        )}

                        {/* Timer progress bar at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 z-40">
                            <motion.div
                                className="h-full"
                                style={{
                                    width:      `${(timeLeft / SET_DURATION) * 100}%`,
                                    background: timeLeft <= 10 ? '#FF4444' : '#00FFFF',
                                    boxShadow:  timeLeft <= 10 ? '0 0 12px #FF4444' : '0 0 12px #00FFFF',
                                    transition: 'background 0.3s, box-shadow 0.3s',
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Exit — top-left, always visible */}
                <button
                    onClick={handleExit}
                    className="absolute top-12 left-5 z-[600] flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-black/50 border border-white/10 text-white/70 active:scale-95 transition-transform"
                    style={{ touchAction: 'manipulation' }}
                >
                    <X size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Exit</span>
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
