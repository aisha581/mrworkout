"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
    isOpen:   boolean;
    onClose:  () => void;
    accent:   string;
}

// Native iOS Share icon — square with arrow pointing up
function IOSShareIcon({ color, size = 22 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.684 8.316L12 5m0 0l3.316 3.316M12 5v10" />
            <path d="M9 11H6a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2v-6a2 2 0 00-2-2h-3" />
        </svg>
    );
}

export default function AddToHomeModal({ isOpen, onClose, accent }: Props) {
    const [step,         setStep]         = useState(1);
    const [isIOS,        setIsIOS]        = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt(): Promise<void> } | null>(null);

    // Detect platform + standalone on client only
    useEffect(() => {
        if (typeof window === "undefined") return;
        const ua = navigator.userAgent;
        setIsIOS(/iphone|ipad|ipod/i.test(ua));
        setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    }, []);

    // Capture Android install prompt
    useEffect(() => {
        if (typeof window === "undefined") return;
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as Event & { prompt(): Promise<void> });
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    // Reset step on close
    useEffect(() => {
        if (!isOpen) { setTimeout(() => setStep(1), 400); }
    }, [isOpen]);

    // Already installed — nothing to show
    if (isStandalone) return null;

    const handleAndroidInstall = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        setDeferredPrompt(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[900] bg-black/80 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 340, damping: 34 }}
                        className="fixed bottom-0 inset-x-0 z-[901] rounded-t-[32px] overflow-hidden pb-10"
                        style={{
                            background:   "linear-gradient(180deg, #0e0e0e 0%, #080808 100%)",
                            border:       `1px solid ${accent}20`,
                            borderBottom: "none",
                            boxShadow:    `0 -20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${accent}10`,
                        }}
                    >
                        {/* Top accent line */}
                        <div
                            className="absolute top-0 inset-x-0 h-[1px]"
                            style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }}
                        />

                        {/* Drag handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full" style={{ background: `${accent}30` }} />
                        </div>

                        {/* Header */}
                        <div className="flex items-start justify-between px-6 pt-4 pb-2">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-1" style={{ color: accent }}>
                                    Save to Device
                                </p>
                                <h2
                                    className="text-2xl font-black uppercase leading-tight"
                                    style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                                >
                                    Add to Home Screen
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full flex items-center justify-center mt-1"
                                style={{ background: "rgba(255,255,255,0.07)" }}
                            >
                                <X size={15} className="opacity-60" />
                            </button>
                        </div>

                        <p className="px-6 text-[12px] opacity-40 mb-6">
                            No App Store needed. Get the full native experience in 2 taps.
                        </p>

                        {/* ── iOS steps ─────────────────────────────────────────── */}
                        {isIOS && (
                            <div className="px-6 space-y-4">

                                {/* Step 1 — Tap Share */}
                                <motion.div
                                    className="relative rounded-2xl p-5 overflow-hidden"
                                    style={{
                                        background: step === 1 ? `${accent}0d` : "rgba(255,255,255,0.03)",
                                        border:     `1px solid ${step === 1 ? accent + "40" : "rgba(255,255,255,0.07)"}`,
                                        boxShadow:  step === 1 ? `0 0 20px ${accent}15` : "none",
                                        transition: "all 0.35s ease",
                                    }}
                                >
                                    {step === 1 && (
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{ background: `linear-gradient(135deg, ${accent}06 0%, transparent 60%)` }}
                                        />
                                    )}
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm"
                                            style={{
                                                background: step === 1 ? accent : "rgba(255,255,255,0.08)",
                                                color:      step === 1 ? "#000" : "rgba(255,255,255,0.35)",
                                                fontFamily: "var(--font-archivo-black), sans-serif",
                                            }}
                                        >
                                            1
                                        </div>

                                        <div className="flex-1">
                                            <p className="font-black text-sm uppercase tracking-wide mb-0.5">
                                                Tap the Share button
                                            </p>
                                            <p className="text-[11px] opacity-40 leading-snug">
                                                The square-with-arrow icon at the bottom of Safari
                                            </p>
                                        </div>

                                        {/* iOS-accurate Share icon */}
                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                            style={{
                                                background: "rgba(255,255,255,0.07)",
                                                border:     "1px solid rgba(255,255,255,0.12)",
                                            }}
                                        >
                                            <IOSShareIcon color={step === 1 ? accent : "rgba(255,255,255,0.4)"} />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Connector arrow */}
                                <div className="flex justify-center">
                                    <motion.div
                                        animate={{ y: [0, 4, 0] }}
                                        transition={{ duration: 1.4, repeat: Infinity }}
                                        className="opacity-30 text-lg leading-none"
                                    >↓</motion.div>
                                </div>

                                {/* Step 2 — Add to Home Screen */}
                                <motion.div
                                    className="relative rounded-2xl p-5 overflow-hidden"
                                    style={{
                                        background: step === 2 ? `${accent}0d` : "rgba(255,255,255,0.03)",
                                        border:     `1px solid ${step === 2 ? accent + "40" : "rgba(255,255,255,0.07)"}`,
                                        boxShadow:  step === 2 ? `0 0 20px ${accent}15` : "none",
                                        transition: "all 0.35s ease",
                                    }}
                                >
                                    {step === 2 && (
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{ background: `linear-gradient(135deg, ${accent}06 0%, transparent 60%)` }}
                                        />
                                    )}
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm"
                                            style={{
                                                background: step === 2 ? accent : "rgba(255,255,255,0.08)",
                                                color:      step === 2 ? "#000" : "rgba(255,255,255,0.35)",
                                                fontFamily: "var(--font-archivo-black), sans-serif",
                                            }}
                                        >
                                            2
                                        </div>

                                        <div className="flex-1">
                                            <p className="font-black text-sm uppercase tracking-wide mb-0.5">
                                                Add to Home Screen
                                            </p>
                                            <p className="text-[11px] opacity-40 leading-snug">
                                                Scroll down in the Share sheet and tap it
                                            </p>
                                        </div>

                                        <div
                                            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                            style={{
                                                background: "rgba(255,255,255,0.07)",
                                                border:     "1px solid rgba(255,255,255,0.12)",
                                            }}
                                        >
                                            <Plus size={18} style={{ color: step === 2 ? accent : "rgba(255,255,255,0.4)" }} />
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Step navigation */}
                                <div className="flex items-center gap-3 mt-6">
                                    <button
                                        onClick={() => setStep(s => s === 1 ? 2 : 1)}
                                        className="flex-1 py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] transition-all active:scale-[0.97]"
                                        style={{
                                            background: `${accent}18`,
                                            border:     `1px solid ${accent}40`,
                                            color:      accent,
                                        }}
                                    >
                                        {step === 1 ? "Next →" : "← Back"}
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="flex-1 py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] text-black transition-all active:scale-[0.97]"
                                        style={{
                                            background: accent,
                                            boxShadow:  `0 0 20px ${accent}50`,
                                        }}
                                    >
                                        Got It
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ── Android / desktop ─────────────────────────────────── */}
                        {!isIOS && (
                            <div className="px-6">
                                {deferredPrompt ? (
                                    <button
                                        onClick={handleAndroidInstall}
                                        className="w-full py-4 rounded-2xl font-black uppercase text-[13px] tracking-[0.25em] text-black transition-all active:scale-[0.97]"
                                        style={{
                                            background: accent,
                                            boxShadow:  `0 0 28px ${accent}60`,
                                        }}
                                    >
                                        Install App
                                    </button>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Fallback manual steps for Android/Chrome */}
                                        {[
                                            { n: 1, title: "Tap the Menu ( ⋮ )", sub: "Three-dot menu in the top-right of Chrome" },
                                            { n: 2, title: "Add to Home Screen", sub: "Tap the option from the dropdown list" },
                                        ].map(({ n, title, sub }) => (
                                            <div
                                                key={n}
                                                className="flex items-center gap-4 rounded-2xl p-5"
                                                style={{
                                                    background: "rgba(255,255,255,0.03)",
                                                    border:     "1px solid rgba(255,255,255,0.07)",
                                                }}
                                            >
                                                <div
                                                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm"
                                                    style={{
                                                        background: accent,
                                                        color:      "#000",
                                                        fontFamily: "var(--font-archivo-black), sans-serif",
                                                    }}
                                                >
                                                    {n}
                                                </div>
                                                <div>
                                                    <p className="font-black text-sm uppercase tracking-wide mb-0.5">{title}</p>
                                                    <p className="text-[11px] opacity-40 leading-snug">{sub}</p>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={onClose}
                                            className="w-full py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-[0.25em] text-black mt-2 transition-all active:scale-[0.97]"
                                            style={{
                                                background: accent,
                                                boxShadow:  `0 0 20px ${accent}50`,
                                            }}
                                        >
                                            Got It
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
