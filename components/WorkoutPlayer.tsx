"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Music, Zap, CheckCircle2 } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';
import { useRef, useState, useEffect } from 'react';
import VictoryScreen from './VictoryScreen';

// ── Muscle legend — category fallback ────────────────────────────────────────
const CATEGORY_MUSCLES: Record<string, { primary: string; secondary: string; stretch: string }> = {
    Chest:     { primary: 'Pectoralis Major',  secondary: 'Triceps & Front Delts',  stretch: 'Pec Minor'        },
    Back:      { primary: 'Latissimus Dorsi',  secondary: 'Biceps & Rear Delts',    stretch: 'Thoracic Spine'   },
    Arms:      { primary: 'Biceps / Triceps',  secondary: 'Brachialis & Forearms',  stretch: 'Elbow Flexors'    },
    Shoulders: { primary: 'Deltoids',          secondary: 'Traps & Upper Back',     stretch: 'Shoulder Capsule' },
    Legs:      { primary: 'Quadriceps',        secondary: 'Glutes & Hamstrings',    stretch: 'Hip Flexors'      },
    Core:      { primary: 'Rectus Abdominis',  secondary: 'Obliques & Hip Flexors', stretch: 'Lumbar Fascia'    },
};

// Green → yellow → red  (elapsed 0 → 1)
const timerHsl = (e: number) => `hsl(${Math.round(120 * (1 - Math.min(e, 1)))},82%,52%)`;

// Shared glassmorphism circle style
const glassCircle: React.CSSProperties = {
    background:           'rgba(255,255,255,0.14)',
    backdropFilter:       'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border:               '1px solid rgba(255,255,255,0.25)',
    boxShadow:            '0 4px 20px rgba(0,0,0,0.4)',
};

interface WorkoutPlayerProps {
    playlist:     LiveExercise[];
    initialIndex: number;
    onClose:      () => void;
}

export default function WorkoutPlayer({ playlist, initialIndex, onClose }: WorkoutPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pipRef   = useRef<HTMLVideoElement>(null);

    // ── Navigation ────────────────────────────────────────────────────────────
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const exercise = playlist[activeIndex];
    const nextEx   = activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;
    const hasPrev  = activeIndex > 0;
    const hasNext  = !!nextEx;

    // Rep-only: 3 s per rep synthesised duration
    const setDuration = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);

    // ── Set state ─────────────────────────────────────────────────────────────
    const [isSetStarted,      setIsSetStarted]      = useState(false);
    const [isSetJustComplete, setIsSetJustComplete] = useState(false);
    const [timeLeft,          setTimeLeft]           = useState(setDuration);
    const [currentSet,        setCurrentSet]         = useState(1);
    const totalSets = 4;

    // ── Playback ──────────────────────────────────────────────────────────────
    const [videoProgress, setVideoProgress] = useState(0);   // 0-100 within current loop
    const [playbackRate,  setPlaybackRate]  = useState(1.0);

    // ── Trackers ──────────────────────────────────────────────────────────────
    const [timeUnderTension, setTimeUnderTension] = useState(0);
    const [completedSets,    setCompletedSets]    = useState(0);
    const [totalVolume,      setTotalVolume]      = useState(0);

    // ── Rest ──────────────────────────────────────────────────────────────────
    const [isResting,  setIsResting]  = useState(false);
    const [restTimer,  setRestTimer]  = useState<number | null>(null);

    // ── Finish ────────────────────────────────────────────────────────────────
    const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────────
    const muscles = exercise?.muscles ?? {
        primary:   exercise?.targetMuscle ?? CATEGORY_MUSCLES[exercise?.category]?.primary   ?? '—',
        secondary: CATEGORY_MUSCLES[exercise?.category]?.secondary ?? '—',
        stretch:   CATEGORY_MUSCLES[exercise?.category]?.stretch   ?? '—',
    };

    const elapsedPct = isSetStarted ? Math.max(0, Math.min(1, (setDuration - timeLeft) / setDuration)) : 0;
    const barColor   = timerHsl(elapsedPct);
    const barGlow    = `0 0 ${4 + elapsedPct * 10}px ${barColor}, 0 0 ${8 + elapsedPct * 18}px ${barColor}55`;
    const isUrgent   = isSetStarted && timeLeft > 0 && timeLeft <= 5;

    const fmt = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const displayTime = fmt(isSetStarted ? timeLeft : setDuration);

    // ── Reset when exercise changes ───────────────────────────────────────────
    useEffect(() => {
        const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
        setIsSetStarted(false);
        setIsSetJustComplete(false);
        setIsResting(false);
        setRestTimer(null);
        setVideoProgress(0);
        setTimeLeft(dur);
        setCurrentSet(1);
        const v = videoRef.current;
        if (v) {
            v.currentTime  = 0;
            v.playbackRate = playbackRate;
            v.play().catch(() => {});
        }
    }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Sync playback rate ────────────────────────────────────────────────────
    useEffect(() => {
        if (videoRef.current && !isResting) videoRef.current.playbackRate = playbackRate;
    }, [playbackRate, isResting]);

    // ── Countdown → auto-log → rest ───────────────────────────────────────────
    useEffect(() => {
        if (!isSetStarted || isResting || isSetJustComplete) return;

        if (timeLeft <= 0) {
            // Auto-log the completed set
            setTotalVolume(v  => v + (exercise?.defaultReps ?? 1));
            setTimeUnderTension(t => t + setDuration);
            setCompletedSets(s => s + 1);
            setIsSetJustComplete(true);

            // After the flash, immediately switch to rest screen
            const restDur = nextEx ? (exercise?.defaultRest ?? 60) : 3;
            const tid = setTimeout(() => {
                setIsSetJustComplete(false);
                setIsResting(true);
                setRestTimer(restDur);
            }, 1400);
            return () => clearTimeout(tid);
        }

        const iv = setInterval(() => setTimeLeft(p => p - 1), 1000);
        return () => clearInterval(iv);
    }, [isSetStarted, timeLeft, isResting, isSetJustComplete,
        exercise, nextEx, setDuration]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Rest countdown ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isResting || restTimer === null) return;
        if (restTimer <= 0) { advanceAfterRest(); return; }
        const iv = setInterval(() => setRestTimer(p => p! - 1), 1000);
        return () => clearInterval(iv);
    }, [isResting, restTimer]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!exercise) return null;

    // ── Actions ───────────────────────────────────────────────────────────────
    const advanceAfterRest = () => {
        if (currentSet < totalSets) {
            const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
            setCurrentSet(s => s + 1);
            setTimeLeft(dur);
            setIsResting(false);
            setRestTimer(null);
            setIsSetStarted(false);
        } else if (activeIndex < playlist.length - 1) {
            setActiveIndex(p => p + 1);
        } else {
            setIsWorkoutComplete(true);
        }
    };

    const startSet = () => {
        const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
        setTimeLeft(dur);
        setIsSetStarted(true);
    };

    const cycleSpeed = () => setPlaybackRate(p => p === 1.0 ? 0.5 : 1.0);

    const goToPrev = () => { if (hasPrev) setActiveIndex(p => p - 1); };
    const goToNext = () => { if (hasNext) setActiveIndex(p => p + 1); };

    // ── Seamless loop via onTimeUpdate — NO opacity changes ───────────────────
    // Seeks back before the black end-frame instead of relying on native loop.
    const handleTimeUpdate = () => {
        const v = videoRef.current;
        if (!v || !v.duration) return;
        setVideoProgress((v.currentTime / v.duration) * 100);
        // Jump before the final black frame (last 0.1 s)
        if (v.currentTime >= v.duration - 0.1) {
            v.currentTime = 0;
        }
    };

    // ── Victory ───────────────────────────────────────────────────────────────
    if (isWorkoutComplete) {
        return (
            <AnimatePresence>
                <VictoryScreen
                    totalVolume={totalVolume}
                    timeUnderTension={timeUnderTension}
                    completedSets={completedSets}
                    category={playlist[0]?.category?.toUpperCase() ?? 'TARGET'}
                    onReturn={onClose}
                />
            </AnimatePresence>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] overflow-hidden bg-black"
            >
                {/* ── Video — loop=false, we handle seeking manually ────────── */}
                <video
                    ref={videoRef}
                    src={exercise.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        opacity:    isResting ? 0.15 : 1,
                        filter:     isResting ? 'blur(10px)' : 'none',
                        transition: 'opacity 0.4s ease, filter 0.4s ease',
                    }}
                    playsInline
                    preload="auto"
                    muted
                    loop={false}
                    onTimeUpdate={handleTimeUpdate}
                />

                {/* ── Gradient scrims ──────────────────────────────────────── */}
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black/80 via-black/20 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none z-10" />

                {/* ══════════════════════════════════════════════════════════
                    BACK BUTTON  z-50, 56×56, always on top
                ══════════════════════════════════════════════════════════ */}
                <button
                    onClick={onClose}
                    className="absolute z-50 flex items-center justify-center active:scale-90 transition-transform"
                    style={{ top: '3rem', left: '1rem', width: 56, height: 56, borderRadius: '50%', ...glassCircle }}
                    aria-label="Back"
                >
                    <ChevronLeft size={22} strokeWidth={2.5} className="text-white" />
                </button>

                {/* ══════════════════════════════════════════════════════════
                    PREV / NEXT EXERCISE CHEVRONS  — visible, mid-screen
                ══════════════════════════════════════════════════════════ */}
                {hasPrev && !isResting && (
                    <button
                        onClick={goToPrev}
                        className="absolute z-40 flex items-center justify-center active:scale-90 transition-transform"
                        style={{
                            top: '50%', left: '1rem',
                            transform: 'translateY(-50%)',
                            width: 48, height: 48,
                            borderRadius: '50%',
                            ...glassCircle,
                        }}
                        aria-label="Previous exercise"
                    >
                        <ChevronLeft size={20} strokeWidth={2.5} className="text-white" />
                    </button>
                )}

                {hasNext && !isResting && (
                    <button
                        onClick={goToNext}
                        className="absolute z-40 flex items-center justify-center active:scale-90 transition-transform"
                        style={{
                            top: '50%', right: '1rem',
                            transform: 'translateY(-50%)',
                            width: 48, height: 48,
                            borderRadius: '50%',
                            ...glassCircle,
                        }}
                        aria-label="Next exercise"
                    >
                        <ChevronRight size={20} strokeWidth={2.5} className="text-white" />
                    </button>
                )}

                {/* ══════════════════════════════════════════════════════════
                    HEADER  — SET counter · timer · exercise name
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center pt-12 pointer-events-none select-none">
                    <p className="text-[11px] font-black uppercase tracking-[0.38em] text-white/50 mb-0.5">
                        SET {String(currentSet).padStart(2, '0')}/{String(totalSets).padStart(2, '0')}
                    </p>

                    <motion.p
                        key={displayTime}
                        initial={{ scale: 1.04, opacity: 0.75 }}
                        animate={{ scale: 1,    opacity: 1    }}
                        transition={{ duration: 0.14 }}
                        className="font-black leading-none tracking-tight"
                        style={{
                            fontFamily:  'var(--font-archivo-black), sans-serif',
                            fontSize:    'clamp(5.5rem, 24vw, 7.5rem)',
                            color:       isUrgent ? '#fca5a5' : 'white',
                            textShadow:  isUrgent
                                ? '0 0 32px rgba(239,68,68,0.85)'
                                : isSetStarted
                                    ? `0 0 22px ${barColor}60`
                                    : 'none',
                        }}
                    >
                        {displayTime}
                    </motion.p>

                    <p className="text-[14px] text-white/65 font-semibold mt-2 tracking-wide text-center px-20">
                        {exercise.name}
                    </p>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    RIGHT CIRCLE BUTTONS  — Music · Speed
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute right-4 z-40 flex flex-col gap-3" style={{ top: '40%' }}>
                    <button
                        className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                        style={glassCircle}
                        aria-label="Music"
                    >
                        <Music size={18} className="text-white" />
                    </button>

                    <button
                        onClick={cycleSpeed}
                        className="w-12 h-12 rounded-full flex flex-col items-center justify-center gap-[2px] active:scale-90 transition-transform"
                        style={{
                            ...glassCircle,
                            ...(playbackRate === 0.5 && {
                                background:  'rgba(76,175,80,0.82)',
                                border:      '1px solid rgba(76,175,80,0.6)',
                                boxShadow:   '0 0 20px rgba(76,175,80,0.65), 0 4px 20px rgba(0,0,0,0.4)',
                            }),
                        }}
                        aria-label="Toggle speed"
                    >
                        <Zap size={15} className="text-white" fill={playbackRate === 0.5 ? 'white' : 'none'} />
                        <span className="text-white font-black" style={{ fontSize: '8px', lineHeight: 1 }}>
                            {playbackRate === 0.5 ? '0.5×' : '1×'}
                        </span>
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    FOOTER  — start button · next exercise · legend · bar
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-6">

                    {/* START SET — only before set begins */}
                    <AnimatePresence mode="wait">
                        {!isSetStarted && (
                            <motion.button
                                key="start"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0  }}
                                exit={  { opacity: 0, y: -6  }}
                                onClick={startSet}
                                className="w-full mb-4 py-[14px] rounded-2xl font-black uppercase tracking-[0.22em] text-[13px] text-white active:scale-[0.97] transition-transform"
                                style={glassCircle}
                            >
                                START SET {currentSet}
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Next exercise row */}
                    <div className="flex items-center justify-between mb-3">
                        {nextEx ? (
                            <div className="flex items-center gap-2">
                                <div className="rounded-lg overflow-hidden shrink-0"
                                    style={{ width: 40, height: 40, border: '1px solid rgba(255,255,255,0.15)' }}>
                                    <video
                                        ref={pipRef}
                                        src={nextEx.videoUrl}
                                        className="w-full h-full object-cover"
                                        autoPlay muted loop playsInline
                                    />
                                </div>
                                <div>
                                    <p className="font-bold text-white/40 uppercase" style={{ fontSize: '9px', letterSpacing: '0.13em' }}>Next</p>
                                    <p className="font-bold text-white/80 leading-snug" style={{ fontSize: '12px', maxWidth: 110 }}>
                                        {nextEx.name}
                                    </p>
                                </div>
                            </div>
                        ) : <div />}

                        <span className="font-bold text-white/35" style={{ fontSize: '13px' }}>
                            {activeIndex + 1}<span className="text-white/20">/</span>{playlist.length}
                        </span>
                    </div>

                    {/* Muscle legend */}
                    <div className="flex items-center justify-center gap-4 mb-[14px]">
                        {[
                            { label: muscles.primary,   color: '#4CAF50' },
                            { label: muscles.secondary, color: '#9C27B0' },
                            { label: muscles.stretch,   color: '#FFC107' },
                        ].map(({ label, color }) => (
                            <span key={color} className="flex items-center gap-[5px]">
                                <span className="rounded-full shrink-0" style={{ width: 7, height: 7, backgroundColor: color }} />
                                <span className="font-medium text-white/42" style={{ fontSize: '9px' }}>{label}</span>
                            </span>
                        ))}
                    </div>

                    {/* ── Progress bar — fills green→yellow→red, absolute bottom ── */}
                    <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.10)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            animate={{ width: `${elapsedPct * 100}%` }}
                            transition={{ duration: 0.85, ease: 'linear' }}
                            style={{ backgroundColor: barColor, boxShadow: barGlow }}
                        />
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    SET COMPLETE FLASH  (1.4 s, then flips to rest)
                ══════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isSetJustComplete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={  { opacity: 0 }}
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse at center, rgba(76,175,80,0.3) 0%, rgba(0,0,0,0.7) 100%)' }}
                        >
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1,   opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <CheckCircle2
                                    size={68} strokeWidth={1.5}
                                    style={{ color: '#4CAF50', filter: 'drop-shadow(0 0 24px rgba(76,175,80,0.95))' }}
                                />
                                <p
                                    className="text-[2.3rem] font-black text-white uppercase tracking-[0.12em]"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', textShadow: '0 0 28px rgba(76,175,80,0.6)' }}
                                >
                                    Set Complete
                                </p>
                                <p className="text-[10px] uppercase tracking-[0.45em] text-white/45 font-bold">
                                    Rest Starting…
                                </p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══════════════════════════════════════════════════════════
                    REST OVERLAY  — with PiP next exercise
                ══════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isResting && restTimer !== null && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={  { opacity: 0 }}
                            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                        >
                            <p className="text-[10px] uppercase tracking-[0.55em] font-black mb-2 text-green-400">
                                {currentSet < totalSets
                                    ? `SET ${currentSet} DONE — RECOVER`
                                    : nextEx ? 'EXERCISE DONE — RECOVER' : 'WORKOUT COMPLETE'}
                            </p>

                            <motion.p
                                key={restTimer}
                                initial={{ scale: 1.12, opacity: 0.5 }}
                                animate={{ scale: 1,    opacity: 1   }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="font-black leading-none text-white tracking-tighter"
                                style={{ fontFamily: 'var(--font-archivo-black)', fontSize: 'clamp(6rem, 28vw, 9rem)' }}
                            >
                                {restTimer}
                            </motion.p>

                            <p className="text-[10px] uppercase tracking-[0.4em] text-white/35 mt-1 font-bold">seconds rest</p>

                            <button
                                onClick={advanceAfterRest}
                                className="mt-8 px-8 py-[13px] rounded-2xl text-white font-black uppercase text-[11px] tracking-[0.3em] active:scale-[0.97] transition-transform"
                                style={glassCircle}
                            >
                                {currentSet < totalSets
                                    ? `START SET ${currentSet + 1}`
                                    : nextEx ? 'NEXT EXERCISE' : 'FINISH'}
                            </button>

                            {/* PiP — next exercise preview */}
                            {nextEx && (
                                <motion.div
                                    initial={{ y: 55, opacity: 0 }}
                                    animate={{ y: 0,  opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                    className="absolute bottom-10 right-5 rounded-2xl overflow-hidden shadow-2xl"
                                    style={{ width: 118, aspectRatio: '9/16', border: '1px solid rgba(255,255,255,0.15)' }}
                                >
                                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent px-2 py-1.5 z-10">
                                        <p className="text-[8px] uppercase tracking-widest text-green-400 font-black truncate">
                                            NEXT: {nextEx.name}
                                        </p>
                                    </div>
                                    <video
                                        src={nextEx.videoUrl}
                                        className="w-full h-full object-cover opacity-90"
                                        playsInline autoPlay muted loop
                                    />
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>
        </AnimatePresence>
    );
}
