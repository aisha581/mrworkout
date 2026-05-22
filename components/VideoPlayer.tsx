"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Maximize, RotateCcw, Plus, CheckCircle2, Clock } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

interface VideoPlayerProps {
    isOpen: boolean;
    onClose: () => void;
    exercise: any;
}

export default function VideoPlayer({ isOpen, onClose, exercise }: VideoPlayerProps) {
    const { theme } = useTheme();
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    // Workout Focus State
    const [isSetStarted, setIsSetStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentReps, setCurrentReps] = useState(0);

    useEffect(() => {
        if (isOpen && exercise) {
            setIsSetStarted(false);
            if (exercise.defaultTime) setTimeLeft(exercise.defaultTime);
            if (exercise.defaultReps) setCurrentReps(0);

            if (videoRef.current) {
                videoRef.current.play().catch(e => console.warn("Auto-play prevented", e));
            }
            setIsPlaying(true);
        }
    }, [isOpen, exercise?.id]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isSetStarted && exercise?.defaultTime && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isSetStarted, timeLeft, exercise?.defaultTime]);

    if (!exercise) return null;

    const startSet = () => setIsSetStarted(true);
    const incrementRep = () => setCurrentReps(prev => Math.min(prev + 1, exercise.defaultReps || 99));

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                if (audioRef.current) audioRef.current.pause();
            } else {
                videoRef.current.play();
                if (audioRef.current) audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
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

    const restartVideo = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            if (audioRef.current) audioRef.current.currentTime = 0;
            if (!isPlaying) {
                videoRef.current.play();
                if (audioRef.current) audioRef.current.play();
                setIsPlaying(true);
            }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-8 bg-black/95 backdrop-blur-xl overflow-y-auto"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="w-full max-w-4xl relative flex flex-col rounded-3xl overflow-hidden bg-[#0A0A0A] my-auto"
                        style={{
                            border: `1px solid ${theme.accent}30`,
                            boxShadow: `0 30px 60px rgba(0,0,0,0.9), 0 0 80px ${theme.accent}15`
                        }}
                    >
                        {/* 1. Header Banner */}
                        <div className="flex justify-between items-center p-6 bg-[#000000] border-b border-white/5 relative z-20">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-white" style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}>
                                    {exercise.name}
                                </h2>
                                <span className="text-xs font-bold uppercase tracking-widest mt-1 inline-block" style={{ color: theme.accent }}>
                                    Target: {exercise.targetMuscle}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 rounded-full bg-white/5 hover:bg-red-500/20 text-white hover:text-red-400 transition-all border border-white/10"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* 2. Video Container - STAYS COMPLETELY CLEAN */}
                        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden border-b border-white/5">
                            <video
                                ref={videoRef}
                                src={exercise.videoUrl}
                                className="w-full h-full object-contain pointer-events-none"
                                onTimeUpdate={handleTimeUpdate}
                                playsInline
                                preload="auto"
                                muted
                                loop
                            />
                            {/* Subtle Progress Bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                <motion.div
                                    className="h-full"
                                    style={{ width: `${progress}%`, backgroundColor: theme.accent }}
                                    layout
                                />
                            </div>
                        </div>

                        {/* 3. Active Dashboard & Actions Area */}
                        <div className="p-6 sm:p-8 flex flex-col items-center bg-gradient-to-b from-[#121212] to-[#0A0A0A] border-b border-white/5">
                            {!isSetStarted && (exercise?.defaultTime || exercise?.defaultReps) ? (
                                // START SET View
                                <div className="text-center w-full max-w-sm">
                                    <div className="mb-6 flex justify-center gap-4 text-white/50 text-sm font-bold tracking-widest uppercase">
                                        {exercise.defaultTime && (
                                            <span className="flex items-center gap-2"><Clock size={16} /> {exercise.defaultTime}s Time</span>
                                        )}
                                        {exercise.defaultReps && (
                                            <span className="flex items-center gap-2"><Plus size={16} /> {exercise.defaultReps} Reps</span>
                                        )}
                                    </div>
                                    <button 
                                        onClick={startSet} 
                                        className="w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] text-lg hover:scale-[1.02] active:scale-95 transition-all text-black"
                                        style={{ backgroundColor: theme.accent, boxShadow: `0 0 20px ${theme.accent}40` }}
                                    >
                                        START SET
                                    </button>
                                </div>
                            ) : (
                                // ACTIVE HUD View
                                <div className="flex flex-col items-center w-full max-w-md">
                                    {/* Timer View */}
                                    {exercise?.defaultTime && (
                                        <div className="text-center w-full">
                                            <div className="text-[5rem] sm:text-[6rem] font-black leading-none text-white tracking-tighter" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                                                {timeLeft}
                                            </div>
                                            <div className="text-sm font-bold uppercase tracking-[0.3em] mb-4" style={{ color: theme.accent }}>
                                                {timeLeft === 0 ? 'COMPLETE' : 'Seconds Logged'}
                                            </div>
                                        </div>
                                    )}

                                    {/* Rep Counter View */}
                                    {exercise?.defaultReps && !exercise?.defaultTime && (
                                        <div className="w-full flex items-center justify-between gap-6 px-4">
                                            <div className="flex-1 text-center sm:text-left">
                                                <div className="text-sm font-bold uppercase tracking-[0.2em] text-white/50 mb-1">
                                                    Current Reps
                                                </div>
                                                <div className="text-5xl font-black text-white" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                                                    {currentReps} <span className="text-2xl text-white/20">/ {exercise.defaultReps}</span>
                                                </div>
                                            </div>
                                            <div className="shrink-0 flex items-center justify-center">
                                                {currentReps < exercise.defaultReps ? (
                                                    <button 
                                                        onClick={incrementRep} 
                                                        className="flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl text-black font-black uppercase tracking-wider text-xs hover:scale-105 active:scale-95 transition-all"
                                                        style={{ backgroundColor: theme.accent, boxShadow: `0 0 20px ${theme.accent}30` }}
                                                    >
                                                        <Plus size={32} />
                                                        Add Rep
                                                    </button>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center gap-1 w-24 h-24 rounded-2xl bg-green-500 text-black font-black uppercase tracking-wider text-xs shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                                                        <CheckCircle2 size={32} />
                                                        Done
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 4. Details Flow (Savage Tip completely distinct, Controls pinned nicely) */}
                        <div className="flex flex-col lg:flex-row bg-[#0A0A0A]">
                            {/* Savage Tip */}
                            <div className="flex-[2] p-6 sm:p-8 lg:border-r border-white/5 border-b lg:border-b-0">
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>
                                        Savage Tip
                                    </h4>
                                    <div className="h-[1px] flex-1 bg-white/10" />
                                </div>
                                <p className="text-sm sm:text-base italic text-white/80 font-medium leading-relaxed">
                                    "{exercise.savageTip}"
                                </p>
                            </div>

                            {/* Playback Controls Hub */}
                            <div className="flex-[1] p-6 sm:p-8 flex items-center justify-center bg-black/20">
                                <div className="flex items-center gap-6">
                                    <button onClick={restartVideo} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition">
                                        <RotateCcw size={20} />
                                    </button>

                                    <button
                                        onClick={togglePlay}
                                        className="w-14 h-14 rounded-full text-black flex items-center justify-center hover:scale-105 transition"
                                        style={{ backgroundColor: theme.accent, boxShadow: `0 0 15px ${theme.accent}40` }}
                                    >
                                        {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                                    </button>

                                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
