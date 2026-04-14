"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Music, Zap, CheckCircle2, Plus } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';
import { useRef, useState, useEffect, useCallback } from 'react';
import VictoryScreen from './VictoryScreen';

// ── Muscle legend fallback by category ───────────────────────────────────────
const CATEGORY_MUSCLES: Record<string, { primary: string; secondary: string; stretch: string }> = {
    Chest:     { primary: 'Pectoralis Major',   secondary: 'Triceps & Front Delts',   stretch: 'Pec Minor' },
    Back:      { primary: 'Latissimus Dorsi',    secondary: 'Biceps & Rear Delts',     stretch: 'Thoracic Spine' },
    Arms:      { primary: 'Biceps / Triceps',    secondary: 'Brachialis & Forearms',   stretch: 'Elbow Flexors' },
    Shoulders: { primary: 'Deltoids',            secondary: 'Traps & Upper Back',      stretch: 'Shoulder Capsule' },
    Legs:      { primary: 'Quadriceps',          secondary: 'Glutes & Hamstrings',     stretch: 'Hip Flexors' },
    Core:      { primary: 'Rectus Abdominis',    secondary: 'Obliques & Hip Flexors',  stretch: 'Lumbar Fascia' },
};

// ── Arc ring constants ────────────────────────────────────────────────────────
const RING_R = 82;
const RING_C = 2 * Math.PI * RING_R; // ≈ 515

interface WorkoutPlayerProps {
    playlist: LiveExercise[];
    initialIndex: number;
    onClose: () => void;
}

export default function WorkoutPlayer({ playlist, initialIndex, onClose }: WorkoutPlayerProps) {
    const videoRef   = useRef<HTMLVideoElement>(null);
    const pipRef     = useRef<HTMLVideoElement>(null);
    const tempoRef   = useRef<HTMLDivElement>(null);

    // ── Core state ────────────────────────────────────────────────────────────
    const [activeIndex, setActiveIndex]   = useState(initialIndex);
    const exercise = playlist[activeIndex];
    const [progress, setProgress]         = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);

    // ── Set state ────────────────────────────────────────────────────────────
    const [isSetStarted,      setIsSetStarted]      = useState(false);
    const [isSetJustComplete, setIsSetJustComplete] = useState(false);
    const [timeLeft,          setTimeLeft]           = useState(0);
    const [currentReps,       setCurrentReps]        = useState(0);
    const [currentSet,        setCurrentSet]         = useState(1);
    const totalSets = 4;

    // ── Trackers ─────────────────────────────────────────────────────────────
    const [totalVolume,      setTotalVolume]      = useState(0);
    const [timeUnderTension, setTimeUnderTension] = useState(0);
    const [completedSets,    setCompletedSets]    = useState(0);
    const [isPulsing,        setIsPulsing]        = useState(false);

    // ── Rest state ───────────────────────────────────────────────────────────
    const [isResting,        setIsResting]        = useState(false);
    const [restTimer,        setRestTimer]        = useState<number | null>(null);

    // ── Video state ──────────────────────────────────────────────────────────
    const [videoOpacity,     setVideoOpacity]     = useState(1);
    const [isWorkoutComplete,setIsWorkoutComplete]= useState(false);

    const nextExercise = activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;
    const nextVideoSrc = nextExercise?.videoUrl;

    // ── Derived muscle data (from libraryData or category fallback) ───────────
    const muscles = exercise?.muscles ?? {
        primary:   exercise?.targetMuscle ?? CATEGORY_MUSCLES[exercise?.category]?.primary ?? '—',
        secondary: CATEGORY_MUSCLES[exercise?.category]?.secondary ?? '—',
        stretch:   CATEGORY_MUSCLES[exercise?.category]?.stretch   ?? '—',
    };

    // ── Reset on exercise change ──────────────────────────────────────────────
    useEffect(() => {
        setIsSetStarted(false);
        setIsSetJustComplete(false);
        setIsResting(false);
        setRestTimer(null);
        setProgress(0);
        setVideoOpacity(1);
        if (exercise?.defaultTime) setTimeLeft(exercise.defaultTime);
        if (exercise?.defaultReps) { setCurrentReps(0); setCurrentSet(1); }
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.playbackRate = playbackRate;
            videoRef.current.play().catch(() => {});
        }
    }, [activeIndex]); // eslint-disable-line

    // ── Sync playback rate ────────────────────────────────────────────────────
    useEffect(() => {
        if (videoRef.current && !isResting) videoRef.current.playbackRate = playbackRate;
    }, [playbackRate, isResting]);

    // ── Cross-fade engine (3 s loop) ──────────────────────────────────────────
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

    // ── Countdown timer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!isSetStarted || !exercise?.defaultTime || isResting || isSetJustComplete) return;
        if (timeLeft <= 0) {
            // Show "Set Complete" flash for 1.5 s, then trigger rest
            setIsSetJustComplete(true);
            const t = setTimeout(() => {
                setIsSetJustComplete(false);
                triggerRestOverlay();
            }, 1600);
            return () => clearTimeout(t);
        }
        const interval = setInterval(() => {
            setTimeLeft(p => p - 1);
            setTimeUnderTension(p => p + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isSetStarted, timeLeft, exercise, isResting, isSetJustComplete]); // eslint-disable-line

    // ── Rest countdown ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isResting || restTimer === null) return;
        if (restTimer <= 0) { handleCompleteBypass(); return; }
        const interval = setInterval(() => setRestTimer(p => p! - 1), 1000);
        return () => clearInterval(interval);
    }, [isResting, restTimer]); // eslint-disable-line

    if (!exercise) return null;

    // ── Arc ring progress ─────────────────────────────────────────────────────
    const timerPct      = exercise.defaultTime && isSetStarted
        ? Math.max(0, timeLeft / exercise.defaultTime)   // 1 → 0 as timer counts down
        : 1;
    const ringOffset    = RING_C * timerPct;              // full circle when not started
    const isUrgent      = isSetStarted && exercise.defaultTime && timeLeft > 0 && timeLeft <= 5;

    // ── Format helpers ────────────────────────────────────────────────────────
    const fmt = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const displayTime = exercise.defaultTime
        ? fmt(isSetStarted ? timeLeft : exercise.defaultTime)
        : null;

    // ── Actions ───────────────────────────────────────────────────────────────
    const startSet = () => setIsSetStarted(true);

    const triggerRestOverlay = useCallback(() => {
        setIsResting(true);
        setRestTimer(nextExercise ? (exercise?.defaultRest ?? 60) : 3);
    }, [nextExercise, exercise]);

    const handleCompleteBypass = useCallback(() => {
        if (activeIndex < playlist.length - 1) setActiveIndex(p => p + 1);
        else setIsWorkoutComplete(true);
    }, [activeIndex, playlist.length]);

    const handleNext = () => handleCompleteBypass();
    const handlePrev = () => { if (activeIndex > 0) setActiveIndex(p => p - 1); };

    const cyclePlaybackSpeed = () => setPlaybackRate(p => p === 1.0 ? 0.5 : 1.0);

    const incrementRep = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
        setIsPulsing(true);
        setTotalVolume(p => p + 1);
        setTimeout(() => setIsPulsing(false), 300);
        setCurrentReps(prev => {
            const next = prev + 1;
            try {
                localStorage.setItem(`mrworkout_${exercise.id}`, JSON.stringify({
                    date: new Date().toISOString(), set: currentSet, reps: next,
                }));
            } catch {}
            if (exercise.defaultReps && next >= exercise.defaultReps) {
                if (currentSet < totalSets) {
                    setTimeout(() => { setCurrentSet(s => s + 1); setCurrentReps(0); setCompletedSets(s => s + 1); }, 500);
                } else {
                    setTimeout(() => { setCompletedSets(s => s + 1); triggerRestOverlay(); }, 400);
                }
                return exercise.defaultReps;
            }
            return Math.min(next, exercise.defaultReps ?? 99);
        });
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const { currentTime, duration } = videoRef.current;
            if (duration > 0) setProgress((currentTime / duration) * 100);
        }
    };

    const isComplete =
        (exercise.defaultTime  && timeLeft === 0    && isSetStarted) ||
        (exercise.defaultReps  && currentReps >= exercise.defaultReps && currentSet === totalSets);

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
                {/* ── Video ── */}
                <video
                    ref={videoRef}
                    src={exercise.videoUrl}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        opacity: isResting ? 0.2 : videoOpacity === 1 ? 1 : 0.5,
                        filter:  isResting ? 'blur(10px)' : 'none',
                        transition: 'opacity 0.2s ease',
                    }}
                    playsInline preload="auto" muted loop={false}
                    onTimeUpdate={handleTimeUpdate}
                />

                {/* ── Gradients ── */}
                <div className="absolute inset-x-0 top-0    h-56  bg-gradient-to-b  from-black/80 via-black/30 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black    via-black/65 to-transparent pointer-events-none z-10" />

                {/* ── Header ── */}
                <div className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center pt-14 px-6">
                    <button
                        onClick={onClose}
                        className="absolute left-4 text-white/90 p-2 hover:text-white transition-colors"
                        style={{ top: '3.2rem' }}
                    >
                        <ChevronLeft size={28} strokeWidth={2.5} />
                    </button>

                    {/* Arc ring + timer */}
                    {displayTime !== null ? (
                        <div className="relative flex items-center justify-center" style={{ width: 188, height: 188 }}>
                            {/* SVG ring */}
                            <svg
                                className="absolute inset-0 w-full h-full"
                                viewBox="0 0 188 188"
                                style={{ transform: 'rotate(-90deg)' }}
                            >
                                {/* Track */}
                                <circle
                                    cx="94" cy="94" r={RING_R}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.12)"
                                    strokeWidth="3"
                                />
                                {/* Progress */}
                                <circle
                                    cx="94" cy="94" r={RING_R}
                                    fill="none"
                                    stroke={isUrgent ? '#ef4444' : '#4CAF50'}
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeDasharray={RING_C}
                                    strokeDashoffset={ringOffset}
                                    style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease' }}
                                />
                            </svg>

                            {/* Timer digits */}
                            <motion.div
                                key={displayTime}
                                initial={{ scale: 1.06, opacity: 0.7 }}
                                animate={{ scale: 1,    opacity: 1   }}
                                transition={{ duration: 0.18 }}
                                className="relative text-[3.8rem] font-black text-white leading-none tracking-tight"
                                style={{
                                    fontFamily: 'var(--font-archivo-black), sans-serif',
                                    textShadow: isUrgent
                                        ? '0 0 20px rgba(239,68,68,0.8)'
                                        : isSetStarted
                                            ? '0 0 12px rgba(76,175,80,0.5)'
                                            : 'none',
                                    color: isUrgent ? '#fca5a5' : 'white',
                                }}
                            >
                                {displayTime}
                            </motion.div>
                        </div>
                    ) : (
                        /* Rep counter display — no ring needed */
                        <div className="relative flex items-center justify-center" style={{ width: 188, height: 188 }}>
                            <div
                                className="text-[3.8rem] font-black text-white leading-none tracking-tight"
                                style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                            >
                                <span style={{ color: isPulsing ? '#00FFFF' : 'white', transition: 'color 0.15s' }}>
                                    {String(currentReps).padStart(2, '0')}
                                </span>
                                <span className="text-[2rem] text-white/30 mx-1">/</span>
                                <span className="text-[2.2rem] text-white/50">{exercise.defaultReps}</span>
                            </div>
                        </div>
                    )}

                    {/* Exercise name */}
                    <p className="text-[15px] text-white/75 font-medium mt-1 tracking-wide text-center px-16 leading-snug">
                        {exercise.name}
                    </p>
                </div>

                {/* ── Right-side buttons ── */}
                <div className="absolute right-4 z-20 flex flex-col gap-3" style={{ top: '42%' }}>
                    {/* Music (decorative) */}
                    <button
                        className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: 'rgba(76,175,80,0.80)', backdropFilter: 'blur(14px)' }}
                    >
                        <Music size={19} className="text-white" />
                    </button>

                    {/* Speed toggle */}
                    <button
                        onClick={cyclePlaybackSpeed}
                        className="w-12 h-12 rounded-[14px] flex flex-col items-center justify-center shadow-lg gap-0.5 transition-all active:scale-95"
                        style={{
                            backgroundColor: playbackRate === 0.5 ? 'rgba(76,175,80,1)' : 'rgba(76,175,80,0.80)',
                            backdropFilter: 'blur(14px)',
                            boxShadow: playbackRate === 0.5 ? '0 0 18px rgba(76,175,80,0.65)' : undefined,
                        }}
                    >
                        <Zap size={16} className="text-white" fill={playbackRate === 0.5 ? 'white' : 'none'} />
                        <span className="text-white font-black leading-none" style={{ fontSize: '9px' }}>
                            {playbackRate === 0.5 ? '0.5×' : '1×'}
                        </span>
                    </button>
                </div>

                {/* ── Bottom layer ── */}
                <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-6">

                    {/* Stats row */}
                    <div className="flex items-end justify-between mb-4">
                        {/* Left: duration + sets */}
                        <div className="flex flex-col leading-tight">
                            <span
                                className="text-[2.4rem] font-black text-white leading-none"
                                style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                            >
                                {exercise.defaultTime ? `${exercise.defaultTime} sec` : `${exercise.defaultReps} reps`}
                            </span>
                            <span className="text-[1.25rem] font-black text-white/90 mt-0.5">
                                Sets {currentSet}/{totalSets}
                            </span>
                        </div>

                        {/* Center: Up Next */}
                        {nextExercise && (
                            <div className="flex items-center gap-2.5 mx-3">
                                <div className="w-[52px] h-[52px] rounded-xl overflow-hidden bg-black/50 shrink-0 border border-white/15">
                                    <video
                                        ref={pipRef}
                                        src={nextVideoSrc}
                                        className="w-full h-full object-cover"
                                        autoPlay muted loop playsInline
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-white/45 uppercase tracking-[0.14em] font-bold">Next</span>
                                    <span className="text-[13px] font-bold text-white leading-snug max-w-[110px]">
                                        {nextExercise.name}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Right: index */}
                        <div className="text-white/50 text-[15px] font-bold shrink-0">
                            {activeIndex + 1}<span className="text-white/25">/</span>{playlist.length}
                        </div>
                    </div>

                    {/* ── Action button ── */}
                    <AnimatePresence mode="wait">
                        {!isSetStarted ? (
                            <motion.button
                                key="start"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0  }}
                                exit={  { opacity: 0, y: -6  }}
                                onClick={startSet}
                                className="w-full py-[15px] rounded-2xl font-black uppercase tracking-[0.22em] text-[14px] text-white border border-white/20 transition-all active:scale-[0.97]"
                                style={{ backgroundColor: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(18px)' }}
                            >
                                START SET
                            </motion.button>

                        ) : isComplete ? (
                            <motion.button
                                key="complete"
                                initial={{ opacity: 0, scale: 0.93 }}
                                animate={{ opacity: 1, scale: 1   }}
                                exit={  { opacity: 0             }}
                                onClick={handleNext}
                                className="w-full py-[15px] rounded-2xl font-black uppercase tracking-[0.22em] text-[14px] bg-green-500 text-black flex items-center justify-center gap-3 active:scale-[0.97] transition-all"
                                style={{ boxShadow: '0 0 28px rgba(34,197,94,0.4)' }}
                            >
                                <CheckCircle2 size={18} />
                                {nextExercise ? 'NEXT EXERCISE' : 'FINISH WORKOUT'}
                            </motion.button>

                        ) : exercise.defaultReps && !exercise.defaultTime ? (
                            <motion.button
                                key="rep"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={  { opacity: 0        }}
                                onClick={incrementRep}
                                className="w-full py-[15px] rounded-2xl font-black uppercase tracking-[0.22em] text-[14px] text-black flex items-center justify-center gap-3 active:scale-[0.97] transition-all"
                                style={{
                                    backgroundColor: isPulsing ? '#33ffff' : '#00FFFF',
                                    boxShadow: isPulsing
                                        ? '0 0 28px rgba(0,255,255,0.6)'
                                        : '0 0 10px rgba(0,255,255,0.2)',
                                    transition: 'background-color 0.12s, box-shadow 0.12s',
                                }}
                            >
                                <Plus size={18} />
                                LOG REP
                                <span className="text-black/50 font-bold text-[12px]">
                                    {currentReps}/{exercise.defaultReps}
                                </span>
                            </motion.button>

                        ) : (
                            /* Timed set in progress */
                            <motion.div
                                key="active"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full py-[15px] rounded-2xl font-black uppercase tracking-[0.3em] text-[12px] text-white/35 text-center border border-white/08"
                                style={{ backgroundColor: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(4px)' }}
                            >
                                · · · in progress · · ·
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ── Muscle legend (from libraryData via muscles field or category fallback) ── */}
                    <div className="flex items-center justify-center gap-5 mt-[14px]">
                        {[
                            { label: muscles.primary,   dot: '#4CAF50', tag: 'Primary'   },
                            { label: muscles.secondary, dot: '#9C27B0', tag: 'Secondary' },
                            { label: muscles.stretch,   dot: '#FFC107', tag: 'Stretches' },
                        ].map(({ label, dot, tag }) => (
                            <div key={tag} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                                <span className="text-[10px] text-white/50 font-medium">{label}</span>
                            </div>
                        ))}
                    </div>

                    {/* ── Progress bar ── */}
                    <div className="mt-[14px] h-[2px] bg-white/12 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-white/80 rounded-full"
                            style={{ width: `${((activeIndex + progress / 100) / playlist.length) * 100}%` }}
                            layout
                        />
                    </div>
                </div>

                {/* ── Set Complete Flash ── */}
                <AnimatePresence>
                    {isSetJustComplete && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{   opacity: 0 }}
                            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
                            style={{ background: 'radial-gradient(ellipse at center, rgba(76,175,80,0.25) 0%, rgba(0,0,0,0.6) 100%)' }}
                        >
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1,   opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <CheckCircle2 size={80} strokeWidth={1.5} style={{ color: '#4CAF50', filter: 'drop-shadow(0 0 20px rgba(76,175,80,0.8))' }} />
                                <div
                                    className="text-[2.6rem] font-black text-white uppercase tracking-[0.15em]"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', textShadow: '0 0 30px rgba(76,175,80,0.5)' }}
                                >
                                    Set Complete
                                </div>
                                <div className="text-[11px] uppercase tracking-[0.4em] text-white/50 font-bold">
                                    Rest Starting...
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Rest Overlay ── */}
                <AnimatePresence>
                    {isResting && restTimer !== null && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{   opacity: 0 }}
                            className="absolute inset-0 z-30 flex flex-col items-center justify-center"
                            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
                        >
                            <div className="text-[11px] uppercase tracking-[0.55em] font-black mb-3 text-green-400">
                                {nextExercise ? 'RECOVER' : 'FINISHED'}
                            </div>

                            {/* Rest countdown */}
                            <motion.div
                                key={restTimer}
                                initial={{ scale: 1.18, opacity: 0.5 }}
                                animate={{ scale: 1,    opacity: 1   }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className="text-[8.5rem] font-black leading-none text-white tracking-tighter"
                                style={{ fontFamily: 'var(--font-archivo-black)' }}
                            >
                                {restTimer}
                            </motion.div>

                            <div className="text-[11px] uppercase tracking-[0.4em] text-white/40 mt-2 font-bold">
                                seconds rest
                            </div>

                            <button
                                onClick={handleCompleteBypass}
                                className="mt-9 px-9 py-[13px] rounded-2xl text-white font-black uppercase text-[12px] tracking-[0.3em] border border-white/20 transition-all hover:border-white/40 active:scale-[0.97]"
                                style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)' }}
                            >
                                SKIP REST
                            </button>

                            {/* PiP */}
                            {nextExercise && nextVideoSrc && (
                                <motion.div
                                    initial={{ y: 60, opacity: 0 }}
                                    animate={{ y: 0,  opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                    className="absolute bottom-10 right-5 w-[130px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl"
                                    style={{ aspectRatio: '9/16' }}
                                >
                                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent px-2 py-1.5 z-10">
                                        <div className="text-[8px] uppercase tracking-widest text-green-400 font-black truncate">
                                            NEXT: {nextExercise.name}
                                        </div>
                                    </div>
                                    <video
                                        src={nextVideoSrc}
                                        className="w-full h-full object-cover opacity-90"
                                        playsInline autoPlay muted loop
                                    />
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Invisible edge swipe zones */}
                {!isResting && activeIndex > 0 && (
                    <button onClick={handlePrev} className="absolute left-0 top-1/4 bottom-1/4 w-10 z-20 opacity-0" aria-label="Previous" />
                )}
                {!isResting && activeIndex < playlist.length - 1 && (
                    <button onClick={handleNext} className="absolute right-0 top-1/4 bottom-1/4 w-10 z-20 opacity-0" aria-label="Next" />
                )}

            </motion.div>
        </AnimatePresence>
    );
}
