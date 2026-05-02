"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Music, Zap, CheckCircle2 } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';
import { useRef, useState, useEffect, useCallback } from 'react';
import VictoryScreen from './VictoryScreen';
import { getRandomSavageQuote } from '@/data/quotes';
import { useWorkout } from '@/contexts/WorkoutContext';

// ── Muscle legend — category fallback ────────────────────────────────────────
const CATEGORY_MUSCLES: Record<string, { primary: string; secondary: string; stretch: string }> = {
    Chest:     { primary: 'Pectoralis Major',  secondary: 'Triceps & Front Delts',  stretch: 'Pec Minor'        },
    Back:      { primary: 'Latissimus Dorsi',  secondary: 'Biceps & Rear Delts',    stretch: 'Thoracic Spine'   },
    Arms:      { primary: 'Biceps / Triceps',  secondary: 'Brachialis & Forearms',  stretch: 'Elbow Flexors'    },
    Shoulders: { primary: 'Deltoids',          secondary: 'Traps & Upper Back',     stretch: 'Shoulder Capsule' },
    Legs:      { primary: 'Quadriceps',        secondary: 'Glutes & Hamstrings',    stretch: 'Hip Flexors'      },
    Core:      { primary: 'Rectus Abdominis',  secondary: 'Obliques & Hip Flexors', stretch: 'Lumbar Fascia'    },
};

const timerHsl = (e: number) => `hsl(${Math.round(120 * (1 - Math.min(e, 1)))},82%,52%)`;

const glassCircle: React.CSSProperties = {
    background:           'rgba(255,255,255,0.14)',
    backdropFilter:       'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border:               '1px solid rgba(255,255,255,0.25)',
    boxShadow:            '0 4px 20px rgba(0,0,0,0.4)',
};

const touchBtn: React.CSSProperties = { touchAction: 'manipulation', cursor: 'pointer' };

// Full GPU compositor promotion — translate3d forces layer creation on all
// mobile browsers including older WebKit; backface-visibility hidden prevents
// the layer from being invalidated on repaints.
const gpuLayer: React.CSSProperties = {
    transform:                 'translate3d(0,0,0)',
    backfaceVisibility:        'hidden',
    WebkitBackfaceVisibility:  'hidden',
    willChange:                'transform',
};

interface WorkoutPlayerProps {
    playlist:     LiveExercise[];
    initialIndex: number;
    onClose:      () => void;
}

export default function WorkoutPlayer({ playlist, initialIndex, onClose }: WorkoutPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { setPlayerOpen } = useWorkout();

    // Signal nav components to hide themselves while player is visible
    useEffect(() => {
        setPlayerOpen(true);
        return () => setPlayerOpen(false);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Navigation ────────────────────────────────────────────────────────────
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const exercise = playlist[activeIndex];
    const nextEx   = activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;
    const hasPrev  = activeIndex > 0;
    const hasNext  = !!nextEx;

    const setDuration = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);

    // ── Set state ─────────────────────────────────────────────────────────────
    const [isSetStarted,      setIsSetStarted]      = useState(false);
    const [isSetJustComplete, setIsSetJustComplete] = useState(false);
    const [timeLeft,          setTimeLeft]           = useState(setDuration);
    const [currentSet,        setCurrentSet]         = useState(1);
    const totalSets = 4;

    // ── Playback ──────────────────────────────────────────────────────────────
    const [playbackRate, setPlaybackRate] = useState(1.0);

    // ── Trackers ──────────────────────────────────────────────────────────────
    const [timeUnderTension, setTimeUnderTension] = useState(0);
    const [completedSets,    setCompletedSets]    = useState(0);
    const [totalVolume,      setTotalVolume]      = useState(0);

    // ── Rest ──────────────────────────────────────────────────────────────────
    const [isResting, setIsResting] = useState(false);
    const [restTimer, setRestTimer] = useState<number | null>(null);
    const [restQuote, setRestQuote] = useState('');

    // ── Finish ────────────────────────────────────────────────────────────────
    const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

    // ── Hot-path refs (readable in callbacks without stale closures) ──────────
    const isRestingRef    = useRef(false);
    const playbackRateRef = useRef(1.0);
    // isSeekingRef guards against concurrent seeks.
    // onTimeUpdate fires up to 30× per second; without this guard, multiple
    // seek + opacity-dip calls can stack on the same loop boundary, which
    // accumulates timing debt and stalls the decoder after ~20–30 seconds.
    const isSeekingRef    = useRef(false);

    useEffect(() => { isRestingRef.current    = isResting;    }, [isResting]);
    useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

    // ── Imperative video style helpers (no React re-render) ──────────────────
    // opacity and filter are managed here, NOT in the React style prop.
    // This prevents every 1-Hz setTimeLeft re-render from overwriting the
    // values set by the loop handler.
    const setVideoVisible = useCallback((resting: boolean) => {
        const v = videoRef.current;
        if (!v) return;
        v.style.opacity = resting ? '0.15' : '1';
        v.style.filter  = resting ? 'blur(10px)' : 'none';
    }, []);

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

    // ── Infinity Loop handler ─────────────────────────────────────────────────
    //
    // Design goals:
    //   1. Zero React state changes → zero re-renders in the hot path.
    //   2. Single seek per loop cycle (isSeekingRef guard).
    //   3. 80ms opacity dip hides the decoder's seek-to-0 stall.
    //   4. Threshold at (duration - 0.1s) avoids the trailing black frame.
    //
    // This is wired via addEventListener (see below) NOT the React onTimeUpdate
    // prop. React's synthetic event system adds delegation overhead (attach to
    // root → bubble → find fiber → dispatch) on every single timeupdate event.
    // The native listener with { passive: true } fires directly, with zero
    // framework overhead.
    const handleTimeUpdate = useCallback(() => {
        const v = videoRef.current;
        if (!v || !v.duration || isNaN(v.duration) || isSeekingRef.current) return;
        if (v.currentTime >= v.duration - 0.1) {
            isSeekingRef.current = true;
            v.currentTime = 0;
            if (!isRestingRef.current) {
                v.style.opacity = '0';
                setTimeout(() => {
                    isSeekingRef.current = false;
                    if (videoRef.current && !isRestingRef.current) {
                        videoRef.current.style.opacity = '1';
                    }
                }, 80);
            } else {
                isSeekingRef.current = false;
            }
        }
    }, []); // stable — reads only refs, never stale, never recreated

    // ── Wire timeupdate directly, bypassing React's synthetic event system ────
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        // passive: true — tells the browser this handler never calls
        // preventDefault(), allowing it to batch/optimise event delivery.
        v.addEventListener('timeupdate', handleTimeUpdate, { passive: true });
        return () => v.removeEventListener('timeupdate', handleTimeUpdate);
    }, [handleTimeUpdate]);

    // ── Exercise change: explicit memory flush → load new clip ────────────────
    //
    //   pause()              stop the hardware decoder immediately
    //   removeAttribute(src) cleanly severs the browser's object reference;
    //                        more reliable than src='' (which some browsers
    //                        interpret as "load current page URL")
    //   load()               triggers the media engine's buffer teardown,
    //                        releasing decoded frames from RAM / VRAM
    //   src = newUrl         fresh assignment gives the decoder a clean start
    //   load() + play()      explicit pipeline initialisation
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const dur = exercise?.defaultTime ?? (exercise?.defaultReps ? exercise.defaultReps * 3 : 30);
        setIsSetStarted(false);
        setIsSetJustComplete(false);
        setIsResting(false);
        setRestTimer(null);
        setTimeLeft(dur);
        setCurrentSet(1);

        // Clear any in-progress seek guard from the previous clip
        isSeekingRef.current = false;

        // ── Memory flush ───────────────────────────────────────────────────
        v.pause();
        v.removeAttribute('src');
        v.load();

        // ── Reset visual state ─────────────────────────────────────────────
        v.style.opacity = '1';
        v.style.filter  = 'none';

        // ── Load new clip ──────────────────────────────────────────────────
        if (exercise?.videoUrl) {
            v.src          = exercise.videoUrl;
            v.playbackRate = playbackRateRef.current;
            v.load();
            v.play().catch(() => {});
        }
    }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Pause/resume on rest toggle ───────────────────────────────────────────
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        if (isResting) {
            v.pause();
            setVideoVisible(true);
        } else {
            setVideoVisible(false);
            v.playbackRate = playbackRateRef.current;
            v.play().catch(() => {});
        }
    }, [isResting, setVideoVisible]);

    // ── Sync playback rate ────────────────────────────────────────────────────
    useEffect(() => {
        const v = videoRef.current;
        if (v && !isResting) v.playbackRate = playbackRate;
    }, [playbackRate, isResting]);

    // ── Countdown → auto-log → rest ───────────────────────────────────────────
    useEffect(() => {
        if (!isSetStarted || isResting || isSetJustComplete) return;
        if (timeLeft <= 0) {
            navigator.vibrate?.([100, 50, 100]);
            setTotalVolume(v  => v + (exercise?.defaultReps ?? 1));
            setTimeUnderTension(t => t + setDuration);
            setCompletedSets(s => s + 1);
            setIsSetJustComplete(true);
            const restDur = nextEx ? (exercise?.defaultRest ?? 60) : 3;
            const tid = setTimeout(() => {
                setIsSetJustComplete(false);
                setIsResting(true);
                setRestTimer(restDur);
                setRestQuote(getRandomSavageQuote());
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
        if (restTimer <= 0) { navigator.vibrate?.([50, 30, 50]); advanceAfterRest(); return; }
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
    const goToPrev   = () => { if (hasPrev) setActiveIndex(p => p - 1); };
    const goToNext   = () => { if (hasNext) setActiveIndex(p => p + 1); };

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
                {/*
                  ── MAIN VIDEO ────────────────────────────────────────────────
                  • src absent from JSX — managed imperatively for explicit flush.
                  • opacity/filter absent from React style — managed via refs so
                    the 1-Hz timer re-render never overwrites loop-handler values.
                  • translate3d(0,0,0) + backface-visibility: hidden → strongest
                    GPU layer promotion across all mobile browsers.
                  • onTimeUpdate absent — listener attached directly via useEffect
                    with { passive: true } to bypass React's synthetic event system.
                  • preload="auto" → full buffer loaded before set starts.
                  • playsInline + muted → required for autoplay on iOS/Android.
                  • loop={false} → we handle looping manually at duration-0.1s.
                */}
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                        // opacity/filter intentionally absent — managed imperatively
                        transition: 'opacity 0.08s ease-in-out, filter 0.4s ease',
                        ...gpuLayer,
                    }}
                    playsInline
                    preload="auto"
                    muted
                    loop={false}
                    disablePictureInPicture
                />

                {/* ── Gradient scrims ──────────────────────────────────────── */}
                <div className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-black/80 via-black/20 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-black/95 via-black/55 to-transparent pointer-events-none z-10" />

                {/* ══════════════════════════════════════════════════════════
                    BACK BUTTON
                ══════════════════════════════════════════════════════════ */}
                <button
                    onClick={onClose}
                    className="absolute z-50 flex items-center justify-center active:scale-90 transition-transform"
                    style={{ top: '3rem', left: '1rem', width: 56, height: 56, borderRadius: '50%', ...glassCircle, ...touchBtn }}
                    aria-label="Back"
                >
                    <ChevronLeft size={22} strokeWidth={2.5} className="text-white" />
                </button>

                {/* ══════════════════════════════════════════════════════════
                    PREV / NEXT CHEVRONS
                ══════════════════════════════════════════════════════════ */}
                {hasPrev && !isResting && (
                    <button
                        onClick={goToPrev}
                        className="absolute z-[41] flex items-center justify-center active:scale-90 transition-transform"
                        style={{ top: '50%', left: '1rem', transform: 'translateY(-50%)', width: 52, height: 52, borderRadius: '50%', ...glassCircle, ...touchBtn }}
                        aria-label="Previous exercise"
                    >
                        <ChevronLeft size={22} strokeWidth={2.5} className="text-white" />
                    </button>
                )}
                {hasNext && !isResting && (
                    <button
                        onClick={goToNext}
                        className="absolute z-[41] flex items-center justify-center active:scale-90 transition-transform"
                        style={{ top: '50%', right: '1rem', transform: 'translateY(-50%)', width: 52, height: 52, borderRadius: '50%', ...glassCircle, ...touchBtn }}
                        aria-label="Next exercise"
                    >
                        <ChevronRight size={22} strokeWidth={2.5} className="text-white" />
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
                                : isSetStarted ? `0 0 22px ${barColor}60` : 'none',
                            willChange:  'transform, opacity',
                        }}
                    >
                        {displayTime}
                    </motion.p>
                    <p className="text-[14px] text-white/65 font-semibold mt-2 tracking-wide text-center px-20">
                        {exercise.name}
                    </p>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    RIGHT CIRCLE BUTTONS — Music · Speed
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute right-4 z-40 flex flex-col gap-3" style={{ top: '28%' }}>
                    <button className="w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                        style={{ ...glassCircle, ...touchBtn }} aria-label="Music">
                        <Music size={18} className="text-white" />
                    </button>
                    <button
                        onClick={cycleSpeed}
                        className="w-12 h-12 rounded-full flex flex-col items-center justify-center gap-[2px] active:scale-90 transition-transform"
                        style={{
                            ...glassCircle, ...touchBtn,
                            ...(playbackRate === 0.5 && {
                                background: 'rgba(76,175,80,0.82)',
                                border:     '1px solid rgba(76,175,80,0.6)',
                                boxShadow:  '0 0 20px rgba(76,175,80,0.65), 0 4px 20px rgba(0,0,0,0.4)',
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
                    FOOTER — start button · next row · muscle legend
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute bottom-0 left-0 right-0 z-30 px-5"
                    style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 40px)' }}>

                    <AnimatePresence mode="wait">
                        {!isSetStarted && (
                            <motion.button
                                key="start"
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                onClick={startSet}
                                className="w-full mb-4 py-[14px] rounded-2xl font-black uppercase tracking-[0.22em] text-[13px] text-white active:scale-[0.97] transition-transform"
                                style={{ ...glassCircle, ...touchBtn }}
                            >
                                START SET {currentSet}
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {/* Next exercise row */}
                    <div className="flex items-center justify-between mb-3">
                        {nextEx ? (
                            <div className="flex items-center gap-2">
                                {/*
                                  NEXT-UP STATIC SWAP
                                  ─────────────────────────────────────────────
                                  During an active set: <img> with the category
                                  poster — zero decode cost, zero bandwidth.
                                  Between sets: <video preload="metadata"> shows
                                  a poster frame with no active decode pipeline.
                                  Two simultaneous video decoders on a mobile
                                  chipset will share/starve the hardware unit,
                                  causing exactly the 20-30s freeze pattern.
                                */}
                                <div className="rounded-lg overflow-hidden shrink-0"
                                    style={{ width: 40, height: 40, border: '1px solid rgba(255,255,255,0.15)' }}>
                                    {isSetStarted ? (
                                        <img
                                            src={`/images/${nextEx.category.toLowerCase()}-bg.jpg`}
                                            alt={nextEx.name}
                                            className="w-full h-full object-cover opacity-60"
                                        />
                                    ) : (
                                        <video
                                            key={nextEx.id}
                                            src={nextEx.videoUrl}
                                            className="w-full h-full object-cover"
                                            preload="metadata"
                                            playsInline
                                            muted
                                        />
                                    )}
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
                    <div className="flex items-center justify-center gap-4 mb-3">
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
                </div>

                {/* ══════════════════════════════════════════════════════════
                    GLOW BAR — scaleX (GPU compositor, zero layout reflow)
                ══════════════════════════════════════════════════════════ */}
                <div className="absolute bottom-0 left-0 right-0 z-30 overflow-hidden"
                    style={{ height: 4, background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                        className="h-full w-full origin-left"
                        animate={{ scaleX: elapsedPct }}
                        transition={{ duration: 0.85, ease: 'linear' }}
                        style={{ backgroundColor: barColor, boxShadow: barGlow, ...gpuLayer }}
                    />
                </div>

                {/* ══════════════════════════════════════════════════════════
                    SET COMPLETE FLASH  (1.4 s)
                ══════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isSetJustComplete && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
                            style={{ background: 'radial-gradient(ellipse at center, rgba(76,175,80,0.3) 0%, rgba(0,0,0,0.7) 100%)' }}
                        >
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                                className="flex flex-col items-center gap-4"
                            >
                                <CheckCircle2 size={68} strokeWidth={1.5}
                                    style={{ color: '#4CAF50', filter: 'drop-shadow(0 0 24px rgba(76,175,80,0.95))' }} />
                                <p className="text-[2.3rem] font-black text-white uppercase tracking-[0.12em]"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', textShadow: '0 0 28px rgba(76,175,80,0.6)' }}>
                                    Set Complete
                                </p>
                                <p className="text-[10px] uppercase tracking-[0.45em] text-white/45 font-bold">Rest Starting…</p>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══════════════════════════════════════════════════════════
                    REST OVERLAY — Electric Blue · savage quote · PiP
                ══════════════════════════════════════════════════════════ */}
                <AnimatePresence>
                    {isResting && restTimer !== null && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-40 flex flex-col items-center justify-center"
                            style={{
                                background:           'radial-gradient(ellipse at center, rgba(0,60,90,0.55) 0%, rgba(0,0,0,0.78) 100%)',
                                backdropFilter:       'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                            }}
                        >
                            <p className="text-[10px] uppercase tracking-[0.55em] font-black mb-2" style={{ color: '#00CFFF' }}>
                                {currentSet < totalSets
                                    ? `SET ${currentSet} DONE — RECOVER`
                                    : nextEx ? 'EXERCISE DONE — RECOVER' : 'WORKOUT COMPLETE'}
                            </p>

                            <motion.p
                                key={restTimer}
                                initial={{ scale: 1.12, opacity: 0.5 }}
                                animate={{ scale: 1,    opacity: 1   }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className="font-black leading-none tracking-tighter"
                                style={{
                                    fontFamily:  'var(--font-archivo-black)',
                                    fontSize:    'clamp(6rem, 28vw, 9rem)',
                                    color:       '#00CFFF',
                                    textShadow:  '0 0 40px rgba(0,207,255,0.55), 0 0 80px rgba(0,207,255,0.2)',
                                    willChange:  'transform, opacity',
                                }}
                            >
                                {restTimer}
                            </motion.p>

                            <p className="text-[10px] uppercase tracking-[0.4em] text-white/35 mt-1 font-bold">seconds rest</p>

                            {restQuote && (
                                <motion.p
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4, duration: 0.5 }}
                                    className="text-center italic font-medium mt-6 px-10"
                                    style={{ color: 'rgba(255,255,255,0.52)', fontSize: '13px', maxWidth: 320, lineHeight: 1.65 }}
                                >
                                    &ldquo;{restQuote}&rdquo;
                                </motion.p>
                            )}

                            {/* Primary advance button */}
                            <button
                                onClick={advanceAfterRest}
                                className="mt-8 px-10 py-[15px] rounded-2xl text-black font-black uppercase text-[11px] tracking-[0.3em] active:scale-[0.97] transition-transform"
                                style={{
                                    ...touchBtn,
                                    background: '#00CFFF',
                                    boxShadow:  '0 0 30px rgba(0,207,255,0.55), 0 4px 24px rgba(0,0,0,0.5)',
                                }}
                            >
                                {currentSet < totalSets ? `START SET ${currentSet + 1}` : nextEx ? 'NEXT EXERCISE' : 'FINISH'}
                            </button>

                            {/* Skip rest */}
                            <button
                                onClick={advanceAfterRest}
                                className="mt-3 flex items-center gap-1.5 px-5 py-2 rounded-full font-black uppercase text-[9px] tracking-[0.25em] active:scale-95 transition-transform"
                                style={{
                                    ...touchBtn,
                                    background: 'rgba(0,207,255,0.08)',
                                    border:     '1px solid rgba(0,207,255,0.25)',
                                    color:      'rgba(0,207,255,0.7)',
                                }}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M5.5 5H7v14H5.5V5zm2.5.86L17.77 12 8 18.14V5.86z"/>
                                </svg>
                                SKIP REST
                            </button>

                            {/* Rest PiP — main video paused, decoder fully free */}
                            {nextEx && (
                                <motion.div
                                    initial={{ y: 55, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                    className="absolute bottom-10 right-5 rounded-2xl overflow-hidden shadow-2xl"
                                    style={{ width: 118, aspectRatio: '9/16', border: '1px solid rgba(0,207,255,0.25)' }}
                                >
                                    <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent px-2 py-1.5 z-10">
                                        <p className="text-[8px] uppercase tracking-widest font-black truncate" style={{ color: '#00CFFF' }}>
                                            NEXT: {nextEx.name}
                                        </p>
                                    </div>
                                    <video
                                        key={nextEx.id}
                                        src={nextEx.videoUrl}
                                        className="w-full h-full object-cover opacity-90"
                                        style={gpuLayer}
                                        preload="auto"
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
