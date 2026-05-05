"use client";

import { motion } from 'framer-motion';
import { ChevronRight, Flag } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';

interface CircuitHUDProps {
    timeLeft:     number;
    totalTime:    number;
    nextExercise: LiveExercise | null;
    currentSet:   number;
    totalSets:    number;
    isFinale:     boolean;
    onSkip:       () => void;
    onFinish:     () => void;
    exerciseName: string;
    exerciseNum:  number;
    queueLength:  number;
}

export default function CircuitHUD({
    timeLeft, totalTime, nextExercise,
    currentSet, totalSets, isFinale,
    onSkip, onFinish,
    exerciseName, exerciseNum, queueLength,
}: CircuitHUDProps) {
    const isUrgent = timeLeft <= 10;

    return (
        <div className="absolute inset-0 pointer-events-none z-30">

            {/* ── Top-right: Next Up / Finale button ─────────────────────────── */}
            <div className="absolute top-12 right-5" style={{ pointerEvents: 'auto' }}>
                {isFinale ? (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={onFinish}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl font-black uppercase text-xs tracking-[0.2em] active:scale-95 transition-transform"
                        style={{
                            background:  'rgba(255,68,68,0.15)',
                            border:      '1px solid rgba(255,68,68,0.45)',
                            color:       '#FF4444',
                            boxShadow:   '0 0 22px rgba(255,68,68,0.25)',
                            touchAction: 'manipulation',
                        }}
                    >
                        <Flag size={13} fill="#FF4444" />
                        Finish Workout
                    </motion.button>
                ) : (
                    <motion.div
                        key={exerciseNum}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-3.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 max-w-[160px]"
                    >
                        <p className="text-[9px] uppercase font-black tracking-[0.2em] text-[#00FFFF]/60 mb-1">
                            Next Up
                        </p>
                        <p className="font-black text-sm uppercase tracking-tight leading-tight">
                            {nextExercise ? nextExercise.name : 'FINISH LINE'}
                        </p>
                    </motion.div>
                )}
            </div>

            {/* ── Bottom: exercise info + ring + skip ────────────────────────── */}
            <div className="absolute bottom-8 left-0 right-0 px-6 flex items-end justify-between">

                {/* Left: name + set counter */}
                <div>
                    <p className="text-[9px] uppercase font-black tracking-[0.25em] text-[#00FFFF]/50 mb-0.5">
                        Exercise {exerciseNum} / {queueLength}
                    </p>
                    <h2 className="text-2xl font-black uppercase tracking-tight leading-tight">
                        {exerciseName}
                    </h2>
                    <motion.p
                        key={currentSet}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-black uppercase tracking-widest mt-0.5"
                        style={{ color: '#00FFFF', opacity: 0.55 }}
                    >
                        Set {currentSet} of {totalSets}
                    </motion.p>
                </div>

                {/* Right: countdown ring + skip chevron */}
                <div className="flex items-center gap-2">
                    <div className="relative w-20 h-20 shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34"
                                stroke="rgba(255,255,255,0.08)" strokeWidth="4" fill="none" />
                            <circle cx="40" cy="40" r="34"
                                stroke={isUrgent ? '#FF4444' : '#00FFFF'}
                                strokeWidth="5" fill="none" strokeLinecap="round"
                                strokeDasharray={213.6}
                                strokeDashoffset={213.6 * (1 - timeLeft / totalTime)}
                                style={{
                                    filter:     isUrgent ? 'drop-shadow(0 0 6px #FF4444)' : 'drop-shadow(0 0 6px #00FFFF)',
                                    transition: 'stroke 0.3s, filter 0.3s',
                                }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-black tabular-nums"
                                style={{ color: isUrgent ? '#FF4444' : '#fff' }}>
                                {timeLeft}
                            </span>
                        </div>
                    </div>

                    {/* Skip set button */}
                    <button
                        onClick={onSkip}
                        className="flex flex-col items-center justify-center gap-0.5 w-11 h-11 rounded-full active:scale-90 transition-transform"
                        style={{
                            background:    'rgba(0,255,255,0.12)',
                            border:        '1px solid rgba(0,255,255,0.35)',
                            pointerEvents: 'auto',
                            touchAction:   'manipulation',
                        }}
                        aria-label="Skip set"
                    >
                        <ChevronRight size={16} style={{ color: '#00FFFF' }} />
                        <span className="font-black uppercase" style={{ fontSize: '6px', color: '#00FFFF', opacity: 0.7, letterSpacing: '0.08em' }}>
                            Skip
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
}
