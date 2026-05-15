"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, X, Trophy, Zap } from "lucide-react";
import { notifyPR } from "@/utils/savageNotifications";
import type { ExercisePR } from "@/utils/prTracker";

interface PREvent {
    exerciseName:  string;
    weight:        number;
    reps:          number;
    previousBest:  ExercisePR | null;
}

const GOLD = "#FFD700";

// Eight confetti-style dots that burst outward
const BURST_DOTS = Array.from({ length: 8 }, (_, i) => ({
    angle: (i / 8) * 360,
    color: i % 2 === 0 ? GOLD : "#FFA500",
    delay: i * 0.04,
}));

export default function PRCelebrationModal() {
    const [prEvent,  setPrEvent]  = useState<PREvent | null>(null);
    const [visible,  setVisible]  = useState(false);
    const dismissRef = useState<ReturnType<typeof setTimeout> | null>(null);

    const dismiss = useCallback(() => {
        setVisible(false);
        setTimeout(() => setPrEvent(null), 500);
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const { exerciseName, weight, reps, previousBest } = (e as CustomEvent<PREvent>).detail;

            // Clear any pending auto-dismiss from a previous PR
            if (dismissRef[0]) clearTimeout(dismissRef[0]);

            setPrEvent({ exerciseName, weight, reps, previousBest });
            setVisible(true);
            notifyPR(exerciseName);

            // Auto-dismiss after 5 s
            const tid = setTimeout(dismiss, 5000);
            // Store tid so a subsequent PR can cancel it
            (dismissRef as any)[0] = tid;
        };

        window.addEventListener('mw:new-pr', handler);
        return () => window.removeEventListener('mw:new-pr', handler);
    }, [dismiss, dismissRef]);

    if (!prEvent) return null;

    const improvement = prEvent.previousBest
        ? prEvent.weight - prEvent.previousBest.weight
        : null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    key="pr-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[900] flex items-center justify-center px-6"
                    style={{ background: "rgba(0,0,0,0.78)", backdropFilter: "blur(18px)" }}
                    onClick={dismiss}
                >
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 40 }}
                        animate={{ scale: 1,   opacity: 1, y: 0  }}
                        exit={{ scale: 0.85, opacity: 0, y: -20 }}
                        transition={{ type: "spring", stiffness: 280, damping: 22 }}
                        className="relative w-full max-w-sm rounded-[36px] overflow-hidden text-center"
                        style={{
                            background:   "linear-gradient(160deg, #0f0f0f 0%, #080808 100%)",
                            border:       `1px solid ${GOLD}35`,
                            boxShadow:    `0 0 80px ${GOLD}25, 0 0 200px ${GOLD}10, 0 20px 60px rgba(0,0,0,0.8)`,
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Top gold shimmer line */}
                        <div className="absolute top-0 inset-x-0 h-[1px]"
                            style={{ background: `linear-gradient(90deg, transparent, ${GOLD}80, transparent)` }} />

                        {/* Burst particles */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                            {BURST_DOTS.map((dot, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{ background: dot.color }}
                                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                                    animate={{
                                        x: Math.cos((dot.angle * Math.PI) / 180) * 120,
                                        y: Math.sin((dot.angle * Math.PI) / 180) * 120,
                                        opacity: 0,
                                        scale: 0,
                                    }}
                                    transition={{ duration: 1.1, delay: dot.delay, ease: [0.2, 0, 0.8, 1] }}
                                />
                            ))}
                        </div>

                        <div className="px-8 py-10 flex flex-col items-center gap-4">
                            {/* Crown icon — pulsing */}
                            <motion.div
                                animate={{ scale: [1, 1.12, 1], rotate: [-4, 4, -4, 0] }}
                                transition={{ duration: 0.7, delay: 0.3 }}
                                className="w-20 h-20 rounded-[24px] flex items-center justify-center"
                                style={{
                                    background: `linear-gradient(135deg, rgba(255,215,0,0.20), rgba(255,165,0,0.08))`,
                                    border:     `1px solid ${GOLD}40`,
                                    boxShadow:  `0 0 40px ${GOLD}30`,
                                }}
                            >
                                <Crown size={36} color={GOLD} fill={`${GOLD}40`} />
                            </motion.div>

                            {/* Labels */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1,  y: 0  }}
                                transition={{ delay: 0.25 }}
                            >
                                <p className="text-[10px] font-black uppercase tracking-[0.6em] mb-1"
                                    style={{ color: `${GOLD}70` }}>
                                    New Personal Record
                                </p>
                                <h2
                                    className="text-[2.4rem] font-black uppercase leading-none mb-1"
                                    style={{
                                        fontFamily:  "var(--font-archivo-black), sans-serif",
                                        color:       GOLD,
                                        textShadow:  `0 0 40px ${GOLD}60`,
                                        letterSpacing: "-0.03em",
                                    }}
                                >
                                    PR!
                                </h2>
                                <p className="text-base font-black uppercase tracking-tight opacity-80">
                                    {prEvent.exerciseName}
                                </p>
                            </motion.div>

                            {/* Weight / reps */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.85 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.35, type: "spring", stiffness: 220, damping: 18 }}
                                className="w-full rounded-[22px] px-6 py-4"
                                style={{
                                    background: `${GOLD}0c`,
                                    border:     `1px solid ${GOLD}22`,
                                }}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <div className="text-center">
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-1">Weight</p>
                                        <p className="text-3xl font-black tabular-nums" style={{ color: GOLD }}>
                                            {prEvent.weight}<span className="text-base opacity-50 ml-1">kg</span>
                                        </p>
                                    </div>
                                    <div className="h-8 w-px opacity-15" style={{ background: GOLD }} />
                                    <div className="text-center">
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-1">Reps</p>
                                        <p className="text-3xl font-black tabular-nums" style={{ color: GOLD }}>
                                            {prEvent.reps}
                                        </p>
                                    </div>
                                    {improvement !== null && improvement > 0 && (
                                        <>
                                            <div className="h-8 w-px opacity-15" style={{ background: GOLD }} />
                                            <div className="text-center">
                                                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-1">Gain</p>
                                                <p className="text-xl font-black" style={{ color: "#4ADE80" }}>
                                                    +{improvement}kg
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </div>
                                {prEvent.previousBest && (
                                    <p className="text-[10px] opacity-30 mt-2 font-medium text-center">
                                        Previous best: {prEvent.previousBest.weight}kg × {prEvent.previousBest.reps} reps
                                    </p>
                                )}
                            </motion.div>

                            {/* Stars row */}
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-center gap-2"
                            >
                                {[...Array(5)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        animate={{ scale: [0, 1.3, 1] }}
                                        transition={{ delay: 0.55 + i * 0.07, type: "spring", stiffness: 300 }}
                                    >
                                        <Trophy size={14} color={GOLD} fill={GOLD} />
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Dismiss hint */}
                            <p className="text-[9px] opacity-20 font-medium uppercase tracking-widest">
                                Tap anywhere to continue
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={dismiss}
                            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center opacity-20 hover:opacity-50 transition-opacity"
                            style={{ background: "rgba(255,255,255,0.06)" }}
                            aria-label="Close"
                        >
                            <X size={13} />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
