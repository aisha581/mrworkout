"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface DailyGoalRingProps {
    progress: number; // 0 to 100
    label: string;
    sublabel: string;
}

export default function DailyGoalRing({ progress, label, sublabel }: DailyGoalRingProps) {
    const { theme } = useTheme();

    // SVG Configuration
    const size = 280;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            className="relative flex items-center justify-center p-8 rounded-[40px] overflow-hidden"
            style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.borderColor}`,
                boxShadow: `0 20px 40px rgba(0,0,0,0.4)`
            }}
        >
            {/* Ambient Radial Depth Glow */}
            <div
                className="absolute inset-0 z-0 opacity-40"
                style={{
                    background: `radial-gradient(circle at center, ${theme.accent}40 0%, transparent 60%)`,
                    filter: 'blur(30px)'
                }}
            />

            {/* SVG Ring */}
            <div className="relative z-10 w-[240px] h-[240px] sm:w-[280px] sm:h-[280px]">
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${size} ${size}`}
                    className="transform -rotate-90"
                >
                    {/* Background Track */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth={strokeWidth}
                        className="transition-colors duration-500"
                        style={{
                            stroke: theme.mode === 'savage' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                        }}
                    />

                    {/* Animated Fill Progress */}
                    <motion.circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="transparent"
                        stroke={theme.accent}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                        style={{
                            filter: `drop-shadow(0 0 12px ${theme.accent}80)`
                        }}
                    />
                </svg>

                {/* Center Content Data */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center gap-2 mb-1"
                    >
                        <Flame size={18} style={{ color: theme.accent }} />
                        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Status</span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="text-5xl font-bold tracking-tighter"
                        style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}
                    >
                        {progress}%
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="text-sm font-semibold opacity-60 mt-2 tracking-wide uppercase"
                    >
                        {label}
                        <br />
                        <span style={{ color: theme.accent }}>{sublabel}</span>
                    </motion.p>
                </div>
            </div>
        </motion.div>
    );
}
