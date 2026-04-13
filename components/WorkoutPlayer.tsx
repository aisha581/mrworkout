"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Plus, CheckCircle2, ChevronLeft, ChevronRight, FastForward, Activity } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';
import { useRef, useState, useEffect } from 'react';
import VictoryScreen from './VictoryScreen';

interface WorkoutPlayerProps {
    playlist: LiveExercise[];
    initialIndex: number;
    onClose: () => void;
}

export default function WorkoutPlayer({ playlist, initialIndex, onClose }: WorkoutPlayerProps) {
    const { theme } = useTheme();
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
    const totalSets = 3;
    
    // Global Dash/Telemetry Trackers
    const [totalVolume, setTotalVolume] = useState(0); 
    const [timeUnderTension, setTimeUnderTension] = useState(0); 
    const [completedSets, setCompletedSets] = useState(0);

    const [isPulsing, setIsPulsing] = useState(false);
    const tempoRef = useRef<HTMLDivElement>(null);

    // Inter-Exercise Rest State Mechanics
    const [isResting, setIsResting] = useState(false);
    const [restTimer, setRestTimer] = useState<number | null>(null);

    // Cross-fade Looping State
    const [videoOpacity, setVideoOpacity] = useState(1);
    
    // Mobile Overlays
    const [showMobileTip, setShowMobileTip] = useState(false);

    // Define next target safely
    const nextExercise = activeIndex < playlist.length - 1 ? playlist[activeIndex + 1] : null;

    // Reset Core states when activeIndex changes
    useEffect(() => {
        setIsSetStarted(false);
        setIsResting(false);
        setRestTimer(null);
        setProgress(0);
        setVideoOpacity(1);
        setShowMobileTip(false);
        
        if (exercise.defaultTime) setTimeLeft(exercise.defaultTime);
        if (exercise.defaultReps) {
             setCurrentReps(0);
             setCurrentSet(1);
        }

        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.playbackRate = playbackRate;
            videoRef.current.play().catch(e => console.warn("Auto-play prevented", e));
        }
    }, [activeIndex, exercise, playbackRate]);

    // Synchronize HTMLVideoElement Playback Rate globally
    useEffect(() => {
        if (videoRef.current && !isResting) {
            videoRef.current.playbackRate = playbackRate;
        }
    }, [playbackRate, isResting]);

    // Flawless Cross-Fade Engine (Restricts video precisely to 3.0s with a subtle opacity dip)
    useEffect(() => {
        let reqId: number;

        const handleCrossFadeWrap = () => {
            if (videoRef.current) {
                const ct = videoRef.current.currentTime;
                
                // Track Tempo
                if (tempoRef.current && !isResting) {
                     const pct = Math.min((ct / 3.0) * 100, 100);
                     tempoRef.current.style.background = `conic-gradient(from 0deg, #00FFFF ${pct}%, transparent ${pct}%, transparent 100%)`;
                }

                // If approaching 3.0s timeline, dip opacity and seamlessly teleport under shadow
                if (ct >= 2.8 && videoOpacity === 1) {
                    setVideoOpacity(0.5); // Subtle dip
                    setTimeout(() => {
                        if (videoRef.current) {
                            videoRef.current.currentTime = 0;
                            setVideoOpacity(1); // Fade back in seamlessly
                            if (!isResting) videoRef.current.play().catch(() => {});
                        }
                    }, 200); // Wait for transition physics
                }
            }
            reqId = requestAnimationFrame(handleCrossFadeWrap);
        };

        reqId = requestAnimationFrame(handleCrossFadeWrap);
        return () => cancelAnimationFrame(reqId);
    }, [videoOpacity, isResting]);

    // Timer Match Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSetStarted && exercise?.defaultTime && timeLeft > 0 && !isResting) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
                setTimeUnderTension(prev => prev + 1); // Track global tension
            }, 1000);
        } else if (timeLeft === 0 && isSetStarted && exercise?.defaultTime && !isResting) {
            triggerRestOverlay();
        }
        return () => clearInterval(interval);
    }, [isSetStarted, timeLeft, exercise, isResting]);

    // Rest State Engine (Auto-Flow into next exercise)
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

    // Actions
    const startSet = () => setIsSetStarted(true);

    const incrementRep = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Haptic Feedback Integration for Mobile Devices
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50);
        }

        // Trigger visual pulse
        setIsPulsing(true);
        setTotalVolume(prev => prev + 1);
        setTimeout(() => setIsPulsing(false), 300);

        setCurrentReps(prev => {
            const nextVal = prev + 1;
            
            try {
                localStorage.setItem(`mrworkout_progress_${exercise.id}`, JSON.stringify({
                    date: new Date().toISOString(),
                    set: currentSet,
                    reps: nextVal
                }));
            } catch (e) {
                console.warn('Local storage save failed', e);
            }

            if (exercise.defaultReps && nextVal >= exercise.defaultReps) {
                if (currentSet < totalSets) {
                    setTimeout(() => {
                         setCurrentSet(c => c + 1);
                         setCurrentReps(0);
                         setCompletedSets(prev => prev + 1); // Track successful sets
                    }, 500);
                } else {
                    setTimeout(() => {
                        setCompletedSets(prev => prev + 1);
                        triggerRestOverlay();
                    }, 400); 
                }
                return exercise.defaultReps;
            }
            return Math.min(nextVal, exercise.defaultReps || 99);
        });
    };

    const triggerRestOverlay = () => {
        if (nextExercise) {
            setIsResting(true);
            setRestTimer(exercise.defaultRest || 60);
        } else {
            // End of playlist
            setIsResting(true);
            setRestTimer(3);
        }
    };

    const [isWorkoutComplete, setIsWorkoutComplete] = useState(false);

    const handleCompleteBypass = () => {
        if (activeIndex < playlist.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else {
            setIsWorkoutComplete(true);
        }
    };

    const handleNext = () => handleCompleteBypass();
    const handlePrev = () => {
        if (activeIndex > 0) setActiveIndex(prev => prev - 1);
    };

    const cyclePlaybackSpeed = () => {
        setPlaybackRate(prev => {
            if (prev === 1.0) return 0.5;
            return 1.0;
        });
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (duration > 0) {
                setProgress((current / duration) * 100);
            }
        }
    };

    const videoSrc = exercise.videoUrl;

    // PiP source mapped to next target
    const nextVideoSrc = nextExercise?.videoUrl;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const isComplete = (exercise.defaultTime && timeLeft === 0) || (exercise.defaultReps && currentReps >= exercise.defaultReps && currentSet === totalSets);

    const displayTip = Array.isArray(exercise.savageTip) 
        ? (exercise.savageTip[currentSet - 1] || exercise.savageTip[0]) 
        : exercise.savageTip;

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

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] bg-black overflow-hidden flex flex-col md:flex-row"
            >
                {/* 1. Underlying Video Canvas (Full Mobile, Left Desktop) */}
                <div className="absolute inset-0 z-0 md:relative md:w-[60%] md:h-full bg-black shrink-0 border-r border-white/5 overflow-hidden">
                    <video
                        ref={videoRef}
                        src={videoSrc}
                        className={`w-full h-full object-cover scale-[1.15] origin-center transition-all duration-300 will-change-transform ${isResting ? 'blur-md' : 'md:opacity-100'}`}
                        style={{ opacity: isResting ? 0.3 : (videoOpacity === 1 ? 1 : 0.4) }}
                        playsInline
                        preload="auto"
                        muted
                        loop={false} // Custom Cross-fade Engine manages looping
                        onTimeUpdate={handleTimeUpdate}
                    />
                    
                    {/* Shadow overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none md:hidden" />
                    
                    {/* Manual Navigation Arrows (Embedded on video edges) */}
                    {!isResting && (
                        <>
                            <div className="absolute inset-y-0 left-0 flex items-center px-2 md:px-6">
                                {activeIndex > 0 && (
                                    <button onClick={handlePrev} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white/50 hover:text-white border border-white/10 transition-colors">
                                        <ChevronLeft size={32} />
                                    </button>
                                )}
                            </div>
                            <div className="absolute inset-y-0 right-0 flex items-center justify-end px-2 md:px-6 z-20">
                                {activeIndex < playlist.length - 1 && (
                                    <button onClick={handleNext} className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white/50 hover:text-white border border-white/10 transition-colors">
                                        <ChevronRight size={32} />
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {/* Rest Overlay with Picture in Picture */}
                    <AnimatePresence>
                        {isResting && restTimer !== null && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 z-30 flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-sm"
                            >
                                <div className="text-xl uppercase tracking-[0.5em] font-black mb-4 text-[#00FFFF]">
                                    {nextExercise ? 'RECOVER' : 'FINISHED'}
                                </div>
                                <motion.div 
                                    className="text-[120px] md:text-[180px] font-black leading-none text-white tracking-tighter drop-shadow-2xl"
                                    style={{ fontFamily: 'var(--font-archivo-black)' }}
                                    key={restTimer}
                                    initial={{ scale: 1.2, opacity: 0.5 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                >
                                    {restTimer}
                                </motion.div>

                                <button 
                                    onClick={handleCompleteBypass}
                                    className="mt-8 px-10 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white font-black uppercase text-sm tracking-widest border border-white/20 transition-colors"
                                >
                                    SKIP REST
                                </button>

                                {/* Picture in Picture Next Up Preview */}
                                {nextExercise && nextVideoSrc && (
                                    <motion.div 
                                        initial={{ y: 50, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="absolute bottom-8 right-8 w-40 md:w-56 aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl"
                                    >
                                        <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-2 z-10">
                                            <div className="text-[9px] uppercase tracking-widest text-[#00FFFF] font-black truncate">
                                                NEXT: {nextExercise.name}
                                            </div>
                                        </div>
                                        <video
                                            ref={pipRef}
                                            src={nextVideoSrc}
                                            className="w-full h-full object-cover opacity-90"
                                            playsInline
                                            autoPlay
                                            muted
                                            loop
                                        />
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 2. HUD Container (Overlay Mobile, Right Desktop) */}
                <div className="relative z-10 w-full h-full flex flex-col md:w-[40%] md:bg-[#080808]">
                    
                    {/* Top Header Controls */}
                    <div className="w-full flex justify-between items-start pt-12 px-6 safe-top md:p-12">
                        <div className="flex flex-col drop-shadow-2xl md:drop-shadow-none">
                            <h2 className="text-xl font-black uppercase tracking-tighter text-[#00FFFF]" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                                {exercise.category} TARGET
                            </h2>
                            {exercise.defaultTime && isSetStarted ? (
                                <div className="text-[5rem] md:text-[7rem] font-black leading-none text-white tracking-tighter mt-2" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                                    {formatTime(timeLeft)}
                                </div>
                            ) : (
                                <div className="text-[3rem] md:text-[5rem] font-black leading-none text-white tracking-tighter mt-2 pr-6 leading-[0.9]" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                                    {exercise.defaultTime ? formatTime(exercise.defaultTime) : exercise.name}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                            <button 
                                onClick={cyclePlaybackSpeed}
                                className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border flex items-center justify-center gap-2 transition-all shadow-lg ${
                                    playbackRate === 0.5 
                                      ? 'bg-[#00FFFF]/10 text-[#00FFFF] border-[#00FFFF]/50 animate-pulse'
                                      : 'bg-black/40 text-white border-white/20 hover:bg-white/10'
                                }`}
                            >
                                <FastForward size={16} className={playbackRate === 0.5 ? "text-[#00FFFF]" : "opacity-50"} /> 
                                {playbackRate === 0.5 ? 'SAVAGE FOCUS: ON' : 'SAVAGE FOCUS'}
                            </button>
                            <button 
                                onClick={onClose}
                                className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white border border-white/20 shadow-xl transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="hidden md:block px-12 mt-4 shrink-0 transition-opacity duration-300">
                         <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: theme.accent }}>
                              SAVAGE TIP
                         </div>
                         <p className="text-xl italic text-white/80 font-medium leading-relaxed border-l-4 pl-4 min-h-[4rem]" style={{ borderLeftColor: theme.accent }}>
                              "{displayTip}"
                         </p>
                    </div>

                    {/* Desktop-Only Workout Checklist (Game-style Quest Tracker) */}
                    <div className="hidden md:flex flex-col flex-grow px-12 mt-6 overflow-y-auto custom-scrollbar relative">
                        
                        {/* Legend & Volume Wrap */}
                        <div className="flex justify-between items-end mb-6 sticky top-0 bg-[#080808] py-2 z-10 border-b border-white/10 pb-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="text-xs font-black uppercase tracking-[0.3em] text-white/40">
                                    Anatomical Key
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/60">
                                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00FFFF]" /> Primary</span>
                                    <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> Peak Tension</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 flex items-center gap-1">
                                    <Activity size={12} className="text-[#00FFFF]" /> Total Volume
                                </div>
                                <div className="text-2xl font-black text-white leading-none mt-1">
                                    {totalVolume} <span className="text-sm text-white/40">REPS</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 pb-4">
                            {playlist.map((item, idx) => {
                                const isActive = idx === activeIndex;
                                const isPast = idx < activeIndex;

                                return (
                                    <div 
                                        key={item.id} 
                                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border ${
                                            isActive 
                                            ? `border-[${theme.accent}] bg-[${theme.accent}]/10` 
                                            : isPast 
                                                ? 'border-white/5 opacity-50' 
                                                : 'border-white/10 bg-black/50'
                                        }`}
                                        style={isActive ? { borderColor: theme.accent, backgroundColor: `${theme.accent}15` } : undefined}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center text-sm font-black shrink-0 relative overflow-hidden">
                                            {isPast ? <CheckCircle2 size={16} className="text-[#00FFFF]" /> : (idx + 1)}
                                            {isActive && (
                                                <motion.div 
                                                    className="absolute inset-0 bg-[#00FFFF]/20" 
                                                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }} 
                                                    transition={{ duration: 2, repeat: Infinity }} 
                                                />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className={`font-black uppercase tracking-wider ${isActive ? 'text-white' : 'text-white/60'}`}>
                                                {item.name}
                                            </div>
                                            <div className="text-[10px] uppercase tracking-widest text-[#00FFFF] mt-0.5">
                                                {item.targetMuscle}
                                            </div>
                                        </div>
                                        
                                        {!isPast && !isActive && (
                                            <button onClick={() => setActiveIndex(idx)} className="ml-auto text-xs uppercase font-black text-white/30 hover:text-white px-3 py-1 bg-white/5 rounded-full backdrop-blur-sm transition-colors border border-white/5">
                                                SKIP
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Action HUD Deck */}
                    <div className="mt-auto w-full pb-10 px-6 md:p-12 relative">
                        
                        <div className="md:hidden flex justify-between items-center bg-black/80 backdrop-blur-md rounded-2xl p-4 mb-4 border border-white/10 relative z-20">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black tracking-widest text-white/50 mb-1">Total Volume</span>
                                <span className="text-sm font-black text-white uppercase tracking-wider">{totalVolume} Reps</span>
                            </div>
                            
                            <button 
                                onClick={() => setShowMobileTip(!showMobileTip)}
                                className={`text-[10px] uppercase font-black px-4 py-2 rounded-full border transition-colors mx-4 ${showMobileTip ? 'bg-[#00FFFF] text-black border-transparent' : 'bg-[#00FFFF]/10 text-[#00FFFF] border-[#00FFFF]/30 hidden sm:block'}`}
                            >
                                {showMobileTip ? 'Hide Tip' : 'Read Tip'}
                            </button>

                            {nextExercise && (
                                <div className="text-right flex flex-col">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-[#00FFFF] mb-1">Up Next</span>
                                    <span className="text-sm font-bold text-white/80 line-clamp-1">{nextExercise.name}</span>
                                </div>
                            )}
                        </div>

                        {/* Toggleable Mobile Tip Overlay */}
                        <AnimatePresence>
                            {showMobileTip && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="md:hidden absolute bottom-[calc(100%-1rem)] left-6 right-6 lg:left-12 lg:right-12 z-30 p-6 rounded-3xl bg-black/95 backdrop-blur-3xl border border-[#00FFFF]/30 shadow-[0_0_40px_rgba(0,255,255,0.15)]"
                                >
                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-[#00FFFF]">
                                        SAVAGE TIP
                                    </div>
                                    <p className="text-lg italic text-white font-medium leading-relaxed">
                                        "{displayTip}"
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!isSetStarted ? (
                            <div className="flex flex-col pb-4 h-24 justify-end">
                                <button 
                                    onClick={startSet}
                                    className="w-full py-6 rounded-2xl text-black font-black uppercase tracking-[0.3em] text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_50px_rgba(0,255,255,0.2)]"
                                    style={{ backgroundColor: theme.accent }}
                                >
                                    START SET
                                </button>
                            </div>
                        ) : (
                            <div className={`bg-black/80 shadow-2xl backdrop-blur-3xl border rounded-[32px] p-6 lg:p-8 relative overflow-hidden transition-all duration-300 ${isPulsing ? 'border-[#00FFFF] shadow-[0_0_50px_rgba(0,255,255,0.3)]' : 'border-white/20'}`}>
                                <div className="flex justify-between items-center relative z-10 w-full">
                                    
                                    <div className="flex flex-col">
                                        <div className="text-xs uppercase text-white/50 tracking-[0.2em] font-black mb-1">
                                            Current Set
                                        </div>
                                        <div className="text-xl text-white font-black mb-4 transition-all" key={`set-${currentSet}`}>
                                            {currentSet} <span className="text-white/30">/ {totalSets}</span>
                                        </div>

                                        {exercise.defaultReps && !exercise.defaultTime && (
                                            <>
                                                <div className="text-xs uppercase text-white/50 tracking-[0.2em] font-black mb-1">
                                                    Reps
                                                </div>
                                                <div className="text-5xl font-black text-white leading-none" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                                                    {currentReps} <span className="text-2xl text-white/40">/ {exercise.defaultReps}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {exercise.defaultTime ? (
                                        <div className="flex items-center shrink-0 ml-4">
                                            {isComplete ? (
                                                <button onClick={handleNext} className="h-24 px-8 rounded-3xl bg-green-500 text-black font-black uppercase text-xl flex items-center gap-3 transition-transform hover:scale-105 shadow-[0_0_40px_rgba(34,197,94,0.4)] ring-4 ring-green-500/20">
                                                    <CheckCircle2 size={32} /> {nextExercise ? 'NEXT' : 'DONE'}
                                                </button>
                                            ) : (
                                                <div className="h-24 px-10 rounded-3xl bg-black/40 text-[#00FFFF] font-black uppercase text-xl border-2 tracking-[0.2em] border-[#00FFFF]/30 animate-pulse flex items-center">
                                                    ACTIVE
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center shrink-0 ml-4 relative">
                                            {!isComplete ? (
                                                <div className="relative p-[3px] rounded-[1.8rem] overflow-hidden group">
                                                     <div ref={tempoRef} className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                                                     
                                                     <button 
                                                         onClick={incrementRep}
                                                         className="relative z-10 min-w-[140px] h-[106px] px-8 rounded-3xl text-black font-black uppercase tracking-widest text-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 leading-none"
                                                         style={{ backgroundColor: theme.accent }}
                                                     >
                                                         <Plus size={36} className="mb-1 opacity-80" />
                                                         LOG REP
                                                     </button>
                                                </div>
                                            ) : (
                                                <button onClick={handleNext} className="min-w-[140px] h-28 px-8 rounded-3xl bg-green-500 text-black font-black uppercase tracking-widest text-xl flex flex-col items-center justify-center gap-2 shadow-[0_0_40px_rgba(34,197,94,0.4)] hover:scale-105 transition-all">
                                                    <CheckCircle2 size={36} className="opacity-80" />
                                                    {nextExercise ? 'NEXT' : 'DONE'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="absolute overflow-hidden bottom-0 left-0 right-0 h-1.5 bg-white/5 z-20 md:h-1">
                    <motion.div
                        className="h-full relative origin-left"
                        style={{ width: `${((activeIndex + (progress/100)) / playlist.length) * 100}%`, backgroundColor: theme.accent }}
                        layout
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
