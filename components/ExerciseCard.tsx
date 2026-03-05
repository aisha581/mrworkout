"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import type { Exercise } from '@/data/libraryData';
import type { LiveExercise } from '@/app/library/page';
import { useState } from 'react';
import LogSetModal from '@/components/LogSetModal';
import VideoPlayer from '@/components/VideoPlayer';
import { PlayCircle, Loader2, Plus } from 'lucide-react';
import { useCircuit } from '@/contexts/CircuitContext';

interface ExerciseCardProps {
    exercise: LiveExercise;
    delay?: number;
}

export default function ExerciseCard({ exercise, delay = 0 }: ExerciseCardProps) {
    const { theme } = useTheme();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVideoPlayerOpen, setIsVideoPlayerOpen] = useState(false);
    const { addToQueue, queue } = useCircuit();
    const isInQueue = queue.some(ex => ex.id === exercise.id);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -5 }}
            className="group relative flex flex-col rounded-[24px] overflow-hidden cursor-pointer backdrop-blur-3xl transition-all duration-300"
            style={{
                backgroundColor: theme.mode === 'savage' ? '#181818' : theme.cardBg,
                border: `1px solid ${theme.borderColor}`,
                boxShadow: theme.mode === 'savage'
                    ? `0 4px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
                    : `0 4px 24px rgba(183, 110, 121, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
            }}
        >
            {/* W Watermark */}
            {theme.mode === 'savage' && (
                <div
                    className="absolute -top-6 -right-4 text-[#00FFFF] opacity-[0.03] font-black italic text-[120px] pointer-events-none select-none"
                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                >
                    W
                </div>
            )}
            {/* Glow effect on hover (Savage Cyan / Mrs Rose) */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 pointer-events-none"
                style={{ backgroundColor: theme.accent }}
            />

            {/* Hover Border Glow */}
            <div
                className="absolute inset-0 rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{ border: `1px solid ${theme.accent}60` }}
            />

            {/* Add to Circuit Button */}
            {!isInQueue && exercise.isAvailable && (
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

            {/* Video / Image Area */}
            <div
                className="relative h-48 w-full bg-black/40 overflow-hidden"
                onClick={() => setIsVideoPlayerOpen(true)}
            >
                <div
                    className="absolute inset-0 opacity-20 group-hover:scale-105 transition-transform duration-700"
                    style={{
                        background: `linear-gradient(45deg, ${theme.accent}20, transparent)`,
                    }}
                />
                {/* Fallback pattern since we don't have actual images yet */}
                <div className="absolute inset-0 flex items-center justify-center text-white/10 font-bold text-4xl uppercase tracking-tighter mix-blend-overlay">
                    {exercise.category}
                </div>

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]">
                    <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm border-2 border-white flex items-center justify-center text-white">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    </div>
                </div>
            </div>

            {/* Content Content */}
            <div className="p-6 flex flex-col flex-grow">
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

                <div className="mt-auto p-4 rounded-xl bg-black/20 border border-white/5 relative overflow-hidden group/tip">
                    <div
                        className="absolute left-0 top-0 bottom-0 w-1 opacity-50 transition-opacity group-hover/tip:opacity-100"
                        style={{ backgroundColor: theme.accent }}
                    />
                    <p className="text-sm italic opacity-80 pl-2">
                        "{exercise.savageTip}"
                    </p>
                </div>

                {/* Action Button: Hot Swap Logic */}
                {exercise.isAvailable ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsVideoPlayerOpen(true); }}
                        className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold transition-all duration-300 hover:scale-[1.02]"
                        style={{
                            backgroundColor: theme.accent,
                            color: '#000',
                            boxShadow: `0 0 15px ${theme.accent}60`
                        }}
                    >
                        <PlayCircle size={18} />
                        Start Workout
                    </button>
                ) : (
                    <button
                        disabled
                        className="mt-6 flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold transition-colors duration-200 cursor-not-allowed opacity-60"
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.5)',
                            border: `1px dashed rgba(255,255,255,0.2)`
                        }}
                    >
                        <Loader2 size={18} className="animate-spin" />
                        Processing...
                    </button>
                )}
            </div>

            {/* Injected Logging Modal */}
            <LogSetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                exercise={exercise}
            />

            {/* Injected Video Player */}
            <VideoPlayer
                isOpen={isVideoPlayerOpen}
                onClose={() => setIsVideoPlayerOpen(false)}
                exercise={exercise}
            />
        </motion.div>
    );
}
