"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';

const TIPS = [
    "Intensity builds density. Focus on the squeeze.",
    "Rest is totally useless until you've truly earned it.",
    "Form over ego. Weight will follow.",
    "Hydrate proactively. Performance drops at 2% dehydration.",
    "Slept 8 hours? You're already ahead of the pack.",
    "Progressive overload isn't just weight; it's better reps.",
    "Don't count the reps. Make the reps count.",
    "Your central nervous system needs recovery too.",
    "Log every set. Data doesn't lie, feelings do.",
    "Consistency > Intensity. Show up tomorrow."
];

export default function SavageTip({ delay = 0 }: { delay?: number }) {
    const { theme } = useTheme();
    const [tip, setTip] = useState("");

    useEffect(() => {
        // Hydration safe random selection
        const randomTip = TIPS[Math.floor(Math.random() * TIPS.length)];
        setTip(randomTip);
    }, []);

    if (!tip) return null; // Prevent layout shift before hydration

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.8 }}
            className="w-full relative rounded-[32px] p-8 overflow-hidden"
            style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.borderColor}`,
                boxShadow: `0 10px 40px rgba(0,0,0,0.3)`
            }}
        >
            {/* Ambient Background Glow */}
            <div
                className="absolute -right-10 -top-10 w-40 h-40 opacity-20 pointer-events-none"
                style={{
                    background: `radial-gradient(circle, ${theme.accent}, transparent 70%)`
                }}
            />

            {/* Content Header */}
            <div className="flex items-center gap-3 mb-4">
                <div
                    className="flex items-center justify-center w-8 h-8 rounded-full shadow-lg"
                    style={{ backgroundColor: `${theme.accent}20` }}
                >
                    <Zap size={16} style={{ color: theme.accent, fill: theme.accent }} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-widest opacity-80">
                    Savage Intel
                </h3>
            </div>

            {/* Tip Text */}
            <p className="text-xl sm:text-2xl font-semibold leading-tight pr-6">
                "{tip}"
            </p>

            {/* Accent Line */}
            <div
                className="w-12 h-1 mt-6 rounded-full"
                style={{ backgroundColor: theme.accent }}
            />
        </motion.div>
    );
}
