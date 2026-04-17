"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Crown, Dumbbell, BarChart3, Trophy,
    Flame, CheckCircle2, Loader2, ArrowLeft, Lock,
    User, ChevronRight, Download, X, Smartphone,
    Shield, Star,
} from "lucide-react";
import { hapticMedium, hapticHeavy } from "@/utils/haptic";

// ── Pricing ───────────────────────────────────────────────────────────────────
const MONTHLY_PRICE  = "$14.99";
const ANNUAL_PRICE   = "$99";
const ANNUAL_MONTHLY = "$8.25";
const ANNUAL_SAVING  = "45%";

// ── Founder slots config ──────────────────────────────────────────────────────
const FOUNDER_TOTAL  = 1000;
// Stable "claimed" count seeded from today's date so it stays consistent
// within the same day but increments daily — feels live without a real DB.
function getFounderClaimed(): number {
    const dayIndex = Math.floor(Date.now() / 86_400_000); // days since epoch
    // Starts at 724, grows ~3-6 per day, capped at FOUNDER_TOTAL - 5
    const base = 724 + ((dayIndex % 40) * 4);
    return Math.min(base, FOUNDER_TOTAL - 5);
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
    { icon: Dumbbell,  text: "All 89 moves — full Armory access"          },
    { icon: Zap,       text: "Custom Routines — build & save any circuit"  },
    { icon: BarChart3, text: "Advanced analytics — volume, PRs, trends"    },
    { icon: Trophy,    text: "Global Leaderboard — compete worldwide"       },
    { icon: Flame,     text: "Streak protection & bonus XP missions"       },
    { icon: Crown,     text: "Exclusive themes — Founder, Gold, Obsidian"  },
];

// ── Founder badges ────────────────────────────────────────────────────────────
const FOUNDER_BADGES = [
    { label: "OG Founder",   color: "#FFD700", glow: "rgba(255,215,0,0.35)",   icon: Crown,  desc: "Locked-in rate forever"  },
    { label: "Beta Access",  color: "#00E5CC", glow: "rgba(0,229,204,0.35)",   icon: Zap,    desc: "First to every feature"  },
    { label: "Name in App",  color: "#C084FC", glow: "rgba(192,132,252,0.35)", icon: Star,   desc: "Credited in the Hall"     },
];

// ── Countdown hook ─────────────────────────────────────────────────────────────
const DEADLINE_KEY = "mw_founder_deadline";

function useCountdown() {
    const [parts, setParts] = useState({ h: "24", m: "00", s: "00" });
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        let deadline: number;
        try {
            const stored = localStorage.getItem(DEADLINE_KEY);
            if (stored) {
                deadline = parseInt(stored, 10);
            } else {
                deadline = Date.now() + 24 * 60 * 60 * 1000;
                localStorage.setItem(DEADLINE_KEY, deadline.toString());
            }
        } catch {
            deadline = Date.now() + 24 * 60 * 60 * 1000;
        }

        const tick = () => {
            const diff = deadline - Date.now();
            if (diff <= 0) {
                setParts({ h: "00", m: "00", s: "00" });
                setExpired(true);
                return;
            }
            const h = Math.floor(diff / 3_600_000);
            const m = Math.floor((diff % 3_600_000) / 60_000);
            const s = Math.floor((diff % 60_000) / 1_000);
            setParts({
                h: String(h).padStart(2, "0"),
                m: String(m).padStart(2, "0"),
                s: String(s).padStart(2, "0"),
            });
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return { parts, expired };
}

// ── Clock segment ─────────────────────────────────────────────────────────────
function ClockSeg({ value, label }: { value: string; label: string }) {
    const prevRef = useRef(value);
    const changed = prevRef.current !== value;
    prevRef.current = value;

    return (
        <div className="flex flex-col items-center gap-0.5">
            <AnimatePresence mode="popLayout">
                <motion.span
                    key={value}
                    initial={changed ? { y: -14, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 14, opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    className="text-3xl font-black tabular-nums"
                    style={{
                        fontFamily:  "var(--font-archivo-black), sans-serif",
                        color:       "#FFD700",
                        textShadow:  "0 0 20px rgba(255,215,0,0.6)",
                        lineHeight:  1,
                    }}
                >
                    {value}
                </motion.span>
            </AnimatePresence>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-35">{label}</span>
        </div>
    );
}

// ── Founder slots bar ──────────────────────────────────────────────────────────
function FounderSlotsBar() {
    const claimed   = getFounderClaimed();
    const remaining = FOUNDER_TOTAL - claimed;
    const pct       = (claimed / FOUNDER_TOTAL) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="rounded-2xl p-4 mb-6"
            style={{
                background: "rgba(255,215,0,0.04)",
                border:     "1px solid rgba(255,215,0,0.14)",
            }}
        >
            <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
                    Founder Spots
                </span>
                <span
                    className="text-[11px] font-black"
                    style={{ color: remaining < 100 ? "#FF6B6B" : "#FFD700" }}
                >
                    {remaining} left
                </span>
            </div>

            {/* Progress bar */}
            <div
                className="w-full rounded-full overflow-hidden"
                style={{ height: 5, background: "rgba(255,255,255,0.07)" }}
            >
                <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4, duration: 1.1, ease: "easeOut" }}
                    style={{
                        background: "linear-gradient(90deg, #FFD700 0%, #FFA500 100%)",
                        boxShadow:  "0 0 8px rgba(255,215,0,0.5)",
                    }}
                />
            </div>

            <p className="text-[10px] opacity-25 mt-2 font-medium">
                {claimed.toLocaleString()} of {FOUNDER_TOTAL.toLocaleString()} slots claimed
            </p>
        </motion.div>
    );
}

// ── Founder Badge row ─────────────────────────────────────────────────────────
function FounderBadges() {
    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
            className="flex gap-2.5 mb-7 flex-wrap justify-center"
        >
            {FOUNDER_BADGES.map(({ label, color, glow, icon: Icon, desc }) => (
                <motion.div
                    key={label}
                    variants={{ hidden: { opacity: 0, scale: 0.85 }, show: { opacity: 1, scale: 1 } }}
                    className="flex-1 min-w-[90px] rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center"
                    style={{
                        background: `rgba(${hexToRgb(color)}, 0.07)`,
                        border:     `1px solid ${color}28`,
                        boxShadow:  `0 0 18px ${glow}22`,
                    }}
                >
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: `${color}18` }}
                    >
                        <Icon size={15} color={color} />
                    </div>
                    <p className="text-[10px] font-black leading-tight" style={{ color }}>
                        {label}
                    </p>
                    <p className="text-[9px] opacity-35 font-medium leading-tight">{desc}</p>
                </motion.div>
            ))}
        </motion.div>
    );
}

// helper: "#FFD700" → "255,215,0"
function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

// ── PWA Install prompt ─────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function PWAInstallBanner({ onDismiss }: { onDismiss: () => void }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS]                   = useState(false);
    const [installing, setInstalling]          = useState(false);

    useEffect(() => {
        // Detect iOS (no beforeinstallprompt — show manual instructions)
        const ios = /iphone|ipad|ipod/i.test(navigator?.userAgent ?? "");
        setIsIOS(ios);

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const install = async () => {
        if (!deferredPrompt) return;
        setInstalling(true);
        await deferredPrompt.prompt();
        const result = await deferredPrompt.userChoice;
        if (result.outcome === "accepted") onDismiss();
        setInstalling(false);
        setDeferredPrompt(null);
    };

    // Don't show if already installed (standalone mode)
    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
        return null;
    }

    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0,   opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed bottom-20 left-4 right-4 z-50 rounded-2xl p-4 flex items-center gap-3"
            style={{
                background: "linear-gradient(135deg, rgba(0,229,204,0.12) 0%, rgba(0,229,204,0.06) 100%)",
                border:     "1px solid rgba(0,229,204,0.25)",
                backdropFilter: "blur(16px)",
                boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(0,229,204,0.1)",
            }}
        >
            {/* icon */}
            <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(0,229,204,0.15)" }}
            >
                <Smartphone size={20} color="#00E5CC" />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-[12px] font-black leading-tight">Add to Home Screen</p>
                {isIOS ? (
                    <p className="text-[10px] opacity-40 mt-0.5 leading-snug">
                        Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
                    </p>
                ) : (
                    <p className="text-[10px] opacity-40 mt-0.5">Install for the full native experience</p>
                )}
            </div>

            {!isIOS && (
                <button
                    onClick={install}
                    disabled={installing || !deferredPrompt}
                    className="shrink-0 px-3.5 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider text-black disabled:opacity-50 flex items-center gap-1.5"
                    style={{ background: "#00E5CC", touchAction: "manipulation" }}
                >
                    {installing
                        ? <Loader2 size={13} className="animate-spin" />
                        : <><Download size={13} /> Install</>
                    }
                </button>
            )}

            <button
                onClick={onDismiss}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-30 hover:opacity-60 transition-opacity"
                style={{ background: "rgba(255,255,255,0.08)" }}
                aria-label="Dismiss install prompt"
            >
                <X size={13} />
            </button>
        </motion.div>
    );
}

// ── Name step ──────────────────────────────────────────────────────────────────
function NameStep({ onContinue }: { onContinue: (name: string) => void }) {
    const [name, setName] = useState("");
    const inputRef        = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Restore saved name if user navigated back
        try {
            const saved = sessionStorage.getItem("mw_join_name");
            if (saved) setName(saved);
        } catch {}
        setTimeout(() => inputRef.current?.focus(), 350);
    }, []);

    const submit = () => {
        const trimmed = name.trim();
        if (!trimmed) { inputRef.current?.focus(); return; }
        try { sessionStorage.setItem("mw_join_name", trimmed); } catch {}
        onContinue(trimmed);
    };

    return (
        <motion.div
            key="name-step"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.35 }}
            className="relative z-10 w-full max-w-sm mx-auto px-5 pt-12 pb-28 flex flex-col min-h-screen"
        >
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-10">
                <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: "#00E5CC", boxShadow: "0 0 8px #00E5CC" }}
                />
                <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>

            {/* Headline */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-10"
            >
                <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-25 mb-3">
                    Step 1 of 2
                </p>
                <h1
                    className="text-[46px] font-black uppercase leading-[0.9]"
                    style={{
                        fontFamily:    "var(--font-archivo-black), sans-serif",
                        letterSpacing: "-0.04em",
                    }}
                >
                    What do we
                    <br />
                    <span style={{ color: "#00E5CC", textShadow: "0 0 40px rgba(0,229,204,0.5)" }}>
                        call you?
                    </span>
                </h1>
                <p className="text-sm opacity-35 mt-3 leading-relaxed">
                    Your name gets etched into the
                    <br />
                    Founder Hall. Make it count.
                </p>
            </motion.div>

            {/* Input */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative mb-4"
            >
                <div
                    className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "rgba(0,229,204,0.5)" }}
                >
                    <User size={17} />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && submit()}
                    placeholder="Your first name..."
                    maxLength={32}
                    className="w-full pl-11 pr-5 py-4 rounded-2xl font-bold text-base outline-none placeholder:opacity-20"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border:     name.trim()
                            ? "1px solid rgba(0,229,204,0.45)"
                            : "1px solid rgba(255,255,255,0.1)",
                        color:      "#fff",
                        caretColor: "#00E5CC",
                        transition: "border-color 0.2s",
                    }}
                    autoComplete="given-name"
                    spellCheck={false}
                />
            </motion.div>

            {/* Character preview */}
            <AnimatePresence>
                {name.trim().length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div
                            className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
                            style={{
                                background: "rgba(0,229,204,0.06)",
                                border:     "1px solid rgba(0,229,204,0.14)",
                            }}
                        >
                            <div
                                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-black shrink-0"
                                style={{ background: "linear-gradient(135deg, #00E5CC, #00B5A0)" }}
                            >
                                {name.trim()[0].toUpperCase()}
                            </div>
                            <div>
                                <p className="text-xs font-black opacity-90">
                                    {name.trim()}, OG Founder
                                </p>
                                <p className="text-[10px] opacity-35 font-medium">
                                    Will appear in the Founder Hall
                                </p>
                            </div>
                            <Shield size={14} color="#00E5CC" className="ml-auto shrink-0 opacity-60" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* CTA */}
            <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileTap={{ scale: 0.97 }}
                onClick={submit}
                className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2.5"
                style={{
                    background:  name.trim()
                        ? "linear-gradient(135deg, #00E5CC 0%, #00B5A0 100%)"
                        : "rgba(255,255,255,0.07)",
                    color:       name.trim() ? "#000" : "rgba(255,255,255,0.3)",
                    boxShadow:   name.trim() ? "0 0 30px rgba(0,229,204,0.3), 0 6px 20px rgba(0,0,0,0.4)" : "none",
                    touchAction: "manipulation",
                    transition:  "all 0.25s",
                }}
            >
                Continue <ChevronRight size={16} />
            </motion.button>

            <p className="text-center text-[10px] opacity-15 font-medium mt-5">
                We never share your name. View our&nbsp;
                <span className="underline underline-offset-2 cursor-pointer">Privacy Policy</span>.
            </p>
        </motion.div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function JoinPage() {
    const { data: session }  = useSession();
    const router              = useRouter();
    const { parts, expired }  = useCountdown();
    const [step, setStep]     = useState<"name" | "pricing">("name");
    const [userName, setUserName] = useState("");
    const [loadingPlan, setLoadingPlan] = useState<"monthly" | "annual" | null>(null);
    const [showPWA, setShowPWA]    = useState(false);
    const [pwaDismissed, setPwaDismissed] = useState(false);

    // Restore state from sessionStorage on mount
    useEffect(() => {
        try {
            const savedName = sessionStorage.getItem("mw_join_name");
            const dismissed = localStorage.getItem("mw_pwa_dismissed");
            if (savedName) {
                setUserName(savedName);
                setStep("pricing");
            }
            if (dismissed) setPwaDismissed(true);
        } catch {}
    }, []);

    // Show PWA banner after 2.5 s (only if not dismissed before)
    useEffect(() => {
        if (pwaDismissed) return;
        // Only show on mobile-ish screens
        if (typeof window === "undefined") return;
        const isMobile = window.innerWidth < 768;
        if (!isMobile) return;
        const id = setTimeout(() => setShowPWA(true), 2500);
        return () => clearTimeout(id);
    }, [pwaDismissed]);

    const handleNameContinue = (name: string) => {
        setUserName(name);
        setStep("pricing");
    };

    const dismissPWA = () => {
        setShowPWA(false);
        try { localStorage.setItem("mw_pwa_dismissed", "1"); } catch {}
    };

    const checkout = async (plan: "monthly" | "annual") => {
        plan === "annual" ? hapticHeavy() : hapticMedium();
        if (!session) {
            try { sessionStorage.setItem("mw_join_plan", plan); } catch {}
            signIn("google", { callbackUrl: "/auth-redirect" });
            return;
        }

        setLoadingPlan(plan);
        try {
            const res = await fetch("/api/checkout", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    email: session.user?.email,
                    name:  userName || session.user?.name,
                    plan,
                }),
            });
            const { url, error } = await res.json();
            if (url)   window.location.href = url;
            if (error) setLoadingPlan(null);
        } catch {
            setLoadingPlan(null);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{ background: "#060606", color: "#fff" }}
        >
            {/* ── Atmospheric layers ─────────────────────────────────── */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    background: [
                        "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,229,204,0.07) 0%, transparent 55%)",
                        "radial-gradient(ellipse 55% 35% at 100% 100%, rgba(255,215,0,0.055) 0%, transparent 50%)",
                        "radial-gradient(ellipse 40% 30% at 0% 70%, rgba(0,229,204,0.03) 0%, transparent 50%)",
                    ].join(","),
                }}
            />
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-[0.018]"
                style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }}
            />

            {/* ── Page content ──────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {step === "name" ? (
                    <NameStep key="name" onContinue={handleNameContinue} />
                ) : (
                    <motion.div
                        key="pricing"
                        initial={{ opacity: 0, x: 24 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -24 }}
                        transition={{ duration: 0.35 }}
                        className="relative z-10 w-full max-w-sm mx-auto px-5 pt-12 pb-28"
                    >
                        {/* Step indicator + Back */}
                        <div className="flex items-center justify-between mb-10">
                            <button
                                onClick={() => setStep("name")}
                                className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-25 hover:opacity-55 transition-opacity"
                            >
                                <ArrowLeft size={13} /> Back
                            </button>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-2 h-2 rounded-full opacity-25"
                                    style={{ background: "rgba(255,255,255,0.4)" }}
                                />
                                <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: "#FFD700", boxShadow: "0 0 8px #FFD700" }}
                                />
                            </div>
                        </div>

                        {/* ── Eyebrow + greeting ─────────────────────────────── */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45 }}
                            className="mb-7"
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-25 mb-3">
                                Savage Pro
                            </p>
                            <h1
                                className="text-[46px] font-black uppercase leading-[0.88]"
                                style={{
                                    fontFamily:    "var(--font-archivo-black), sans-serif",
                                    letterSpacing: "-0.04em",
                                }}
                            >
                                {userName ? (
                                    <>
                                        Welcome,{" "}
                                        <span
                                            style={{
                                                color:      "#00E5CC",
                                                textShadow: "0 0 50px rgba(0,229,204,0.45)",
                                            }}
                                        >
                                            {userName}
                                        </span>
                                        .
                                    </>
                                ) : (
                                    <>
                                        Join The{" "}
                                        <span
                                            style={{
                                                color:      "#00E5CC",
                                                textShadow: "0 0 50px rgba(0,229,204,0.45)",
                                            }}
                                        >
                                            Savage
                                        </span>{" "}
                                        Elite
                                    </>
                                )}
                            </h1>
                            <p className="text-sm opacity-35 mt-3 leading-relaxed">
                                7-day free trial on all plans.<br />
                                Cancel any time — no questions asked.
                            </p>
                        </motion.div>

                        {/* ── Founder slots bar ─────────────────────────────── */}
                        <FounderSlotsBar />

                        {/* ── Founder badges ────────────────────────────────── */}
                        <FounderBadges />

                        {/* ── Countdown timer ───────────────────────────────── */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="rounded-2xl p-4 mb-6"
                            style={{
                                background: "rgba(255,215,0,0.06)",
                                border:     "1px solid rgba(255,215,0,0.18)",
                            }}
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-50 text-center mb-3">
                                {expired ? "Offer Extended" : "Founder Pricing Ends In"}
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <ClockSeg value={parts.h} label="hrs" />
                                <span className="text-2xl font-black opacity-40 pb-3">:</span>
                                <ClockSeg value={parts.m} label="min" />
                                <span className="text-2xl font-black opacity-40 pb-3">:</span>
                                <ClockSeg value={parts.s} label="sec" />
                            </div>
                            <p className="text-center text-[10px] opacity-30 font-medium mt-3">
                                After this, annual pricing rises to $149/yr
                            </p>
                        </motion.div>

                        {/* ── Pricing cards ─────────────────────────────────── */}
                        <div className="flex flex-col gap-4 mb-8">

                            {/* Founder Annual — featured */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="relative rounded-[28px] p-6"
                                style={{
                                    background: "linear-gradient(135deg, rgba(255,215,0,0.10) 0%, rgba(255,165,0,0.04) 100%)",
                                    border:     "1px solid rgba(255,215,0,0.28)",
                                    boxShadow:  "0 0 50px rgba(255,215,0,0.08)",
                                }}
                            >
                                {/* Best Value badge */}
                                <div
                                    className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap"
                                    style={{ background: "#FFD700", color: "#000" }}
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
                                                className="text-5xl font-black"
                                                style={{
                                                    fontFamily: "var(--font-archivo-black)",
                                                    color:      "#FFD700",
                                                    textShadow: "0 0 30px rgba(255,215,0,0.4)",
                                                }}
                                            >
                                                {ANNUAL_PRICE}
                                            </span>
                                            <span className="text-sm opacity-40 font-medium">/ yr</span>
                                        </div>
                                        <p className="text-xs opacity-45 mt-1 font-medium">
                                            {ANNUAL_MONTHLY}/mo · Founder pricing, locked forever
                                        </p>
                                    </div>
                                    <Crown size={28} color="#FFD700" fill="rgba(255,215,0,0.25)" className="mt-1 shrink-0" />
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => checkout("annual")}
                                    disabled={loadingPlan === "annual"}
                                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-55"
                                    style={{
                                        background:  "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                                        boxShadow:   "0 0 35px rgba(255,215,0,0.35), 0 6px 20px rgba(0,0,0,0.4)",
                                        touchAction: "manipulation",
                                    }}
                                >
                                    {loadingPlan === "annual"
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <><Crown size={15} fill="currentColor" /> Lock In Founder Rate</>
                                    }
                                </motion.button>
                            </motion.div>

                            {/* Savage Monthly */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="rounded-[28px] p-6"
                                style={{
                                    background: "rgba(0,229,204,0.05)",
                                    border:     "1px solid rgba(0,229,204,0.18)",
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
                                                style={{
                                                    fontFamily: "var(--font-archivo-black)",
                                                    color:      "#00E5CC",
                                                }}
                                            >
                                                {MONTHLY_PRICE}
                                            </span>
                                            <span className="text-sm opacity-40 font-medium">/ mo</span>
                                        </div>
                                        <p className="text-xs opacity-35 mt-1 font-medium">
                                            Billed monthly after free trial
                                        </p>
                                    </div>
                                    <Zap size={24} color="#00E5CC" fill="rgba(0,229,204,0.2)" className="mt-1 shrink-0" />
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => checkout("monthly")}
                                    disabled={loadingPlan === "monthly"}
                                    className="w-full py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-55"
                                    style={{
                                        background:  "linear-gradient(135deg, #00E5CC 0%, #00B5A0 100%)",
                                        boxShadow:   "0 0 25px rgba(0,229,204,0.28)",
                                        touchAction: "manipulation",
                                    }}
                                >
                                    {loadingPlan === "monthly"
                                        ? <Loader2 size={16} className="animate-spin" />
                                        : <><Zap size={15} fill="currentColor" /> Start 7-Day Free Trial</>
                                    }
                                </motion.button>
                            </motion.div>
                        </div>

                        {/* ── Feature list ──────────────────────────────────── */}
                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                            className="mb-6"
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-25 mb-4 text-center">
                                Everything Included
                            </p>
                            <div className="flex flex-col gap-3">
                                {FEATURES.map(({ icon: Icon, text }) => (
                                    <motion.div
                                        key={text}
                                        variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }}
                                        className="flex items-center gap-3.5"
                                    >
                                        <CheckCircle2 size={15} color="#00E5CC" className="shrink-0" />
                                        <span className="text-[13px] opacity-60 font-medium">{text}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>

                        {/* ── Social proof ──────────────────────────────────── */}
                        <div
                            className="rounded-2xl p-4 mb-6 flex items-center gap-4"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                border:     "1px solid rgba(255,255,255,0.07)",
                            }}
                        >
                            <div className="flex -space-x-2">
                                {["#e74c3c", "#3498db", "#2ecc71", "#f39c12"].map((c, i) => (
                                    <div
                                        key={i}
                                        className="w-8 h-8 rounded-full border-2 border-[#060606] flex items-center justify-center text-xs font-black text-black"
                                        style={{ background: c, zIndex: 4 - i }}
                                    >
                                        {["S", "A", "M", "K"][i]}
                                    </div>
                                ))}
                            </div>
                            <div>
                                <p className="text-xs font-bold opacity-80">2,400+ savages training</p>
                                <p className="text-[10px] opacity-35 font-medium">Join this week&apos;s cohort</p>
                            </div>
                        </div>

                        <p className="text-center text-[10px] opacity-15 font-medium leading-relaxed">
                            Secured by Stripe · No hidden fees · Cancel in 2 taps
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── PWA Install banner ─────────────────────────────────── */}
            <AnimatePresence>
                {showPWA && !pwaDismissed && (
                    <PWAInstallBanner onDismiss={dismissPWA} />
                )}
            </AnimatePresence>
        </div>
    );
}
