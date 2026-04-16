"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Zap, Trophy } from 'lucide-react';
import { getUserStats, getRankInfo } from '@/utils/userStats';

const SUMMARY_KEY = 'mw_last_summary';

interface WorkoutSummary {
    exerciseCount: number;
    xpGained: number;
    workoutName: string;
}

export default function SummaryPage() {
    const router = useRouter();
    const [summary, setSummary] = useState<WorkoutSummary | null>(null);
    const [stats, setStats] = useState(getUserStats());

    useEffect(() => {
        try {
            const raw = localStorage.getItem(SUMMARY_KEY);
            if (raw) setSummary(JSON.parse(raw) as WorkoutSummary);
        } catch {}
        setStats(getUserStats());
    }, []);

    const handleFinish = () => {
        // Clear the current routine and summary data
        try {
            localStorage.removeItem('mw_routine');
            localStorage.removeItem(SUMMARY_KEY);
        } catch {}
        router.push('/');
    };

    const rankInfo = getRankInfo(stats.totalXP);
    const xpGained = summary?.xpGained ?? 100;

    return (
        <div className="fixed inset-0 z-[500] bg-[#060606] flex flex-col items-center justify-center px-8 text-center">
            {/* Background glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0,229,204,0.10) 0%, transparent 70%)',
                }}
            />

            <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 22 }}
                className="relative z-10 flex flex-col items-center gap-5 w-full max-w-sm"
            >
                {/* Eyebrow */}
                <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">
                    Session Complete
                </p>

                {/* Headline */}
                <h1
                    className="text-5xl font-black uppercase leading-none"
                    style={{
                        fontFamily:    'var(--font-archivo-black), sans-serif',
                        letterSpacing: '-0.03em',
                        color:         '#00E5CC',
                        textShadow:    '0 0 60px rgba(0,229,204,0.5)',
                    }}
                >
                    {summary?.workoutName ?? 'Workout'}<br />Complete
                </h1>

                {/* Exercise count */}
                <p className="text-sm opacity-40 font-medium">
                    {summary?.exerciseCount ?? 0} exercise{(summary?.exerciseCount ?? 0) !== 1 ? 's' : ''} destroyed.
                </p>

                {/* XP earned card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="w-full rounded-2xl p-5 flex items-center justify-between"
                    style={{
                        background: 'rgba(0,229,204,0.08)',
                        border:     '1px solid rgba(0,229,204,0.2)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <Zap size={20} color="#00E5CC" fill="#00E5CC" />
                        <div className="text-left">
                            <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">XP Earned</p>
                            <p className="text-2xl font-black" style={{ color: '#00E5CC' }}>+{xpGained} XP</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Total XP</p>
                        <p className="text-xl font-black opacity-80">{stats.totalXP}</p>
                    </div>
                </motion.div>

                {/* Rank card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="w-full rounded-2xl p-5 flex items-center justify-between"
                    style={{
                        background: 'rgba(255,215,0,0.06)',
                        border:     '1px solid rgba(255,215,0,0.15)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <Trophy size={20} color="#FFD700" />
                        <div className="text-left">
                            <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Current Rank</p>
                            <p className="text-xl font-black" style={{ color: '#FFD700' }}>
                                Level {rankInfo.level} · {rankInfo.levelName}
                            </p>
                        </div>
                    </div>
                    {rankInfo.xpToNext !== null && (
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">To Next</p>
                            <p className="text-sm font-black opacity-60">{rankInfo.xpToNext} XP</p>
                        </div>
                    )}
                </motion.div>

                {/* Rank progress bar */}
                <div className="w-full">
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rankInfo.progress}%` }}
                            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: 'linear-gradient(90deg, #00E5CC, #00B5A0)' }}
                        />
                    </div>
                    <p className="text-[10px] opacity-25 mt-1 text-right font-medium uppercase tracking-widest">
                        {rankInfo.progress}% to {rankInfo.levelName === 'Diamond' ? 'Max' : NEXT_RANK_NAME[rankInfo.level]}
                    </p>
                </div>

                {/* Finish button */}
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleFinish}
                    className="mt-2 flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black w-full justify-center"
                    style={{
                        background:  'linear-gradient(135deg, #00E5CC 0%, #00B5A0 100%)',
                        boxShadow:   '0 0 40px rgba(0,229,204,0.35)',
                        touchAction: 'manipulation',
                    }}
                >
                    <Home size={16} />
                    Finish
                </motion.button>
            </motion.div>
        </div>
    );
}

const NEXT_RANK_NAME: Record<number, string> = {
    1: 'Bronze',
    2: 'Silver',
    3: 'Gold',
    4: 'Platinum',
    5: 'Diamond',
};
