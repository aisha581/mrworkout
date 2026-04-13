"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import type { LiveExercise } from '@/app/library/page';
import { useState } from 'react';
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
    const isInQueue = queue.some(ex => ex.id === exercise.id);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="group relative flex flex-col rounded-[24px] overflow-hidden backdrop-blur-3xl transition-all duration-300 w-full"
            style={{
                backgroundColor: theme.mode === 'savage' ? '#181818' : theme.cardBg,
                border: `1px solid ${theme.borderColor}`,
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
                        addToQueue(exercise);
                    }}
                    className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/40 border border-white/5 text-[#00FFFF]/50 hover:text-[#00FFFF] hover:border-[#00FFFF]/50 transition-all scale-0 group-hover:scale-100"
                    title="Add to Circuit"
                >
                    <Plus size={20} />
                </button>
            )}

            <div className="w-full h-48 relative overflow-hidden bg-[#0a0a0a] shrink-0 cursor-pointer border-b border-white/10" onClick={() => { if(exercise.videoUrl) onStartWorkout(exercise) }}>
                
                {/* 1. Underlying Video Canvas */}
                {exercise.videoUrl ? (
                    <video
                        src={exercise.videoUrl}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-300"
                        playsInline
                        preload="metadata"
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
                ) : (
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-300"
                        style={{ backgroundImage: `url('/images/${exercise.category.toLowerCase()}-bg.jpg')` }}
                    />
                )}

                {/* 2. Overlays */}
                <div
                    className="absolute inset-0 opacity-20 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                    style={{ background: `linear-gradient(45deg, ${theme.accent}20, transparent)` }}
                />
                
                {!exercise.videoUrl && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/50 font-bold text-3xl uppercase tracking-tighter drop-shadow-2xl">
                        {exercise.category}
                    </div>
                )}
                
                {/* Play Button Hover Indication */}
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
                        "{exercise.savageTip}"
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
