"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Crown, Zap, Dumbbell, BarChart3, Trophy,
    Flame, Star, X, Loader2, CheckCircle2,
    ArrowLeft,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";

// ── Pricing ───────────────────────────────────────────────────────────────────
const MONTHLY_PRICE  = "$14.99";
const ANNUAL_PRICE   = "$99";
const ANNUAL_MONTHLY = "$8.25";
const ANNUAL_SAVING  = "45%";

const FEATURES = [
    { icon: Dumbbell,  text: "All 89 moves — full Armory access"         },
    { icon: Zap,       text: "Custom Routines — build & save any circuit" },
    { icon: BarChart3, text: "Advanced analytics — volume, PRs, trends"   },
    { icon: Trophy,    text: "Global Leaderboard — compete worldwide"      },
    { icon: Flame,     text: "Streak protection & bonus XP missions"      },
    { icon: Crown,     text: "Exclusive themes — Founder, Gold, Obsidian" },
];

const GOLD = "#FFD700";
const CYAN = "#00E5CC";

type Phase = "loading" | "auth" | "pricing";

interface UpgradeModalProps {
    onClose: () => void;
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
    const [phase,         setPhase]         = useState<Phase>("loading");
    const [userEmail,     setUserEmail]     = useState("");
    const [userName,      setUserName]      = useState("");
    const [loadingPlan,   setLoadingPlan]   = useState<"monthly" | "annual" | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    // ── On mount: check Supabase session ────────────────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            const user = data.session?.user;
            if (user) {
                const email = user.email ?? "";
                // Name priority: Supabase metadata → localStorage → sessionStorage
                const meta  = user.user_metadata ?? {};
                let name    = (meta.full_name ?? meta.name ?? "").split(" ")[0].trim();
                if (!name) {
                    try { name = localStorage.getItem("mw_display_name") ?? ""; } catch {}
                }
                if (!name) {
                    try { name = sessionStorage.getItem("mw_join_name") ?? ""; } catch {}
                }
                setUserEmail(email);
                setUserName(name);
                setPhase("pricing");
            } else {
                // No Supabase session — show auth first
                setPhase("auth");
            }
        });
    }, []);

    // ── Called by AuthModal when login succeeds ──────────────────────────────
    const handleAuthDone = async () => {
        // Re-read Supabase session to get fresh user data
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (user) {
            const email = user.email ?? "";
            const meta  = user.user_metadata ?? {};
            let name    = (meta.full_name ?? meta.name ?? "").split(" ")[0].trim();
            if (!name) {
                try { name = localStorage.getItem("mw_display_name") ?? ""; } catch {}
            }
            if (!name) {
                try { name = sessionStorage.getItem("mw_join_name") ?? ""; } catch {}
            }
            setUserEmail(email);
            setUserName(name);
        }
        setPhase("pricing");
    };

    // ── Checkout ─────────────────────────────────────────────────────────────
    const checkout = async (plan: "monthly" | "annual") => {
        setLoadingPlan(plan);
        setCheckoutError(null);
        try {
            const res  = await fetch("/api/checkout", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email: userEmail, plan }),
            });
            const json = await res.json();
            if (json.url) { window.location.href = json.url; return; }
            setCheckoutError(json.error ?? "Checkout failed — please try again.");
        } catch (err: any) {
            setCheckoutError(err?.message ?? "Network error — check your connection.");
        } finally {
            setLoadingPlan(null);
        }
    };

    // ── Auth phase: render AuthModal transparently over upgrade backdrop ──────
    if (phase === "auth") {
        return (
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[600]"
                style={{ background: "rgba(0,0,0,0.84)", backdropFilter: "blur(14px)" }}
            >
                {/* Back button so user can close without logging in */}
                <button
                    onClick={onClose}
                    className="absolute top-5 left-5 z-[700] flex items-center gap-1.5 text-xs font-black uppercase tracking-widest opacity-30 hover:opacity-70 transition-opacity"
                >
                    <ArrowLeft size={13} /> Close
                </button>
                <div className="flex items-end sm:items-center justify-center h-full">
                    <AuthModal
                        onClose={onClose}
                        onAuthenticated={handleAuthDone}
                        redirectTo="/auth-redirect"
                    />
                </div>
            </motion.div>
        );
    }

    // ── Bottom-sheet modal wrapper ────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0,  opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="w-full sm:max-w-sm relative overflow-hidden overflow-y-auto"
                style={{
                    maxHeight:     "90dvh",
                    background:    "linear-gradient(160deg, #0b0b0b 0%, #060606 100%)",
                    border:        `1px solid ${GOLD}18`,
                    borderBottom:  "none",
                    borderRadius:  "32px 32px 0 0",
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top cyan line */}
                <div className="absolute top-0 inset-x-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)` }} />

                {/* Drag handle */}
                <div className="flex justify-center pt-3 sm:hidden">
                    <div className="w-10 h-1 rounded-full" style={{ background: `${GOLD}22` }} />
                </div>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-9 h-9 rounded-full flex items-center justify-center opacity-25 hover:opacity-60 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                    aria-label="Close"
                >
                    <X size={15} />
                </button>

                <div className="px-6 pt-8 pb-10 flex flex-col gap-5">

                    {/* ── Loading state ────────────────────────────────── */}
                    {phase === "loading" && (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 size={28} className="animate-spin opacity-25" />
                        </div>
                    )}

                    {/* ── Pricing ──────────────────────────────────────── */}
                    {phase === "pricing" && (
                        <>
                            {/* Header */}
                            <div className="flex flex-col items-center text-center gap-2 pt-2">
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1,   opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                                    className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-1"
                                    style={{
                                        background: `linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.06))`,
                                        border:     `1px solid ${GOLD}30`,
                                        boxShadow:  `0 0 32px ${GOLD}18`,
                                    }}
                                >
                                    <Crown size={28} color={GOLD} fill={`${GOLD}30`} />
                                </motion.div>

                                <p className="text-[9px] font-black uppercase tracking-[0.55em] opacity-25">
                                    Savage Pro
                                </p>
                                <motion.h2
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="text-[26px] font-black uppercase leading-tight"
                                    style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                                >
                                    {userName
                                        ? <>Hey {userName}, <span style={{ color: GOLD }}>Level Up</span> to Pro</>
                                        : <>Unlock <span style={{ color: GOLD }}>Pro</span></>
                                    }
                                </motion.h2>
                                <p className="text-xs opacity-35 font-medium leading-relaxed">
                                    7-day free trial on all plans. Cancel any time.
                                </p>
                            </div>

                            {/* Checkout error */}
                            <AnimatePresence>
                                {checkoutError && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div
                                            className="rounded-2xl px-4 py-3 flex items-start gap-2 text-xs font-medium"
                                            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", color: "#fca5a5" }}
                                        >
                                            <span className="shrink-0">⚠</span>
                                            <span className="leading-snug">{checkoutError}</span>
                                            <button onClick={() => setCheckoutError(null)} className="ml-auto shrink-0 opacity-50 hover:opacity-100">✕</button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ── Founder Annual — featured ─────────────── */}
                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="relative rounded-[24px] p-5"
                                style={{
                                    background: `linear-gradient(135deg, rgba(255,215,0,0.10) 0%, rgba(255,165,0,0.04) 100%)`,
                                    border:     `1px solid ${GOLD}28`,
                                    boxShadow:  `0 0 40px ${GOLD}08`,
                                }}
                            >
                                <div
                                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                                    style={{ background: GOLD, color: "#000" }}
                                >
                                    Best Value — Save {ANNUAL_SAVING}
                                </div>

                                <div className="flex items-start justify-between mb-4 mt-1">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-35 mb-1">
                                            Founder Annual
                                        </p>
                                        <div className="flex items-baseline gap-1">
                                            <span
                                                className="text-4xl font-black"
                                                style={{ fontFamily: "var(--font-archivo-black)", color: GOLD, textShadow: `0 0 24px ${GOLD}40` }}
                                            >
                                                {ANNUAL_PRICE}
                                            </span>
                                            <span className="text-sm opacity-40 font-medium">/ yr</span>
                                        </div>
                                        <p className="text-xs opacity-40 mt-0.5 font-medium">
                                            {ANNUAL_MONTHLY}/mo · Locked forever
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 mt-1">
                                        <Crown size={22} color={GOLD} fill={`${GOLD}25`} />
                                        <div className="flex gap-0.5">
                                            {[...Array(3)].map((_, i) => (
                                                <Star key={i} size={10} color={GOLD} fill={GOLD} />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => checkout("annual")}
                                    disabled={loadingPlan === "annual"}
                                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-55"
                                    style={{
                                        background:  `linear-gradient(135deg, ${GOLD} 0%, #FFA500 100%)`,
                                        boxShadow:   `0 0 30px ${GOLD}35, 0 6px 20px rgba(0,0,0,0.4)`,
                                        touchAction: "manipulation",
                                    }}
                                >
                                    {loadingPlan === "annual"
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <><Crown size={15} fill="currentColor" /> Lock In Founder Rate</>
                                    }
                                </motion.button>
                            </motion.div>

                            {/* ── Savage Monthly ────────────────────────── */}
                            <motion.div
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.22 }}
                                className="rounded-[24px] p-5"
                                style={{
                                    background: `rgba(0,229,204,0.05)`,
                                    border:     `1px solid ${CYAN}18`,
                                }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-35 mb-1">
                                            Savage Monthly
                                        </p>
                                        <div className="flex items-baseline gap-1">
                                            <span
                                                className="text-4xl font-black"
                                                style={{ fontFamily: "var(--font-archivo-black)", color: CYAN }}
                                            >
                                                {MONTHLY_PRICE}
                                            </span>
                                            <span className="text-sm opacity-40 font-medium">/ mo</span>
                                        </div>
                                        <p className="text-xs opacity-35 mt-0.5 font-medium">
                                            Billed monthly after free trial
                                        </p>
                                    </div>
                                    <Zap size={22} color={CYAN} fill={`${CYAN}20`} className="mt-1 shrink-0" />
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => checkout("monthly")}
                                    disabled={loadingPlan === "monthly"}
                                    className="w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-55"
                                    style={{
                                        background:  `linear-gradient(135deg, ${CYAN} 0%, #00B5A0 100%)`,
                                        boxShadow:   `0 0 22px ${CYAN}28`,
                                        touchAction: "manipulation",
                                    }}
                                >
                                    {loadingPlan === "monthly"
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <><Zap size={15} fill="currentColor" /> Start 7-Day Free Trial</>
                                    }
                                </motion.button>
                            </motion.div>

                            {/* ── Feature list ─────────────────────────── */}
                            <motion.div
                                initial="hidden"
                                animate="show"
                                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.055 } } }}
                                className="flex flex-col gap-2.5"
                            >
                                <p className="text-[9px] font-black uppercase tracking-[0.45em] opacity-20 text-center mb-1">
                                    Everything Included
                                </p>
                                {FEATURES.map(({ icon: Icon, text }) => (
                                    <motion.div
                                        key={text}
                                        variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                                        className="flex items-center gap-3"
                                    >
                                        <CheckCircle2 size={14} color={CYAN} className="shrink-0" />
                                        <span className="text-xs opacity-55 font-medium">{text}</span>
                                    </motion.div>
                                ))}
                            </motion.div>

                            <p className="text-center text-[10px] opacity-12 font-medium">
                                Secured by Stripe · No hidden fees · Cancel in 2 taps
                            </p>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
