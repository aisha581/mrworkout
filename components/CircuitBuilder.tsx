"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { GripVertical, Play, Trash2, Plus } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';

export default function CircuitBuilder() {
    const { queue, setQueue, removeFromQueue, startCircuit, isCircuitActive } = useCircuit();
    const { theme } = useTheme();

    if (isCircuitActive) return null;

    return (
        <section className="mt-12 mb-16">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2
                        className="text-3xl font-bold tracking-tighter uppercase"
                        style={{
                            fontFamily: 'var(--font-archivo-black), sans-serif',
                            textShadow: theme.mode === 'savage' ? `0 0 20px ${theme.accent}40` : 'none'
                        }}
                    >
                        Create Your <span style={{ color: theme.accent }}>Circuit</span>
                    </h2>
                    <p className="text-sm opacity-50 mt-1 uppercase tracking-widest font-bold">
                        Add exercises to build your savage sequence
                    </p>
                </div>

                {queue.length > 0 && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startCircuit}
                        className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-tighter text-lg transition-all"
                        style={{
                            backgroundColor: theme.accent,
                            color: '#000',
                            boxShadow: `0 0 30px ${theme.accent}40`
                        }}
                    >
                        <Play size={20} fill="currentColor" />
                        Start Savage Workout
                    </motion.button>
                )}
            </div>

            <div
                className="p-8 rounded-[32px] border border-white/5 bg-black/20 min-h-[200px] flex flex-col"
            >
                {queue.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-[24px]">
                        <Plus size={48} className="mb-4 opacity-50" />
                        <p className="font-bold tracking-widest uppercase">Select exercises from below</p>
                    </div>
                ) : (
                    <Reorder.Group
                        axis="y"
                        values={queue}
                        onReorder={setQueue}
                        className="space-y-4"
                    >
                        <AnimatePresence>
                            {queue.map((exercise) => (
                                <Reorder.Item
                                    key={exercise.id}
                                    value={exercise}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="relative flex items-center gap-4 p-4 rounded-2xl bg-[#181818] border border-white/5 group cursor-grab active:cursor-grabbing"
                                    style={{
                                        boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.05)`
                                    }}
                                >
                                    <div className="text-white/20 group-hover:text-white/40 transition-colors">
                                        <GripVertical size={20} />
                                    </div>

                                    <div className="h-12 w-12 rounded-xl bg-black/40 flex items-center justify-center font-black text-xs text-[#00FFFF]/50">
                                        {exercise.category[0]}
                                    </div>

                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg">{exercise.name}</h4>
                                        <p className="text-xs opacity-50 uppercase tracking-widest">{exercise.targetMuscle}</p>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">3 Sets</p>
                                            <p className="text-[10px] uppercase font-bold text-[#00FFFF]/60 tracking-widest">Auto-Advance</p>
                                        </div>
                                        <button
                                            onClick={() => removeFromQueue(exercise.id)}
                                            className="p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    {/* Accent Border on Hover */}
                                    <div className="absolute inset-0 rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </Reorder.Item>
                            ))}
                        </AnimatePresence>
                    </Reorder.Group>
                )}
            </div>
        </section>
    );
}
