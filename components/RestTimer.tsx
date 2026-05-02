"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { useWorkout } from '@/contexts/WorkoutContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, SkipForward } from 'lucide-react';

export default function RestTimer() {
    const { theme } = useTheme();
    const { isTimerActive, timeRemaining, stopRestTimer } = useWorkout();

    // Format mm:ss
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <AnimatePresence>
            {isTimerActive && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]"
                >
                    <motion.div
                        className="flex items-center gap-4 px-6 py-3 rounded-full backdrop-blur-3xl"
                        style={{
                            backgroundColor: theme.cardBg,
                            border: `1px solid ${theme.accent}80`,
                            // Savage Cyan Pulse Effect
                            boxShadow: `0 0 20px ${theme.accent}40, inset 0 0 10px ${theme.accent}20`
                        }}
                        animate={{
                            boxShadow: [
                                `0 0 20px ${theme.accent}40, inset 0 0 10px ${theme.accent}20`,
                                `0 0 40px ${theme.accent}80, inset 0 0 20px ${theme.accent}40`,
                                `0 0 20px ${theme.accent}40, inset 0 0 10px ${theme.accent}20`,
                            ]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <Timer size={20} style={{ color: theme.accent }} />

                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                                Rest Timer
                            </span>
                            <span
                                className="text-xl font-bold tracking-tighter"
                                style={{
                                    fontFamily: 'var(--font-archivo-black), sans-serif',
                                    color: theme.accent
                                }}
                            >
                                {formattedTime}
                            </span>
                        </div>

                        {/* Skip button */}
                        <button
                            onClick={stopRestTimer}
                            className="ml-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black uppercase text-[9px] tracking-[0.2em] transition-all active:scale-95"
                            style={{
                                background:  `${theme.accent}20`,
                                border:      `1px solid ${theme.accent}50`,
                                color:       theme.accent,
                            }}
                        >
                            <SkipForward size={11} />
                            SKIP
                        </button>

                        {/* Dismiss */}
                        <button
                            onClick={stopRestTimer}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={14} className="opacity-40 hover:opacity-80" />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
