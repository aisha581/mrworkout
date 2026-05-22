"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Heart, Flame, Zap } from 'lucide-react';
import { useWorkoutStats } from '@/hooks/useWorkoutStats';

export default function BioMetrics() {
    const { theme } = useTheme();
    const { bpm, calories, intensity } = useWorkoutStats();

    const metrics = [
        { icon: Heart, label: 'Heart Rate', value: bpm, unit: 'bpm', progress: ((bpm - 60) / 100) * 100 },
        { icon: Flame, label: 'Calories', value: calories, unit: 'kcal', progress: 60 },
        { icon: Zap, label: 'Intensity', value: intensity, unit: '/10', progress: (intensity / 10) * 100 },
    ];

    return (
        <div className="flex gap-4">
            {metrics.map((metric, index) => (
                <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1, duration: 0.6 }}
                    className="relative w-32 h-32"
                >
                    {/* Circular progress ring */}
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={theme.mode === 'savage' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                            strokeWidth="3"
                        />
                        {/* Progress circle */}
                        <motion.circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={theme.accent}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={283}
                            initial={{ strokeDashoffset: 283 }}
                            animate={{ strokeDashoffset: 283 - (283 * metric.progress) / 100 }}
                            transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
                        />
                    </svg>

                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <metric.icon
                            size={20}
                            strokeWidth={1.5}
                            style={{ color: theme.accent, marginBottom: '4px' }}
                            className={metric.label === 'Heart Rate' ? 'animate-pulse' : ''}
                        />
                        <motion.div
                            key={`${metric.label}-${metric.value}`}
                            initial={{ scale: 1.2, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-2xl font-semibold"
                            style={{ color: theme.accent }}
                        >
                            {metric.value}
                        </motion.div>
                        <div className="text-xs opacity-50">{metric.unit}</div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
