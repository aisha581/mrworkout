"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsPro } from '@/hooks/useIsPro';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Trash2, Play, Database, Plus, Lock, Crown } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function VaultPage() {
    const { theme } = useTheme();
    const { queue, removeFromQueue } = useCircuit();
    const { isPro } = useIsPro();
    const router = useRouter();

    const handleStart = () => {
        if (queue.length === 0) return;
        navigator.vibrate?.([30, 20, 60]);
        router.push('/playground');
    };

    return (
        <main className="min-h-screen pb-32 bg-[#0D0D0D]">
            <Navbar />

            <section className="pt-28 pb-8 px-6 sm:px-10 max-w-2xl mx-auto">

                {/* Header */}
                <div className="mb-8">
                    <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30 mb-2">
                        Selected Exercises
                    </p>
                    <h1
                        className="text-4xl font-black uppercase leading-none"
                        style={{
                            fontFamily:    'var(--font-archivo-black), sans-serif',
                            letterSpacing: '-0.03em',
                        }}
                    >
                        The <span style={{ color: theme.accent }}>Vault</span>
                    </h1>
                </div>

                {/* Queue list */}
                <AnimatePresence mode="popLayout">
                    {queue.length === 0 ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-24 text-center"
                        >
                            <Database size={40} className="mb-4 opacity-10" />
                            <p className="text-sm opacity-30 font-medium mb-2">Your vault is empty.</p>
                            <p className="text-xs opacity-20 mb-6">
                                Tap <strong>+</strong> on any exercise in the Armory to add it here.
                            </p>
                            <Link
                                href="/library"
                                className="px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest text-black flex items-center gap-2"
                                style={{
                                    background: `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}cc 100%)`,
                                    boxShadow:  `0 0 20px ${theme.accent}40`,
                                }}
                            >
                                <Plus size={13} strokeWidth={3} />
                                Go to Armory
                            </Link>
                        </motion.div>
                    ) : (
                        queue.map((exercise, idx) => (
                            <motion.div
                                key={exercise.id}
                                layout
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 16, transition: { duration: 0.18 } }}
                                transition={{ delay: idx * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                className="flex items-center gap-4 mb-3 rounded-2xl px-5 py-4"
                                style={{
                                    background: theme.mode === 'savage' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                    border:     `1px solid ${theme.accent}18`,
                                }}
                            >
                                {/* Index badge */}
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                                    style={{
                                        background: `${theme.accent}18`,
                                        color:      theme.accent,
                                        border:     `1px solid ${theme.accent}30`,
                                    }}
                                >
                                    {idx + 1}
                                </div>

                                {/* Exercise info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-sm uppercase tracking-tight truncate">
                                        {exercise.name}
                                    </p>
                                    <p className="text-[10px] opacity-30 font-medium mt-0.5">
                                        {exercise.category} · {exercise.targetMuscle}
                                    </p>
                                </div>

                                {/* Remove */}
                                <motion.button
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => removeFromQueue(exercise.id)}
                                    className="p-2 rounded-xl opacity-30 hover:opacity-70 transition-opacity"
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <Trash2 size={15} />
                                </motion.button>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>

                {/* Start button */}
                {queue.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-6"
                    >
                        <motion.button
                            whileTap={{ scale: isPro ? 0.97 : 1 }}
                            onClick={isPro ? handleStart : () => router.push('/join')}
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-3 relative overflow-hidden"
                            style={{
                                background:  isPro
                                    ? `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}cc 100%)`
                                    : 'rgba(255,255,255,0.07)',
                                boxShadow:   isPro
                                    ? `0 0 40px ${theme.accent}50, 0 8px 32px rgba(0,0,0,0.4)`
                                    : 'none',
                                border:      isPro ? 'none' : '1px solid rgba(255,255,255,0.15)',
                                color:       isPro ? '#000' : '#fff',
                                touchAction: 'manipulation',
                            }}
                        >
                            {isPro ? (
                                <>
                                    <Play size={16} fill="currentColor" />
                                    Start Workout · {queue.length} Exercise{queue.length !== 1 ? 's' : ''}
                                </>
                            ) : (
                                <>
                                    <Lock size={15} />
                                    Custom Routine — Pro Only
                                    <Crown size={14} color="#FFD700" style={{ marginLeft: 4 }} />
                                </>
                            )}
                        </motion.button>

                        {!isPro && (
                            <p className="text-center text-[10px] opacity-30 mt-2 font-medium">
                                Start a 7-day free trial to unlock custom circuits.
                            </p>
                        )}

                        {isPro && (
                            <p className="text-center text-[10px] opacity-20 mt-3 font-medium">
                                Exercises play in order. Rest between sets.
                            </p>
                        )}
                    </motion.div>
                )}

            </section>
        </main>
    );
}
