"use client";

// Bottom-sheet drawer for the Daily Mission.
// Opens when the user taps the glowing chest button on the 3D mannequin.
// Drag the sheet down >100 px to dismiss.

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Trophy, Clock, X, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { DailyChallenge } from '@/utils/dailyChallenge';
import { getTimeUntilNextChallenge } from '@/utils/dailyChallenge';
import { useState, useEffect } from 'react';

interface MissionDrawerProps {
    isOpen:           boolean;
    onClose:          () => void;
    challenge:        DailyChallenge | null;
    onStartChallenge: () => void;
}

export default function MissionDrawer({ isOpen, onClose, challenge, onStartChallenge }: MissionDrawerProps) {
    const { theme } = useTheme();
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setTimeLeft(getTimeUntilNextChallenge());
        const iv = setInterval(() => setTimeLeft(getTimeUntilNextChallenge()), 1000);
        return () => clearInterval(iv);
    }, [isOpen]);

    const handleStart = () => {
        onClose();
        // Small delay lets the sheet animate out before ChallengePlayer opens
        setTimeout(onStartChallenge, 180);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-[580] bg-black/60 backdrop-blur-[6px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 z-[590] rounded-t-[36px] overflow-hidden"
                        style={{ backgroundColor: '#0e0e0e', border: `1px solid rgba(255,255,255,0.07)` }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 290, damping: 34 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
                    >
                        {/* Safe-area bottom padding */}
                        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

                            {/* Drag handle */}
                            <div className="flex justify-center pt-4 pb-2">
                                <div className="w-10 h-1 rounded-full bg-white/20" />
                            </div>

                            {/* Close button */}
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 active:scale-90 transition-transform"
                            >
                                <X size={16} className="text-white/60" />
                            </button>

                            <div className="px-7 pt-2 pb-8">
                                {/* Label */}
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-3"
                                   style={{ color: theme.accent, opacity: 0.8 }}>
                                    Daily Mission
                                </p>

                                {/* Exercise name */}
                                <h2
                                    className="text-4xl font-black uppercase tracking-tighter leading-none mb-1"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                                >
                                    {challenge?.exerciseId ?? 'SQUAT'}{' '}
                                    <span className="opacity-30">AMRAP</span>
                                </h2>

                                <p className="text-sm opacity-40 mb-6 font-medium">
                                    {challenge?.quote ?? 'Earn your rest.'}
                                </p>

                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-3 mb-7">
                                    {[
                                        { icon: Zap,    label: 'Target',    value: `${challenge?.targetReps ?? 60}+ Reps` },
                                        { icon: Trophy, label: 'Savage Avg', value: `${challenge?.averageReps ?? 42} Reps` },
                                        { icon: Clock,  label: 'Expires',   value: timeLeft || '—' },
                                    ].map(({ icon: Icon, label, value }) => (
                                        <div
                                            key={label}
                                            className="rounded-2xl p-3 flex flex-col gap-1"
                                            style={{
                                                background: `${theme.accent}0a`,
                                                border:     `1px solid ${theme.accent}20`,
                                            }}
                                        >
                                            <Icon size={14} style={{ color: theme.accent }} />
                                            <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{label}</p>
                                            <p className="text-sm font-black leading-tight">{value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA */}
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleStart}
                                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5"
                                    style={{
                                        background:  `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}cc 100%)`,
                                        boxShadow:   `0 0 30px ${theme.accent}50`,
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    <Zap size={16} fill="currentColor" />
                                    Start Challenge
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
