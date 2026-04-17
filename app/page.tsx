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
import { formatWorkoutSummary } from "@/utils/workoutParser";
import { useWorkout } from "@/contexts/WorkoutContext";
import dynamic from "next/dynamic";

import DailyGoalRing from "@/components/DailyGoalRing";
import FloatingMic from "@/components/FloatingMic";
import MuscleHeatmap from "@/components/MuscleHeatmap";
import SavageTip from "@/components/SavageTip";
import ExerciseCard from "@/components/ExerciseCard";
import CircuitBuilder from "@/components/CircuitBuilder";
import WorkoutPlayer from "@/components/WorkoutPlayer";
import MissionDrawer from "@/components/MissionDrawer";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import type { LiveExercise } from "@/app/library/page";
import { useCircuit } from "@/contexts/CircuitContext";
import { useRouter } from "next/navigation";
import {
    loadProfile, generateDailyMission,
    type Goal, type UserProfile,
} from "@/utils/missionGenerator";
import { getUserStats, getRankInfo, recordDailyVisit, type UserStats } from "@/utils/userStats";
import { useIsPro } from "@/hooks/useIsPro";
import { hapticMedium, hapticLight } from "@/utils/haptic";
import BiometricScan, { shouldShowScan } from "@/components/BiometricScan";
import XPBar from "@/components/XPBar";
import { Zap, ChevronDown, Flame, Trophy, Lock, Crown } from "lucide-react";

// Canvas cannot be server-rendered — load only on the client
const MannequinCanvas = dynamic(() => import("@/components/MannequinCanvas"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-[#060606]" />,
});

export default function Home() {
    const { theme }                          = useTheme();
    const { workoutHistory, addWorkout, startRestTimer } = useWorkout();
    const { setQueue }                       = useCircuit();
    const router                             = useRouter();

    // ── State ──────────────────────────────────────────────────────────────────
    const [showToast,       setShowToast]       = useState(false);
    const [toastMessage,    setToastMessage]    = useState('');
    const [coreExercises,   setCoreExercises]   = useState<LiveExercise[]>([]);
    const [allExercises,    setAllExercises]    = useState<LiveExercise[]>([]);
    const [lastExercise,    setLastExercise]    = useState<LiveExercise | null>(null);
    const [quickStartOpen,  setQuickStartOpen]  = useState(false);
    const [isMissionOpen,   setIsMissionOpen]   = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _workoutHistory = workoutHistory; // kept for VaultGrid below
    const [showWelcome,     setShowWelcome]     = useState(false);

    // Profile + generated mission
    const [profile,          setProfile]         = useState<UserProfile | null>(null);
    const [missionExercises, setMissionExercises] = useState<LiveExercise[]>([]);

    // Persistent user stats (XP, streak)
    const [vitals, setVitals] = useState(() => getUserStats());

    // Biometric scan overlay (first-visit only)
    const [showScan, setShowScan] = useState(false);

    // Pro status
    const { isPro } = useIsPro();

    // ── Library fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const res = await fetch('/api/library');
                if (!res.ok) return;
                const data: LiveExercise[] = await res.json();
                setAllExercises(data);
                const targetIds = ['pushup', 'squat', 'lunge'];
                const ordered   = targetIds
                    .map(id => data.find(ex => ex.id === id))
                    .filter(Boolean) as LiveExercise[];
                setCoreExercises(ordered);
            } catch {}
        };
        fetchLibrary();
        const iv = setInterval(fetchLibrary, 3000);
        return () => clearInterval(iv);
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

    const handleWorkoutLogged = (intent: any) => {
        addWorkout(intent);
        startRestTimer(60);
        setToastMessage(`Logged ${formatWorkoutSummary(intent)} to The Vault.`);
        setShowToast(true);
    };

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
                        className="absolute inset-x-0 z-[10] flex items-end justify-end"
                        style={{
                            bottom:  'calc(max(env(safe-area-inset-bottom, 0px), 20px) + 3.5rem)',
                            padding: '0 clamp(1.5rem, 5vw, 7rem)',
                        }}
                    >
                        {/* Quick Start — only visible when a last exercise exists */}
                        {lastExercise && (
                            <motion.button
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, type: 'spring', stiffness: 180, damping: 22 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => { hapticMedium(); setQuickStartOpen(true); }}
                                className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest"
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
                    </div>

                    {/* ── Pro upgrade pill — top-right, only for free users ── */}
                    {!isPro && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                            className="absolute z-[10]"
                            style={{ top: '5.5rem', right: 'clamp(1.5rem, 5vw, 7rem)' }}
                        >
                            <button
                                onClick={() => router.push('/join')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-md"
                                style={{
                                    background: 'rgba(255,215,0,0.1)',
                                    border:     '1px solid rgba(255,215,0,0.25)',
                                    touchAction: 'manipulation',
                                }}
                            >
                                <Crown size={12} color="#FFD700" fill="rgba(255,215,0,0.4)" />
                                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#FFD700' }}>
                                    Go Pro
                                </span>
                            </button>
                        </motion.div>
                    )}

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
                        />

                        <CircuitBuilder />

                        {/* Core Movements */}
                        <div className="mb-12">
                            <h2
                                className="text-3xl font-bold mb-6 tracking-tighter uppercase"
                                style={{
                                    fontFamily: 'var(--font-archivo-black), sans-serif',
                                    textShadow: theme.mode === 'savage' ? `0 0 20px ${theme.accent}40` : 'none',
                                }}
                            >
                                Core <span style={{ color: theme.accent }}>Movements</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {coreExercises.length > 0 ? (
                                    coreExercises.map((exercise, idx) => (
                                        <div key={exercise.id} className="h-full">
                                            <ExerciseCard
                                                exercise={exercise}
                                                delay={0.3 + idx * 0.1}
                                                onStartWorkout={() => {}}
                                            />
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-3 h-48 rounded-[24px] border border-white/5 bg-black/20 flex items-center justify-center text-white/40">
                                        Loading Armory Data...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bento Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
                            <div className="lg:col-span-4 space-y-6">
                                <LuxuryCard className="p-8 rounded-[32px] h-full" delay={0.6}>
                                    <div className="text-sm opacity-50 mb-2">Current Streak</div>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className="text-5xl font-semibold" style={{ color: theme.accent }}>28</span>
                                        <span className="text-2xl opacity-50">days</span>
                                    </div>
                                    <div className="text-xs opacity-40">Personal best: 45 days</div>
                                </LuxuryCard>
                            </div>
                            <div className="lg:col-span-4 h-full">
                                <MuscleHeatmap />
                            </div>
                            <div className="lg:col-span-4 flex flex-col gap-6">
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
            {/* Streak pill */}
            <div
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl backdrop-blur-md"
                style={{
                    background: 'rgba(6,6,6,0.55)',
                    border:     '1px solid rgba(255,255,255,0.08)',
                }}
            >
                <Flame size={13} color="#FF8C00" fill="#FF8C00" />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#FF8C00' }}>
                    {vitals.currentStreak}
                </span>
                <span className="text-[10px] opacity-40 font-bold uppercase tracking-widest">streak</span>
            </div>

            {/* Points pill */}
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
}

function ProgressDashboard({ accentColor, lastExercise, onQuickStart }: ProgressDashboardProps) {
    // Rank progress: placeholder data (replace with real context later)
    const streakDays  = 7;
    const rankLabel   = 'Iron';
    const rankPct     = 62; // % toward next rank
    const nextRank    = 'Bronze';

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

                {/* Rank Progress */}
                <div
                    className="rounded-[24px] p-6 flex flex-col justify-between"
                    style={{
                        background: `${accentColor}0a`,
                        border:     `1px solid ${accentColor}22`,
                    }}
                >
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-40 mb-2">
                        Rank Progress
                    </p>
                    <div className="mb-3">
                        <div className="flex justify-between items-baseline mb-2">
                            <span
                                className="text-xl font-black uppercase"
                                style={{ color: accentColor, fontFamily: 'var(--font-archivo-black), sans-serif' }}
                            >
                                {rankLabel}
                            </span>
                            <span className="text-xs opacity-30 font-black">→ {nextRank}</span>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: accentColor }}
                                initial={{ width: 0 }}
                                animate={{ width: `${rankPct}%` }}
                                transition={{ delay: 0.5, duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
                            />
                        </div>
                        <p className="text-[9px] opacity-25 mt-1.5 font-medium">{rankPct}% to {nextRank}</p>
                    </div>
                </div>

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
