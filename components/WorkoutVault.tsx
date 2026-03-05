"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function WorkoutVault() {
    const { theme } = useTheme();

    const workouts = [
        { name: 'Chest Day', date: 'Today', sets: 12, duration: '45 min' },
        { name: 'Leg Power', date: 'Yesterday', sets: 15, duration: '52 min' },
        { name: 'Back & Bis', date: '2 days ago', sets: 10, duration: '38 min' },
        { name: 'Shoulders', date: '3 days ago', sets: 8, duration: '32 min' },
        { name: 'Full Body', date: '4 days ago', sets: 18, duration: '67 min' },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold" style={{ letterSpacing: '-0.02em' }}>
                    The Vault
                </h3>
                <motion.button
                    whileHover={{ x: 4 }}
                    className="text-sm opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
                >
                    View All
                    <ChevronRight size={16} />
                </motion.button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {workouts.map((workout, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
                        whileHover={{ y: -4 }}
                        className="flex-shrink-0 w-64 p-6 rounded-3xl backdrop-blur-3xl cursor-pointer"
                        style={{
                            backgroundColor: theme.cardBg,
                            border: `1px solid ${theme.borderColor}`,
                        }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h4 className="font-semibold mb-1">{workout.name}</h4>
                                <p className="text-sm opacity-50">{workout.date}</p>
                            </div>
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-xl"
                                style={{
                                    backgroundColor: `${theme.accent}15`,
                                    border: `1px solid ${theme.accent}30`,
                                }}
                            >
                                <span className="text-sm font-medium" style={{ color: theme.accent }}>
                                    {workout.sets}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm opacity-60">
                            <span>{workout.sets} sets</span>
                            <span>•</span>
                            <span>{workout.duration}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
}
