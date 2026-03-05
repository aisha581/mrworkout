"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { motion } from 'framer-motion';

export default function RecoveryScreen() {
    const { restTimeRemaining, isResting, queue, currentIndex } = useCircuit();
    const nextExercise = queue[currentIndex + 1];

    if (!isResting) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-3xl"
        >
            {/* Pulsing Breathing Guide (60bpm) */}
            <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
                <div className="w-[500px] h-[500px] rounded-full border border-[#00FFFF]/10 bg-[#00FFFF]/5 blur-3xl" />
            </motion.div>

            <div className="relative z-10 text-center">
                <motion.div
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="mb-8 font-black italic text-[#00FFFF] text-4xl"
                >
                    W
                </motion.div>

                <h2 className="text-xl font-bold uppercase tracking-[0.4em] mb-12 text-[#00FFFF]/60">Recovery Mode</h2>

                {/* Circular Timer */}
                <div className="relative w-64 h-64 mb-16 mx-auto">
                    <svg className="w-full h-full -rotate-90">
                        <circle
                            cx="128"
                            cy="128"
                            r="120"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="transparent"
                            className="text-white/5"
                        />
                        <motion.circle
                            cx="128"
                            cy="128"
                            r="120"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="753.6" // 2 * PI * 120
                            initial={{ strokeDashoffset: 0 }}
                            animate={{ strokeDashoffset: (1 - restTimeRemaining / 60) * 753.6 }}
                            transition={{ duration: 1, ease: "linear" }}
                            className="text-[#00FFFF]"
                            style={{ filter: 'drop-shadow(0 0 10px #00FFFF)' }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-7xl font-black italic">{restTimeRemaining}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-sm uppercase tracking-widest font-bold opacity-40">Lower your heart rate</p>
                    {nextExercise && (
                        <p className="text-lg font-bold uppercase">Preparing: <span className="text-[#00FFFF]">{nextExercise.name}</span></p>
                    )}
                </div>
            </div>

            {/* Dynamic Savage Tip */}
            <div className="absolute bottom-12 max-w-md px-8 text-center border-t border-white/5 pt-8 italic opacity-40 text-sm">
                "Oxygen is fuel. Deep belly breaths only. Control the recovery to dominate the next set."
            </div>
        </motion.div>
    );
}
