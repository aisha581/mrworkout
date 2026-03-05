"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSavageSounds } from '@/hooks/useSavageSounds';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, Maximize } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';
import CircuitHUD from './CircuitHUD';
import RecoveryScreen from './RecoveryScreen';

export default function CircuitPlayer() {
    const {
        isCircuitActive,
        stopCircuit,
        queue,
        currentIndex,
        isResting,
        handleLoopComplete,
        restTimeRemaining
    } = useCircuit();

    const { theme } = useTheme();
    const { playThud, playPing } = useSavageSounds();

    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    const currentExercise = queue[currentIndex];

    // Handle Fullscreen on Start
    useEffect(() => {
        if (isCircuitActive && containerRef.current) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen().catch(err => {
                    console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            }
        }
    }, [isCircuitActive]);

    // Handle SFX for Countdown
    useEffect(() => {
        if (isResting && restTimeRemaining <= 3 && restTimeRemaining > 0) {
            playThud();
        } else if (isResting && restTimeRemaining === 0) {
            playPing();
        }
    }, [restTimeRemaining, isResting, playThud, playPing]);

    // Ensure we reset state when opening a new exercise
    useEffect(() => {
        if (isCircuitActive && !isResting && videoRef.current) {
            videoRef.current.play().catch(e => console.warn("Auto-play prevented", e));
            setIsPlaying(true);
        }
    }, [isCircuitActive, isResting, currentIndex]);

    if (!isCircuitActive) return null;

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

    const onVideoEnded = () => {
        handleLoopComplete();
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

    return (
        <AnimatePresence>
            <motion.div
                ref={containerRef}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[500] bg-black flex flex-col items-center justify-center overflow-hidden"
            >
                {/* HUD Overlay */}
                {!isResting && <CircuitHUD />}

                {/* Recovery Screen */}
                <RecoveryScreen />

                {/* Main Video View */}
                {!isResting && currentExercise && (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {currentExercise.videoUrl ? (
                            <video
                                ref={videoRef}
                                src={currentExercise.videoUrl}
                                className="w-full h-full object-cover lg:object-contain"
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={onVideoEnded}
                                playsInline
                                muted
                                autoPlay
                            />
                        ) : (
                            <div className="text-[#00FFFF] text-center">
                                <p className="text-2xl font-black uppercase italic mb-2">Footage Missing</p>
                                <p className="opacity-40 uppercase tracking-widest text-sm">Drop MP4 for {currentExercise.name}</p>
                            </div>
                        )}

                        {currentExercise.audioUrl && (
                            <audio ref={audioRef} src={currentExercise.audioUrl} autoPlay />
                        )}

                        {/* Custom Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/5 z-40">
                            <motion.div
                                className="h-full bg-[#00FFFF]"
                                style={{
                                    width: `${progress}%`,
                                    boxShadow: '0 0 20px #00FFFF'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Floating Exit Button */}
                <button
                    onClick={stopCircuit}
                    className="absolute top-10 left-1/2 -translate-x-1/2 z-[600] p-4 rounded-full bg-black/40 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all opacity-0 hover:opacity-100"
                >
                    <X size={24} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
}
