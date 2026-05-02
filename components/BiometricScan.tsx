"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SCAN_KEY = "mw_scan_shown";
const DURATION = 3500; // ms

interface Props {
    accentColor: string;
    onComplete:  () => void;
}

export default function BiometricScan({ accentColor, onComplete }: Props) {
    const [progress,  setProgress]  = useState(0);
    const [phase,     setPhase]     = useState<"scanning" | "confirmed">("scanning");
    const [visible,   setVisible]   = useState(true);
    const [hasCamera, setHasCamera] = useState(false);

    const startRef   = useRef<number | null>(null);
    const rafRef     = useRef<number | null>(null);
    const videoRef   = useRef<HTMLVideoElement>(null);
    const streamRef  = useRef<MediaStream | null>(null);

    // ── Camera request ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!navigator.mediaDevices?.getUserMedia) return;

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: "user", width: 300, height: 300 } })
            .then((stream) => {
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
                setHasCamera(true);
            })
            .catch(() => {
                // Permission denied or no camera — proceed with animation-only mode
                setHasCamera(false);
            });

        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // ── Progress animation ────────────────────────────────────────────────────
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
                streamRef.current?.getTracks().forEach((t) => t.stop());
                try { localStorage.setItem(SCAN_KEY, "1"); } catch {}
                setTimeout(() => {
                    setVisible(false);
                    setTimeout(onComplete, 400);
                }, 900);
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
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden select-none"
                    style={{ background: "#060606" }}
                >
                    {/* Ambient glow */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${accentColor}0c 0%, transparent 65%)`,
                        }}
                    />

                    {/* Grid */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-[0.022]"
                        style={{
                            backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                            backgroundSize: "40px 40px",
                        }}
                    />

                    <div className="relative flex flex-col items-center gap-8 w-full max-w-xs px-8">

                        {/* ── Scan circle ───────────────────────────────────── */}
                        <div className="relative w-56 h-56">

                            {/* Camera feed / fallback bg — clipped to circle */}
                            <div
                                className="absolute inset-0 rounded-full overflow-hidden"
                                style={{ border: `1px solid ${accentColor}20` }}
                            >
                                {hasCamera ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover scale-x-[-1]"
                                        style={{ opacity: phase === "confirmed" ? 0.4 : 0.65, transition: "opacity 0.5s" }}
                                    />
                                ) : (
                                    /* No camera: animated dark pulse fills the circle */
                                    <motion.div
                                        className="w-full h-full"
                                        animate={{ backgroundColor: [`${accentColor}06`, `${accentColor}0e`, `${accentColor}06`] }}
                                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                )}
                            </div>

                            {/* Outer glow ring */}
                            <div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{ boxShadow: `0 0 0 12px ${accentColor}04, inset 0 0 40px ${accentColor}08` }}
                            />

                            {/* Middle ring — pulsing */}
                            <motion.div
                                className="absolute inset-4 rounded-full pointer-events-none"
                                animate={{ scale: [1, 1.03, 1], opacity: [0.35, 0.65, 0.35] }}
                                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                                style={{ border: `1px solid ${accentColor}50` }}
                            />

                            {/* Corner brackets */}
                            {[
                                { top: 0,    left:  0,    borderTop: `2px solid ${accentColor}`, borderLeft:  `2px solid ${accentColor}`, borderRadius: "12px 0 0 0"  },
                                { top: 0,    right: 0,    borderTop: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, borderRadius: "0 12px 0 0"  },
                                { bottom: 0, left:  0,    borderBottom: `2px solid ${accentColor}`, borderLeft:  `2px solid ${accentColor}`, borderRadius: "0 0 0 12px" },
                                { bottom: 0, right: 0,    borderBottom: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, borderRadius: "0 0 12px 0" },
                            ].map((style, i) => (
                                <div
                                    key={i}
                                    className="absolute w-7 h-7 pointer-events-none"
                                    style={{ ...style, boxShadow: `0 0 10px ${accentColor}70` }}
                                />
                            ))}

                            {/* Scan line */}
                            {phase === "scanning" && (
                                <motion.div
                                    className="absolute inset-x-0 pointer-events-none overflow-hidden rounded-full"
                                    style={{ top: scanY, height: "3px" }}
                                >
                                    <div
                                        className="w-full h-full"
                                        style={{
                                            background: `linear-gradient(90deg, transparent 0%, ${accentColor}70 25%, ${accentColor} 50%, ${accentColor}70 75%, transparent 100%)`,
                                            boxShadow:  `0 0 14px ${accentColor}, 0 0 4px #fff`,
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
                                        background: `linear-gradient(to bottom, transparent 50%, ${accentColor}14)`,
                                    }}
                                />
                            )}

                            {/* Confirmed checkmark */}
                            <AnimatePresence>
                                {phase === "confirmed" && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 300, damping: 22 }}
                                        className="absolute inset-0 flex items-center justify-center"
                                    >
                                        <div
                                            className="w-18 h-18 rounded-full flex items-center justify-center"
                                            style={{
                                                background: `${accentColor}18`,
                                                border:     `2px solid ${accentColor}`,
                                                boxShadow:  `0 0 50px ${accentColor}60`,
                                                width: 72, height: 72,
                                            }}
                                        >
                                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                                <motion.path
                                                    d="M5 12l5 5L19 7"
                                                    stroke={accentColor}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.45, ease: "easeOut" }}
                                                />
                                            </svg>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── HUD data tags (savage feel) ───────────────────── */}
                        {phase === "scanning" && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="absolute top-1/2 -translate-y-1/2 left-8 flex flex-col gap-2 pointer-events-none"
                            >
                                {["FACE·ID", "DEPTH·MAP", "BIOMETRIC"].map((label, i) => (
                                    <motion.p
                                        key={label}
                                        animate={{ opacity: [0.15, 0.45, 0.15] }}
                                        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4 }}
                                        className="text-[8px] font-black uppercase tracking-widest"
                                        style={{ color: accentColor }}
                                    >
                                        {label}
                                    </motion.p>
                                ))}
                            </motion.div>
                        )}

                        {/* ── Status text ───────────────────────────────────── */}
                        <div className="flex flex-col items-center gap-3 w-full">
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
                                        {hasCamera ? "Scanning Biometrics" : "Initializing System"}
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

                            <p
                                className="text-[28px] font-black tabular-nums leading-none"
                                style={{
                                    fontFamily: "var(--font-archivo-black), sans-serif",
                                    color:      accentColor,
                                    opacity:    phase === "confirmed" ? 0 : 1,
                                    transition: "opacity 0.3s",
                                }}
                            >
                                {String(progress).padStart(3, "\u2007")}
                                <span className="text-base opacity-50">%</span>
                            </p>
                        </div>

                        {/* Brand label */}
                        <p className="text-[9px] font-black uppercase tracking-[0.7em] opacity-15 mt-2">
                            Mr. Workout · Biometric Auth
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
