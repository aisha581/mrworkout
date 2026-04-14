"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { LiveExercise } from '@/app/library/page';
import { useState, useRef, useEffect } from 'react';
import LogSetModal from '@/components/LogSetModal';
import { Loader2, Plus, PlayCircle } from 'lucide-react';
import { useCircuit } from '@/contexts/CircuitContext';

interface ExerciseCardProps {
    exercise: LiveExercise;
    delay?: number;
    onStartWorkout: (exercise: LiveExercise) => void;
}

export default function ExerciseCard({ exercise, delay = 0, onStartWorkout }: ExerciseCardProps) {
    const { theme } = useTheme();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addToQueue, queue } = useCircuit();

    const cardRef  = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // ── Intersection Observer ─────────────────────────────────────────────────
    // Video element is only mounted when the card is in (or within 150 px of)
    // the viewport. Cards outside this zone have no <video> in the DOM at all —
    // zero network requests, zero decoded buffers, zero GPU memory for them.
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsVisible(entry.isIntersecting),
            {
                rootMargin: '150px', // start loading 150 px before entering view
                threshold:  0,
            }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    // ── Re-play when URL changes while visible (e.g. category filter) ─────────
    // With conditional rendering, videoRef is only set when isVisible=true.
    // The effect re-runs whenever the url or visibility changes.
    useEffect(() => {
        const v = videoRef.current;
        if (!v || !exercise.videoUrl || !isVisible) return;
        v.load();
        v.play().catch(() => {});
    }, [exercise.videoUrl, isVisible]);

    const isInQueue = queue.some(ex => ex.id === exercise.id);

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="group relative flex flex-col rounded-[24px] overflow-hidden backdrop-blur-3xl transition-all duration-300 w-full"
            style={{
                backgroundColor: theme.mode === 'savage' ? '#181818' : theme.cardBg,
                border:          `1px solid ${theme.borderColor}`,
                boxShadow: theme.mode === 'savage'
                    ? `0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
                    : `0 4px 24px rgba(183, 110, 121, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
            }}
        >
            {theme.mode === 'savage' && (
                <div
                    className="absolute -top-6 -right-4 text-[#00FFFF] opacity-[0.03] font-black italic text-[120px] pointer-events-none select-none"
                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                >
                    W
                </div>
            )}

            <div
                className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"
                style={{ border: `1px solid ${theme.accent}60` }}
            />

            {!isInQueue && exercise.videoUrl && (
                <button
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(40);
                        addToQueue(exercise); 
                    }}
                    className="absolute top-4 right-4 z-20 p-2.5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center"
                    style={{ 
                        background: theme.accent, 
                        color: '#000',
                        boxShadow: `0 0 20px ${theme.accent}60`,
                        border: `1px solid rgba(255,255,255,0.5)`,
                        touchAction: 'manipulation'
                    }}
                    title="Add to Routine"
                >
                    <Plus size={16} strokeWidth={4} />
                </button>
            )}
            
            {isInQueue && (
                <div 
                    className="absolute top-4 right-4 z-20 p-2.5 rounded-full flex items-center justify-center"
                    style={{ 
                        background: 'rgba(0,255,255,0.1)', 
                        border: `1px solid ${theme.accent}40`,
                        color: theme.accent
                    }}
                >
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                    >
                        <Plus size={16} strokeWidth={4} className="rotate-45" />
                    </motion.div>
                </div>
            )}

            {/* ── Video thumbnail area ──────────────────────────────────────── */}
            <div
                className="w-full h-48 relative overflow-hidden bg-[#0a0a0a] shrink-0 cursor-pointer border-b border-white/10"
                onClick={() => { if (exercise.videoUrl) onStartWorkout(exercise); }}
                style={{ willChange: 'transform' }}
            >
                {/*
                  Only mount the <video> element when the card is visible.
                  - isVisible=true  → full preload="auto", plays immediately
                  - isVisible=false → no DOM node, no network, no decoder memory
                  The 150px rootMargin means the video is already decoded by the
                  time the card scrolls fully into view.
                */}
                {exercise.videoUrl && isVisible ? (
                    <video
                        ref={videoRef}
                        src={exercise.videoUrl}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ transform: 'translateZ(0)', willChange: 'opacity' }}
                        playsInline
                        preload="auto"
                        autoPlay
                        muted
                        loop
                        poster={`/images/${exercise.category.toLowerCase()}-bg.jpg`}
                        onTimeUpdate={(e) => {
                            if (e.currentTarget.currentTime >= 3.0) {
                                e.currentTarget.currentTime = 0;
                            }
                        }}
                    />
                ) : exercise.videoUrl && !isVisible ? (
                    // Off-screen placeholder: dark slot, zero network/memory cost
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-20"
                        style={{ backgroundImage: `url('/images/${exercise.category.toLowerCase()}-bg.jpg')` }}
                    />
                ) : (
                    // No video at all: static background
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                        style={{ backgroundImage: `url('/images/${exercise.category.toLowerCase()}-bg.jpg')` }}
                    />
                )}

                <div
                    className="absolute inset-0 opacity-20 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                    style={{ background: `linear-gradient(45deg, ${theme.accent}20, transparent)` }}
                />

                {!exercise.videoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/50 font-bold text-3xl uppercase tracking-tighter drop-shadow-2xl">
                        {exercise.category}
                    </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)] pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white flex items-center justify-center text-white">
                        <PlayCircle size={32} />
                    </div>
                </div>
            </div>

            <div className="flex flex-col flex-grow bg-[#0c0c0c] p-6 h-full">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold tracking-tight">{exercise.name}</h3>
                    <span
                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full bg-white/5 border"
                        style={{ borderColor: `${theme.accent}30`, color: theme.accent }}
                    >
                        {exercise.category}
                    </span>
                </div>

                <p className="text-sm opacity-60 mb-4 font-medium">
                    Target: {exercise.targetMuscle}
                </p>

                <div className="mt-auto p-4 rounded-xl bg-black/40 border border-white/5 relative overflow-hidden group/tip">
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1 opacity-50 transition-opacity group-hover/tip:opacity-100"
                        style={{ backgroundColor: theme.accent }}
                    />
                    <p className="text-sm italic opacity-80 pl-2 line-clamp-2">
                        &ldquo;{exercise.savageTip}&rdquo;
                    </p>
                </div>

                {!exercise.videoUrl && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
                        <div className="flex items-center gap-2 text-white/50 bg-black/80 px-6 py-3 rounded-full border border-white/10 uppercase font-black text-xs tracking-widest">
                            <Loader2 size={16} className="animate-spin" /> Processing
                        </div>
                    </div>
                )}
            </div>

            <LogSetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                exercise={exercise}
            />
        </motion.div>
    );
}
