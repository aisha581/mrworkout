"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChevronRight, Zap, Target, Dumbbell,
    CheckCircle2, User, Smartphone, Share2,
} from "lucide-react";
import {
    saveProfile,
    loadProfile,
    type Goal,
    type FocusArea,
    type ExperienceLevel,
} from "@/utils/missionGenerator";
import { useTheme } from "@/contexts/ThemeContext";
import { hapticLight, hapticMedium } from "@/utils/haptic";

// ── Data ──────────────────────────────────────────────────────────────────────

const GOALS: { value: Goal; label: string; sub: string; emoji: string }[] = [
    { value: "MASS",  label: "Build Mass",   sub: "Hypertrophy & size",       emoji: "💪" },
    { value: "SHRED", label: "Get Shredded", sub: "Fat loss & conditioning",  emoji: "🔥" },
    { value: "POWER", label: "Get Strong",   sub: "Strength & explosiveness", emoji: "⚡" },
];

const FOCUS: { value: FocusArea; label: string; sub: string }[] = [
    { value: "UPPER", label: "Upper Body", sub: "Chest, back, shoulders, arms" },
    { value: "LOWER", label: "Lower Body", sub: "Legs, glutes, core"           },
    { value: "FULL",  label: "Full Body",  sub: "Balanced training"             },
];

const LEVELS: { value: ExperienceLevel; label: string; sub: string }[] = [
    { value: "BEGINNER",     label: "Beginner",     sub: "Less than 1 year of training"    },
    { value: "INTERMEDIATE", label: "Intermediate", sub: "1–3 years of consistent lifting" },
    { value: "ADVANCED",     label: "Advanced",     sub: "3+ years, knows the movements"   },
];

// ── Step dots ─────────────────────────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div
                    key={i}
                    className="transition-all duration-300 rounded-full"
                    style={{
                        width:      i <= current ? "20px" : "6px",
                        height:     "6px",
                        background: i <= current ? "#00E5CC" : "rgba(255,255,255,0.12)",
                    }}
                />
            ))}
        </div>
    );
}

// ── Choice button ──────────────────────────────────────────────────────────────
function ChoiceButton({
    selected, onClick, accent, children,
}: {
    selected: boolean;
    onClick:  () => void;
    accent:   string;
    children: React.ReactNode;
}) {
    return (
        <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { hapticLight(); onClick(); }}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all text-left"
            style={{
                background:  selected ? `${accent}14` : "rgba(255,255,255,0.03)",
                borderColor: selected ? accent         : "rgba(255,255,255,0.08)",
                touchAction: "manipulation",
            }}
        >
            {children}
            {selected && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-3"
                    style={{ background: accent }}
                >
                    <div className="w-2 h-2 rounded-full bg-black" />
                </motion.div>
            )}
        </motion.button>
    );
}

// ── PWA install step ───────────────────────────────────────────────────────────
function PWAInstallStep({ accent, onDone }: { accent: string; onDone: () => void }) {
    const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
    const [installed, setInstalled] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
        else if (/android/.test(ua))      setPlatform("android");
    }, []);

    const handleDone = () => {
        try { localStorage.setItem("mw_pwa_prompted", "true"); } catch {}
        setInstalled(true);
        setTimeout(onDone, 400);
    };

    const steps = platform === "ios"
        ? [
            { icon: Share2,     text: 'Tap the Share icon in Safari' },
            { icon: Smartphone, text: '"Add to Home Screen"'         },
            { icon: CheckCircle2, text: 'Tap "Add" — done!'          },
          ]
        : platform === "android"
        ? [
            { icon: Smartphone,  text: 'Tap the menu (⋮) in Chrome'  },
            { icon: Smartphone,  text: '"Add to Home screen"'         },
            { icon: CheckCircle2, text: 'Tap "Add" — done!'           },
          ]
        : [
            { icon: Smartphone,  text: "Open in Chrome or Safari on your phone" },
            { icon: Smartphone,  text: "Use browser menu → Add to Home Screen"  },
            { icon: CheckCircle2, text: "Opens as a full-screen app"             },
          ];

    return (
        <div className="flex flex-col flex-1">
            <StepDots current={4} total={5} />
            <div className="flex items-center gap-3 mb-2">
                <Smartphone size={20} color={accent} />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
                    Install App
                </p>
            </div>
            <h2
                className="text-3xl font-black uppercase leading-tight mb-1"
                style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
            >
                Add to your <span style={{ color: accent }}>Home Screen</span>
            </h2>
            <p className="text-xs opacity-30 font-medium mb-6">
                Works like a native app — no App Store needed.
            </p>

            <div className="flex flex-col gap-3 flex-1">
                {steps.map(({ icon: Icon, text }, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                        <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${accent}1a` }}
                        >
                            <Icon size={15} color={accent} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-0.5">
                                Step {i + 1}
                            </p>
                            <p className="text-sm font-bold">{text}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-3 mt-6">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDone}
                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2"
                    style={{
                        background:  installed
                            ? "rgba(255,255,255,0.1)"
                            : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                        boxShadow:   installed ? "none" : `0 0 40px ${accent}40`,
                        touchAction: "manipulation",
                        color:       installed ? "#fff" : "#000",
                    }}
                >
                    <CheckCircle2 size={16} />
                    {installed ? "All Set!" : "Done — Let's Train"}
                </motion.button>
                <button
                    onClick={onDone}
                    className="text-center text-xs opacity-25 hover:opacity-50 transition-opacity font-medium"
                >
                    Skip for now
                </button>
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OnboardingPage() {
    const router    = useRouter();
    useTheme(); // keep context alive
    const accent    = "#00E5CC";

    const [step,  setStep]  = useState(0);
    const [name,  setName]  = useState("");
    const [goal,  setGoal]  = useState<Goal | null>(null);
    const [focus, setFocus] = useState<FocusArea | null>(null);
    const [level, setLevel] = useState<ExperienceLevel | null>(null);

    // If already onboarded, skip to home
    useEffect(() => {
        if (loadProfile()) router.replace("/");
    }, [router]);

    const goNext = () => { hapticMedium(); setStep(s => s + 1); };

    const finish = () => {
        if (!goal || !focus || !level) return;
        const displayName = name.trim() || undefined;
        if (displayName) {
            try { localStorage.setItem("mw_display_name", displayName); } catch {}
        }
        saveProfile({ goal, focusArea: focus, level, weeklySchedule: "3x" });
        fetch("/api/user/profile", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
                goal, focusArea: focus, level, weeklySchedule: "3x",
                ...(displayName ? { name: displayName } : {}),
            }),
        }).catch(() => {});
        router.replace("/");
    };

    const slide = {
        initial: { opacity: 0, x: 40  },
        animate: { opacity: 1, x: 0   },
        exit:    { opacity: 0, x: -40 },
    };
    const ease = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as any };

    return (
        <div
            className="fixed inset-0 overflow-hidden flex flex-col"
            style={{ background: "#060606", color: "#fff" }}
        >
            {/* Grid texture */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.022]"
                style={{
                    backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
                    backgroundSize:  "60px 60px",
                }}
            />
            {/* Accent glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `radial-gradient(ellipse 60% 40% at 50% 0%, ${accent}09 0%, transparent 60%)` }}
            />

            <div className="relative z-10 flex-1 flex flex-col max-w-sm mx-auto w-full px-6 pt-14 pb-10 overflow-hidden">
                <AnimatePresence mode="wait">

                    {/* ── Step 0: Splash ───────────────────────────────────── */}
                    {step === 0 && (
                        <motion.div
                            key="splash"
                            variants={slide} initial="initial" animate="animate" exit="exit"
                            transition={ease}
                            className="flex flex-col items-center justify-center flex-1 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1,   opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
                                className="text-[130px] font-black italic leading-none mb-4 select-none"
                                style={{
                                    color:      accent,
                                    fontFamily: "var(--font-archivo-black), sans-serif",
                                    textShadow: `0 0 80px ${accent}40`,
                                }}
                            >
                                W
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0  }}
                                transition={{ delay: 0.4 }}
                                className="space-y-4"
                            >
                                <h1
                                    className="text-4xl font-black uppercase italic tracking-tighter"
                                    style={{ fontFamily: "var(--font-archivo-black), sans-serif" }}
                                >
                                    Mr. Workout
                                </h1>
                                <p className="text-sm text-white/45 font-medium leading-relaxed px-4">
                                    Let's build your personal program.<br />
                                    5 quick questions. 60 seconds.
                                </p>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={goNext}
                                    className="flex items-center gap-3 px-10 py-4 rounded-[20px] font-black uppercase tracking-[0.15em] text-sm text-black mx-auto mt-4"
                                    style={{
                                        background:  `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                        boxShadow:   `0 0 40px ${accent}40`,
                                        touchAction: "manipulation",
                                    }}
                                >
                                    Let's Begin <ChevronRight size={18} />
                                </motion.button>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1 }}
                                className="mt-12 flex items-center gap-2 text-white/15"
                            >
                                <Zap size={12} fill="currentColor" />
                                <span className="text-[10px] uppercase tracking-[0.5em] font-bold">System Status: Savage</span>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* ── Step 1: Name ─────────────────────────────────────── */}
                    {step === 1 && (
                        <motion.div
                            key="name"
                            variants={slide} initial="initial" animate="animate" exit="exit"
                            transition={ease}
                            className="flex flex-col flex-1"
                        >
                            <StepDots current={0} total={5} />
                            <div className="flex items-center gap-3 mb-2">
                                <User size={20} color={accent} />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Identity</p>
                            </div>
                            <h2
                                className="text-3xl font-black uppercase leading-tight mb-1"
                                style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                            >
                                What do we<br /><span style={{ color: accent }}>call you?</span>
                            </h2>
                            <p className="text-xs opacity-30 font-medium mb-6">
                                Your name powers your personal program.
                            </p>

                            <div className="flex flex-col flex-1">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && name.trim()) goNext(); }}
                                    placeholder="Your name or nickname"
                                    autoFocus
                                    maxLength={32}
                                    className="w-full px-5 py-4 rounded-2xl text-base font-bold placeholder:font-medium placeholder:opacity-25 outline-none"
                                    style={{
                                        background:  "rgba(255,255,255,0.05)",
                                        border:      `1px solid ${name.trim() ? accent : "rgba(255,255,255,0.10)"}`,
                                        color:       "#fff",
                                        caretColor:  accent,
                                        transition:  "border-color 0.2s",
                                    }}
                                />
                            </div>

                            <div className="flex flex-col gap-3">
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={goNext}
                                    disabled={!name.trim()}
                                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2 disabled:opacity-30"
                                    style={{
                                        background:  `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                        touchAction: "manipulation",
                                    }}
                                >
                                    Continue <ChevronRight size={16} />
                                </motion.button>
                                <button
                                    onClick={goNext}
                                    className="text-center text-xs opacity-25 hover:opacity-50 transition-opacity font-medium"
                                >
                                    Skip
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ── Step 2: Goal ─────────────────────────────────────── */}
                    {step === 2 && (
                        <motion.div
                            key="goal"
                            variants={slide} initial="initial" animate="animate" exit="exit"
                            transition={ease}
                            className="flex flex-col flex-1"
                        >
                            <StepDots current={1} total={5} />
                            <div className="flex items-center gap-3 mb-2">
                                <Target size={20} color={accent} />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Your Mission</p>
                            </div>
                            <h2
                                className="text-3xl font-black uppercase leading-tight mb-1"
                                style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                            >
                                What's your <span style={{ color: accent }}>goal?</span>
                            </h2>
                            <p className="text-xs opacity-30 font-medium mb-6">
                                Your daily workouts will be calibrated around this.
                            </p>

                            <div className="flex flex-col gap-3 flex-1">
                                {GOALS.map(g => (
                                    <ChoiceButton
                                        key={g.value}
                                        selected={goal === g.value}
                                        onClick={() => setGoal(g.value)}
                                        accent={accent}
                                    >
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-tight">
                                                {g.emoji} {g.label}
                                            </p>
                                            <p className="text-[10px] opacity-40 font-medium mt-0.5">{g.sub}</p>
                                        </div>
                                    </ChoiceButton>
                                ))}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={goNext}
                                disabled={!goal}
                                className="mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2 disabled:opacity-30"
                                style={{
                                    background:  `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                    touchAction: "manipulation",
                                }}
                            >
                                Continue <ChevronRight size={16} />
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ── Step 3: Focus ────────────────────────────────────── */}
                    {step === 3 && (
                        <motion.div
                            key="focus"
                            variants={slide} initial="initial" animate="animate" exit="exit"
                            transition={ease}
                            className="flex flex-col flex-1"
                        >
                            <StepDots current={2} total={5} />
                            <div className="flex items-center gap-3 mb-2">
                                <Dumbbell size={20} color={accent} />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Training Focus</p>
                            </div>
                            <h2
                                className="text-3xl font-black uppercase leading-tight mb-1"
                                style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                            >
                                What do you <span style={{ color: accent }}>train?</span>
                            </h2>
                            <p className="text-xs opacity-30 font-medium mb-6">
                                Exercises will be weighted toward this area.
                            </p>

                            <div className="flex flex-col gap-3 flex-1">
                                {FOCUS.map(f => (
                                    <ChoiceButton
                                        key={f.value}
                                        selected={focus === f.value}
                                        onClick={() => setFocus(f.value)}
                                        accent={accent}
                                    >
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-tight">{f.label}</p>
                                            <p className="text-[10px] opacity-40 font-medium mt-0.5">{f.sub}</p>
                                        </div>
                                    </ChoiceButton>
                                ))}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={goNext}
                                disabled={!focus}
                                className="mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2 disabled:opacity-30"
                                style={{
                                    background:  `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                    touchAction: "manipulation",
                                }}
                            >
                                Continue <ChevronRight size={16} />
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ── Step 4: Level ────────────────────────────────────── */}
                    {step === 4 && (
                        <motion.div
                            key="level"
                            variants={slide} initial="initial" animate="animate" exit="exit"
                            transition={ease}
                            className="flex flex-col flex-1"
                        >
                            <StepDots current={3} total={5} />
                            <div className="flex items-center gap-3 mb-2">
                                <Zap size={20} color={accent} />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Experience</p>
                            </div>
                            <h2
                                className="text-3xl font-black uppercase leading-tight mb-1"
                                style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                            >
                                Your current <span style={{ color: accent }}>level?</span>
                            </h2>
                            <p className="text-xs opacity-30 font-medium mb-6">
                                Be honest — it helps us calibrate intensity.
                            </p>

                            <div className="flex flex-col gap-3 flex-1">
                                {LEVELS.map(l => (
                                    <ChoiceButton
                                        key={l.value}
                                        selected={level === l.value}
                                        onClick={() => setLevel(l.value)}
                                        accent={accent}
                                    >
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-tight">{l.label}</p>
                                            <p className="text-[10px] opacity-40 font-medium mt-0.5">{l.sub}</p>
                                        </div>
                                    </ChoiceButton>
                                ))}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => { if (level) goNext(); }}
                                disabled={!level}
                                className="mt-6 w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2 disabled:opacity-30"
                                style={{
                                    background:  `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                    touchAction: "manipulation",
                                }}
                            >
                                Continue <ChevronRight size={16} />
                            </motion.button>
                        </motion.div>
                    )}

                    {/* ── Step 5: PWA Install ──────────────────────────────── */}
                    {step === 5 && (
                        <motion.div
                            key="pwa"
                            variants={slide} initial="initial" animate="animate" exit="exit"
                            transition={ease}
                            className="flex flex-col flex-1"
                        >
                            <PWAInstallStep accent={accent} onDone={finish} />
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
