"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Music, Zap, CheckCircle2 } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';
import { useRef, useState, useEffect, useCallback } from 'react';
import VictoryScreen from './VictoryScreen';

// ── Muscle legend fallback by category ───────────────────────────────────────
const CATEGORY_MUSCLES: Record<string, { primary: string; secondary: string; stretch: string }> = {
    Chest:     { primary: 'Pectoralis Major',  secondary: 'Triceps & Front Delts',  stretch: 'Pec Minor'        },
    Back:      { primary: 'Latissimus Dorsi',   secondary: 'Biceps & Rear Delts',    stretch: 'Thoracic Spine'   },
    Arms:      { primary: 'Biceps / Triceps',   secondary: 'Brachialis & Forearms',  stretch: 'Elbow Flexors'    },
    Shoulders: { primary: 'Deltoids',           secondary: 'Traps & Upper Back',     stretch: 'Shoulder Capsule' },
    Legs:      { primary: 'Quadriceps',         secondary: 'Glutes & Hamstrings',    stretch: 'Hip Flexors'      },
    Core:      { primary: 'Rectus Abdominis',   secondary: 'Obliques & Hip Flexors', stretch: 'Lumbar Fascia'    },
};

interface WorkoutPlayerProps {
    playlist:     LiveExercise[];
    initialIndex: number;
    onClose:      () => void;
}

export default function WorkoutPlayer({ playlist, initialIndex, onClose }: WorkoutPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pipRef   = useRef<HTMLVideoElement>(null);

    // ── Navigation ───────────────────────────────────────────────────────────
    const [activeIndex,       setActiveIndex]       = useState(initialIndex);
    const exercise = playlist[activeIndex];

    // For rep-only exercises we synthesise a duration (3 s per rep)
    const setDuration = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);

    // ── Set state ─────────────────────────────────────────────────────────────
    const [isSetStarted,      setIsSetStarted]      = useState(false);
    const [isSetJustComplete, setIsSetJustComplete] = useState(false);
    const [timeLeft,          setTimeLeft]           = useState(setDuration);
    const [currentSet,        setCurrentSet]         = useState(1);
    const totalSets = 4;

    // ── Video / playback ─────────────────────────────────────────────────────
    const [videoProgress,  setVideoProgress]  = useState(0);   // 0-100, for bottom bar
    const [videoOpacity,   setVideoOpacity]   = useState(1);
    const [playbackRate,   setPlaybackRate]   = useState(1.0);

    // ── Global trackers ───────────────────────────────────────────────────────
    const [timeUnderTension, setTimeUnderTension] = useState(0);
    const [completedSets,    setCompletedSets]    = useState(0);
    const [totalVolume,      setTotalVolume]      = useState(0);

    // ── Rest ──────────────────────────────────────────────────────────────────
    const [isResting,  setIsResting]  = useState(false);
    const [restTimer,  setRestTimer]  = useState<number | null>(null);

    // ── Finish ────────────────────────────────────────────────────────────────
    const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

    const nextExercise = activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;

    // ── Derived muscle data ───────────────────────────────────────────────────
    const muscles = exercise?.muscles ?? {
        primary:   exercise?.targetMuscle ?? CATEGORY_MUSCLES[exercise?.category]?.primary   ?? '—',
        secondary: CATEGORY_MUSCLES[exercise?.category]?.secondary ?? '—',
        stretch:   CATEGORY_MUSCLES[exercise?.category]?.stretch   ?? '—',
    };

    // ── Reset on exercise change ──────────────────────────────────────────────
    useEffect(() => {
        const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
        setIsSetStarted(false);
        setIsSetJustComplete(false);
        setIsResting(false);
        setRestTimer(null);
        setVideoProgress(0);
        setVideoOpacity(1);
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

    // ── Cross-fade engine (3 s video loop) ────────────────────────────────────
    useEffect(() => {
        let reqId: number;
        const tick = () => {
            if (videoRef.current) {
                const ct = videoRef.current.currentTime;
                if (ct >= 2.8 && videoOpacity === 1) {
                    setVideoOpacity(0.5);
                    setTimeout(() => {
                        if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            setVideoOpacity(1);
                            if (!isResting) videoRef.current.play().catch(() => {});
                        }
                    }, 200);
                }
            }
            reqId = requestAnimationFrame(tick);
        };
        reqId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(reqId);
    }, [videoOpacity, isResting]);

    // ── Countdown ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isSetStarted || isResting || isSetJustComplete) return;
        if (timeLeft <= 0) {
            // Auto-log the set
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
        if (restTimer <= 0) { advance(); return; }
        const iv = setInterval(() => setRestTimer(p => p! - 1), 1000);
        return () => clearInterval(iv);
    }, [isResting, restTimer]); // eslint-disable-line

    if (!exercise) return null;

    // ── Actions ───────────────────────────────────────────────────────────────
    const triggerRest = useCallback(() => {
        setIsResting(true);
        setRestTimer(nextExercise ? (exercise?.defaultRest ?? 60) : 3);
    }, [nextExercise, exercise]);

    const advance = useCallback(() => {
        if (activeIndex < playlist.length - 1) {
            setActiveIndex(p => p + 1);
        } else {
            setIsWorkoutComplete(true);
        }
    }, [activeIndex, playlist.length]);

    const startSet = () => {
        const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
        setTimeLeft(dur);
        setIsSetStarted(true);
    };

    const handleNextSet = () => {
        // After rest: if more sets remain, start next set; otherwise move to next exercise
        if (currentSet < totalSets) {
            const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
            setCurrentSet(s => s + 1);
            setTimeLeft(dur);
            setIsResting(false);
            setRestTimer(null);
            setIsSetStarted(false);
        } else {
            advance();
        }
    };

    const skipRest = () => handleNextSet();

    const cycleSpeed = () => setPlaybackRate(p => p === 1.0 ? 0.5 : 1.0);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const { currentTime, duration } = videoRef.current;
            if (duration > 0) setVideoProgress((currentTime / duration) * 100);
        }
    };

    // ── Computed helpers ──────────────────────────────────────────────────────
    const fmt = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const setProgressPct = isSetStarted
        ? Math.max(0, (timeLeft / setDuration) * 100)
        : 100;

    const isUrgent   = isSetStarted && timeLeft > 0 && timeLeft <= 5;
    const displayTime = fmt(isSetStarted ? timeLeft : setDuration);

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

                {/* ── 1. Full-screen video ────────────────────────────────── */}
                <video
                    ref={videoRef}
                    src={exercise.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        opacity:    isResting ? 0.18 : videoOpacity === 1 ? 1 : 0.5,
                        filter:     isResting ? 'blur(10px)' : 'none',
                        transition: 'opacity 0.2s ease',
                    }}
                    playsInline preload="auto" muted loop={false}
                    onTimeUpdate={handleTimeUpdate}
                />

                {/* ── 2. Gradient scrim ───────────────────────────────────── */}
                <div className="absolute inset-x-0 top-0    h-64   bg-gradient-to-b  from-black/80 via-black/25 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none z-10" />

                {/* ══════════════════════════════════════════════════════════
                    3. HEADER — back chevron · set counter · timer · name
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center pt-12 px-5">

                    {/* Back chevron */}
                    <button
                        onClick={onClose}
                        className="absolute left-4 top-[3.1rem] text-white/85 p-2 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={26} strokeWidth={2.5} />
                    </button>

                    {/* Set counter — small label above timer */}
                    <div className="text-[11px] font-black uppercase tracking-[0.35em] text-white/50 mb-1">
                        SET {String(currentSet).padStart(2, '0')}/{String(totalSets).padStart(2, '0')}
                    </div>

                    {/* Giant timer — the primary element */}
                    <motion.div
                        key={displayTime}
                        initial={{ scale: 1.04, opacity: 0.75 }}
                        animate={{ scale: 1,    opacity: 1    }}
                        transition={{ duration: 0.16 }}
                        className="font-black leading-none tracking-tight"
                        style={{
                            fontFamily: 'var(--font-archivo-black), sans-serif',
                            fontSize:   'clamp(5rem, 22vw, 7rem)',
                            color:      isUrgent ? '#fca5a5' : 'white',
                            textShadow: isUrgent
                                ? '0 0 24px rgba(239,68,68,0.75)'
                                : isSetStarted
                                    ? '0 0 16px rgba(255,255,255,0.15)'
                                    : 'none',
                        }}
                    >
                        {displayTime}
                    </motion.div>

                    {/* Exercise name */}
                    <p className="text-[14px] text-white/65 font-semibold mt-2 tracking-wide text-center px-16">
                        {exercise.name}
                    </p>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    4. RIGHT-SIDE GLASSMORPHISM CIRCLE BUTTONS
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute right-4 z-20 flex flex-col gap-3" style={{ top: '40%' }}>

                    {/* Music */}
                    <button
                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                        style={{
                            background:    'rgba(255,255,255,0.12)',
                            backdropFilter:'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border:        '1px solid rgba(255,255,255,0.18)',
                            boxShadow:     '0 4px 16px rgba(0,0,0,0.3)',
                        }}
                    >
                        <Music size={18} className="text-white" />
                    </button>

                    {/* Speed toggle */}
                    <button
                        onClick={cycleSpeed}
                        className="w-12 h-12 rounded-full flex flex-col items-center justify-center gap-[2px] transition-all active:scale-90"
                        style={{
                            background:    playbackRate === 0.5
                                ? 'rgba(76,175,80,0.85)'
                                : 'rgba(255,255,255,0.12)',
                            backdropFilter:'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            border:        playbackRate === 0.5
                                ? '1px solid rgba(76,175,80,0.6)'
                                : '1px solid rgba(255,255,255,0.18)',
                            boxShadow:     playbackRate === 0.5
                                ? '0 0 18px rgba(76,175,80,0.55), 0 4px 16px rgba(0,0,0,0.3)'
                                : '0 4px 16px rgba(0,0,0,0.3)',
                        }}
                    >
                        <Zap size={15} className="text-white" fill={playbackRate === 0.5 ? 'white' : 'none'} />
                        <span className="text-white font-black" style={{ fontSize: '8px', lineHeight: 1 }}>
                            {playbackRate === 0.5 ? '0.5×' : '1×'}
                        </span>
                    </button>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    5. SET PROGRESS BAR  (drains with the countdown)
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute left-0 right-0 z-20 px-5" style={{ bottom: '26%' }}>
                    {/* Track */}
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.12)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            animate={{ width: `${setProgressPct}%` }}
                            transition={{ duration: 0.9, ease: 'linear' }}
                            style={{
                                background: isUrgent
                                    ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                    : 'linear-gradient(90deg, #4CAF50, #81C784)',
                                boxShadow: isUrgent
                                    ? '0 0 8px rgba(239,68,68,0.6)'
                                    : '0 0 8px rgba(76,175,80,0.5)',
                            }}
                        />
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    6. FOOTER  (20% smaller than before)
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-5">

                    {/* START SET button — only shown before set begins */}
                    <AnimatePresence mode="wait">
                        {!isSetStarted && (
                            <motion.button
                                key="start"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0  }}
                                exit={  { opacity: 0, y: -6  }}
                                onClick={startSet}
                                className="w-full mb-3 py-[13px] rounded-2xl font-black uppercase tracking-[0.22em] text-[13px] text-white border border-white/20 transition-all active:scale-[0.97]"
                                style={{ background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }}
                            >
                                START SET {currentSet}
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Next exercise + exercise index row */}
                    <div className="flex items-center justify-between mb-3">
                        {nextExercise ? (
                            <div className="flex items-center gap-2">
                                {/* Thumbnail — 20% smaller: was 52px → 42px */}
                                <div className="rounded-lg overflow-hidden bg-black/50 shrink-0 border border-white/12"
                                    style={{ width: 42, height: 42 }}>
                                    <video
                                        ref={pipRef}
                                        src={nextExercise.videoUrl}
                                        className="w-full h-full object-cover"
                                        autoPlay muted loop playsInline
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white/40 uppercase" style={{ fontSize: '9px', letterSpacing: '0.13em' }}>Next</span>
                                    <span className="font-bold text-white/85 leading-snug" style={{ fontSize: '12px', maxWidth: 105 }}>
                                        {nextExercise.name}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div />
                        )}

                        {/* Exercise index */}
                        <span className="font-bold text-white/40" style={{ fontSize: '13px' }}>
                            {activeIndex + 1}<span className="text-white/20">/</span>{playlist.length}
                        </span>
                    </div>

                    {/* Muscle legend — 20% smaller */}
                    <div className="flex items-center justify-center gap-4 mb-3">
                        {[
                            { label: muscles.primary,   color: '#4CAF50' },
                            { label: muscles.secondary, color: '#9C27B0' },
                            { label: muscles.stretch,   color: '#FFC107' },
                        ].map(({ label, color }) => (
                            <span key={color} className="flex items-center gap-[5px]">
                                <span className="rounded-full shrink-0" style={{ width: 7, height: 7, backgroundColor: color }} />
                                <span className="font-medium text-white/45" style={{ fontSize: '9px' }}>{label}</span>
                            </span>
                        ))}
                    </div>

                    {/* Bottom workout-progress line */}
                    <div className="h-[2px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}>
                        <motion.div
                            className="h-full rounded-full bg-white/60"
                            style={{ width: `${((activeIndex + videoProgress / 100) / playlist.length) * 100}%` }}
                            layout
                        />
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    7. SET COMPLETE FLASH
                ══════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isSetJustComplete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={  { opacity: 0 }}
                            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
                            style={{ background: 'radial-gradient(ellipse at center, rgba(76,175,80,0.28) 0%, rgba(0,0,0,0.65) 100%)' }}
                        >
                            <motion.div
                                initial={{ scale: 0.55, opacity: 0 }}
                                animate={{ scale: 1,    opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <CheckCircle2
                                    size={72} strokeWidth={1.5}
                                    style={{ color: '#4CAF50', filter: 'drop-shadow(0 0 22px rgba(76,175,80,0.9))' }}
                                />
                                <div
                                    className="text-[2.4rem] font-black text-white uppercase tracking-[0.12em]"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', textShadow: '0 0 28px rgba(76,175,80,0.5)' }}
                                >
                                    Set Complete
                                </div>
                                <div className="text-[10px] uppercase tracking-[0.45em] text-white/45 font-bold">
                                    Rest Starting...
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══════════════════════════════════════════════════════════
                    8. REST OVERLAY
                ══════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isResting && restTimer !== null && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={  { opacity: 0 }}
                            className="absolute inset-0 z-30 flex flex-col items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.58)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                        >
                            <div className="text-[10px] uppercase tracking-[0.55em] font-black mb-2 text-green-400">
                                {currentSet < totalSets ? `SET ${currentSet} DONE — RECOVER` : (nextExercise ? 'EXERCISE DONE — RECOVER' : 'FINISHED')}
                            </div>

                            {/* Rest countdown */}
                            <motion.div
                                key={restTimer}
                                initial={{ scale: 1.15, opacity: 0.5 }}
                                animate={{ scale: 1,    opacity: 1   }}
                                transition={{ duration: 0.32, ease: 'easeOut' }}
                                className="font-black leading-none text-white tracking-tighter"
                                style={{ fontFamily: 'var(--font-archivo-black)', fontSize: 'clamp(6rem, 28vw, 9rem)' }}
                            >
                                {restTimer}
                            </motion.div>

                            <div className="text-[10px] uppercase tracking-[0.4em] text-white/35 mt-1 font-bold">
                                seconds rest
                            </div>

                            <button
                                onClick={skipRest}
                                className="mt-8 px-8 py-[12px] rounded-2xl text-white font-black uppercase text-[11px] tracking-[0.3em] border border-white/18 transition-all hover:border-white/35 active:scale-[0.97]"
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
                            >
                                {currentSet < totalSets ? `START SET ${currentSet + 1}` : (nextExercise ? 'NEXT EXERCISE' : 'FINISH')}
                            </button>

                            {/* PiP preview */}
                            {nextExercise && (
                                <motion.div
                                    initial={{ y: 55, opacity: 0 }}
                                    animate={{ y: 0,  opacity: 1 }}
                                    transition={{ delay: 0.28 }}
                                    className="absolute bottom-10 right-5 rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
                                    style={{ width: 120, aspectRatio: '9/16' }}
                                >
                                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent px-2 py-1.5 z-10">
                                        <div className="text-[8px] uppercase tracking-widest text-green-400 font-black truncate">
                                            NEXT: {nextExercise.name}
                                        </div>
                                    </div>
                                    <video
                                        src={nextExercise.videoUrl}
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
