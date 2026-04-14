"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Music, Zap, CheckCircle2 } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';
import { useRef, useState, useEffect, useCallback } from 'react';
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

// Returns a hue-shifted colour: green (120) → yellow (60) → red (0)
const timerHsl = (elapsedPct: number) =>
    `hsl(${Math.round(120 * (1 - Math.min(elapsedPct, 1)))}, 82%, 52%)`;

// Shared glassmorphism style for circle buttons and chevrons
const glass = (extra?: string) => ({
    background:              'rgba(255,255,255,0.13)',
    backdropFilter:          'blur(18px)',
    WebkitBackdropFilter:    'blur(18px)',
    border:                  '1px solid rgba(255,255,255,0.22)',
    boxShadow:               '0 4px 20px rgba(0,0,0,0.35)',
    ...(extra ? { extra } : {}),
} as React.CSSProperties);

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
    const exercise    = playlist[activeIndex];
    const nextEx      = activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;
    const hasPrev     = activeIndex > 0;
    const hasNext     = activeIndex < playlist.length - 1;

    // Rep-only exercises: synthesise duration (3 s / rep)
    const setDuration = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);

    // ── Set state ─────────────────────────────────────────────────────────────
    const [isSetStarted,      setIsSetStarted]      = useState(false);
    const [isSetJustComplete, setIsSetJustComplete] = useState(false);
    const [timeLeft,          setTimeLeft]           = useState(setDuration);
    const [currentSet,        setCurrentSet]         = useState(1);
    const totalSets = 4;

    // ── Video ─────────────────────────────────────────────────────────────────
    const [videoProgress, setVideoProgress] = useState(0);
    const [isFading,      setIsFading]      = useState(false);   // crossfade flag
    const [playbackRate,  setPlaybackRate]  = useState(1.0);

    // ── Global trackers ───────────────────────────────────────────────────────
    const [timeUnderTension, setTimeUnderTension] = useState(0);
    const [completedSets,    setCompletedSets]    = useState(0);
    const [totalVolume,      setTotalVolume]      = useState(0);

    // ── Rest ──────────────────────────────────────────────────────────────────
    const [isResting, setIsResting] = useState(false);
    const [restTimer, setRestTimer] = useState<number | null>(null);

    // ── Victory ───────────────────────────────────────────────────────────────
    const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────────
    const muscles = exercise?.muscles ?? {
        primary:   exercise?.targetMuscle ?? CATEGORY_MUSCLES[exercise?.category]?.primary   ?? '—',
        secondary: CATEGORY_MUSCLES[exercise?.category]?.secondary ?? '—',
        stretch:   CATEGORY_MUSCLES[exercise?.category]?.stretch   ?? '—',
    };

    const elapsedPct  = isSetStarted ? (setDuration - timeLeft) / setDuration : 0;
    const barColor    = timerHsl(elapsedPct);
    const barGlowPx   = 4 + elapsedPct * 10;
    const isUrgent    = isSetStarted && timeLeft > 0 && timeLeft <= 5;

    const fmt = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const displayTime = fmt(isSetStarted ? timeLeft : setDuration);

    // ── Reset on exercise change ──────────────────────────────────────────────
    useEffect(() => {
        const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
        setIsSetStarted(false);
        setIsSetJustComplete(false);
        setIsResting(false);
        setRestTimer(null);
        setVideoProgress(0);
        setIsFading(false);
        setTimeLeft(dur);
        setCurrentSet(1);
        if (videoRef.current) {
            videoRef.current.currentTime  = 0;
            videoRef.current.playbackRate = playbackRate;
            videoRef.current.play().catch(() => {});
        }
    }, [activeIndex]); // eslint-disable-line

    // ── Sync playback rate ────────────────────────────────────────────────────
    useEffect(() => {
        if (videoRef.current && !isResting) videoRef.current.playbackRate = playbackRate;
    }, [playbackRate, isResting]);

    // ── Seamless crossfade loop (0.2 s fade-out → reset → fade-in) ───────────
    useEffect(() => {
        let reqId: number;
        let scheduled = false;

        const tick = () => {
            if (videoRef.current && !scheduled) {
                const ct = videoRef.current.currentTime;
                if (ct >= 2.75) {
                    scheduled = true;
                    setIsFading(true);                     // fade out (0.15 s)
                    setTimeout(() => {
                        if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            if (!isResting) videoRef.current.play().catch(() => {});
                        }
                        setTimeout(() => {
                            setIsFading(false);            // fade back in (0.15 s)
                            scheduled = false;
                        }, 50);
                    }, 150);
                }
            }
            reqId = requestAnimationFrame(tick);
        };
        reqId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(reqId);
    }, [isResting]);

    // ── Countdown ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isSetStarted || isResting || isSetJustComplete) return;
        if (timeLeft <= 0) {
            setTotalVolume(v => v + (exercise?.defaultReps ?? 1));
            setTimeUnderTension(t => t + setDuration);
            setCompletedSets(s => s + 1);
            setIsSetJustComplete(true);
            const t = setTimeout(() => {
                setIsSetJustComplete(false);
                triggerRest();
            }, 1600);
            return () => clearTimeout(t);
        }
        const iv = setInterval(() => setTimeLeft(p => p - 1), 1000);
        return () => clearInterval(iv);
    }, [isSetStarted, timeLeft, isResting, isSetJustComplete]); // eslint-disable-line

    // ── Rest countdown ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isResting || restTimer === null) return;
        if (restTimer <= 0) { advanceAfterRest(); return; }
        const iv = setInterval(() => setRestTimer(p => p! - 1), 1000);
        return () => clearInterval(iv);
    }, [isResting, restTimer]); // eslint-disable-line

    if (!exercise) return null;

    // ── Actions ───────────────────────────────────────────────────────────────
    const triggerRest = useCallback(() => {
        setIsResting(true);
        setRestTimer(nextEx ? (exercise?.defaultRest ?? 60) : 3);
    }, [nextEx, exercise]);

    const advanceAfterRest = useCallback(() => {
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
    }, [currentSet, totalSets, activeIndex, playlist.length, exercise]);

    const startSet = () => {
        const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
        setTimeLeft(dur);
        setIsSetStarted(true);
    };

    const skipRest = () => advanceAfterRest();
    const cycleSpeed = () => setPlaybackRate(p => p === 1.0 ? 0.5 : 1.0);

    const goToPrev = () => { if (hasPrev) setActiveIndex(p => p - 1); };
    const goToNext = () => { if (hasNext) setActiveIndex(p => p + 1); };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const { currentTime, duration } = videoRef.current;
            if (duration > 0) setVideoProgress((currentTime / duration) * 100);
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

                {/* ── Video ───────────────────────────────────────────────── */}
                <video
                    ref={videoRef}
                    src={exercise.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        opacity:    isResting ? 0.18 : isFading ? 0 : 1,
                        filter:     isResting ? 'blur(10px)' : 'none',
                        transition: 'opacity 0.15s ease',
                    }}
                    playsInline preload="auto" muted loop={false}
                    onTimeUpdate={handleTimeUpdate}
                />

                {/* ── Gradient scrims ─────────────────────────────────────── */}
                <div className="absolute inset-x-0 top-0 h-60 bg-gradient-to-b from-black/80 via-black/20 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none z-10" />

                {/* ════════════════════════════════════════════════════════
                    BACK BUTTON  — z-50, large 56×56 hit area
                ════════════════════════════════════════════════════════ */}
                <button
                    onClick={onClose}
                    className="absolute z-50 flex items-center justify-center transition-all active:scale-90"
                    style={{
                        top: '3rem', left: '1rem',
                        width: 56, height: 56,
                        borderRadius: '50%',
                        ...glass(),
                    }}
                    aria-label="Back"
                >
                    <ChevronLeft size={22} strokeWidth={2.5} className="text-white" />
                </button>

                {/* ════════════════════════════════════════════════════════
                    LEFT / RIGHT EXERCISE NAVIGATION CHEVRONS
                ════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {hasPrev && !isResting && (
                        <motion.button
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0  }}
                            exit={  { opacity: 0, x: -8  }}
                            onClick={goToPrev}
                            className="absolute z-40 flex items-center justify-center transition-all active:scale-90"
                            style={{
                                top: '50%', left: '1rem',
                                transform: 'translateY(-50%)',
                                width: 48, height: 48,
                                borderRadius: '50%',
                                ...glass(),
                            }}
                            aria-label="Previous exercise"
                        >
                            <ChevronLeft size={20} strokeWidth={2.5} className="text-white/90" />
                        </motion.button>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {hasNext && !isResting && (
                        <motion.button
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={  { opacity: 0, x: 8  }}
                            onClick={goToNext}
                            className="absolute z-40 flex items-center justify-center transition-all active:scale-90"
                            style={{
                                top: '50%', right: '1rem',
                                transform: 'translateY(-50%)',
                                width: 48, height: 48,
                                borderRadius: '50%',
                                ...glass(),
                            }}
                            aria-label="Next exercise"
                        >
                            <ChevronRight size={20} strokeWidth={2.5} className="text-white/90" />
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* ════════════════════════════════════════════════════════
                    HEADER — SET counter · giant timer · exercise name
                ════════════════════════════════════════════════════════ */}
                <div className="absolute top-0 left-0 right-0 z-30 flex flex-col items-center pt-12 pointer-events-none">

                    {/* SET 01/04 */}
                    <p className="text-[11px] font-black uppercase tracking-[0.38em] text-white/50 mb-0.5">
                        SET {String(currentSet).padStart(2, '0')}/{String(totalSets).padStart(2, '0')}
                    </p>

                    {/* Giant countdown timer */}
                    <motion.div
                        key={displayTime}
                        initial={{ scale: 1.05, opacity: 0.7 }}
                        animate={{ scale: 1,    opacity: 1   }}
                        transition={{ duration: 0.15 }}
                        className="font-black leading-none tracking-tight select-none"
                        style={{
                            fontFamily:  'var(--font-archivo-black), sans-serif',
                            fontSize:    'clamp(5.5rem, 24vw, 7.5rem)',
                            color:       isUrgent ? '#fca5a5' : 'white',
                            textShadow:  isUrgent
                                ? '0 0 30px rgba(239,68,68,0.8)'
                                : isSetStarted
                                    ? `0 0 20px ${barColor}55`
                                    : 'none',
                        }}
                    >
                        {displayTime}
                    </motion.div>

                    {/* Exercise name — perfectly centered */}
                    <p className="text-[14px] text-white/65 font-semibold mt-2 tracking-wide text-center px-20">
                        {exercise.name}
                    </p>
                </div>

                {/* ════════════════════════════════════════════════════════
                    RIGHT-SIDE CIRCLE BUTTONS  (Music · Speed)
                ════════════════════════════════════════════════════════ */}
                <div className="absolute right-4 z-40 flex flex-col gap-3" style={{ top: '40%' }}>

                    <button
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={glass()}
                        aria-label="Music"
                    >
                        <Music size={18} className="text-white" />
                    </button>

                    <button
                        onClick={cycleSpeed}
                        className="w-12 h-12 rounded-full flex flex-col items-center justify-center gap-[2px] transition-all active:scale-90"
                        style={{
                            ...glass(),
                            ...(playbackRate === 0.5 ? {
                                background:  'rgba(76,175,80,0.80)',
                                border:      '1px solid rgba(76,175,80,0.55)',
                                boxShadow:   '0 0 18px rgba(76,175,80,0.6), 0 4px 20px rgba(0,0,0,0.35)',
                            } : {}),
                        }}
                        aria-label="Toggle speed"
                    >
                        <Zap size={15} fill={playbackRate === 0.5 ? 'white' : 'none'} className="text-white" />
                        <span className="text-white font-black" style={{ fontSize: '8px', lineHeight: 1 }}>
                            {playbackRate === 0.5 ? '0.5×' : '1×'}
                        </span>
                    </button>
                </div>

                {/* ════════════════════════════════════════════════════════
                    FOOTER CONTENT  (above the bottom bar)
                ════════════════════════════════════════════════════════ */}
                <div className="absolute bottom-0 left-0 right-0 z-30 px-5 pb-7">

                    {/* START SET button */}
                    <AnimatePresence mode="wait">
                        {!isSetStarted && (
                            <motion.button
                                key="start"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0  }}
                                exit={  { opacity: 0, y: -6  }}
                                onClick={startSet}
                                className="w-full mb-4 py-[14px] rounded-2xl font-black uppercase tracking-[0.22em] text-[13px] text-white transition-all active:scale-[0.97]"
                                style={glass()}
                            >
                                START SET {currentSet}
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Next exercise + index */}
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
                            {activeIndex + 1}<span className="text-white/18">/</span>{playlist.length}
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

                    {/* ── PROGRESS BAR — absolute bottom, fills green→yellow→red ── */}
                    <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.10)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            animate={{ width: `${elapsedPct * 100}%` }}
                            transition={{ duration: 0.9, ease: 'linear' }}
                            style={{
                                backgroundColor: barColor,
                                boxShadow: `0 0 ${barGlowPx}px ${barColor}, 0 0 ${barGlowPx * 2}px ${barColor}55`,
                            }}
                        />
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════
                    SET COMPLETE FLASH
                ════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isSetJustComplete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={  { opacity: 0 }}
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse at center, rgba(76,175,80,0.3) 0%, rgba(0,0,0,0.65) 100%)' }}
                        >
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1,   opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <CheckCircle2
                                    size={68} strokeWidth={1.5}
                                    style={{ color: '#4CAF50', filter: 'drop-shadow(0 0 22px rgba(76,175,80,0.9))' }}
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

                {/* ════════════════════════════════════════════════════════
                    REST OVERLAY
                ════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isResting && restTimer !== null && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={  { opacity: 0 }}
                            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                        >
                            <p className="text-[10px] uppercase tracking-[0.55em] font-black mb-2 text-green-400">
                                {currentSet < totalSets
                                    ? `SET ${currentSet} DONE — RECOVER`
                                    : nextEx ? 'EXERCISE DONE — RECOVER' : 'FINISHED'}
                            </p>

                            <motion.p
                                key={restTimer}
                                initial={{ scale: 1.14, opacity: 0.5 }}
                                animate={{ scale: 1,    opacity: 1   }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="font-black leading-none text-white tracking-tighter"
                                style={{ fontFamily: 'var(--font-archivo-black)', fontSize: 'clamp(6rem, 28vw, 9rem)' }}
                            >
                                {restTimer}
                            </motion.p>

                            <p className="text-[10px] uppercase tracking-[0.4em] text-white/35 mt-1 font-bold">seconds rest</p>

                            <button
                                onClick={skipRest}
                                className="mt-8 px-8 py-[12px] rounded-2xl text-white font-black uppercase text-[11px] tracking-[0.3em] transition-all active:scale-[0.97]"
                                style={glass()}
                            >
                                {currentSet < totalSets
                                    ? `START SET ${currentSet + 1}`
                                    : nextEx ? 'NEXT EXERCISE' : 'FINISH'}
                            </button>

                            {/* PiP */}
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
