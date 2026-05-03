"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { Zap, ChevronRight, Dumbbell, Home, Trophy, Building2 } from 'lucide-react';
import { saveProfile, loadProfile, type Goal, type FocusArea, type ExperienceLevel } from '@/utils/missionGenerator';

interface WelcomeOverlayProps {
    isVisible: boolean;
    onEnter:   () => void;
}

type Step = 'splash' | 'goal' | 'equipment' | 'level' | 'scan' | 'email';

const CYAN = '#00FFFF';
const SCAN_DURATION = 4000; // ms

// ── Step data ─────────────────────────────────────────────────────────────────
const GOALS: { value: Goal; label: string; sub: string; icon: string }[] = [
    { value: 'MASS',  label: 'Build Mass',   sub: 'Hypertrophy & size',        icon: '💪' },
    { value: 'SHRED', label: 'Shred',        sub: 'Fat loss & conditioning',    icon: '🔥' },
    { value: 'POWER', label: 'Build Power',  sub: 'Strength & explosiveness',   icon: '⚡' },
];

const LEVELS: { value: ExperienceLevel; label: string; sub: string }[] = [
    { value: 'BEGINNER',     label: 'Beginner',     sub: 'Under 1 year training'   },
    { value: 'INTERMEDIATE', label: 'Intermediate', sub: '1–3 years of lifting'    },
    { value: 'ADVANCED',     label: 'Advanced',     sub: '3+ years, serious lifter' },
];

// ── Stepper dots ──────────────────────────────────────────────────────────────
const STEPS: Step[] = ['goal', 'equipment', 'level', 'scan', 'email'];

function StepDots({ current }: { current: Step }) {
    const idx = STEPS.indexOf(current);
    return (
        <div className="flex items-center gap-1.5 mb-6">
            {STEPS.map((s, i) => (
                <motion.div
                    key={s}
                    animate={{ width: i === idx ? 20 : 6, opacity: i <= idx ? 1 : 0.25 }}
                    transition={{ duration: 0.3 }}
                    className="h-1.5 rounded-full"
                    style={{ background: CYAN }}
                />
            ))}
        </div>
    );
}

// ── Inline Biometric Scan (onboarding step) ────────────────────────────────
function ScanStep({ onComplete }: { onComplete: () => void }) {
    const [progress,  setProgress]  = useState(0);
    const [phase,     setPhase]     = useState<'scanning' | 'confirmed'>('scanning');
    const startRef = useRef<number | null>(null);
    const rafRef   = useRef<number | null>(null);
    const hapticRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        startRef.current = performance.now();

        // Haptic pulse every 1 second during scan
        hapticRef.current = setInterval(() => {
            navigator.vibrate?.([30]);
        }, 1000);

        const tick = (now: number) => {
            const elapsed = now - (startRef.current ?? now);
            const pct     = Math.min(100, Math.round((elapsed / SCAN_DURATION) * 100));
            setProgress(pct);
            if (pct < 100) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                clearInterval(hapticRef.current!);
                navigator.vibrate?.([50, 30, 80]); // confirmation burst
                setPhase('confirmed');
                setTimeout(onComplete, 1200);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (hapticRef.current) clearInterval(hapticRef.current);
        };
    }, [onComplete]);

    return (
        <motion.div
            key="scan"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 flex flex-col items-center px-6 max-w-xs w-full"
        >
            <StepDots current="scan" />

            <p className="text-[9px] font-black uppercase tracking-[0.55em] opacity-30 mb-2">
                Biometric Analysis
            </p>
            <h2
                className="text-2xl font-black uppercase leading-tight mb-8 text-center"
                style={{ fontFamily: 'var(--font-archivo-black), sans-serif', letterSpacing: '-0.03em', color: CYAN }}
            >
                {phase === 'confirmed' ? 'Profile Locked In' : 'Scanning Your Profile'}
            </h2>

            {/* Scan circle */}
            <div className="relative w-52 h-52 mb-10">

                {/* Outer pulse ring */}
                <motion.div
                    className="absolute inset-[-12px] rounded-full pointer-events-none"
                    animate={{ scale: [1, 1.06, 1], opacity: [0.08, 0.2, 0.08] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ border: `1px solid ${CYAN}` }}
                />

                {/* Circle bg */}
                <div
                    className="absolute inset-0 rounded-full overflow-hidden"
                    style={{ border: `1.5px solid ${CYAN}30`, background: `${CYAN}04` }}
                />

                {/* Inner glow ring */}
                <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ boxShadow: `inset 0 0 32px ${CYAN}12, 0 0 0 1px ${CYAN}20, 0 0 24px ${CYAN}15` }}
                />

                {/* Pulsing middle ring */}
                <motion.div
                    className="absolute inset-4 rounded-full pointer-events-none"
                    animate={{ scale: [1, 1.04, 1], opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ border: `1px solid ${CYAN}60` }}
                />

                {/* Corner brackets */}
                {[
                    { top: -2,    left:  -2,  borderTop: `2.5px solid ${CYAN}`, borderLeft:  `2.5px solid ${CYAN}`, borderRadius: '14px 0 0 0' },
                    { top: -2,    right: -2,  borderTop: `2.5px solid ${CYAN}`, borderRight: `2.5px solid ${CYAN}`, borderRadius: '0 14px 0 0' },
                    { bottom: -2, left:  -2,  borderBottom: `2.5px solid ${CYAN}`, borderLeft:  `2.5px solid ${CYAN}`, borderRadius: '0 0 0 14px' },
                    { bottom: -2, right: -2,  borderBottom: `2.5px solid ${CYAN}`, borderRight: `2.5px solid ${CYAN}`, borderRadius: '0 0 14px 0' },
                ].map((s, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-7 h-7 pointer-events-none"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.3 }}
                        style={{ ...s, filter: `drop-shadow(0 0 6px ${CYAN})` }}
                    />
                ))}

                {/* Scan line */}
                {phase === 'scanning' && (
                    <motion.div
                        className="absolute inset-x-0 pointer-events-none overflow-hidden rounded-full"
                        style={{ top: `${progress}%`, height: '2px' }}
                    >
                        <div
                            className="w-full h-full"
                            style={{
                                background: `linear-gradient(90deg, transparent 0%, ${CYAN}50 15%, #fff 48%, ${CYAN} 50%, #fff 52%, ${CYAN}50 85%, transparent 100%)`,
                                boxShadow:  `0 0 12px 3px ${CYAN}, 0 0 24px 6px ${CYAN}60, 0 0 2px #fff`,
                                filter:     'blur(0.3px)',
                            }}
                        />
                    </motion.div>
                )}

                {/* Confirmed checkmark */}
                <AnimatePresence>
                    {phase === 'confirmed' && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                            <div
                                className="rounded-full flex items-center justify-center"
                                style={{
                                    width: 70, height: 70,
                                    background: `${CYAN}15`,
                                    border: `2px solid ${CYAN}`,
                                    boxShadow: `0 0 40px ${CYAN}70, 0 0 80px ${CYAN}30`,
                                }}
                            >
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                                    <motion.path
                                        d="M5 12l5 5L19 7"
                                        stroke={CYAN}
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </svg>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Status */}
            <motion.p
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-[10px] font-black uppercase tracking-[0.55em] mb-3"
                style={{ color: CYAN, textShadow: `0 0 12px ${CYAN}` }}
            >
                {phase === 'confirmed' ? 'Identity Confirmed' : 'Analyzing Biometrics'}
            </motion.p>

            {/* Progress bar */}
            <div className="w-full rounded-full overflow-hidden" style={{ height: '2px', background: `${CYAN}12` }}>
                <div
                    className="h-full rounded-full transition-all duration-75"
                    style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${CYAN}80, ${CYAN})`,
                        boxShadow: `0 0 8px ${CYAN}, 0 0 2px #fff`,
                    }}
                />
            </div>

            {/* Percentage */}
            <p
                className="mt-3 font-black tabular-nums leading-none"
                style={{
                    fontFamily: 'var(--font-archivo-black), sans-serif',
                    fontSize: '2rem',
                    color: CYAN,
                    textShadow: `0 0 20px ${CYAN}80`,
                    opacity: phase === 'confirmed' ? 0 : 1,
                    transition: 'opacity 0.3s',
                }}
            >
                {String(progress).padStart(3, '\u2007')}
                <span className="text-base opacity-40">%</span>
            </p>

            {/* HUD side labels */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 flex flex-col gap-2.5 pointer-events-none">
                {['FACE·ID', 'DEPTH', 'NEURAL'].map((label, i) => (
                    <motion.p
                        key={label}
                        animate={{ opacity: [0.12, 0.45, 0.12] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5 }}
                        className="text-[7px] font-black uppercase tracking-[0.4em]"
                        style={{ color: CYAN }}
                    >
                        {label}
                    </motion.p>
                ))}
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 right-0 flex flex-col gap-2.5 pointer-events-none items-end">
                {['BIO', 'ID', 'SECURE'].map((label, i) => (
                    <motion.p
                        key={label}
                        animate={{ opacity: [0.12, 0.4, 0.12] }}
                        transition={{ duration: 1.8, repeat: Infinity, delay: 0.8 + i * 0.5 }}
                        className="text-[7px] font-black uppercase tracking-[0.4em]"
                        style={{ color: CYAN }}
                    >
                        {label}
                    </motion.p>
                ))}
            </div>
        </motion.div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function WelcomeOverlay({ isVisible, onEnter }: WelcomeOverlayProps) {
    const { theme } = useTheme();

    const [step,      setStep]      = useState<Step>('splash');
    const [goal,      setGoal]      = useState<Goal | null>(null);
    const [equipment, setEquipment] = useState<'GYM' | 'HOME' | null>(null);
    const [level,     setLevel]     = useState<ExperienceLevel | null>(null);
    const [email,     setEmail]     = useState('');
    const [saving,    setSaving]    = useState(false);

    // Skip onboarding if profile already saved
    const profileDone = typeof window !== 'undefined' && !!loadProfile();

    const handleSplashEnter = () => {
        if (profileDone) { onEnter(); return; }
        setStep('goal');
    };

    const handleEmailSubmit = async () => {
        if (!goal || !equipment || !level) return;
        if (!email.includes('@')) return; // hard gate — email required
        setSaving(true);
        // Save profile locally
        saveProfile({ goal, focusArea: equipment === 'HOME' ? 'FULL' : 'FULL', level });
        // Optionally submit email to waitlist
        if (email) {
            try {
                await fetch('/api/waitlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
            } catch {}
        }
        setSaving(false);
        try { localStorage.setItem('mw_onboarded', '1'); } catch {}
        onEnter();
    };

    const accent = theme.accent;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#060606] overflow-hidden"
                >
                    {/* Ambient glow */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{ background: `radial-gradient(circle at center, ${accent}12 0%, transparent 65%)` }}
                    />

                    {/* Grid texture */}
                    <div
                        className="absolute inset-0 pointer-events-none opacity-[0.022]"
                        style={{
                            backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
                            backgroundSize: '80px 80px',
                        }}
                    />

                    <AnimatePresence mode="wait">

                        {/* ══ SPLASH ════════════════════════════════════════ */}
                        {step === 'splash' && (
                            <motion.div
                                key="splash"
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -24 }}
                                transition={{ duration: 0.4 }}
                                className="relative z-10 flex flex-col items-center text-center px-8 max-w-md"
                            >
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 18 }}
                                    className="text-[140px] font-black italic leading-none select-none mb-0"
                                    style={{
                                        color:      accent,
                                        fontFamily: 'var(--font-archivo-black), sans-serif',
                                        textShadow: `0 0 80px ${accent}40`,
                                    }}
                                >
                                    W
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    className="space-y-5"
                                >
                                    <div>
                                        <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-3">
                                            MR. WORKOUT
                                        </h1>
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="h-px w-8 bg-white/20" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/35">
                                                The Clinic Awaits
                                            </span>
                                            <div className="h-px w-8 bg-white/20" />
                                        </div>
                                    </div>

                                    <p className="text-sm text-white/40 font-medium leading-relaxed">
                                        Forge your body. Master the routine.<br />No shortcuts. Just Savage execution.
                                    </p>

                                    <motion.button
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleSplashEnter}
                                        className="flex items-center gap-3 px-12 py-5 rounded-[24px] mx-auto font-black uppercase italic tracking-tighter text-xl text-black"
                                        style={{
                                            background:  accent,
                                            boxShadow:   `0 0 40px ${accent}50`,
                                            touchAction: 'manipulation',
                                        }}
                                    >
                                        {profileDone ? 'Enter The Clinic' : "Let's Begin"}
                                        <ChevronRight size={22} />
                                    </motion.button>

                                    <div className="flex items-center justify-center gap-2 text-white/20 mt-4">
                                        <Zap size={12} fill="currentColor" />
                                        <span className="text-[9px] uppercase font-bold tracking-[0.5em]">System Status: Savage</span>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}

                        {/* ══ GOAL ══════════════════════════════════════════ */}
                        {step === 'goal' && (
                            <motion.div
                                key="goal"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ duration: 0.32 }}
                                className="relative z-10 flex flex-col px-6 max-w-sm w-full"
                            >
                                <StepDots current="goal" />
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30 mb-1">Step 1 of 4</p>
                                <h2
                                    className="text-3xl font-black uppercase leading-tight mb-1"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', letterSpacing: '-0.03em' }}
                                >
                                    What's your <span style={{ color: accent }}>mission?</span>
                                </h2>
                                <p className="text-xs opacity-30 font-medium mb-6">
                                    Your daily workouts are built around this goal.
                                </p>

                                <div className="flex flex-col gap-3 mb-8">
                                    {GOALS.map(g => (
                                        <motion.button
                                            key={g.value}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setGoal(g.value)}
                                            className="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left"
                                            style={{
                                                background:  goal === g.value ? `${accent}15` : 'rgba(255,255,255,0.03)',
                                                borderColor: goal === g.value ? accent : 'rgba(255,255,255,0.08)',
                                                boxShadow:   goal === g.value ? `0 0 20px ${accent}20` : 'none',
                                                touchAction: 'manipulation',
                                            }}
                                        >
                                            <span className="text-2xl">{g.icon}</span>
                                            <div className="flex-1">
                                                <p className="font-black text-sm uppercase tracking-tight">{g.label}</p>
                                                <p className="text-[10px] opacity-40 mt-0.5">{g.sub}</p>
                                            </div>
                                            {goal === g.value && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ background: accent }}
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-black" />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => goal && setStep('equipment')}
                                    disabled={!goal}
                                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2 transition-opacity"
                                    style={{
                                        background:  goal ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : 'rgba(255,255,255,0.1)',
                                        opacity:     goal ? 1 : 0.35,
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    Continue <ChevronRight size={15} />
                                </motion.button>
                            </motion.div>
                        )}

                        {/* ══ EQUIPMENT ═════════════════════════════════════ */}
                        {step === 'equipment' && (
                            <motion.div
                                key="equipment"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ duration: 0.32 }}
                                className="relative z-10 flex flex-col px-6 max-w-sm w-full"
                            >
                                <StepDots current="equipment" />
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30 mb-1">Step 2 of 4</p>
                                <h2
                                    className="text-3xl font-black uppercase leading-tight mb-1"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', letterSpacing: '-0.03em' }}
                                >
                                    Where do you <span style={{ color: accent }}>train?</span>
                                </h2>
                                <p className="text-xs opacity-30 font-medium mb-6">
                                    This filters your exercise library.
                                </p>

                                <div className="flex flex-col gap-3 mb-8">
                                    {([
                                        { value: 'GYM',  label: 'Full Gym',    sub: 'Barbells, cables, machines',    Icon: Building2 },
                                        { value: 'HOME', label: 'Home / Minimal', sub: 'Dumbbells & bodyweight only', Icon: Home },
                                    ] as const).map(({ value, label, sub, Icon }) => (
                                        <motion.button
                                            key={value}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setEquipment(value)}
                                            className="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left"
                                            style={{
                                                background:  equipment === value ? `${accent}15` : 'rgba(255,255,255,0.03)',
                                                borderColor: equipment === value ? accent : 'rgba(255,255,255,0.08)',
                                                boxShadow:   equipment === value ? `0 0 20px ${accent}20` : 'none',
                                                touchAction: 'manipulation',
                                            }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: equipment === value ? `${accent}20` : 'rgba(255,255,255,0.06)' }}
                                            >
                                                <Icon size={18} style={{ color: equipment === value ? accent : 'rgba(255,255,255,0.4)' }} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-black text-sm uppercase tracking-tight">{label}</p>
                                                <p className="text-[10px] opacity-40 mt-0.5">{sub}</p>
                                            </div>
                                            {equipment === value && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ background: accent }}
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-black" />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('goal')}
                                        className="px-5 py-4 rounded-2xl font-black uppercase text-xs tracking-widest opacity-40 hover:opacity-70 transition-opacity"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}
                                    >
                                        ← Back
                                    </button>
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => equipment && setStep('level')}
                                        disabled={!equipment}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2 transition-opacity"
                                        style={{
                                            background:  equipment ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : 'rgba(255,255,255,0.1)',
                                            opacity:     equipment ? 1 : 0.35,
                                            touchAction: 'manipulation',
                                        }}
                                    >
                                        Continue <ChevronRight size={15} />
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        {/* ══ LEVEL ═════════════════════════════════════════ */}
                        {step === 'level' && (
                            <motion.div
                                key="level"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ duration: 0.32 }}
                                className="relative z-10 flex flex-col px-6 max-w-sm w-full"
                            >
                                <StepDots current="level" />
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30 mb-1">Step 3 of 4</p>
                                <h2
                                    className="text-3xl font-black uppercase leading-tight mb-1"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', letterSpacing: '-0.03em' }}
                                >
                                    Your <span style={{ color: accent }}>level?</span>
                                </h2>
                                <p className="text-xs opacity-30 font-medium mb-6">
                                    We'll calibrate intensity to match your experience.
                                </p>

                                <div className="flex flex-col gap-3 mb-8">
                                    {LEVELS.map(l => (
                                        <motion.button
                                            key={l.value}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setLevel(l.value)}
                                            className="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all text-left"
                                            style={{
                                                background:  level === l.value ? `${accent}15` : 'rgba(255,255,255,0.03)',
                                                borderColor: level === l.value ? accent : 'rgba(255,255,255,0.08)',
                                                boxShadow:   level === l.value ? `0 0 20px ${accent}20` : 'none',
                                                touchAction: 'manipulation',
                                            }}
                                        >
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ background: level === l.value ? `${accent}20` : 'rgba(255,255,255,0.06)' }}
                                            >
                                                <Trophy size={16} style={{ color: level === l.value ? accent : 'rgba(255,255,255,0.35)' }} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-black text-sm uppercase tracking-tight">{l.label}</p>
                                                <p className="text-[10px] opacity-40 mt-0.5">{l.sub}</p>
                                            </div>
                                            {level === l.value && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                    style={{ background: accent }}
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-black" />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setStep('equipment')}
                                        className="px-5 py-4 rounded-2xl font-black uppercase text-xs tracking-widest opacity-40 hover:opacity-70 transition-opacity"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}
                                    >
                                        ← Back
                                    </button>
                                    <motion.button
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => level && setStep('scan')}
                                        disabled={!level}
                                        className="flex-1 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2 transition-opacity"
                                        style={{
                                            background:  level ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : 'rgba(255,255,255,0.1)',
                                            opacity:     level ? 1 : 0.35,
                                            touchAction: 'manipulation',
                                        }}
                                    >
                                        Analyze Me <Zap size={14} fill="currentColor" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}

                        {/* ══ SCAN ══════════════════════════════════════════ */}
                        {step === 'scan' && (
                            <ScanStep key="scan" onComplete={() => setStep('email')} />
                        )}

                        {/* ══ EMAIL ═════════════════════════════════════════ */}
                        {step === 'email' && (
                            <motion.div
                                key="email"
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -24 }}
                                transition={{ duration: 0.4 }}
                                className="relative z-10 flex flex-col items-center px-6 max-w-sm w-full text-center"
                            >
                                <StepDots current="email" />

                                {/* Welcome badge */}
                                <motion.div
                                    initial={{ scale: 0.7, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                                    className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-5"
                                    style={{
                                        background: `${accent}15`,
                                        border: `1.5px solid ${accent}40`,
                                        boxShadow: `0 0 40px ${accent}30`,
                                    }}
                                >
                                    <Dumbbell size={28} style={{ color: accent }} />
                                </motion.div>

                                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30 mb-2">Profile Complete</p>
                                <h2
                                    className="text-3xl font-black uppercase leading-tight mb-2"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', letterSpacing: '-0.03em', color: accent }}
                                >
                                    You're In The Clinic
                                </h2>
                                <p className="text-xs opacity-40 font-medium mb-8 leading-relaxed">
                                    Drop your email for exclusive updates and your personalised savage plan.
                                </p>

                                {/* Email input */}
                                <div className="w-full mb-4">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        autoFocus
                                        className="w-full px-5 py-4 rounded-2xl font-medium text-sm bg-white/5 text-white placeholder:opacity-30 outline-none transition-all"
                                        style={{
                                            border: `1px solid ${email.includes('@') ? accent + '60' : 'rgba(255,255,255,0.12)'}`,
                                            boxShadow: email.includes('@') ? `0 0 16px ${accent}20` : 'none',
                                        }}
                                        onKeyDown={e => e.key === 'Enter' && email.includes('@') && handleEmailSubmit()}
                                    />
                                    {email && !email.includes('@') && (
                                        <p className="text-[10px] text-red-400 opacity-70 mt-2 font-medium">Enter a valid email to unlock the dashboard.</p>
                                    )}
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleEmailSubmit}
                                    disabled={saving || !email.includes('@')}
                                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2"
                                    style={{
                                        background:  email.includes('@') ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : 'rgba(255,255,255,0.08)',
                                        boxShadow:   email.includes('@') ? `0 0 32px ${accent}50` : 'none',
                                        color:       email.includes('@') ? '#000' : 'rgba(255,255,255,0.3)',
                                        touchAction: 'manipulation',
                                        opacity:     saving ? 0.7 : 1,
                                        transition:  'all 0.25s ease',
                                    }}
                                >
                                    <Zap size={15} fill="currentColor" />
                                    {saving ? 'Unlocking…' : 'Unlock My Dashboard'}
                                </motion.button>

                                <p className="text-[9px] opacity-20 mt-3 text-center tracking-widest uppercase font-black">
                                    Required to access your CNS data
                                </p>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
