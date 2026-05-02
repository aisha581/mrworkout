"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// sessionStorage key — shows once per browser session (clears on tab close)
const SCAN_KEY  = "mw_scan_session";
const DURATION  = 3800; // ms
const CYAN      = "#00FFFF";

interface Props {
    accentColor: string;
    onComplete:  () => void;
}

export default function BiometricScan({ accentColor, onComplete }: Props) {
    const color = CYAN; // always neon cyan regardless of theme

    const [progress,  setProgress]  = useState(0);
    const [phase,     setPhase]     = useState<"scanning" | "confirmed">("scanning");
    const [visible,   setVisible]   = useState(true);
    const [hasCamera, setHasCamera] = useState(false);

    const startRef  = useRef<number | null>(null);
    const rafRef    = useRef<number | null>(null);
    const videoRef  = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // ── Camera — useEffect guards SSR ─────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!navigator.mediaDevices?.getUserMedia) return;

        navigator.mediaDevices
            .getUserMedia({ video: { facingMode: "user", width: 320, height: 320 } })
            .then((stream) => {
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch(() => {});
                }
                setHasCamera(true);
            })
            .catch(() => setHasCamera(false));

        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // ── Progress rAF ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (typeof window === "undefined") return;

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
                try { sessionStorage.setItem(SCAN_KEY, "1"); } catch {}
                setTimeout(() => {
                    setVisible(false);
                    setTimeout(onComplete, 450);
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
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="fixed inset-0 z-[999] flex flex-col items-center justify-center overflow-hidden select-none"
                    style={{ background: "#050505" }}
                >
                    {/* Full-screen ambient cyan glow */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            background: `radial-gradient(ellipse 65% 60% at 50% 50%, ${color}0a 0%, transparent 70%)`,
                        }}
                    />

                    {/* Dark grid */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            opacity: 0.028,
                            backgroundImage:
                                `linear-gradient(${color}80 1px, transparent 1px), linear-gradient(90deg, ${color}80 1px, transparent 1px)`,
                            backgroundSize: "40px 40px",
                        }}
                    />

                    {/* Diagonal corner lines — top-left + bottom-right */}
                    {[
                        { top: 0,    left:  0,    transform: "none" },
                        { bottom: 0, right: 0,    transform: "none" },
                    ].map((pos, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-20 h-px pointer-events-none"
                            animate={{ opacity: [0.2, 0.5, 0.2] }}
                            transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2 }}
                            style={{ ...pos, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }}
                        />
                    ))}

                    <div className="relative flex flex-col items-center gap-8 w-full max-w-xs px-8">

                        {/* HUD side tags */}
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="absolute top-1/2 -translate-y-1/2 left-4 flex flex-col gap-2.5 pointer-events-none"
                        >
                            {["FACE·ID", "DEPTH·MAP", "NEURAL"].map((label, i) => (
                                <motion.p
                                    key={label}
                                    animate={{ opacity: [0.12, 0.45, 0.12] }}
                                    transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5 }}
                                    className="text-[7px] font-black uppercase tracking-[0.4em]"
                                    style={{ color }}
                                >
                                    {label}
                                </motion.p>
                            ))}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-2.5 pointer-events-none items-end"
                        >
                            {["BIOMETRIC", "IDENTITY", "SECURE"].map((label, i) => (
                                <motion.p
                                    key={label}
                                    animate={{ opacity: [0.12, 0.4, 0.12] }}
                                    transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 + i * 0.5 }}
                                    className="text-[7px] font-black uppercase tracking-[0.4em]"
                                    style={{ color }}
                                >
                                    {label}
                                </motion.p>
                            ))}
                        </motion.div>

                        {/* ── Scan circle ─────────────────────────────────────── */}
                        <div className="relative w-60 h-60">

                            {/* Outer pulse ring */}
                            <motion.div
                                className="absolute inset-[-12px] rounded-full pointer-events-none"
                                animate={{ scale: [1, 1.06, 1], opacity: [0.08, 0.18, 0.08] }}
                                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                                style={{ border: `1px solid ${color}` }}
                            />

                            {/* Camera feed / fallback */}
                            <div
                                className="absolute inset-0 rounded-full overflow-hidden"
                                style={{ border: `1.5px solid ${color}30` }}
                            >
                                {hasCamera ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover scale-x-[-1]"
                                        style={{
                                            opacity:    phase === "confirmed" ? 0.35 : 0.6,
                                            transition: "opacity 0.5s",
                                        }}
                                    />
                                ) : (
                                    <motion.div
                                        className="w-full h-full"
                                        animate={{ backgroundColor: [`${color}04`, `${color}0d`, `${color}04`] }}
                                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                    />
                                )}
                            </div>

                            {/* Inner glow ring */}
                            <div
                                className="absolute inset-0 rounded-full pointer-events-none"
                                style={{
                                    boxShadow: `inset 0 0 32px ${color}12, 0 0 0 1px ${color}20, 0 0 28px ${color}15`,
                                }}
                            />

                            {/* Pulsing middle ring */}
                            <motion.div
                                className="absolute inset-5 rounded-full pointer-events-none"
                                animate={{ scale: [1, 1.04, 1], opacity: [0.25, 0.55, 0.25] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                style={{ border: `1px solid ${color}60` }}
                            />

                            {/* Corner brackets — neon cyan with glow */}
                            {[
                                { top: -2,   left:  -2,  borderTop: `2.5px solid ${color}`, borderLeft:  `2.5px solid ${color}`, borderRadius: "14px 0 0 0" },
                                { top: -2,   right: -2,  borderTop: `2.5px solid ${color}`, borderRight: `2.5px solid ${color}`, borderRadius: "0 14px 0 0" },
                                { bottom: -2, left: -2,  borderBottom: `2.5px solid ${color}`, borderLeft:  `2.5px solid ${color}`, borderRadius: "0 0 0 14px" },
                                { bottom: -2, right: -2, borderBottom: `2.5px solid ${color}`, borderRight: `2.5px solid ${color}`, borderRadius: "0 0 14px 0" },
                            ].map((style, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-8 h-8 pointer-events-none"
                                    animate={{ opacity: [0.7, 1, 0.7] }}
                                    transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}
                                    style={{ ...style, filter: `drop-shadow(0 0 6px ${color})` }}
                                />
                            ))}

                            {/* ── Primary scan line — neon cyan with white core ── */}
                            {phase === "scanning" && (
                                <>
                                    <motion.div
                                        className="absolute inset-x-0 pointer-events-none overflow-hidden rounded-full"
                                        style={{ top: scanY, height: "2px" }}
                                    >
                                        <div
                                            className="w-full h-full"
                                            style={{
                                                background: `linear-gradient(90deg,
                                                    transparent 0%,
                                                    ${color}50 15%,
                                                    #ffffff 48%,
                                                    ${color} 50%,
                                                    #ffffff 52%,
                                                    ${color}50 85%,
                                                    transparent 100%)`,
                                                boxShadow: `0 0 12px 3px ${color}, 0 0 24px 6px ${color}60, 0 0 2px #fff`,
                                                filter:    `blur(0.3px)`,
                                            }}
                                        />
                                    </motion.div>

                                    {/* Secondary shimmer above the line */}
                                    <div
                                        className="absolute inset-x-0 rounded-full overflow-hidden pointer-events-none"
                                        style={{
                                            top:        0,
                                            height:     scanY,
                                            background: `linear-gradient(to bottom, transparent 60%, ${color}10)`,
                                        }}
                                    />
                                </>
                            )}

                            {/* Confirmed checkmark */}
                            <AnimatePresence>
                                {phase === "confirmed" && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ type: "spring", stiffness: 280, damping: 20 }}
                                        className="absolute inset-0 flex items-center justify-center"
                                    >
                                        <div
                                            className="rounded-full flex items-center justify-center"
                                            style={{
                                                width:     76,
                                                height:    76,
                                                background: `${color}15`,
                                                border:    `2px solid ${color}`,
                                                boxShadow: `0 0 40px ${color}70, 0 0 80px ${color}30`,
                                            }}
                                        >
                                            <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                                                <motion.path
                                                    d="M5 12l5 5L19 7"
                                                    stroke={color}
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: 1 }}
                                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                                />
                                            </svg>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* ── Status + progress ────────────────────────────────── */}
                        <div className="flex flex-col items-center gap-3 w-full">
                            <AnimatePresence mode="wait">
                                {phase === "scanning" ? (
                                    <motion.p
                                        key="scanning"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="text-[10px] font-black uppercase tracking-[0.6em]"
                                        style={{ color, textShadow: `0 0 12px ${color}` }}
                                    >
                                        {hasCamera ? "Scanning Biometrics" : "Initializing System"}
                                    </motion.p>
                                ) : (
                                    <motion.p
                                        key="confirmed"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-[10px] font-black uppercase tracking-[0.6em]"
                                        style={{ color, textShadow: `0 0 20px ${color}` }}
                                    >
                                        Identity Confirmed
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {/* Progress bar */}
                            <div
                                className="w-full rounded-full overflow-hidden"
                                style={{ height: "2px", background: `${color}12` }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-75"
                                    style={{
                                        width:      `${progress}%`,
                                        background: `linear-gradient(90deg, ${color}80, ${color})`,
                                        boxShadow:  `0 0 8px ${color}, 0 0 2px #fff`,
                                    }}
                                />
                            </div>

                            {/* Percentage counter */}
                            <motion.p
                                className="font-black tabular-nums leading-none"
                                style={{
                                    fontFamily: "var(--font-archivo-black), sans-serif",
                                    fontSize:   "2rem",
                                    color,
                                    textShadow: `0 0 20px ${color}80`,
                                    opacity:    phase === "confirmed" ? 0 : 1,
                                    transition: "opacity 0.3s",
                                }}
                            >
                                {String(progress).padStart(3, "\u2007")}
                                <span className="text-base opacity-40">%</span>
                            </motion.p>
                        </div>

                        {/* Brand watermark */}
                        <p
                            className="text-[8px] font-black uppercase tracking-[0.8em] mt-1"
                            style={{ color, opacity: 0.12 }}
                        >
                            Mr. Workout · Biometric Auth
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/** Returns true if the scan should be shown this session */
export function shouldShowScan(): boolean {
    if (typeof window === "undefined") return false;
    try { return !sessionStorage.getItem(SCAN_KEY); } catch { return false; }
}
