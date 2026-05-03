"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import VaultGrid from "@/components/VaultGrid";
import Toast from "@/components/Toast";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useWorkout } from "@/contexts/WorkoutContext";
import dynamic from "next/dynamic";

import FloatingMic from "@/components/FloatingMic";
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
import { getUserStats, getRankInfo, recordDailyVisit } from "@/utils/userStats";
import { hapticMedium, hapticLight } from "@/utils/haptic";
import BiometricScan, { shouldShowScan } from "@/components/BiometricScan";
import XPBar from "@/components/XPBar";
import { Zap, ChevronDown, Trophy, Smartphone, Share2 } from "lucide-react";
import { computeCNSScore } from "@/utils/userStats";
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
    // Profile + generated mission
    const [profile,          setProfile]         = useState<UserProfile | null>(null);
    const [missionExercises, setMissionExercises] = useState<LiveExercise[]>([]);

    // Persistent user stats (XP, streak)
    const [vitals, setVitals] = useState(() => getUserStats());

    // Biometric scan overlay (first-visit only)
    const [showScan,    setShowScan]    = useState(false);

    // Onboarding gate — dashboard hidden until user completes biometric wall
    const [onboarded, setOnboarded] = useState(false);
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setOnboarded(!!localStorage.getItem('mw_onboarded'));
        }
    }, []);

    // iOS install modal
    const [showInstallModal, setShowInstallModal] = useState(false);
    const [showPWABanner, setShowPWABanner] = useState(false);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const dismissed = sessionStorage.getItem('mw_pwa_dismissed');
        const standalone = window.matchMedia('(display-mode: standalone)').matches;
        if (!dismissed && !standalone) setShowPWABanner(true);
    }, []);

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

    // ── Load profile on mount ──────────────────────────────────────────────────
    useEffect(() => {
        const saved = loadProfile();
        if (saved) setProfile(saved);
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

    // ── Onboarding gate — show wall if user hasn't completed signup ──────────
    if (!onboarded) {
        return (
            <WelcomeOverlay
                isVisible={true}
                onEnter={() => {
                    setOnboarded(true);
                    const saved = loadProfile();
                    if (saved) setProfile(saved);
                }}
            />
        );
    }

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

                {/* ── Floating PWA install banner ─────────────────────── */}
                <AnimatePresence>
                    {showPWABanner && (
                        <motion.div
                            initial={{ y: -60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -60, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                            className="fixed top-20 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none"
                        >
                            <div
                                className="flex items-center gap-3 px-5 py-3 rounded-2xl pointer-events-auto"
                                style={{
                                    background:  'rgba(6,6,6,0.92)',
                                    border:      `1px solid ${theme.accent}35`,
                                    boxShadow:   `0 0 32px ${theme.accent}20, 0 8px 32px rgba(0,0,0,0.6)`,
                                    backdropFilter: 'blur(20px)',
                                }}
                            >
                                <motion.div
                                    animate={{ opacity: [0.6, 1, 0.6] }}
                                    transition={{ duration: 1.8, repeat: Infinity }}
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: theme.accent, boxShadow: `0 0 8px ${theme.accent}` }}
                                />
                                <p className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>
                                    Add to Home Screen
                                </p>
                                <button
                                    onClick={() => { hapticLight(); setShowInstallModal(true); }}
                                    className="px-3 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-widest text-black"
                                    style={{ background: theme.accent, boxShadow: `0 0 12px ${theme.accent}60` }}
                                >
                                    Install
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPWABanner(false);
                                        try { sessionStorage.setItem('mw_pwa_dismissed', '1'); } catch {}
                                    }}
                                    className="text-[10px] opacity-30 hover:opacity-60 transition-opacity font-black uppercase tracking-widest"
                                >
                                    ✕
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                            Tap <span className="font-black uppercase" style={{ color: theme.accent, opacity: 1 }}>MISSION</span> to start your challenge.
                        </p>
                    </motion.div>

                    {/* ── Bottom action bar ────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, type: 'spring', stiffness: 180, damping: 22 }}
                        className="absolute inset-x-0 z-[10] flex items-center justify-between"
                        style={{
                            bottom:  'calc(max(env(safe-area-inset-bottom, 0px), 20px) + 24px)',
                            padding: '0 clamp(1.5rem, 5vw, 7rem)',
                        }}
                    >
                        {/* Left: XP pill + icon buttons */}
                        <div className="flex items-center gap-2">
                            {/* XP / Rank pill */}
                            <div
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl backdrop-blur-md"
                                style={{
                                    background: 'rgba(6,6,6,0.60)',
                                    border:     '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                <Trophy size={13} color="#FFD700" />
                                <span className="text-xs font-black uppercase tracking-widest" style={{ color: theme.accent }}>
                                    {vitals.totalXP}
                                </span>
                                <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">
                                    xp · lv{getRankInfo(vitals.totalXP).level}
                                </span>
                            </div>

                            {/* Install */}
                            <motion.button
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

                            {/* Share status */}
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={async () => {
                                    hapticLight();
                                    const rankInfo = getRankInfo(vitals.totalXP);
                                    const text = `💪 ${vitals.currentStreak} day streak · ${rankInfo.levelName} rank · ${vitals.totalXP} XP on Mr. Workout`;
                                    if (typeof navigator !== 'undefined' && navigator.share) {
                                        try { await navigator.share({ title: 'My Savage Status', text, url: window.location.origin }); } catch {}
                                    } else {
                                        try { await navigator.clipboard.writeText(`${text}\n${window.location.origin}`); } catch {}
                                    }
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-2xl backdrop-blur-md"
                                style={{
                                    background:  'rgba(255,255,255,0.05)',
                                    border:      '1px solid rgba(255,255,255,0.08)',
                                    touchAction: 'manipulation',
                                }}
                            >
                                <Share2 size={14} className="opacity-50" />
                            </motion.button>
                        </div>

                        {/* Right: Quick Start (primary CTA) */}
                        {lastExercise ? (
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
                        ) : (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => router.push('/library')}
                                className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest"
                                style={{
                                    background:  'rgba(255,255,255,0.06)',
                                    border:      `1px solid ${theme.accent}30`,
                                    color:       theme.accent,
                                    touchAction: 'manipulation',
                                }}
                            >
                                <Zap size={14} />
                                Browse Armory
                            </motion.button>
                        )}
                    </motion.div>

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

                        {/* ── Savage Streak ─────────────────────────────────── */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="mb-6"
                        >
                            <div
                                className="rounded-[24px] p-6 flex flex-col justify-between"
                                style={{
                                    background: `${theme.accent}0a`,
                                    border:     `1px solid ${theme.accent}22`,
                                }}
                            >
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">
                                    Savage Streak
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <span
                                        className="text-6xl font-black leading-none"
                                        style={{
                                            color:      theme.accent,
                                            fontFamily: 'var(--font-archivo-black), sans-serif',
                                            textShadow: `0 0 30px ${theme.accent}50`,
                                        }}
                                    >
                                        {vitals.currentStreak}
                                    </span>
                                    <span className="text-xl opacity-40 font-black">days</span>
                                </div>
                                <p className="text-[10px] opacity-25 mt-1 font-medium uppercase tracking-widest">
                                    Keep it alive
                                </p>
                            </div>
                        </motion.div>

                        {/* ── CNS Neural Recovery ───────────────────────────── */}
                        <div className="mb-10">
                            <motion.div
                                className="relative rounded-[32px] overflow-hidden"
                                animate={{
                                    boxShadow: [
                                        `0 0 30px ${theme.accent}10, 0 0 0 1px ${theme.accent}15`,
                                        `0 0 55px ${theme.accent}25, 0 0 0 1px ${theme.accent}30`,
                                        `0 0 30px ${theme.accent}10, 0 0 0 1px ${theme.accent}15`,
                                    ],
                                }}
                                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                                style={{
                                    background: 'linear-gradient(135deg, #080808 0%, #0a0a0a 100%)',
                                    border:     `1px solid ${theme.accent}22`,
                                }}
                            >
                                {/* Grid texture */}
                                <div
                                    className="absolute inset-0 pointer-events-none opacity-[0.018]"
                                    style={{
                                        backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                                        backgroundSize:  "32px 32px",
                                    }}
                                />

                                {/* Pulsing cyan mannequin silhouette */}
                                <motion.div
                                    className="absolute right-0 top-0 bottom-0 w-56 pointer-events-none overflow-hidden"
                                    animate={{ opacity: [0.05, 0.12, 0.05] }}
                                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                                >
                                    <svg
                                        viewBox="0 0 200 400"
                                        className="absolute right-[-20px] top-1/2 -translate-y-1/2 h-full"
                                        fill={theme.accent}
                                    >
                                        <circle cx="100" cy="48" r="34" />
                                        <rect x="88" y="80" width="24" height="20" rx="4" />
                                        <path d="M55 100 L145 100 L158 220 L42 220 Z" />
                                        <path d="M55 108 L18 190 Q14 200 20 205 L28 208 Q36 210 40 200 L72 125 Z" />
                                        <path d="M145 108 L182 190 Q186 200 180 205 L172 208 Q164 210 160 200 L128 125 Z" />
                                        <path d="M70 218 L58 340 Q56 355 66 358 L80 360 Q90 362 92 348 L98 224 Z" />
                                        <path d="M130 218 L142 340 Q144 355 134 358 L120 360 Q110 362 108 348 L102 224 Z" />
                                    </svg>
                                </motion.div>

                                {/* Radial accent glow */}
                                <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ background: `radial-gradient(ellipse 55% 65% at 30% 50%, ${theme.accent}08 0%, transparent 70%)` }}
                                />

                                <div className="relative px-8 py-8">
                                    <p className="text-[9px] font-black uppercase tracking-[0.55em] opacity-30 mb-1">
                                        Central Nervous System
                                    </p>
                                    <h3
                                        className="text-3xl font-black uppercase leading-tight mb-6"
                                        style={{
                                            fontFamily:    'var(--font-archivo-black), sans-serif',
                                            color:         theme.accent,
                                            textShadow:    `0 0 30px ${theme.accent}50`,
                                            letterSpacing: '-0.03em',
                                        }}
                                    >
                                        {cnsScore >= 95 ? 'Fully\nRecovered' : 'Neural\nRecovery'}
                                    </h3>

                                    {/* Big score */}
                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span
                                            className="font-black leading-none tabular-nums"
                                            style={{
                                                fontFamily: 'var(--font-archivo-black), sans-serif',
                                                fontSize:   '4rem',
                                                color:      theme.accent,
                                                textShadow: `0 0 40px ${theme.accent}60`,
                                            }}
                                        >
                                            {cnsScore}
                                        </span>
                                        <span className="text-2xl opacity-40 font-black">%</span>
                                    </div>

                                    {/* Metric rows */}
                                    <div className="flex flex-col gap-3">
                                        {[
                                            { label: 'Fatigue Index',   value: `${100 - cnsScore}%` },
                                            { label: 'Readiness',       value: `${cnsScore}%` },
                                            { label: 'Recovery Window', value: cnsScore >= 95 ? 'Full Power' : `${Math.ceil((100 - cnsScore) * 0.24)}h remaining` },
                                        ].map(({ label, value }) => (
                                            <div key={label} className="flex items-center justify-between">
                                                <p className="text-[11px] font-black uppercase tracking-widest opacity-35">{label}</p>
                                                <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: theme.accent }}>{value}</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="h-px mt-5 mb-4" style={{ background: `linear-gradient(90deg, ${theme.accent}30, transparent)` }} />

                                    <p className="text-[11px] opacity-25 leading-relaxed">
                                        {cnsScore >= 95
                                            ? 'Your nervous system is primed. Push maximum intensity.'
                                            : 'Consistent training rebuilds neural pathways. Recovery is progress.'}
                                    </p>
                                </div>
                            </motion.div>
                        </div>

                        {/* ── The Vault ─────────────────────────────────────── */}
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


