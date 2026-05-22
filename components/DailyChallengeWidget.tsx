"use client";

import { useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Timer, Zap, Trophy } from 'lucide-react';
import { getDailyChallenge, getTimeUntilNextChallenge, DailyChallenge } from '@/utils/dailyChallenge';
import ChallengePlayer from './ChallengePlayer';

export default function DailyChallengeWidget() {
    const { theme } = useTheme();
    const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [isPlayerOpen, setIsPlayerOpen] = useState(false);

    useEffect(() => {
        // We'll need to fetch the library to get the exercise details
        const fetchChallenge = async () => {
            try {
                const res = await fetch('/api/library');
                if (res.ok) {
                    const library = await res.json();
                    setChallenge(getDailyChallenge(library));
                }
            } catch (error) {
                console.error("Failed to load daily challenge:", error);
            }
        };

        fetchChallenge();

        const timer = setInterval(() => {
            setTimeLeft(getTimeUntilNextChallenge());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    if (!challenge) return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[32px] p-8 mb-12 group cursor-pointer"
                style={{
                    background: theme.mode === 'savage' ? '#121212' : theme.cardBg,
                    border: `2px solid ${theme.accent}40`,
                    boxShadow: theme.mode === 'savage' ? `0 0 30px ${theme.accent}15` : undefined
                }}
                onClick={() => setIsPlayerOpen(true)}
            >
                {/* Pulsing Border Effect */}
                <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-[30px] border-2 border-[#00FFFF] pointer-events-none opacity-20"
                    style={{ borderColor: theme.accent }}
                />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center text-black"
                            style={{ backgroundColor: theme.accent }}
                        >
                            <Zap size={40} fill="currentColor" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-[#00FFFF]" style={{ color: theme.accent }}>
                                    Daily Savage Challenge
                                </span>
                                <div className="h-[1px] w-12 bg-[#00FFFF]/30" style={{ backgroundColor: `${theme.accent}40` }} />
                            </div>
                            <h2 className="text-4xl font-black uppercase tracking-tighter italic">
                                {challenge.exerciseId} <span className="opacity-40">AMRAP</span>
                            </h2>
                            <p className="text-sm opacity-50 font-bold uppercase tracking-widest mt-1">
                                {challenge.quote}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-12 border-l border-white/10 pl-12">
                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-1">Expires In</p>
                            <div className="flex items-center gap-2 font-mono text-2xl font-bold">
                                <Timer size={20} className="text-[#00FFFF]" style={{ color: theme.accent }} />
                                {timeLeft}
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-[10px] uppercase font-bold tracking-widest opacity-40 mb-1">Savage Avg</p>
                            <div className="flex items-center gap-2 text-2xl font-bold">
                                <Trophy size={20} className="text-[#00FFFF]" style={{ color: theme.accent }} />
                                {challenge.averageReps} <span className="text-xs opacity-40 ml-1">REPS</span>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-4 rounded-2xl font-black uppercase tracking-tighter text-black"
                            style={{ backgroundColor: theme.accent }}
                        >
                            Accept Mission
                        </motion.button>
                    </div>
                </div>

                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#00FFFF]/5 to-transparent pointer-events-none" style={{ background: `linear-gradient(to left, ${theme.accent}05, transparent)` }} />
            </motion.div>

            <ChallengePlayer
                isOpen={isPlayerOpen}
                onClose={() => setIsPlayerOpen(false)}
                challenge={challenge}
            />
        </>
    );
}
