"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSavageSounds } from '@/hooks/useSavageSounds';
import { useTheme } from '@/contexts/ThemeContext';
import { Zap, ChevronRight } from 'lucide-react';

interface WelcomeOverlayProps {
    isVisible: boolean;
    onEnter: () => void;
}

export default function WelcomeOverlay({ isVisible, onEnter }: WelcomeOverlayProps) {
    const { playEntryClang } = useSavageSounds();
    const { theme } = useTheme();

    const handleEnter = () => {
        playEntryClang();
        onEnter();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#060606]"
                >
                    {/* Savage Radial Glow */}
                    <div
                        className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, ${theme.accent}15 0%, transparent 70%)`
                        }}
                    />

                    <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
                        {/* W Logo Animation */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{
                                delay: 0.2,
                                type: "spring",
                                stiffness: 200,
                                damping: 20
                            }}
                            className="text-[180px] font-black italic mb-4 leading-none select-none"
                            style={{
                                color: theme.accent,
                                fontFamily: 'var(--font-archivo-black), sans-serif',
                                textShadow: `0 0 60px ${theme.accent}40`
                            }}
                        >
                            W
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="space-y-6"
                        >
                            <div>
                                <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-2 italic">
                                    MR. WORKOUT
                                </h1>
                                <div className="flex items-center justify-center gap-2 mb-8">
                                    <div className="h-[2px] w-8 bg-white/20" />
                                    <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">
                                        The Clinic Awaits
                                    </span>
                                    <div className="h-[2px] w-8 bg-white/20" />
                                </div>
                            </div>

                            <p className="text-lg text-white/60 mb-12 font-medium tracking-tight px-4 underline decoration-[#00FFFF]/20 underline-offset-8 decoration-2">
                                Forge your body. Master the routine. <br className="hidden sm:block" />
                                No shortcuts. Just Savage execution.
                            </p>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleEnter}
                                className="group relative flex items-center gap-3 px-12 py-5 rounded-[24px] overflow-hidden"
                            >
                                <div
                                    className="absolute inset-0 transition-transform group-hover:scale-105"
                                    style={{ backgroundColor: theme.accent }}
                                />
                                <span className="relative z-10 text-black font-black uppercase italic tracking-tighter text-xl">
                                    Enter The Clinic
                                </span>
                                <ChevronRight className="relative z-10 text-black group-hover:translate-x-1 transition-transform" size={24} />
                            </motion.button>
                        </motion.div>

                        {/* Savage Intellectual Footer */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                            className="mt-20 flex items-center gap-3 text-white/20"
                        >
                            <Zap size={14} fill="currentColor" />
                            <span className="text-[10px] uppercase font-bold tracking-[0.5em]">System Status: Savage</span>
                        </motion.div>
                    </div>

                    {/* Industrial Background Grid Lines */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(${theme.accent} 1px, transparent 1px), linear-gradient(90deg, ${theme.accent} 1px, transparent 1px)`,
                            backgroundSize: '100px 100px'
                        }}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
