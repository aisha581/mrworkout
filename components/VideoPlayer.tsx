"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Maximize, RotateCcw } from 'lucide-react';
import type { Exercise } from '@/data/libraryData';
import { useRef, useState, useEffect } from 'react';

interface VideoPlayerProps {
    isOpen: boolean;
    onClose: () => void;
    exercise: any; // Using any loosely to accept LiveExercise
}

export default function VideoPlayer({ isOpen, onClose, exercise }: VideoPlayerProps) {
    const { theme } = useTheme();
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    // Ensure we reset state when opening a new exercise
    useEffect(() => {
        if (isOpen && videoRef.current) {
            videoRef.current.play().catch(e => console.warn("Auto-play prevented", e));
            setIsPlaying(true);
        }
    }, [isOpen, exercise]);

    if (!exercise) return null;

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

    const handleVideoEnd = () => {
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(e => console.warn("Auto-play prevented", e)); // Auto-loop
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.warn("Audio-play prevented", e));
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
                    className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-8 bg-black/90 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="w-full max-w-4xl relative flex flex-col rounded-3xl overflow-hidden"
                        style={{
                            background: '#121212', // Forced Dark Mode Base Update
                            border: `1px solid #00FFFF40`, // Forced Cyan Border Update
                            boxShadow: `0 30px 60px rgba(0,0,0,0.9), 0 0 40px rgba(0,255,255,0.15)`
                        }}
                    >
                        {/* Header Banner */}
                        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between items-center p-6 bg-gradient-to-b from-black/80 to-transparent">
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tighter text-white drop-shadow-md" style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}>
                                    {exercise.name}
                                </h2>
                                <span className="text-xs font-bold uppercase tracking-widest text-[#00E5CC] drop-shadow-[0_0_8px_rgba(0,229,204,0.6)]">
                                    Target: {exercise.targetMuscle}
                                </span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-black/40 hover:bg-[#00E5CC]/20 text-white transition border border-white/10 hover:border-[#00E5CC]/50"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Video Container */}
                        <div className="relative w-full aspect-video bg-[#121212] flex items-center justify-center overflow-hidden">
                            {/* Ambient Glow behind video (visible if video doesn't perfectly fill or while loading) */}
                            <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at center, rgba(0,255,255,0.1) 0%, transparent 60%)' }} />

                            {exercise.videoUrl ? (
                                <video
                                    ref={videoRef}
                                    src={exercise.videoUrl}
                                    className="w-full h-full object-cover z-10"
                                    onTimeUpdate={handleTimeUpdate}
                                    onEnded={handleVideoEnd}
                                    playsInline
                                    muted // Force muted for video, rely on separate audio stream
                                />
                            ) : (
                                <div className="z-10 flex flex-col items-center justify-center text-[#00E5CC]/50">
                                    <Play size={48} className="mb-4 opacity-50" />
                                    <p className="font-bold tracking-widest uppercase text-sm">Waiting for MP4 Drop</p>
                                    <p className="text-xs opacity-70 mt-2 font-mono">{`/public/videos/exercises/${exercise.id}.mp4`}</p>
                                </div>
                            )}

                            {/* Center Play/Pause Overlay (Fades out when playing) */}
                            <AnimatePresence>
                                {!isPlaying && exercise.videoUrl && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        onClick={togglePlay}
                                        className="absolute z-20 w-20 h-20 rounded-full bg-[#00FFFF]/20 backdrop-blur-md flex items-center justify-center border-2 border-[#00FFFF] text-[#00FFFF]"
                                        style={{ boxShadow: '0 0 30px rgba(0,255,255,0.4)' }}
                                    >
                                        <Play size={32} className="ml-2" fill="currentColor" />
                                    </motion.button>
                                )}
                                {exercise.audioUrl && (
                                    <audio ref={audioRef} src={exercise.audioUrl} />
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Controls & Savage Tip Footer */}
                        <div className="relative z-20 bg-[#121212] border-t border-[#00FFFF]/20 p-6 flex flex-col sm:flex-row items-center gap-6">

                            {/* Savage Tip Highlight */}
                            <div className="flex-1 border-l-4 border-[#00FFFF] pl-4 py-1">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00FFFF]">
                                        Savage Tip
                                    </p>
                                    <p className="text-[8px] font-mono tracking-widest text-[#00FFFF]/50 uppercase">
                                        Powered by Gym 2
                                    </p>
                                </div>
                                <p className="text-sm italic text-white/90 font-medium">
                                    "{exercise.savageTip}"
                                </p>
                            </div>

                            {/* Custom Playback Controls */}
                            <div className="flex items-center gap-4 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                                <button onClick={restartVideo} className="text-white/60 hover:text-[#00FFFF] transition">
                                    <RotateCcw size={18} />
                                </button>

                                <button
                                    onClick={togglePlay}
                                    className="w-12 h-12 rounded-full bg-[#00FFFF] text-black flex items-center justify-center hover:scale-105 transition hover:shadow-[0_0_20px_rgba(0,255,255,0.6)]"
                                >
                                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                                </button>

                                <button className="text-white/60 hover:text-[#00FFFF] transition">
                                    <Maximize size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Custom Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black">
                            <motion.div
                                className="h-full bg-[#00FFFF]"
                                style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(0,255,255,0.8)' }}
                                layout
                            />
                        </div>

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
