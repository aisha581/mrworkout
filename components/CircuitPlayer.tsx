"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { useSavageSounds } from '@/hooks/useSavageSounds';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CircuitHUD from './CircuitHUD';
import RecoveryScreen from './RecoveryScreen';
import { addSetXP } from '@/utils/userStats';
import { checkAndUpdatePR } from '@/utils/prTracker';

const SET_DURATION = 45;

export default function CircuitPlayer() {
    const {
        isCircuitActive, isComplete, clearComplete,
        stopCircuit, startRest, completeWorkout,
        queue, currentIndex, isResting, restTimeRemaining,
        handleRestComplete, advanceToNextSet,
    } = useCircuit();

    const { playThud, playPing } = useSavageSounds();
    const router = useRouter();

    const containerRef  = useRef<HTMLDivElement>(null);
    const videoRef      = useRef<HTMLVideoElement>(null);
    const audioRef      = useRef<HTMLAudioElement>(null);
    const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);
    const voiceRef      = useRef<HTMLAudioElement | null>(null);
    const setEndFired   = useRef(false); // guard: fire end-of-set logic once per countdown

    const [timeLeft,        setTimeLeft]        = useState(SET_DURATION);
    const [isPlaying,       setIsPlaying]       = useState(true);
    const [currentSet,      setCurrentSet]      = useState(1);
    const [showLogger,      setShowLogger]      = useState(false);
    const [logReps,         setLogReps]         = useState('');
    const [logWeight,       setLogWeight]       = useState('');
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const currentExercise = queue[currentIndex];
    const nextExercise    = queue[currentIndex + 1] ?? null;
    const totalSets       = currentExercise?.defaultSets ?? 3;
    const isLastSet       = currentSet >= totalSets;
    const isLastExercise  = currentIndex >= queue.length - 1;
    const isFinale        = isLastSet && isLastExercise;

    // ── Audio ─────────────────────────────────────────────────────────────────
    const playSavageAudio = (fileName: string) => {
        console.log('🔊 Playing Savage Cue: ' + fileName);
        try {
            if (voiceRef.current) { voiceRef.current.pause(); voiceRef.current.currentTime = 0; }
            const audio = new Audio(`/audio/${fileName}`);
            voiceRef.current = audio;
            audio.play().catch(err => console.warn('🔇 Audio blocked or missing:', fileName, err));
        } catch {}
    };

    // ── Fullscreen ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isCircuitActive && containerRef.current?.requestFullscreen) {
            containerRef.current.requestFullscreen().catch(() => {});
        }
    }, [isCircuitActive]);

    // ── Exercise intro voiceover (mid-session, index > 0) ─────────────────────
    useEffect(() => {
        if (!isCircuitActive || currentIndex === 0 || !currentExercise?.name) return;
        playSavageAudio(currentExercise.name.toLowerCase().replace(/ /g, '_') + '_intro.mp3');
    }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Reset set counter when exercise changes ────────────────────────────────
    useEffect(() => {
        setCurrentSet(1);
        setEndFired.current = false;
    }, [currentIndex]);

    // ── Countdown timer ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isCircuitActive || isResting || showLogger) return;
        setTimeLeft(SET_DURATION);
        setEndFired.current = false;
        timerInterval.current = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
        return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
    }, [currentIndex, isCircuitActive, isResting, showLogger]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Set end detection (timer reaches 0 naturally) ─────────────────────────
    useEffect(() => {
        if (!isCircuitActive || isResting || timeLeft > 0 || setEndFired.current) return;
        setEndFired.current = true;
        if (timerInterval.current) clearInterval(timerInterval.current);

        const lastSet      = currentSet >= (currentExercise?.defaultSets ?? 3);
        const lastExercise = currentIndex >= queue.length - 1;

        if (lastSet && lastExercise) {
            playSavageAudio('workout_complete.mp3');
            setTimeout(() => completeWorkout(), 700);
        } else {
            playSavageAudio('rest_start.mp3');
            setShowLogger(true);
        }
    }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Countdown SFX ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!isResting && timeLeft <= 3 && timeLeft > 0) playThud();
    }, [timeLeft, isResting, playThud]);

    // ── Rest: get_ready cue + auto-advance at 0 ───────────────────────────────
    useEffect(() => {
        if (!isResting) return;
        if (restTimeRemaining === 5) playSavageAudio('get_ready.mp3');
        if (restTimeRemaining <= 3 && restTimeRemaining > 0) playThud();
        if (restTimeRemaining === 0) {
            playPing();
            const lastSet = currentSet >= (currentExercise?.defaultSets ?? 3);
            if (lastSet) {
                handleRestComplete(); // all sets done — advance to next exercise
            } else {
                setCurrentSet(prev => prev + 1);
                advanceToNextSet();  // more sets remain — stay on same exercise
            }
        }
    }, [restTimeRemaining, isResting]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Video ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (isCircuitActive && !isResting && videoRef.current) {
            videoRef.current.play().catch(() => {});
            setIsPlaying(true);
        }
    }, [isCircuitActive, isResting, currentIndex]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        const restart = () => { v.currentTime = 0; v.play().catch(() => {}); };
        v.addEventListener('ended', restart);
        return () => v.removeEventListener('ended', restart);
    }, [currentIndex, isCircuitActive]);

    // ── Re-focus: override in-app browser auto-pause on UI overlay changes ────
    useEffect(() => {
        const v = videoRef.current;
        if (!v || v.paused === false || v.ended || isResting || !isCircuitActive) return;
        v.play().catch(() => {});
    }, [isResting, restTimeRemaining, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Navigate on workout complete ──────────────────────────────────────────
    useEffect(() => {
        if (isComplete) { clearComplete(); router.push('/summary'); }
    }, [isComplete]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Handlers ──────────────────────────────────────────────────────────────
    // Skip set — triggered by user gesture, so audio allowed immediately
    const handleSkipSet = () => {
        if (timerInterval.current) clearInterval(timerInterval.current);
        setEndFired.current = true;

        const lastSet      = currentSet >= (currentExercise?.defaultSets ?? 3);
        const lastExercise = currentIndex >= queue.length - 1;

        if (lastSet && lastExercise) {
            playSavageAudio('workout_complete.mp3');
            setTimeout(() => completeWorkout(), 700);
        } else {
            playSavageAudio('rest_start.mp3');
            // Skip the logger — go straight to rest
            startRest();
            // Set advance happens in restTimeRemaining=0 handler
        }
    };

    // Skip rest — same logic as restTimeRemaining=0, called from user tap
    const handleSkipRest = () => {
        const lastSet = currentSet >= (currentExercise?.defaultSets ?? 3);
        if (lastSet) {
            handleRestComplete();
        } else {
            setCurrentSet(prev => prev + 1);
            advanceToNextSet();
        }
    };

    // Logger submit — user logged reps + weight
    const submitLogger = () => {
        localStorage.setItem('mw_last_set_time', String(Date.now()));
        addSetXP();
        const w = parseFloat(logWeight);
        const r = parseInt(logReps);
        const currentExercise = queue[currentIndex];
        if (currentExercise && !isNaN(w) && !isNaN(r) && w > 0 && r > 0) {
            checkAndUpdatePR(currentExercise.name, w, r);
        }
        setLogReps('');
        setLogWeight('');
        setShowLogger(false);
        startRest();
    };

    // Logger skip — user doesn't want to log
    const skipLogger = () => {
        setLogReps('');
        setLogWeight('');
        setShowLogger(false);
        startRest();
    };

    // Finish workout (Finale button) — user-gesture path for audio
    const handleFinish = () => {
        if (timerInterval.current) clearInterval(timerInterval.current);
        // Heavy celebration haptic — mission accomplished
        navigator.vibrate?.([100, 60, 150, 60, 200, 60, 400]);
        playSavageAudio('workout_complete.mp3');
        setTimeout(() => completeWorkout(), 700);
    };

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
            timerInterval.current = setInterval(() => setTimeLeft(p => Math.max(0, p - 1)), 1000);
        }
        setIsPlaying(!isPlaying);
    };

    if (!isCircuitActive) return null;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center overflow-hidden"
            >
                {/* HUD — exercise info, timer ring, skip button, next-up / finale */}
                {!isResting && (
                    <CircuitHUD
                        timeLeft={timeLeft}
                        totalTime={SET_DURATION}
                        nextExercise={nextExercise}
                        currentSet={currentSet}
                        totalSets={totalSets}
                        isFinale={isFinale}
                        onSkip={handleSkipSet}
                        onFinish={handleFinish}
                        exerciseName={currentExercise?.name ?? ''}
                        exerciseNum={currentIndex + 1}
                        queueLength={queue.length}
                    />
                )}

                {/* Recovery Screen — shown by context isResting */}
                <RecoveryScreen />

                {/* Skip Rest button — floats above RecoveryScreen, only shown while resting */}
                <AnimatePresence>
                    {isResting && (
                        <motion.button
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ delay: 0.4 }}
                            onClick={handleSkipRest}
                            className="absolute z-[60] flex items-center gap-2 px-6 py-3 rounded-full font-black uppercase text-[11px] tracking-[0.28em] active:scale-95 transition-transform"
                            style={{
                                bottom:      'calc(max(env(safe-area-inset-bottom, 0px), 24px) + 20px)',
                                left:        '50%',
                                transform:   'translateX(-50%)',
                                background:  'rgba(0,150,255,0.12)',
                                border:      '1px solid rgba(0,150,255,0.35)',
                                color:       '#0096FF',
                                touchAction: 'manipulation',
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M5.5 5H7v14H5.5V5zm2.5.86L17.77 12 8 18.14V5.86z"/>
                            </svg>
                            Skip Rest
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Main video */}
                {!isResting && currentExercise && (
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        onClick={togglePlay}
                    >
                        {currentExercise.videoUrl ? (
                            <video
                                ref={videoRef}
                                src={currentExercise.videoUrl}
                                className="w-full object-cover"
                                style={{ height: '100dvh', objectFit: 'cover' }}
                                playsInline
                                {...{ 'webkit-playsinline': 'true' } as React.VideoHTMLAttributes<HTMLVideoElement>}
                                preload="auto"
                                muted
                                autoPlay
                                loop
                                disablePictureInPicture
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
                        {/* Progress bar */}
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

                {/* ══ Set Logger Modal ══════════════════════════════════════════ */}
                <AnimatePresence>
                    {showLogger && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[700] flex items-end justify-center"
                            style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(14px)' }}
                        >
                            <motion.div
                                initial={{ y: 60 }}
                                animate={{ y: 0 }}
                                exit={{ y: 60 }}
                                transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                                className="w-full max-w-sm mx-4 mb-10 rounded-3xl overflow-hidden"
                                style={{
                                    background: 'rgba(8,18,28,0.97)',
                                    border:     '1px solid rgba(0,150,255,0.22)',
                                }}
                            >
                                <div className="px-6 pt-6 pb-2">
                                    {/* Header */}
                                    <div className="flex items-center gap-2.5 mb-1">
                                        <CheckCircle2 size={18} style={{ color: '#00FFFF' }} />
                                        <p className="text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: '#00FFFF' }}>
                                            Set {currentSet} Complete
                                        </p>
                                    </div>
                                    <p className="text-xl font-black uppercase mb-5 leading-tight">
                                        {currentExercise?.name}
                                    </p>

                                    {/* Rep + Weight inputs */}
                                    <div className="flex gap-3 mb-5">
                                        <div className="flex-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest opacity-35 block mb-1.5">Reps</label>
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                placeholder="—"
                                                value={logReps}
                                                onChange={e => setLogReps(e.target.value)}
                                                className="w-full rounded-xl px-3 py-3 text-center text-2xl font-black text-white focus:outline-none"
                                                style={{
                                                    background:    'rgba(255,255,255,0.05)',
                                                    border:        '1px solid rgba(255,255,255,0.1)',
                                                    touchAction:   'manipulation',
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-end justify-center pb-3 text-white/20 font-black text-lg">×</div>
                                        <div className="flex-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest opacity-35 block mb-1.5">kg</label>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                placeholder="—"
                                                value={logWeight}
                                                onChange={e => setLogWeight(e.target.value)}
                                                className="w-full rounded-xl px-3 py-3 text-center text-2xl font-black text-white focus:outline-none"
                                                style={{
                                                    background:  'rgba(255,255,255,0.05)',
                                                    border:      '1px solid rgba(255,255,255,0.1)',
                                                    touchAction: 'manipulation',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <button
                                        onClick={submitLogger}
                                        className="w-full py-4 rounded-2xl font-black uppercase text-black text-sm tracking-[0.22em] mb-3 active:scale-[0.97] transition-transform"
                                        style={{ background: '#00FFFF', touchAction: 'manipulation' }}
                                    >
                                        Log &amp; Start Rest
                                    </button>
                                    <button
                                        onClick={skipLogger}
                                        className="w-full py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest mb-3 active:scale-[0.97] transition-transform"
                                        style={{ color: 'rgba(255,255,255,0.30)', touchAction: 'manipulation' }}
                                    >
                                        Skip Logging
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ══ Exit Confirmation ════════════════════════════════════════ */}
                <AnimatePresence>
                    {showExitConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-[800] flex items-center justify-center px-8"
                            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(18px)' }}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20 }}
                                animate={{ scale: 1, y: 0 }}
                                className="w-full max-w-xs rounded-3xl p-7 text-center"
                                style={{
                                    background: 'rgba(8,8,12,0.97)',
                                    border:     '1px solid rgba(255,68,68,0.22)',
                                }}
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.45em] mb-3" style={{ color: '#FF4444' }}>
                                    Abandon Mission?
                                </p>
                                <p className="text-lg font-black uppercase leading-snug mb-1">
                                    You will lose your progress.
                                </p>
                                <p className="text-xs mb-8" style={{ color: 'rgba(255,255,255,0.28)' }}>
                                    This cannot be undone.
                                </p>
                                <button
                                    onClick={() => { stopCircuit(); router.push('/vault'); }}
                                    className="w-full py-4 rounded-2xl font-black uppercase text-sm tracking-[0.22em] mb-3 active:scale-[0.97] transition-transform"
                                    style={{
                                        background:  'rgba(255,68,68,0.14)',
                                        border:      '1px solid rgba(255,68,68,0.38)',
                                        color:       '#FF4444',
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    Abandon
                                </button>
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="w-full py-3 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-[0.97] transition-transform"
                                    style={{ color: 'rgba(255,255,255,0.38)', touchAction: 'manipulation' }}
                                >
                                    Keep Going
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Exit button */}
                <button
                    onClick={() => setShowExitConfirm(true)}
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
