"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
    isOpen:   boolean;
    onClose:  () => void;
    accent:   string;
}

export default function AddToHomeModal({ isOpen, onClose, accent }: Props) {
    const [step, setStep] = useState(1);

    useEffect(() => {
        if (!isOpen) { setTimeout(() => setStep(1), 400); }
    }, [isOpen]);

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
                            background: "linear-gradient(180deg, #0e0e0e 0%, #080808 100%)",
                            border:     `1px solid ${accent}20`,
                            borderBottom: "none",
                            boxShadow:  `0 -20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${accent}10`,
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

                        {/* Steps */}
                        <div className="px-6 space-y-4">
                            {/* Step 1 */}
                            <motion.div
                                animate={{ opacity: 1, scale: 1 }}
                                initial={{ opacity: 0.5, scale: 0.98 }}
                                className="relative rounded-2xl p-5 overflow-hidden"
                                style={{
                                    background:  step === 1 ? `${accent}0d` : "rgba(255,255,255,0.03)",
                                    border:      `1px solid ${step === 1 ? accent + "40" : "rgba(255,255,255,0.07)"}`,
                                    boxShadow:   step === 1 ? `0 0 20px ${accent}15` : "none",
                                    transition:  "all 0.35s ease",
                                }}
                            >
                                {step === 1 && (
                                    <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{ background: `linear-gradient(135deg, ${accent}06 0%, transparent 60%)` }}
                                    />
                                )}
                                <div className="flex items-center gap-4">
                                    {/* Step number */}
                                    <div
                                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm"
                                        style={{
                                            background:  step === 1 ? accent : "rgba(255,255,255,0.08)",
                                            color:       step === 1 ? "#000" : "rgba(255,255,255,0.35)",
                                            fontFamily:  "var(--font-archivo-black), sans-serif",
                                        }}
                                    >
                                        1
                                    </div>

                                    <div className="flex-1">
                                        <p className="font-black text-sm uppercase tracking-wide mb-0.5">
                                            Tap Share
                                        </p>
                                        <p className="text-[11px] opacity-40 leading-snug">
                                            Hit the Share icon at the bottom of Safari
                                        </p>
                                    </div>

                                    {/* Visual — Share button mockup */}
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                        style={{
                                            background:  "rgba(255,255,255,0.07)",
                                            border:      "1px solid rgba(255,255,255,0.12)",
                                        }}
                                    >
                                        <Share size={18} style={{ color: step === 1 ? accent : "rgba(255,255,255,0.4)" }} />
                                    </div>
                                </div>
                            </motion.div>

                            {/* Arrow */}
                            <div className="flex justify-center">
                                <motion.div
                                    animate={{ y: [0, 4, 0] }}
                                    transition={{ duration: 1.4, repeat: Infinity }}
                                    className="opacity-30 text-lg leading-none"
                                >↓</motion.div>
                            </div>

                            {/* Step 2 */}
                            <motion.div
                                className="relative rounded-2xl p-5 overflow-hidden"
                                style={{
                                    background:  step === 2 ? `${accent}0d` : "rgba(255,255,255,0.03)",
                                    border:      `1px solid ${step === 2 ? accent + "40" : "rgba(255,255,255,0.07)"}`,
                                    boxShadow:   step === 2 ? `0 0 20px ${accent}15` : "none",
                                    transition:  "all 0.35s ease",
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
                                            background:  step === 2 ? accent : "rgba(255,255,255,0.08)",
                                            color:       step === 2 ? "#000" : "rgba(255,255,255,0.35)",
                                            fontFamily:  "var(--font-archivo-black), sans-serif",
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

                                    {/* Visual — Add button mockup */}
                                    <div
                                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                                        style={{
                                            background:  "rgba(255,255,255,0.07)",
                                            border:      "1px solid rgba(255,255,255,0.12)",
                                        }}
                                    >
                                        <Plus size={18} style={{ color: step === 2 ? accent : "rgba(255,255,255,0.4)" }} />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Step toggle + CTA */}
                        <div className="px-6 mt-6 flex items-center gap-3">
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
