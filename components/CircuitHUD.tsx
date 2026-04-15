"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { motion } from 'framer-motion';
import type { LiveExercise } from '@/app/library/page';

interface CircuitHUDProps {
    timeLeft:     number;
    totalTime:    number;
    nextExercise: LiveExercise | null;
}

export default function CircuitHUD({ timeLeft, totalTime, nextExercise }: CircuitHUDProps) {
    const { queue, currentIndex, currentSet } = useCircuit();
    const currentExercise = queue[currentIndex];

    if (!currentExercise) return null;

    const isUrgent = timeLeft <= 10;

    return (
        <div className="absolute inset-0 pointer-events-none z-30">

            {/* Top-right: Next Up */}
            <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-12 right-5 p-3.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 max-w-[160px]"
            >
                <p className="text-[9px] uppercase font-black tracking-[0.2em] text-[#00FFFF]/60 mb-1">
                    Next Up
                </p>
                <p className="font-black text-sm uppercase tracking-tight leading-tight">
                    {nextExercise ? nextExercise.name : 'FINISH LINE'}
                </p>
            </motion.div>

            {/* Bottom: exercise name + set info + countdown ring */}
            <div className="absolute bottom-8 left-0 right-0 px-6 flex items-end justify-between">

                {/* Left: current exercise + set */}
                <div>
                    <p className="text-[9px] uppercase font-black tracking-[0.25em] text-[#00FFFF]/50 mb-0.5">
                        Exercise {currentIndex + 1} / {queue.length}
                    </p>
                    <h2 className="text-2xl font-black uppercase tracking-tight leading-tight">
                        {currentExercise.name}
                    </h2>
                    <p className="text-xs opacity-40 font-black uppercase tracking-widest mt-0.5">
                        Set {currentSet} of 3
                    </p>
                </div>

                {/* Right: countdown ring */}
                <div className="relative w-20 h-20 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                        <circle
                            cx="40" cy="40" r="34"
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="4"
                            fill="none"
                        />
                        <circle
                            cx="40" cy="40" r="34"
                            stroke={isUrgent ? '#FF4444' : '#00FFFF'}
                            strokeWidth="5"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={213.6}
                            strokeDashoffset={213.6 * (1 - timeLeft / totalTime)}
                            style={{
                                filter:     isUrgent ? 'drop-shadow(0 0 6px #FF4444)' : 'drop-shadow(0 0 6px #00FFFF)',
                                transition: 'stroke 0.3s, filter 0.3s',
                            }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span
                            className="text-2xl font-black tabular-nums"
                            style={{ color: isUrgent ? '#FF4444' : '#fff' }}
                        >
                            {timeLeft}
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
}
