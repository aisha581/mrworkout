"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { motion, AnimatePresence } from 'framer-motion';

const REST_DURATION = 30;
const CIRCUMFERENCE = 2 * Math.PI * 120; // r=120

export default function RecoveryScreen() {
    const { restTimeRemaining, isResting, queue, currentIndex } = useCircuit();
    const nextExercise = queue[currentIndex + 1] ?? null;
    const isLast       = !nextExercise;

    if (!isResting) return null;

    const pct    = restTimeRemaining / REST_DURATION;
    const offset = CIRCUMFERENCE * (1 - pct);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                // Electric Blue background to signal recovery
                className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
                style={{ backgroundColor: '#020d1a' }}
            >
                {/* Ambient glow */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(0,150,255,0.18) 0%, transparent 70%)' }}
                />

                <div className="relative z-10 flex flex-col items-center gap-6 text-center px-8">

                    <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-40">
                        Recovery Mode
                    </p>

                    {/* Circular countdown */}
                    <div className="relative w-56 h-56">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256">
                            <circle cx="128" cy="128" r="120" stroke="rgba(0,150,255,0.12)" strokeWidth="6" fill="none" />
                            <motion.circle
                                cx="128" cy="128" r="120"
                                stroke="#0096FF"
                                strokeWidth="8"
                                fill="none"
                                strokeLinecap="round"
                                strokeDasharray={CIRCUMFERENCE}
                                strokeDashoffset={offset}
                                style={{ filter: 'drop-shadow(0 0 12px #0096FF)' }}
                                transition={{ duration: 0.9, ease: 'linear' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <span className="text-7xl font-black tabular-nums" style={{ color: '#0096FF' }}>
                                {restTimeRemaining}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
                                seconds
                            </span>
                        </div>
                    </div>

                    {/* Next up */}
                    <div>
                        <p className="text-xs uppercase tracking-widest font-black opacity-30 mb-1">
                            {isLast ? 'Final exercise' : 'Prepare for'}
                        </p>
                        <p className="text-xl font-black uppercase tracking-tight" style={{ color: isLast ? '#FF4444' : '#0096FF' }}>
                            {isLast ? 'FINISH LINE' : nextExercise!.name}
                        </p>
                    </div>

                    <p className="text-xs opacity-20 font-medium italic max-w-xs">
                        Deep belly breaths. Control the recovery to dominate the next set.
                    </p>

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
