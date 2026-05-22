"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { useSavagePoints } from '@/hooks/useSavagePoints';
import { motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { Crown, Trophy, Users, Globe2, Flame, Zap } from 'lucide-react';
import { getUserStats, getRankInfo } from '@/utils/userStats';

interface Competitor {
    id: string;
    name: string;
    points: number;
    isUser?: boolean;
    streak?: number;
}

// Generate deterministc mock data to populate the ladder
const MOCK_GLOBAL: Competitor[] = [
    { id: '1', name: 'Iron_Mike', points: 4250, streak: 14 },
    { id: '2', name: 'Savage_King_99', points: 3800, streak: 5 },
    { id: '3', name: 'Liftosaur', points: 3100, streak: 21 },
    { id: '4', name: 'BeastMode_On', points: 2950, streak: 3 },
    { id: '5', name: 'GymBro_Zero', points: 2800, streak: 12 },
    { id: '6', name: 'Natty_Daddy', points: 2650, streak: 8 },
    { id: '7', name: 'Quad_God', points: 2400, streak: 2 },
    { id: '8', name: 'Steel_Spine', points: 2100, streak: 0 },
    { id: '9', name: 'Flex_Appeal', points: 1950, streak: 6 },
    { id: '10', name: 'Titanium_Tim', points: 1800, streak: 1 },
    { id: '11', name: 'Chalk_Dust', points: 1650, streak: 4 },
    { id: '12', name: 'Plate_Pirate', points: 1500, streak: 3 },
    { id: '13', name: 'Sweat_Equity', points: 1200, streak: 10 },
    { id: '14', name: 'Barbell_Bender', points: 950, streak: 0 },
    { id: '15', name: 'Rep_Reaper', points: 800, streak: 2 },
    { id: '16', name: 'Grip_Godzilla', points: 650, streak: 1 },
    { id: '17', name: 'Dumbbell_Demon', points: 500, streak: 5 },
    { id: '18', name: 'Squat_Sorcerer', points: 350, streak: 0 },
    { id: '19', name: 'Lats_Vegas', points: 200, streak: 2 },
];

const MOCK_FRIENDS: Competitor[] = [
    { id: 'f1', name: 'Chris_Lifts', points: 1550, streak: 4 },
    { id: 'f2', name: 'Sarah_Squats', points: 2100, streak: 12 },
    { id: 'f3', name: 'Big_Dave', points: 850, streak: 1 },
];

export default function LeaderboardPage() {
    const { theme } = useTheme();
    const { totalPoints } = useSavagePoints();
    const [view, setView] = useState<'global' | 'friends'>('global');
    const [userXP, setUserXP] = useState(0);
    const [userStreak, setUserStreak] = useState(0);

    useEffect(() => {
        const stats = getUserStats();
        setUserXP(stats.totalXP);
        setUserStreak(stats.currentStreak);
    }, []);

    const rankInfo = getRankInfo(userXP);

    // Merge User + Mocks and Sort
    const rankedData = useMemo(() => {
        const baseClass = view === 'global' ? MOCK_GLOBAL : MOCK_FRIENDS;

        // Inject physical user into the matrix
        const dataWithUser: Competitor[] = [
            ...baseClass,
            { id: 'user', name: 'YOU', points: totalPoints, isUser: true, streak: userStreak }
        ];

        return dataWithUser.sort((a, b) => b.points - a.points);
    }, [view, totalPoints]);

    const topThree = rankedData.slice(0, 3);
    const theRest = rankedData.slice(3, 20);

    return (
        <div className="min-h-screen pb-[120px] px-6 pt-12" style={{ backgroundColor: '#060606', color: '#fff' }}>
            {/* Background Aesthetic */}
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-40"
                style={{
                    background: `radial-gradient(ellipse at top center, rgba(0,230,255,0.1) 0%, transparent 60%),
                                 radial-gradient(ellipse at bottom, rgba(2, 11, 20, 0.5) 0%, transparent 100%)`
                }}
            />

            <div className="relative z-10 max-w-md mx-auto">
                {/* Header & Tier */}
                <div className="flex flex-col items-center mb-8">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center text-center w-full"
                    >
                        <h1
                            className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase mb-1"
                            style={{ fontFamily: 'var(--font-archivo-black)', textShadow: '0 4px 20px rgba(0,230,255,0.3)' }}
                        >
                            {rankInfo.levelName} League
                        </h1>
                        <p className="text-[#00E6FF] font-bold tracking-widest text-sm opacity-80 mb-4">
                            LEVEL {rankInfo.level}
                        </p>

                        {/* XP Progress bar */}
                        <div className="w-full max-w-xs mb-4">
                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1.5">
                                <span>{userXP} XP</span>
                                {rankInfo.xpToNext !== null
                                    ? <span>{rankInfo.xpToNext} to next</span>
                                    : <span>Max Level</span>
                                }
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${rankInfo.progress}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{ background: 'linear-gradient(90deg, #00E6FF, #00B5A0)' }}
                                />
                            </div>
                        </div>

                        {/* XP + Streak pills */}
                        <div className="flex gap-3 mb-5">
                            <div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                style={{ background: 'rgba(0,230,255,0.08)', border: '1px solid rgba(0,230,255,0.2)', color: '#00E6FF' }}
                            >
                                <Zap size={12} fill="currentColor" /> {userXP} XP
                            </div>
                            {userStreak > 0 && (
                                <div
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                                    style={{ background: 'rgba(255,140,0,0.08)', border: '1px solid rgba(255,140,0,0.2)', color: '#FF8C00' }}
                                >
                                    <Flame size={12} fill="currentColor" /> {userStreak}D Streak
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* View Toggle */}
                    <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl w-full max-w-[240px]">
                        <button
                            onClick={() => setView('global')}
                            className="flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                            style={{
                                backgroundColor: view === 'global' ? 'rgba(0,230,255,0.1)' : 'transparent',
                                color: view === 'global' ? '#00E6FF' : 'rgba(255,255,255,0.4)',
                                border: view === 'global' ? '1px solid rgba(0,230,255,0.2)' : 'none'
                            }}
                        >
                            <Globe2 size={14} /> Global
                        </button>
                        <button
                            onClick={() => setView('friends')}
                            className="flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                            style={{
                                backgroundColor: view === 'friends' ? 'rgba(0,230,255,0.1)' : 'transparent',
                                color: view === 'friends' ? '#00E6FF' : 'rgba(255,255,255,0.4)',
                                border: view === 'friends' ? '1px solid rgba(0,230,255,0.2)' : 'none'
                            }}
                        >
                            <Users size={14} /> Friends
                        </button>
                    </div>
                </div>

                {/* The Podium (Top 3) */}
                <div className="flex items-end justify-center h-[220px] mb-12 px-4 gap-2">
                    {/* Position 2 */}
                    {topThree[1] && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                            className="flex-1 flex flex-col items-center z-10"
                        >
                            <div className="p-3 bg-white/5 border border-white/10 rounded-t-2xl flex flex-col items-center w-full shadow-[0_-10px_30px_rgba(0,230,255,0.05)]" style={{ height: '140px' }}>
                                <span className="text-xl font-bold opacity-50 mb-4">2</span>
                                <div className="text-center w-full truncate px-1 font-bold text-sm mb-1">{topThree[1].name}</div>
                                <div className="text-[#00E6FF] font-bold text-xs">{topThree[1].points} pts</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Position 1 (Center) */}
                    {topThree[0] && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
                            className="flex-[1.2] flex flex-col items-center z-20 relative -mx-2"
                        >
                            <div className="absolute -top-10 flex flex-col items-center">
                                <Crown size={32} color="#FFD700" fill="#FFD700" className="drop-shadow-[0_0_15px_#FFD700] mb-2" />
                            </div>
                            <div className="p-4 bg-gradient-to-t from-white/5 to-[rgba(0,230,255,0.15)] border border-[#00E6FF]/30 rounded-t-[32px] flex flex-col items-center w-full shadow-[0_-20px_40px_rgba(0,230,255,0.2)]" style={{ height: '180px' }}>
                                <span className="text-3xl font-black italic mb-4" style={{ fontFamily: 'var(--font-archivo-black)', textShadow: '0 0 20px #00E6FF' }}>1</span>
                                <div className="text-center w-full truncate px-1 font-black text-lg mb-1">{topThree[0].name}</div>
                                <div className="text-[#FFD700] font-bold text-sm drop-shadow-[0_0_5px_#FFD700]">{topThree[0].points} pts</div>
                            </div>
                        </motion.div>
                    )}

                    {/* Position 3 */}
                    {topThree[2] && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                            className="flex-1 flex flex-col items-center z-0"
                        >
                            <div className="p-3 bg-white/5 border border-white/10 rounded-t-2xl flex flex-col items-center w-full shadow-[0_-10px_30px_rgba(0,230,255,0.05)]" style={{ height: '110px' }}>
                                <span className="text-xl font-bold opacity-50 mb-4">3</span>
                                <div className="text-center w-full truncate px-1 font-bold text-sm mb-1">{topThree[2].name}</div>
                                <div className="text-[#00E6FF] opacity-80 font-bold text-xs">{topThree[2].points} pts</div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* The Scrolling Ladder */}
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.05 } }
                    }}
                    className="flex flex-col gap-3"
                >
                    {theRest.map((competitor, index) => {
                        const actualRank = index + 4; // Since top 3 are separated
                        return (
                            <motion.div
                                key={competitor.id}
                                variants={{
                                    hidden: { opacity: 0, y: 20 },
                                    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20 } }
                                }}
                                className={`flex items-center justify-between p-4 rounded-2xl backdrop-blur-md transition-all ${competitor.isUser
                                    ? 'bg-[#00E6FF]/10 border border-[#00E6FF]/50 shadow-[0_0_20px_rgba(0,230,255,0.15)] z-20 scale-[1.02]'
                                    : 'bg-white/5 border border-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className={`w-8 text-center font-bold ${competitor.isUser ? 'text-[#00E6FF]' : 'opacity-40'}`}>
                                        {actualRank}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${competitor.isUser ? 'text-[#00E6FF] tracking-wider' : ''}`}>
                                            {competitor.name}
                                        </span>
                                        <span className="text-white/40 group-hover:text-white/80 transition-colors hidden sm:block">
                                            {competitor.streak || 0}D STREAK
                                        </span>
                                        {(competitor.streak || 0) > 0 && (
                                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-400 mt-1">
                                                <Flame size={10} fill="currentColor" /> {competitor.streak} Streak
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className={`font-black tracking-wider ${competitor.isUser ? 'text-[#00E6FF]' : 'opacity-80'}`}>
                                    {competitor.points} pts
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

            </div>
        </div>
    );
}
