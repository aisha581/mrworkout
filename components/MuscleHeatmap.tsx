"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { useWorkout } from '@/contexts/WorkoutContext';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { EXERCISE_LIBRARY } from '@/data/libraryData';
import { Activity } from 'lucide-react';
import { WorkoutLog } from '@/utils/workoutParser';

// Depth levels: 
// 0: Needs attention (>48h or never)
// 1: Recovering (24h - 48h)
// 2: Fresh/Worked (<24h)
type MuscleState = Record<'Chest' | 'Back' | 'Legs' | 'Arms' | 'Core', 0 | 1 | 2>;

export default function MuscleHeatmap({ isolatedLog }: { isolatedLog?: WorkoutLog }) {
    const { theme } = useTheme();
    const { workoutHistory } = useWorkout();

    // Map active muscles based on vault history depth
    const { activeMuscles, recoveryScore } = useMemo(() => {
        const state: MuscleState = {
            Chest: 0,
            Back: 0,
            Legs: 0,
            Arms: 0,
            Core: 0
        };

        if (isolatedLog) {
            const exercise = EXERCISE_LIBRARY.find(
                ex => ex.id === isolatedLog.title || ex.name.toLowerCase() === isolatedLog.title.toLowerCase()
            );
            if (exercise && exercise.category in state) {
                state[exercise.category as keyof MuscleState] = 2;
            }
            return { activeMuscles: state, recoveryScore: 100 };
        }

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const twoDays = 48 * 60 * 60 * 1000;

        workoutHistory.forEach(log => {
            const timeElapsed = now - new Date(log.timestamp).getTime();

            const exercise = EXERCISE_LIBRARY.find(
                ex => ex.id === log.title || ex.name.toLowerCase() === log.title.toLowerCase()
            );

            if (exercise && exercise.category in state) {
                const category = exercise.category as keyof MuscleState;

                // Only upgrade the state if it's currently lower than the new log's computed level
                let level: 0 | 1 | 2 = 0;
                if (timeElapsed <= oneDay) level = 2;
                else if (timeElapsed <= twoDays) level = 1;

                if (level > state[category]) {
                    state[category] = level;
                }
            }
        });

        // Calculate a dummy "Recovery %" (100% = fully recovered/all 0s, 0% = entirely smashed)
        const totalPossibleScore = 5 * 2; // 5 muscles, max level 2
        const currentScore = Object.values(state).reduce((acc: number, val) => acc + val, 0);
        const recoveryPercentage = Math.max(0, Math.round(((totalPossibleScore - currentScore) / totalPossibleScore) * 100));

        return { activeMuscles: state, recoveryScore: recoveryPercentage };
    }, [workoutHistory, isolatedLog]);

    // Style helper for temporal depth paths
    const getPathStyle = (level: 0 | 1 | 2) => {
        if (level === 2) {
            // Worked today (Deep Cyan + Glow)
            return {
                fill: theme.accent,
                stroke: theme.accent,
                strokeWidth: 2,
                filter: `drop-shadow(0 0 12px ${theme.accent})`,
                transition: 'all 0.5s ease-in-out'
            };
        } else if (level === 1) {
            // Worked yesterday (Dim Cyan, slight opacity)
            return {
                fill: theme.accent,
                stroke: theme.accent,
                strokeWidth: 1,
                opacity: 0.4,
                filter: `drop-shadow(0 0 4px ${theme.accent})`,
                transition: 'all 0.5s ease-in-out'
            };
        } else {
            // Needs Attention (Greyed out)
            return {
                fill: 'rgba(255,255,255,0.03)',
                stroke: 'rgba(255,255,255,0.06)',
                strokeWidth: 1,
                filter: 'none',
                transition: 'all 0.5s ease-in-out'
            };
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative w-full h-[400px] rounded-[32px] flex flex-col items-center justify-center p-6 overflow-hidden"
            style={{
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.borderColor}`,
                boxShadow: `0 20px 40px rgba(0,0,0,0.5)`
            }}
        >
            {/* Header: Hide if isolated */}
            {!isolatedLog && (
                <div className="absolute top-6 left-6 z-10 flex flex-col items-start">
                    <h3 className="text-sm font-bold uppercase tracking-widest opacity-60 mb-2">Central Nervous System</h3>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                        <Activity size={14} style={{ color: theme.accent }} />
                        <span className="text-sm font-bold tracking-wider">{recoveryScore}% Recovered</span>
                    </div>
                </div>
            )}

            {/* Ambient Background Glow based on overall activity */}
            {recoveryScore < 100 && (
                <div
                    className="absolute inset-0 z-0 opacity-20 transition-opacity duration-1000"
                    style={{
                        background: `radial-gradient(circle at center, ${theme.accent} 0%, transparent 60%)`,
                        filter: 'blur(40px)'
                    }}
                />
            )}

            {/* Stylized Abstract Anatomical SVG */}
            <div className="relative z-10 w-full max-w-[200px] h-[300px]">
                <svg viewBox="0 0 200 300" className="w-full h-full drop-shadow-2xl">

                    {/* Head & Neck (Decorative, always inactive) */}
                    <path
                        d="M80 30 C80 15, 120 15, 120 30 C120 50, 110 60, 100 65 C90 60, 80 50, 80 30 Z"
                        style={getPathStyle(0)}
                    />
                    <path
                        d="M90 65 L110 65 L115 80 L85 80 Z"
                        style={getPathStyle(0)}
                    />

                    {/* CHEST */}
                    <path
                        d="M75 80 L125 80 L130 115 C130 125, 100 130, 100 130 C100 130, 70 125, 70 115 Z"
                        style={getPathStyle(activeMuscles.Chest)}
                    />

                    {/* CORE */}
                    <path
                        d="M78 135 L122 135 L115 170 L85 170 Z"
                        style={getPathStyle(activeMuscles.Core)}
                    />

                    {/* LEGS */}
                    <path
                        d="M85 175 L98 175 L98 250 L80 280 L70 280 L75 220 Z"
                        style={getPathStyle(activeMuscles.Legs)}
                    />
                    <path
                        d="M102 175 L115 175 L125 220 L130 280 L120 280 L102 250 Z"
                        style={getPathStyle(activeMuscles.Legs)}
                    />

                    {/* ARMS (Left & Right) */}
                    <path
                        d="M65 85 C55 85, 45 105, 45 125 L50 160 L65 115 Z"
                        style={getPathStyle(activeMuscles.Arms)}
                    />
                    <path
                        d="M135 85 C145 85, 155 105, 155 125 L150 160 L135 115 Z"
                        style={getPathStyle(activeMuscles.Arms)}
                    />

                    {/* BACK (Represented by outer lats) */}
                    <path
                        d="M70 115 C60 110, 65 90, 75 80 C68 95, 72 120, 78 135 Z"
                        style={getPathStyle(activeMuscles.Back)}
                    />
                    <path
                        d="M130 115 C140 110, 135 90, 125 80 C132 95, 128 120, 122 135 Z"
                        style={getPathStyle(activeMuscles.Back)}
                    />

                </svg>
            </div>

            {/* Legend / Status Text: Hide if isolated */}
            {!isolatedLog && (
                <div className="absolute bottom-6 w-full flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shadow-[0_0_5px_cyan]" style={{ backgroundColor: theme.accent }} />
                        Trained
                    </div>
                    <div className="flex items-center gap-1.5 opacity-60">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent, opacity: 0.5 }} />
                        Recovering
                    </div>
                    <div className="flex items-center gap-1.5 opacity-40">
                        <div className="w-2 h-2 rounded-full bg-white/10" />
                        Fresh
                    </div>
                </div>
            )}
        </motion.div>
    );
}
