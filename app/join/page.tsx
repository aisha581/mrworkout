"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, Crown, Dumbbell, BarChart3, Trophy,
    Flame, CheckCircle2, Loader2, ArrowLeft, Lock,
} from "lucide-react";

// ── Pricing ───────────────────────────────────────────────────────────────────
const MONTHLY_PRICE  = "$14.99";
const ANNUAL_PRICE   = "$99";
const ANNUAL_MONTHLY = "$8.25"; // $99 / 12, rounded up
const ANNUAL_SAVING  = "45%";

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
    { icon: Dumbbell,  text: "All 89 moves — full Armory access"          },
    { icon: Zap,       text: "Custom Routines — build & save any circuit"  },
    { icon: BarChart3, text: "Advanced analytics — volume, PRs, trends"    },
    { icon: Trophy,    text: "Global Leaderboard — compete worldwide"       },
    { icon: Flame,     text: "Streak protection & bonus XP missions"       },
    { icon: Crown,     text: "Exclusive themes — Founder, Gold, Obsidian"  },
];

// ── Countdown hook ─────────────────────────────────────────────────────────────
const DEADLINE_KEY = "mw_founder_deadline";

function useCountdown() {
    const [parts, setParts] = useState({ h: "24", m: "00", s: "00" });
    const [expired, setExpired] = useState(false);

    useEffect(() => {
        // Persist deadline across sessions (resets only once per device)
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
                    initial={changed ? { y: -16, opacity: 0 } : false}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 16, opacity: 0 }}
                    transition={{ duration: 0.18 }}
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

// ── Main page ──────────────────────────────────────────────────────────────────
export default function JoinPage() {
    const { data: session } = useSession();
    const router             = useRouter();
    const { parts, expired } = useCountdown();
    const [loadingPlan, setLoadingPlan] = useState<"monthly" | "annual" | null>(null);

    const checkout = async (plan: "monthly" | "annual") => {
        if (!session) {
            // Store intended plan, redirect to login
            try { sessionStorage.setItem("mw_join_plan", plan); } catch {}
            signIn("google", { callbackUrl: "/auth-redirect" });
            return;
        }

        setLoadingPlan(plan);
        try {
            const res = await fetch("/api/checkout", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email: session.user?.email, plan }),
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
            {/* Atmospheric layers */}
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
            {/* Grid */}
            <div
                className="fixed inset-0 pointer-events-none z-0 opacity-[0.018]"
                style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="relative z-10 w-full max-w-sm mx-auto px-5 pt-12 pb-28">

                {/* Back */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-25 hover:opacity-55 transition-opacity mb-10"
                >
                    <ArrowLeft size={13} /> Back
                </button>

                {/* ── Eyebrow + Hero headline ──────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-25 mb-3">
                        Savage Pro
                    </p>
                    <h1
                        className="text-[52px] font-black uppercase leading-[0.88]"
                        style={{
                            fontFamily:    "var(--font-archivo-black), sans-serif",
                            letterSpacing: "-0.04em",
                        }}
                    >
                        Join The<br />
                        <span
                            style={{
                                color:      "#00E5CC",
                                textShadow: "0 0 50px rgba(0,229,204,0.45)",
                            }}
                        >
                            Savage
                        </span>{" "}
                        Elite
                    </h1>
                    <p className="text-sm opacity-35 mt-3 leading-relaxed">
                        7-day free trial on all plans.<br />
                        Cancel any time — no questions asked.
                    </p>
                </motion.div>

                {/* ── Countdown timer ──────────────────────────────────── */}
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
                        <ClockSeg value={parts.h} label="hrs"  />
                        <span className="text-2xl font-black opacity-40 pb-3">:</span>
                        <ClockSeg value={parts.m} label="min"  />
                        <span className="text-2xl font-black opacity-40 pb-3">:</span>
                        <ClockSeg value={parts.s} label="sec"  />
                    </div>

                    <p className="text-center text-[10px] opacity-30 font-medium mt-3">
                        After this, annual pricing rises to $149/yr
                    </p>
                </motion.div>

                {/* ── Pricing cards ─────────────────────────────────────── */}
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

                {/* ── Feature list ──────────────────────────────────────── */}
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

                {/* ── Social proof ──────────────────────────────────────── */}
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
                        <p className="text-[10px] opacity-35 font-medium">Join this week's cohort</p>
                    </div>
                </div>

                <p className="text-center text-[10px] opacity-15 font-medium leading-relaxed">
                    Secured by Stripe · No hidden fees · Cancel in 2 taps
                </p>
            </div>
        </div>
    );
}
