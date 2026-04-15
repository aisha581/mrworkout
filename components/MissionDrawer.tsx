"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { getTimeUntilNextChallenge } from '@/utils/dailyChallenge';
import { GOAL_LABELS, GOAL_MESSAGES, type Goal } from '@/utils/missionGenerator';
import type { LiveExercise } from '@/app/library/page';
import { useState, useEffect } from 'react';

interface MissionDrawerProps {
    isOpen:           boolean;
    onClose:          () => void;
    onStartMission:   () => void;
    goal:             Goal | null;
    missionExercises: LiveExercise[];
}

export default function MissionDrawer({
    isOpen,
    onClose,
    onStartMission,
    goal,
    missionExercises,
}: MissionDrawerProps) {
    const { theme }  = useTheme();
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setTimeLeft(getTimeUntilNextChallenge());
        const iv = setInterval(() => setTimeLeft(getTimeUntilNextChallenge()), 1000);
        return () => clearInterval(iv);
    }, [isOpen]);

    const handleStart = () => {
        onClose();
        setTimeout(onStartMission, 180);
    };

    const hasProfile = goal !== null && missionExercises.length > 0;

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
                        style={{ backgroundColor: '#0e0e0e', border: '1px solid rgba(255,255,255,0.07)' }}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', stiffness: 290, damping: 34 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.4 }}
                        onDragEnd={(_, info) => { if (info.offset.y > 100) onClose(); }}
                    >
                        <div style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>

                            {/* Drag handle */}
                            <div className="flex justify-center pt-4 pb-2">
                                <div className="w-10 h-1 rounded-full bg-white/20" />
                            </div>

                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="absolute top-5 right-5 p-2 rounded-full bg-white/5 border border-white/10 active:scale-90 transition-transform"
                            >
                                <X size={16} className="text-white/60" />
                            </button>

                            <div className="px-7 pt-2 pb-8">
                                {/* Label */}
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-2"
                                   style={{ color: theme.accent, opacity: 0.8 }}>
                                    Daily Mission
                                </p>

                                {/* Title */}
                                <h2
                                    className="text-3xl font-black uppercase tracking-tighter leading-tight mb-1"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                                >
                                    {hasProfile ? `Today's ${GOAL_LABELS[goal!]}` : "Today's Challenge"}
                                </h2>

                                {/* Personalized subtitle */}
                                <p className="text-xs opacity-40 mb-5 font-medium leading-snug">
                                    {hasProfile
                                        ? `Based on your goal to ${GOAL_LABELS[goal!].toUpperCase()} — ${GOAL_MESSAGES[goal!]}`
                                        : 'Complete the daily AMRAP and earn your rest.'}
                                </p>

                                {/* Exercise list (personalized mode) */}
                                {hasProfile ? (
                                    <div className="flex flex-col gap-2 mb-5">
                                        {missionExercises.map((ex, i) => (
                                            <div
                                                key={ex.id}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                                style={{
                                                    background: `${theme.accent}0a`,
                                                    border:     `1px solid ${theme.accent}18`,
                                                }}
                                            >
                                                <span
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                                                    style={{ background: `${theme.accent}22`, color: theme.accent }}
                                                >
                                                    {i + 1}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black uppercase tracking-tight truncate">{ex.name}</p>
                                                    <p className="text-[9px] opacity-30 mt-0.5">{ex.category} · {ex.targetMuscle}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <p className="text-[10px] opacity-20 font-medium text-center pt-1">
                                            Mission resets in {timeLeft || '—'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex gap-3 mb-5">
                                        {[
                                            { label: 'Format',  value: 'AMRAP 60s'    },
                                            { label: 'Expires', value: timeLeft || '—' },
                                        ].map(({ label, value }) => (
                                            <div
                                                key={label}
                                                className="flex-1 rounded-2xl p-3"
                                                style={{ background: `${theme.accent}0a`, border: `1px solid ${theme.accent}20` }}
                                            >
                                                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">{label}</p>
                                                <p className="text-sm font-black leading-tight">{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

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
                                    {hasProfile ? 'Start Mission' : 'Start Challenge'}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
