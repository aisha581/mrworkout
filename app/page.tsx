"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BioMetrics from "@/components/BioMetrics";
import VaultGrid from "@/components/VaultGrid";
import LuxuryCard from "@/components/LuxuryCard";
import Toast from "@/components/Toast";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useWorkout } from "@/contexts/WorkoutContext";
import dynamic from "next/dynamic";

import DailyGoalRing from "@/components/DailyGoalRing";
import FloatingMic from "@/components/FloatingMic";
import MuscleHeatmap from "@/components/MuscleHeatmap";
import SavageTip from "@/components/SavageTip";
import CircuitBuilder from "@/components/CircuitBuilder";
import WorkoutPlayer from "@/components/WorkoutPlayer";
import MissionDrawer from "@/components/MissionDrawer";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import type { LiveExercise } from "@/app/library/page";
import { useCircuit } from "@/contexts/CircuitContext";
import { useRouter } from "next/navigation";
import {
    loadProfile, generateDailyMission,
    type UserProfile,
} from "@/utils/missionGenerator";
import { getUserStats, getRankInfo, recordDailyVisit, type UserStats } from "@/utils/userStats";
import { useIsPro } from "@/hooks/useIsPro";
import { hapticMedium, hapticLight } from "@/utils/haptic";
import BiometricScan, { shouldShowScan } from "@/components/BiometricScan";
import XPBar from "@/components/XPBar";
import { playBriefing } from "@/utils/audio";
import { Zap, ChevronDown, Trophy, Crown, Volume2, Loader2, Smartphone } from "lucide-react";
import { computeCNSScore } from "@/utils/userStats";
import NeuralRecoveryRing from "@/components/NeuralRecoveryRing";
import AddToHomeModal from "@/components/AddToHomeModal";

// Canvas cannot be server-rendered — load only on the client
const MannequinCanvas = dynamic(() => import("@/components/MannequinCanvas"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-[#060606]" />,
});

export default function Home() {
    const { theme }                          = useTheme();
    const { workoutHistory } = useWorkout();
    const { setQueue }                       = useCircuit();
    const router                             = useRouter();

    // ── State ──────────────────────────────────────────────────────────────────
    const [showToast,       setShowToast]       = useState(false);
    const [toastMessage]                        = useState('');
    const [allExercises,    setAllExercises]    = useState<LiveExercise[]>([]);
    const [lastExercise,    setLastExercise]    = useState<LiveExercise | null>(null);
    const [quickStartOpen,  setQuickStartOpen]  = useState(false);
    const [isMissionOpen,   setIsMissionOpen]   = useState(false);
    const [showWelcome,     setShowWelcome]     = useState(false);

    // Profile + generated mission
    const [profile,          setProfile]         = useState<UserProfile | null>(null);
    const [missionExercises, setMissionExercises] = useState<LiveExercise[]>([]);

    // Persistent user stats (XP, streak)
    const [vitals, setVitals] = useState(() => getUserStats());

    // Biometric scan overlay (first-visit only)
    const [showScan,    setShowScan]    = useState(false);
    // Daily briefing button state
    const [briefPlaying, setBriefPlaying] = useState(false);

    // Pro status
    const { isPro } = useIsPro();

    // iOS install modal
    const [showInstallModal, setShowInstallModal] = useState(false);

    // Derived CNS score for card styling
    const cnsScore = computeCNSScore(vitals);

    // ── Library fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const res = await fetch('/api/library');
                if (!res.ok) return;
                const data: LiveExercise[] = await res.json();
                setAllExercises(data);
            } catch {}
        };
        fetchLibrary();
    }, []);

    // ── Load profile + show welcome if first visit ─────────────────────────────
    useEffect(() => {
        const saved = loadProfile();
        if (saved) {
            setProfile(saved);
        } else {
            setShowWelcome(true);
        }
    }, []);

    // ── Re-generate mission whenever profile or exercises change ───────────────
    useEffect(() => {
        if (profile && allExercises.length > 0) {
            setMissionExercises(generateDailyMission(profile, allExercises));
        }
    }, [profile, allExercises]);

    // ── Refresh vitals, record daily visit, check scan flag ──────────────────
    useEffect(() => {
        const updated = recordDailyVisit();
        setVitals(updated);
        setShowScan(shouldShowScan());
    }, []);

    // ── Last exercise from localStorage ───────────────────────────────────────
    useEffect(() => {
        try {
            const raw = localStorage.getItem('mw_last_exercise');
            if (raw) setLastExercise(JSON.parse(raw));
        } catch {}
    }, []);

    // ── Chest pop handler ──────────────────────────────────────────────────────
    const handleChestTap = useCallback(() => {
        navigator.vibrate?.([15, 10, 25]);
        setIsMissionOpen(true);
    }, []);

    // ── Start mission: load queue → navigate to playground ────────────────────
    const handleStartMission = useCallback(() => {
        const exercises = missionExercises.length > 0 ? missionExercises : [];
        if (exercises.length === 0) return;
        setQueue(exercises);
        router.push('/playground');
    }, [missionExercises, setQueue, router]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <AnimatePresence mode="wait">
            <motion.main
                key={theme.mode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                className="min-h-screen relative pb-24 lg:pb-0"
            >
                <Navbar />
                <Sidebar />

                {/* ════════════════════════════════════════════════════════
                    HERO — full-viewport 3D scene
                ════════════════════════════════════════════════════════ */}
                <div className="relative w-full overflow-hidden" style={{ height: '100dvh' }}>

                    {/* Industrial dark floor */}
                    <div className="absolute inset-0 bg-[#060606]" />

                    {/* Accent radial glow behind model */}
                    <div
                        className="absolute inset-0 z-[1] pointer-events-none"
                        style={{ background: `radial-gradient(ellipse 55% 65% at 50% 58%, ${theme.accent}07 0%, transparent 70%)` }}
                    />

                    {/* Industrial grid texture */}
                    <div
                        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.022]"
                        style={{
                            backgroundImage: [
                                'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)',
                                'linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                            ].join(','),
                            backgroundSize: '60px 60px',
                        }}
                    />

                    {/* Neural scan line — sweeps once on page load */}
                    <motion.div
                        className="absolute inset-x-0 z-[3] pointer-events-none"
                        style={{ height: 2 }}
                        initial={{ top: "10%", opacity: 0 }}
                        animate={{ top: ["10%", "90%", "10%"], opacity: [0, 0.7, 0.7, 0] }}
                        transition={{ duration: 3.2, ease: "easeInOut", times: [0, 0.45, 0.9, 1], delay: 0.6 }}
                    >
                        <div
                            className="w-full h-full"
                            style={{
                                background: `linear-gradient(90deg, transparent 0%, ${theme.accent}40 20%, ${theme.accent} 50%, ${theme.accent}40 80%, transparent 100%)`,
                                boxShadow:  `0 0 16px ${theme.accent}, 0 0 40px ${theme.accent}50`,
                            }}
                        />
                    </motion.div>

                    {/* 3D Canvas — chest button is rendered internally via Html portal */}
                    <div className="absolute inset-0 z-[2]">
                        <MannequinCanvas
                            accentColor={theme.accent}
                            onChestTap={handleChestTap}
                        />
                    </div>

                    {/* Bottom gradient fade */}
                    <div
                        className="absolute inset-x-0 bottom-0 h-56 pointer-events-none z-[3]"
                        style={{ background: 'linear-gradient(to top, #060606 0%, transparent 100%)' }}
                    />

                    {/* ── Welcome text — top-left, below navbar ── */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25, duration: 0.7 }}
                        className="absolute z-[10] select-none"
                        style={{ top: '5.5rem', left: 'clamp(1.5rem, 5vw, 7rem)' }}
                    >
                        <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-25 mb-1.5">
                            Ready To Go
                        </p>
                        <h1
                            className="text-5xl lg:text-7xl font-black uppercase leading-[0.92]"
                            style={{
                                letterSpacing: '-0.04em',
                                fontFamily:    'var(--font-archivo-black), sans-serif',
                                textShadow:    theme.mode === 'savage' ? `0 0 50px ${theme.accent}25` : 'none',
                            }}
                        >
                            Welcome<br />
                            <span style={{ color: theme.accent }}>Savage</span>
                        </h1>
                        <p className="text-sm opacity-35 mt-2.5 font-medium tracking-wide">
                            Tap the chest to start your challenge.
                        </p>
                    </motion.div>

                    {/* ── Bottom FABs ─────────────────────────────────────── */}
                    <div
                        className="absolute inset-x-0 z-[10] flex items-end justify-between"
                        style={{
                            bottom:  'calc(max(env(safe-area-inset-bottom, 0px), 20px) + 3.5rem)',
                            padding: '0 clamp(1.5rem, 5vw, 7rem)',
                        }}
                    >
                        {/* Left: phone icon + Today's Mission */}
                        <div className="flex items-center gap-2">
                            <motion.button
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35, type: 'spring', stiffness: 180, damping: 22 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { hapticLight(); setShowInstallModal(true); }}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl backdrop-blur-md"
                                style={{
                                    background:  'rgba(255,255,255,0.05)',
                                    border:      '1px solid rgba(255,255,255,0.08)',
                                    touchAction: 'manipulation',
                                }}
                            >
                                <Smartphone size={14} className="opacity-50" />
                            </motion.button>

                            <motion.button
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, type: 'spring', stiffness: 180, damping: 22 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={async () => {
                                    if (briefPlaying) return;
                                    hapticMedium();
                                    setBriefPlaying(true);
                                    try { await playBriefing(); } catch {}
                                    setBriefPlaying(false);
                                }}
                                disabled={briefPlaying}
                                className="flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest backdrop-blur-md disabled:opacity-50"
                                style={{
                                    background:  'rgba(255,255,255,0.07)',
                                    border:      '1px solid rgba(255,255,255,0.1)',
                                    touchAction: 'manipulation',
                                }}
                            >
                                {briefPlaying
                                    ? <Loader2 size={14} className="animate-spin" />
                                    : <Volume2 size={14} />
                                }
                                {briefPlaying ? 'Loading…' : "Today's Mission"}
                            </motion.button>
                        </div>

                        {/* Right: vertical stack — Upgrade + Quick Start */}
                        <motion.div
                            className="flex flex-col items-end gap-6"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45, type: 'spring', stiffness: 180, damping: 22 }}
                        >
                            {!isPro && (
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => { hapticMedium(); router.push('/join'); }}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-black uppercase tracking-[0.2em] text-xs whitespace-nowrap backdrop-blur-md"
                                    style={{
                                        background:  'rgba(255,215,0,0.10)',
                                        border:      '1px solid rgba(255,215,0,0.35)',
                                        color:       '#FFD700',
                                        boxShadow:   '0 0 20px rgba(255,215,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    <Crown size={12} fill="rgba(255,215,0,0.6)" color="#FFD700" />
                                    Start 7 Days Free
                                </motion.button>
                            )}

                            {lastExercise && (
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => { hapticMedium(); setQuickStartOpen(true); }}
                                    className="flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest"
                                    style={{
                                        background:  `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}bb 100%)`,
                                        color:       '#000',
                                        boxShadow:   `0 0 28px ${theme.accent}50, 0 8px 32px rgba(0,0,0,0.45)`,
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    <Zap size={14} fill="currentColor" />
                                    Quick Start
                                </motion.button>
                            )}
                        </motion.div>
                    </div>

                    {/* ── Vitals strip — bottom-left, above scroll indicator ── */}
                    <VitalsStrip vitals={vitals} accentColor={theme.accent} />

                    {/* Scroll indicator */}
                    <motion.div
                        animate={{ y: [0, 5, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10] pointer-events-none"
                    >
                        <ChevronDown size={18} className="opacity-15" />
                    </motion.div>
                </div>

                {/* ════════════════════════════════════════════════════════
                    SCROLLABLE CONTENT — below the fold
                ════════════════════════════════════════════════════════ */}
                <div
                    className="relative pointer-events-none h-8"
                    style={{ background: 'linear-gradient(to bottom, #060606, transparent)' }}
                />

                <section
                    className="py-12 px-6 sm:px-8 lg:px-24 lg:pl-32"
                    style={{ backgroundColor: theme.bg }}
                >
                    <div className="max-w-[1800px] mx-auto">

                        {/* ── Progress Dashboard ────────────────────────────── */}
                        <ProgressDashboard
                            accentColor={theme.accent}
                            lastExercise={lastExercise}
                            onQuickStart={() => setQuickStartOpen(true)}
                            vitals={vitals}
                        />

                        <CircuitBuilder />

                        {/* ── CNS Neural Recovery ────────────────────────────── */}
                        <div className="mb-12">
                            <motion.div
                                className="relative rounded-[32px] overflow-hidden"
                                animate={{
                                    boxShadow: [
                                        `0 0 30px ${theme.accent}10, 0 0 0 1px ${theme.accent}15`,
                                        `0 0 50px ${theme.accent}20, 0 0 0 1px ${theme.accent}25`,
                                        `0 0 30px ${theme.accent}10, 0 0 0 1px ${theme.accent}15`,
                                    ],
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                style={{
                                    background: 'linear-gradient(135deg, #080808 0%, #0a0a0a 100%)',
                                    border:     `1px solid ${theme.accent}20`,
                                    boxShadow:  `0 0 30px ${theme.accent}10`,
                                }}
                            >
                                {/* Ambient grid */}
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-[0.018]"
                                    style={{
                                        backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                                        backgroundSize:  "32px 32px",
                                    }}
                                />

                                {/* Pulsing mannequin silhouette */}
                                <motion.div
                                    className="absolute right-0 top-0 bottom-0 w-64 pointer-events-none overflow-hidden"
                                    animate={{ opacity: [0.04, 0.08, 0.04] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <svg
                                        viewBox="0 0 200 400"
                                        className="absolute right-[-20px] top-1/2 -translate-y-1/2 h-full"
                                        fill={theme.accent}
                                    >
                                        {/* Head */}
                                        <circle cx="100" cy="48" r="34" />
                                        {/* Neck */}
                                        <rect x="88" y="80" width="24" height="20" rx="4" />
                                        {/* Torso */}
                                        <path d="M55 100 L145 100 L158 220 L42 220 Z" />
                                        {/* Left arm */}
                                        <path d="M55 108 L18 190 Q14 200 20 205 L28 208 Q36 210 40 200 L72 125 Z" />
                                        {/* Right arm */}
                                        <path d="M145 108 L182 190 Q186 200 180 205 L172 208 Q164 210 160 200 L128 125 Z" />
                                        {/* Left leg */}
                                        <path d="M70 218 L58 340 Q56 355 66 358 L80 360 Q90 362 92 348 L98 224 Z" />
                                        {/* Right leg */}
                                        <path d="M130 218 L142 340 Q144 355 134 358 L120 360 Q110 362 108 348 L102 224 Z" />
                                    </svg>
                                </motion.div>

                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ background: `radial-gradient(ellipse 55% 65% at 35% 50%, ${theme.accent}06 0%, transparent 70%)` }}
                                />

                                <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8 px-8 py-10">
                                    {/* Ring */}
                                    <div className="shrink-0 pb-8 md:pb-0">
                                        <NeuralRecoveryRing
                                            accent={theme.accent}
                                            vitals={vitals}
                                        />
                                    </div>

                                    {/* Right panel */}
                                    <div className="flex-1 flex flex-col justify-center gap-5 min-w-0">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.55em] opacity-30 mb-1">
                                                Central Nervous System
                                            </p>
                                            <h3
                                                className="text-3xl font-black uppercase leading-tight"
                                                style={{
                                                    fontFamily:    'var(--font-archivo-black), sans-serif',
                                                    color:         theme.accent,
                                                    textShadow:    `0 0 30px ${theme.accent}40`,
                                                    letterSpacing: '-0.03em',
                                                }}
                                            >
                                                {cnsScore >= 95 ? 'Fully\nRecovered' : 'Neural\nRecovery'}
                                            </h3>
                                        </div>

                                        {/* Metric rows — now using real data */}
                                        {[
                                            { label: "Fatigue Index",   value: `${100 - cnsScore}%` },
                                            { label: "Readiness",       value: `${cnsScore}%` },
                                            { label: "Recovery Window", value: cnsScore >= 95 ? "Full Power" : `${Math.ceil((100 - cnsScore) * 0.24)}h remaining` },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-center justify-between">
                                                <p className="text-[11px] font-black uppercase tracking-widest opacity-35">{label}</p>
                                                <p
                                                    className="text-[11px] font-black uppercase tracking-widest"
                                                    style={{ color: theme.accent }}
                                                >
                                                    {value}
                                                </p>
                                            </div>
                                        ))}

                                        <div className="h-px" style={{ background: `linear-gradient(90deg, ${theme.accent}30, transparent)` }} />

                                        <p className="text-[11px] opacity-25 leading-relaxed">
                                            {cnsScore >= 95
                                                ? 'Your nervous system is primed. This is the window to push maximum intensity.'
                                                : 'Training frequency and recovery fuel your CNS score. The more consistent you are, the stronger your neural pathways become.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                            <div className="h-full">
                                <MuscleHeatmap />
                            </div>
                            <div className="flex flex-col gap-6">
                                <DailyGoalRing progress={73} label="Daily Target" sublabel="5 of 7 Workouts" />
                                <SavageTip delay={0.7} />
                            </div>
                        </div>

                        {/* The Vault */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                        >
                            <h2 className="text-2xl font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
                                The Vault
                            </h2>
                            <VaultGrid dynamicWorkouts={workoutHistory} />
                        </motion.div>

                        {/* Mobile Bio Metrics */}
                        <div className="xl:hidden mt-12">
                            <LuxuryCard className="p-8 rounded-[32px]" delay={0.7}>
                                <h3 className="text-lg font-semibold mb-6" style={{ letterSpacing: '-0.02em' }}>
                                    Today's Metrics
                                </h3>
                                <BioMetrics />
                            </LuxuryCard>
                        </div>

                    </div>
                </section>

                <FloatingMic />
                <Toast
                    message={toastMessage}
                    isVisible={showToast}
                    onClose={() => setShowToast(false)}
                />

                {/* ── Modals ── */}
                {quickStartOpen && lastExercise && (
                    <WorkoutPlayer
                        playlist={[lastExercise]}
                        initialIndex={0}
                        onClose={() => setQuickStartOpen(false)}
                    />
                )}

                {/* Mission Drawer — slides up from chest tap */}
                <MissionDrawer
                    isOpen={isMissionOpen}
                    onClose={() => setIsMissionOpen(false)}
                    goal={profile?.goal ?? null}
                    missionExercises={missionExercises}
                    onStartMission={handleStartMission}
                />

                {/* Welcome / onboarding overlay */}
                <WelcomeOverlay
                    isVisible={showWelcome}
                    onEnter={() => {
                        setShowWelcome(false);
                        setProfile(loadProfile());
                    }}
                />

                {/* Biometric scan — first visit only */}
                {showScan && (
                    <BiometricScan
                        accentColor={theme.accent}
                        onComplete={() => setShowScan(false)}
                    />
                )}

                {/* iOS Add to Home Screen modal */}
                <AddToHomeModal
                    isOpen={showInstallModal}
                    onClose={() => setShowInstallModal(false)}
                    accent={theme.accent}
                />


            </motion.main>

            {/* XP progress bar — fixed to screen bottom */}
            <XPBar xp={vitals.totalXP} accentColor={theme.accent} />

        </AnimatePresence>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Vitals Strip — shown in hero over the 3D mannequin
// ─────────────────────────────────────────────────────────────────────────────
interface VitalsStripProps {
    vitals:      UserStats;
    accentColor: string;
}

function VitalsStrip({ vitals, accentColor }: VitalsStripProps) {
    const rankInfo = getRankInfo(vitals.totalXP);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="absolute z-[10] flex items-center gap-3"
            style={{
                bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 20px) + 3.5rem)',
                left:   'clamp(1.5rem, 5vw, 7rem)',
            }}
        >
            {/* XP pill */}
            <div
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl backdrop-blur-md"
                style={{
                    background: 'rgba(6,6,6,0.55)',
                    border:     '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <Trophy size={13} color="#FFD700" />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: accentColor }}>
                    {vitals.totalXP}
                </span>
                <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">xp · lv{rankInfo.level}</span>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Progress Dashboard — replaces the old DailyChallengeWidget
// ─────────────────────────────────────────────────────────────────────────────
interface ProgressDashboardProps {
    accentColor:   string;
    lastExercise:  any;
    onQuickStart:  () => void;
    vitals:        UserStats;
}

function ProgressDashboard({ accentColor, lastExercise, onQuickStart, vitals }: ProgressDashboardProps) {
    const rankInfo    = getRankInfo(vitals.totalXP);
    const streakDays  = vitals.currentStreak;
    const rankLabel   = rankInfo.levelName;
    const rankPct     = rankInfo.progress;          // already 0-100
    const nextRank    = rankInfo.xpToNext !== null  // null means max rank
        ? (() => {
              const RANK_NAMES = ['Iron','Bronze','Silver','Gold','Platinum','Diamond'];
              return RANK_NAMES[rankInfo.level] ?? 'MAX';
          })()
        : 'MAX';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-10"
        >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                {/* Savage Streak */}
                <div
                    className="rounded-[24px] p-6 flex flex-col justify-between"
                    style={{
                        background: `${accentColor}0a`,
                        border:     `1px solid ${accentColor}22`,
                    }}
                >
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">
                        Savage Streak
                    </p>
                    <div className="flex items-baseline gap-2">
                        <span
                            className="text-6xl font-black leading-none"
                            style={{
                                color:      accentColor,
                                fontFamily: 'var(--font-archivo-black), sans-serif',
                                textShadow: `0 0 30px ${accentColor}50`,
                            }}
                        >
                            {streakDays}
                        </span>
                        <span className="text-xl opacity-40 font-black">days</span>
                    </div>
                    <p className="text-[10px] opacity-25 mt-1 font-medium uppercase tracking-widest">
                        Keep it alive
                    </p>
                </div>

                {/* Iron Rank Progress */}
                <motion.div
                    className="rounded-[20px] p-4 flex flex-col justify-between"
                    animate={rankPct >= 100 ? {
                        boxShadow: [
                            '0 0 16px rgba(255,215,0,0.20), 0 0 0 1px rgba(255,215,0,0.25)',
                            '0 0 32px rgba(255,215,0,0.45), 0 0 0 1px rgba(255,215,0,0.50)',
                            '0 0 16px rgba(255,215,0,0.20), 0 0 0 1px rgba(255,215,0,0.25)',
                        ],
                    } : {}}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        background: rankPct >= 100 ? 'rgba(255,215,0,0.06)' : `${accentColor}0a`,
                        border:     rankPct >= 100 ? '1px solid rgba(255,215,0,0.35)' : `1px solid ${accentColor}22`,
                    }}
                >
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">
                        Iron Rank
                    </p>
                    <div className="mb-2">
                        <div className="flex justify-between items-baseline mb-2">
                            <span
                                className="text-lg font-black uppercase"
                                style={{
                                    color:      rankPct >= 100 ? '#FFD700' : accentColor,
                                    fontFamily: 'var(--font-archivo-black), sans-serif',
                                }}
                            >
                                {rankLabel}
                            </span>
                            <span className="text-[10px] opacity-30 font-black">→ {nextRank}</span>
                        </div>
                        {/* Progress bar with pulse */}
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                            <motion.div
                                className="h-full rounded-full relative"
                                style={{
                                    backgroundColor: rankPct >= 100 ? '#FFD700' : accentColor,
                                    boxShadow: rankPct >= 100
                                        ? '0 0 8px #FFD700, 0 0 16px rgba(255,215,0,0.6)'
                                        : `0 0 6px ${accentColor}80`,
                                }}
                                initial={{ width: 0 }}
                                animate={{
                                    width: `${rankPct}%`,
                                    ...(rankPct >= 100 ? {
                                        boxShadow: [
                                            '0 0 8px #FFD700, 0 0 16px rgba(255,215,0,0.4)',
                                            '0 0 16px #FFD700, 0 0 32px rgba(255,215,0,0.8)',
                                            '0 0 8px #FFD700, 0 0 16px rgba(255,215,0,0.4)',
                                        ]
                                    } : {})
                                }}
                                transition={{ delay: 0.5, duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
                            />
                        </div>
                        <p className="text-[9px] opacity-25 mt-1 font-medium">
                            {rankPct >= 100 ? '⚡ Rank Up Ready' : `${rankPct}% to ${nextRank}`}
                        </p>
                    </div>
                </motion.div>

                {/* Quick Start */}
                <div
                    className="rounded-[24px] p-6 flex flex-col justify-between"
                    style={{
                        background: `${accentColor}0a`,
                        border:     `1px solid ${accentColor}22`,
                    }}
                >
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">
                        Quick Start
                    </p>
                    {lastExercise ? (
                        <>
                            <p className="text-sm font-black uppercase tracking-tight opacity-80 mb-4 leading-tight">
                                {lastExercise.name}
                            </p>
                            <motion.button
                                whileTap={{ scale: 0.96 }}
                                onClick={onQuickStart}
                                className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] text-black flex items-center justify-center gap-2"
                                style={{
                                    background:  `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
                                    boxShadow:   `0 0 20px ${accentColor}40`,
                                    touchAction: 'manipulation',
                                }}
                            >
                                <Zap size={13} fill="currentColor" />
                                Resume
                            </motion.button>
                        </>
                    ) : (
                        <p className="text-xs opacity-25 font-medium">
                            Start an exercise in the Armory to resume it here.
                        </p>
                    )}
                </div>

            </div>
        </motion.div>
    );
}
