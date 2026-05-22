"use client";

import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { CheckCircle2, Activity, Clock, Layers } from 'lucide-react';
import { useEffect, useState } from 'react';

interface VictoryScreenProps {
    totalVolume: number;
    timeUnderTension: number; // in seconds
    completedSets: number;
    category: string;
    onReturn: () => void;
}

export default function VictoryScreen({ totalVolume, timeUnderTension, completedSets, category, onReturn }: VictoryScreenProps) {
    const { theme } = useTheme();
    const [pumpScore, setPumpScore] = useState(0);

    // Format time from seconds to MM:SS
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // Animated SVG Pump Score
    useEffect(() => {
        // Delay animation slightly for dramatic effect
        const timer = setTimeout(() => {
            setPumpScore(100); 
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (pumpScore / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-[#050505] overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-center justify-center p-6 md:p-12"
        >
            <div className="fixed inset-0 z-0 bg-black pointer-events-none" style={{ background: `radial-gradient(circle at center, ${theme.accent}20 0%, transparent 70%)` }} />
            
            <div className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl mx-auto py-12">
                
                {/* Header Sequence */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="text-[#00FFFF] mb-6"
                >
                    <CheckCircle2 size={80} className="drop-shadow-[0_0_40px_rgba(0,255,255,0.6)]" />
                </motion.div>
                
                <h1 
                    className="text-5xl md:text-8xl font-black uppercase tracking-tighter text-white mb-12 drop-shadow-2xl" 
                    style={{ fontFamily: 'var(--font-archivo-black)', textShadow: `0 0 50px ${theme.accent}60` }}
                >
                    <span className="opacity-90">{category}</span> <br/>
                    DESTROYED
                </h1>

                {/* Dashboard Stats Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
                    
                    {/* Stat Card 1: Volume */}
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-black/60 border border-white/10 rounded-[32px] p-8 flex flex-col items-center backdrop-blur-md"
                    >
                        <Activity className="text-[#00FFFF] mb-4" size={32} />
                        <div className="text-[10px] uppercase tracking-[0.3em] font-black text-white/50 mb-2">Total Volume</div>
                        <div className="text-4xl md:text-5xl font-black text-white tracking-tighter" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                            {totalVolume} <span className="text-xl text-white/40">REPS</span>
                        </div>
                    </motion.div>

                    {/* Stat Card 2: Tension */}
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-black/60 border border-white/10 rounded-[32px] p-8 flex flex-col items-center backdrop-blur-md"
                    >
                        <Clock className="text-[#00FFFF] mb-4" size={32} />
                        <div className="text-[10px] uppercase tracking-[0.3em] font-black text-white/50 mb-2">Time Under Tension</div>
                        <div className="text-4xl md:text-5xl font-black text-white tracking-tighter" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                            {formatTime(timeUnderTension)}
                        </div>
                    </motion.div>

                    {/* Stat Card 3: Sets */}
                    <motion.div 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-black/60 border border-white/10 rounded-[32px] p-8 flex flex-col items-center backdrop-blur-md"
                    >
                        <Layers className="text-[#00FFFF] mb-4" size={32} />
                        <div className="text-[10px] uppercase tracking-[0.3em] font-black text-white/50 mb-2">Sets Completed</div>
                        <div className="text-4xl md:text-5xl font-black text-white tracking-tighter" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                            {completedSets}
                        </div>
                    </motion.div>

                </div>

                {/* The Pump Score Gauge */}
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="relative flex flex-col items-center justify-center mb-16"
                >
                    <div className="relative w-48 h-48 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none drop-shadow-[0_0_20px_rgba(0,255,255,0.4)]">
                            <circle cx="50%" cy="50%" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="none" />
                            <circle 
                                cx="50%" cy="50%" 
                                r={radius} 
                                stroke="#00FFFF" 
                                strokeWidth="12" 
                                fill="none" 
                                strokeDasharray={circumference} 
                                strokeDashoffset={strokeDashoffset} 
                                style={{ transition: 'stroke-dashoffset 2s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="flex flex-col items-center">
                            <span className="text-[#00FFFF] text-[10px] uppercase tracking-[0.2em] font-black mb-1">Pump Score</span>
                            <span className="text-5xl font-black text-white tracking-tighter" style={{ fontFamily: 'var(--font-archivo-black)' }}>
                                {Math.round(pumpScore)}<span className="text-xl">%</span>
                            </span>
                        </div>
                    </div>
                </motion.div>
                
                {/* Navigation */}
                <motion.button 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    onClick={onReturn}
                    className="px-16 py-6 rounded-[24px] text-black font-black uppercase tracking-[0.3em] text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_60px_rgba(0,255,255,0.4)] relative overflow-hidden group"
                    style={{ backgroundColor: theme.accent }}
                >
                    <div className="absolute inset-0 bg-white/20 scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500 ease-out" />
                    <span className="relative z-10">RETURN TO ARMORY</span>
                </motion.button>
            </div>
        </motion.div>
    );
}
