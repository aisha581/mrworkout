"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Music, Zap, CheckCircle2, Plus } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';
import { useRef, useState, useEffect } from 'react';
import VictoryScreen from './VictoryScreen';

interface WorkoutPlayerProps {
    playlist: LiveExercise[];
    initialIndex: number;
    onClose: () => void;
}

export default function WorkoutPlayer({ playlist, initialIndex, onClose }: WorkoutPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pipRef = useRef<HTMLVideoElement>(null);

    // Core Navigation & State
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const exercise = playlist[activeIndex];
    const [progress, setProgress] = useState(0);

    // Playback Settings
    const [playbackRate, setPlaybackRate] = useState<number>(1.0);

    // Workout Focus State
    const [isSetStarted, setIsSetStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentReps, setCurrentReps] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const totalSets = 4;

    // Global Trackers
    const [totalVolume, setTotalVolume] = useState(0);
    const [timeUnderTension, setTimeUnderTension] = useState(0);
    const [completedSets, setCompletedSets] = useState(0);
    const [isPulsing, setIsPulsing] = useState(false);
    const tempoRef = useRef<HTMLDivElement>(null);

    // Rest State
    const [isResting, setIsResting] = useState(false);
    const [restTimer, setRestTimer] = useState<number | null>(null);

    // Cross-fade Looping
    const [videoOpacity, setVideoOpacity] = useState(1);
    const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

    const nextExercise = activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;
    const nextVideoSrc = nextExercise?.videoUrl;

    // Reset when exercise changes
    useEffect(() => {
        setIsSetStarted(false);
        setIsResting(false);
        setRestTimer(null);
        setProgress(0);
        setVideoOpacity(1);
        if (exercise.defaultTime) setTimeLeft(exercise.defaultTime);
        if (exercise.defaultReps) { setCurrentReps(0); setCurrentSet(1); }
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.playbackRate = playbackRate;
            videoRef.current.play().catch(e => console.warn("Auto-play prevented", e));
        }
    }, [activeIndex, exercise, playbackRate]);

    // Sync playback rate
    useEffect(() => {
        if (videoRef.current && !isResting) videoRef.current.playbackRate = playbackRate;
    }, [playbackRate, isResting]);

    // Cross-fade engine
    useEffect(() => {
        let reqId: number;
        const handleCrossFadeWrap = () => {
            if (videoRef.current) {
                const ct = videoRef.current.currentTime;
                if (tempoRef.current && !isResting) {
                    const pct = Math.min((ct / 3.0) * 100, 100);
                    tempoRef.current.style.background = `conic-gradient(from 0deg, #4CAF50 ${pct}%, transparent ${pct}%, transparent 100%)`;
                }
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
            reqId = requestAnimationFrame(handleCrossFadeWrap);
        };
        reqId = requestAnimationFrame(handleCrossFadeWrap);
        return () => cancelAnimationFrame(reqId);
    }, [videoOpacity, isResting]);

    // Timer countdown
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSetStarted && exercise?.defaultTime && timeLeft > 0 && !isResting) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
                setTimeUnderTension(prev => prev + 1);
            }, 1000);
        } else if (timeLeft === 0 && isSetStarted && exercise?.defaultTime && !isResting) {
            triggerRestOverlay();
        }
        return () => clearInterval(interval);
    }, [isSetStarted, timeLeft, exercise, isResting]);

    // Rest countdown
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isResting && restTimer !== null && restTimer > 0) {
            interval = setInterval(() => setRestTimer(prev => prev! - 1), 1000);
        } else if (isResting && restTimer === 0) {
            handleCompleteBypass();
        }
        return () => clearInterval(interval);
    }, [isResting, restTimer]);

    if (!exercise) return null;

    // ── Actions ────────────────────────────────────────────────────────────────
    const startSet = () => setIsSetStarted(true);

    const incrementRep = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
        setIsPulsing(true);
        setTotalVolume(prev => prev + 1);
        setTimeout(() => setIsPulsing(false), 300);
        setCurrentReps(prev => {
            const next = prev + 1;
            try {
                localStorage.setItem(`mrworkout_progress_${exercise.id}`, JSON.stringify({
                    date: new Date().toISOString(), set: currentSet, reps: next
                }));
            } catch {}
            if (exercise.defaultReps && next >= exercise.defaultReps) {
                if (currentSet < totalSets) {
                    setTimeout(() => { setCurrentSet(c => c + 1); setCurrentReps(0); setCompletedSets(p => p + 1); }, 500);
                } else {
                    setTimeout(() => { setCompletedSets(p => p + 1); triggerRestOverlay(); }, 400);
                }
                return exercise.defaultReps;
            }
            return Math.min(next, exercise.defaultReps || 99);
        });
    };

    const triggerRestOverlay = () => {
        setIsResting(true);
        setRestTimer(nextExercise ? (exercise.defaultRest || 60) : 3);
    };

    const handleCompleteBypass = () => {
        if (activeIndex < playlist.length - 1) setActiveIndex(prev => prev + 1);
        else setIsWorkoutComplete(true);
    };

    const handleNext = () => handleCompleteBypass();
    const handlePrev = () => { if (activeIndex > 0) setActiveIndex(prev => prev - 1); };
    const cyclePlaybackSpeed = () => setPlaybackRate(prev => prev === 1.0 ? 0.5 : 1.0);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const { currentTime, duration } = videoRef.current;
            if (duration > 0) setProgress((currentTime / duration) * 100);
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    };

    const isComplete =
        (exercise.defaultTime && timeLeft === 0 && isSetStarted) ||
        (exercise.defaultReps && currentReps >= exercise.defaultReps && currentSet === totalSets);

    const displayTime = exercise.defaultTime
        ? formatTime(isSetStarted ? timeLeft : exercise.defaultTime)
        : formatTime(0);

    const videoSrc = exercise.videoUrl;

    // ── Victory Screen ─────────────────────────────────────────────────────────
    if (isWorkoutComplete) {
        return (
            <AnimatePresence>
                <VictoryScreen
                    totalVolume={totalVolume}
                    timeUnderTension={timeUnderTension}
                    completedSets={completedSets}
                    category={playlist[0]?.category?.toUpperCase() || 'TARGET'}
                    onReturn={onClose}
                />
            </AnimatePresence>
        );
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] overflow-hidden bg-black"
            >
                {/* ── 1. Full-Screen Video ── */}
                <video
                    ref={videoRef}
                    src={videoSrc}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        opacity: isResting ? 0.25 : (videoOpacity === 1 ? 1 : 0.5),
                        transition: 'opacity 0.2s ease',
                        filter: isResting ? 'blur(8px)' : 'none',
                    }}
                    playsInline
                    preload="auto"
                    muted
                    loop={false}
                    onTimeUpdate={handleTimeUpdate}
                />

                {/* ── 2. Gradient Overlays ── */}
                {/* Top */}
                <div className="absolute inset-x-0 top-0 h-52 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none z-10" />
                {/* Bottom */}
                <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none z-10" />

                {/* ── 3. Header ── */}
                <div className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center pt-14 px-6">
                    {/* Back button */}
                    <button
                        onClick={onClose}
                        className="absolute left-5 top-[3.75rem] text-white p-1"
                        style={{ top: '3.5rem' }}
                    >
                        <ChevronLeft size={30} strokeWidth={2} />
                    </button>

                    {/* Timer */}
                    {exercise.defaultTime ? (
                        <motion.div
                            key={isSetStarted ? timeLeft : 'idle'}
                            initial={{ scale: 1.05, opacity: 0.8 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                            className="text-[5.5rem] font-black text-white leading-none tracking-tight"
                            style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                        >
                            {displayTime}
                        </motion.div>
                    ) : (
                        <div
                            className="text-[5.5rem] font-black text-white leading-none tracking-tight"
                            style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                        >
                            {String(currentReps).padStart(2, '0')}:{String(exercise.defaultReps || 0).padStart(2, '0')}
                        </div>
                    )}

                    {/* Exercise name */}
                    <p className="text-base text-white/75 font-medium mt-2 tracking-wide text-center px-12">
                        {exercise.name}
                    </p>
                </div>

                {/* ── 4. Right-Side Utility Buttons ── */}
                <div className="absolute right-5 z-20 flex flex-col gap-3" style={{ top: '38%' }}>
                    {/* Music */}
                    <button className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg"
                        style={{ backgroundColor: 'rgba(76,175,80,0.85)', backdropFilter: 'blur(12px)' }}>
                        <Music size={20} className="text-white" />
                    </button>

                    {/* Speed toggle */}
                    <button
                        onClick={cyclePlaybackSpeed}
                        className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg transition-all"
                        style={{
                            backgroundColor: playbackRate === 0.5 ? 'rgba(76,175,80,1)' : 'rgba(76,175,80,0.85)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: playbackRate === 0.5 ? '0 0 16px rgba(76,175,80,0.6)' : undefined,
                        }}
                    >
                        <Zap size={20} className="text-white" fill={playbackRate === 0.5 ? 'white' : 'none'} />
                    </button>
                </div>

                {/* ── 5. Bottom Layer ── */}
                <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-7">

                    {/* Info row: left stats · next exercise · exercise index */}
                    <div className="flex items-end justify-between mb-4">

                        {/* Left: duration + sets */}
                        <div className="flex flex-col leading-tight">
                            <span className="text-[2.6rem] font-black text-white leading-none"
                                style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}>
                                {exercise.defaultTime ? `${exercise.defaultTime} sec` : `${exercise.defaultReps} reps`}
                            </span>
                            <span className="text-[1.4rem] font-black text-white mt-0.5">
                                Sets {currentSet}/{totalSets}
                            </span>
                        </div>

                        {/* Center: Up Next thumbnail */}
                        {nextExercise && (
                            <div className="flex items-center gap-3 mx-4">
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/50 shrink-0 border border-white/10">
                                    <video
                                        ref={pipRef}
                                        src={nextVideoSrc}
                                        className="w-full h-full object-cover"
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-white/50 uppercase tracking-[0.15em] font-bold">Next</span>
                                    <span className="text-sm font-bold text-white leading-snug max-w-[120px]">{nextExercise.name}</span>
                                </div>
                            </div>
                        )}

                        {/* Right: exercise index */}
                        <div className="text-white/55 text-base font-bold shrink-0">
                            {activeIndex + 1}/{playlist.length}
                        </div>
                    </div>

                    {/* Action button */}
                    <AnimatePresence mode="wait">
                        {!isSetStarted ? (
                            <motion.button
                                key="start"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                onClick={startSet}
                                className="w-full py-[14px] rounded-2xl font-black uppercase tracking-[0.2em] text-[15px] text-white border border-white/25 transition-all active:scale-[0.98] hover:border-white/40"
                                style={{ backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(16px)' }}
                            >
                                START SET
                            </motion.button>
                        ) : isComplete ? (
                            <motion.button
                                key="complete"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={handleNext}
                                className="w-full py-[14px] rounded-2xl font-black uppercase tracking-[0.2em] text-[15px] bg-green-500 text-black flex items-center justify-center gap-3 hover:bg-green-400 transition-all active:scale-[0.98] shadow-[0_0_30px_rgba(34,197,94,0.35)]"
                            >
                                <CheckCircle2 size={20} />
                                {nextExercise ? 'NEXT EXERCISE' : 'FINISH WORKOUT'}
                            </motion.button>
                        ) : exercise.defaultReps && !exercise.defaultTime ? (
                            <motion.button
                                key="rep"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                onClick={incrementRep}
                                className="w-full py-[14px] rounded-2xl font-black uppercase tracking-[0.2em] text-[15px] text-black flex items-center justify-center gap-3 transition-all active:scale-[0.97]"
                                style={{
                                    backgroundColor: isPulsing ? '#33ffff' : '#00FFFF',
                                    boxShadow: isPulsing ? '0 0 24px rgba(0,255,255,0.5)' : '0 0 12px rgba(0,255,255,0.2)',
                                    transition: 'background-color 0.15s, box-shadow 0.15s',
                                }}
                            >
                                <Plus size={20} />
                                LOG REP
                                <span className="ml-1 opacity-60 font-bold text-sm">
                                    {currentReps}/{exercise.defaultReps}
                                </span>
                            </motion.button>
                        ) : (
                            <motion.div
                                key="active"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full py-[14px] rounded-2xl text-white/40 font-black uppercase tracking-[0.3em] text-sm text-center border border-white/10 animate-pulse"
                                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                            >
                                IN PROGRESS
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Muscle legend */}
                    <div className="flex items-center justify-center gap-6 mt-4">
                        {[
                            { label: 'Primary',   color: '#4CAF50' },
                            { label: 'Secondary', color: '#9C27B0' },
                            { label: 'Stretches', color: '#FFC107' },
                        ].map(({ label, color }) => (
                            <span key={label} className="flex items-center gap-1.5 text-[11px] text-white/55 font-medium">
                                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: color }} />
                                {label}
                            </span>
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 h-[2px] bg-white/15 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${((activeIndex + progress / 100) / playlist.length) * 100}%` }}
                            layout
                        />
                    </div>
                </div>

                {/* ── 6. Rest Overlay ── */}
                <AnimatePresence>
                    {isResting && restTimer !== null && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
                        >
                            <div className="text-sm uppercase tracking-[0.5em] font-black mb-4 text-green-400">
                                {nextExercise ? 'RECOVER' : 'FINISHED'}
                            </div>
                            <motion.div
                                className="text-[9rem] font-black leading-none text-white tracking-tighter"
                                style={{ fontFamily: 'var(--font-archivo-black)' }}
                                key={restTimer}
                                initial={{ scale: 1.15, opacity: 0.5 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            >
                                {restTimer}
                            </motion.div>

                            <button
                                onClick={handleCompleteBypass}
                                className="mt-8 px-10 py-4 rounded-2xl text-white font-black uppercase text-sm tracking-widest border border-white/20 transition-all hover:bg-white/10"
                                style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}
                            >
                                SKIP REST
                            </button>

                            {/* PiP next exercise */}
                            {nextExercise && nextVideoSrc && (
                                <motion.div
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="absolute bottom-10 right-6 w-36 aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
                                >
                                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-2 z-10">
                                        <div className="text-[9px] uppercase tracking-widest text-green-400 font-black truncate">
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

                {/* Invisible prev/next swipe zones */}
                {!isResting && activeIndex > 0 && (
                    <button onClick={handlePrev} className="absolute left-0 top-1/4 bottom-1/4 w-12 z-20 opacity-0" aria-label="Previous exercise" />
                )}
                {!isResting && activeIndex < playlist.length - 1 && (
                    <button onClick={handleNext} className="absolute right-0 top-1/4 bottom-1/4 w-12 z-20 opacity-0" aria-label="Next exercise" />
                )}

            </motion.div>
        </AnimatePresence>
    );
}
