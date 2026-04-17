"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SCAN_KEY = "mw_scan_shown";
const DURATION = 3000; // ms

interface Props {
    accentColor: string;
    onComplete:  () => void;
}

export default function BiometricScan({ accentColor, onComplete }: Props) {
    const [progress, setProgress]     = useState(0);
    const [phase, setPhase]           = useState<"scanning" | "confirmed">("scanning");
    const [visible, setVisible]       = useState(true);
    const startRef                    = useRef<number | null>(null);
    const rafRef                      = useRef<number | null>(null);

    useEffect(() => {
        startRef.current = performance.now();

        const tick = (now: number) => {
            const elapsed = now - (startRef.current ?? now);
            const pct     = Math.min(100, Math.round((elapsed / DURATION) * 100));
            setProgress(pct);

            if (pct < 100) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                setPhase("confirmed");
                try { localStorage.setItem(SCAN_KEY, "1"); } catch {}
                setTimeout(() => {
                    setVisible(false);
                    setTimeout(onComplete, 400);
                }, 700);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [onComplete]);

    const scanY = `${progress}%`;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden select-none"
                    style={{ background: "#060606" }}
                >
                    {/* Subtle radial glow */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${accentColor}09 0%, transparent 65%)`,
                        }}
                    />

                    {/* Grid */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-[0.02]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                            backgroundSize: "40px 40px",
                        }}
                    />

                    <div className="relative flex flex-col items-center gap-8 w-full max-w-xs px-8">

                        {/* ── Scan circle ─────────────────────────────────── */}
                        <div className="relative w-52 h-52">
                            {/* Outer ring — static */}
                            <div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    border:    `1px solid ${accentColor}20`,
                                    boxShadow: `0 0 0 12px ${accentColor}04`,
                                }}
                            />

                            {/* Middle ring — pulsing */}
                            <motion.div
                                className="absolute inset-4 rounded-full"
                                animate={{ scale: [1, 1.03, 1], opacity: [0.4, 0.7, 0.4] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                style={{ border: `1px solid ${accentColor}40` }}
                            />

                            {/* Inner ring */}
                            <div
                                className="absolute inset-8 rounded-full"
                                style={{ border: `1px solid ${accentColor}25` }}
                            />

                            {/* Corner brackets */}
                            {[
                                { top: 0,    left:  0,    borderTop: `2px solid ${accentColor}`, borderLeft:  `2px solid ${accentColor}`, borderRadius: "12px 0 0 0" },
                                { top: 0,    right: 0,    borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, borderRadius: "0 12px 0 0" },
                                { bottom: 0, left:  0,    borderBottom: `2px solid ${accentColor}`, borderLeft:  `2px solid ${accentColor}`, borderRadius: "0 0 0 12px" },
                                { bottom: 0, right: 0,    borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, borderRadius: "0 0 12px 0" },
                            ].map((style, i) => (
                                <div
                                    key={i}
                                    className="absolute w-6 h-6"
                                    style={{ ...style, boxShadow: `0 0 8px ${accentColor}60` }}
                                />
                            ))}

                            {/* Scan line — sweeps top to bottom */}
                            {phase === "scanning" && (
                                <motion.div
                                    className="absolute inset-x-0 overflow-hidden rounded-full"
                                    style={{ top: scanY, height: "2px" }}
                                >
                                    <div
                                        className="w-full h-full"
                                        style={{
                                            background: `linear-gradient(90deg, transparent 0%, ${accentColor}80 30%, ${accentColor} 50%, ${accentColor}80 70%, transparent 100%)`,
                                            boxShadow:  `0 0 12px ${accentColor}`,
                                        }}
                                    />
                                </motion.div>
                            )}

                            {/* Scan glow trail */}
                            {phase === "scanning" && (
                                <div
                                    className="absolute inset-x-0 rounded-full overflow-hidden pointer-events-none"
                                    style={{
                                        top:        0,
                                        height:     scanY,
                                        background: `linear-gradient(to bottom, transparent 60%, ${accentColor}10)`,
                                    }}
                                />
                            )}

                            {/* Center — confirmed checkmark */}
                            <AnimatePresence>
                                {phase === "confirmed" && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 280, damping: 20 }}
                                        className="absolute inset-0 flex items-center justify-center"
                                    >
                                        <div
                                            className="w-16 h-16 rounded-full flex items-center justify-center"
                                            style={{
                                                background: `${accentColor}18`,
                                                border:     `2px solid ${accentColor}`,
                                                boxShadow:  `0 0 40px ${accentColor}50`,
                                            }}
                                        >
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                                                <motion.path
                                                    d="M5 12l5 5L19 7"
                                                    stroke={accentColor}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                                />
                                            </svg>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── Status text ─────────────────────────────────── */}
                        <div className="flex flex-col items-center gap-2 w-full">
                            <AnimatePresence mode="wait">
                                {phase === "scanning" ? (
                                    <motion.p
                                        key="scanning"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-[10px] font-black uppercase tracking-[0.55em]"
                                        style={{ color: accentColor }}
                                    >
                                        Scanning Biometrics
                                    </motion.p>
                                ) : (
                                    <motion.p
                                        key="confirmed"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-[10px] font-black uppercase tracking-[0.55em]"
                                        style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}` }}
                                    >
                                        Identity Confirmed
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {/* Progress bar */}
                            <div className="w-full h-[3px] rounded-full bg-white/[0.06] overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                        width:      `${progress}%`,
                                        background: `linear-gradient(90deg, ${accentColor}cc, ${accentColor})`,
                                        boxShadow:  `0 0 8px ${accentColor}`,
                                    }}
                                />
                            </div>

                            <p className="text-[28px] font-black tabular-nums leading-none"
                               style={{
                                   fontFamily: "var(--font-archivo-black), sans-serif",
                                   color:      accentColor,
                                   opacity:    phase === "confirmed" ? 0 : 1,
                               }}
                            >
                                {String(progress).padStart(3, "\u2007")}
                                <span className="text-base opacity-50">%</span>
                            </p>
                        </div>

                        {/* ── Brand label ─────────────────────────────────── */}
                        <p className="text-[9px] font-black uppercase tracking-[0.7em] opacity-15 mt-4">
                            Mr. Workout · System v2.0
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** Returns true if the scan should be shown (first visit only) */
export function shouldShowScan(): boolean {
    try { return !localStorage.getItem(SCAN_KEY); } catch { return false; }
}
