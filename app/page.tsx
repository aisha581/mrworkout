"use client";

import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import BioMetrics from "@/components/BioMetrics";
import VaultGrid from "@/components/VaultGrid";
import LuxuryCard from "@/components/LuxuryCard";
import Toast from "@/components/Toast";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { formatWorkoutSummary } from "@/utils/workoutParser";
import { useWorkout } from "@/contexts/WorkoutContext";
import dynamic from "next/dynamic";

import DailyGoalRing from "@/components/DailyGoalRing";
import FloatingMic from "@/components/FloatingMic";
import MuscleHeatmap from "@/components/MuscleHeatmap";
import SavageTip from "@/components/SavageTip";
import ExerciseCard from "@/components/ExerciseCard";
import CircuitBuilder from "@/components/CircuitBuilder";
import DailyChallengeWidget from "@/components/DailyChallengeWidget";
import WorkoutPlayer from "@/components/WorkoutPlayer";
import ChallengePlayer from "@/components/ChallengePlayer";
import type { LiveExercise } from "@/app/library/page";
import { getDailyChallenge, getTimeUntilNextChallenge, type DailyChallenge } from "@/utils/dailyChallenge";
import { Zap, ChevronDown } from "lucide-react";

// Canvas cannot be server-rendered — load only on the client
const MannequinCanvas = dynamic(() => import("@/components/MannequinCanvas"), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-[#060606]" />,
});

export default function Home() {
    const { theme } = useTheme();
    const { workoutHistory, addWorkout, startRestTimer } = useWorkout();

    const [showToast,         setShowToast]         = useState(false);
    const [toastMessage,      setToastMessage]      = useState('');
    const [coreExercises,     setCoreExercises]     = useState<LiveExercise[]>([]);
    const [lastExercise,      setLastExercise]      = useState<LiveExercise | null>(null);
    const [quickStartOpen,    setQuickStartOpen]    = useState(false);
    const [dailyChallenge,    setDailyChallenge]    = useState<DailyChallenge | null>(null);
    const [isChallengeOpen,   setIsChallengeOpen]   = useState(false);
    const [challengeTimeLeft, setChallengeTimeLeft] = useState('');

    // Fetch library → core exercises + daily challenge
    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const res = await fetch('/api/library');
                if (!res.ok) return;
                const data: LiveExercise[] = await res.json();

                const targetIds = ['pushup', 'squat', 'lunge'];
                const filtered  = data.filter(ex => targetIds.includes(ex.id));
                const ordered   = targetIds
                    .map(id => filtered.find(ex => ex.id === id))
                    .filter(Boolean) as LiveExercise[];
                setCoreExercises(ordered);
                setDailyChallenge(getDailyChallenge(data));
            } catch {}
        };
        fetchLibrary();
        const iv = setInterval(fetchLibrary, 3000);
        return () => clearInterval(iv);
    }, []);

    // Read last-played exercise from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem('mw_last_exercise');
            if (raw) setLastExercise(JSON.parse(raw));
        } catch {}
    }, []);

    // Daily challenge countdown
    useEffect(() => {
        setChallengeTimeLeft(getTimeUntilNextChallenge());
        const iv = setInterval(() => setChallengeTimeLeft(getTimeUntilNextChallenge()), 1000);
        return () => clearInterval(iv);
    }, []);

    const handleWorkoutLogged = (intent: any) => {
        addWorkout(intent);
        startRestTimer(60);
        setToastMessage(`Logged ${formatWorkoutSummary(intent)} to The Vault.`);
        setShowToast(true);
    };

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

                {/* ══════════════════════════════════════════════════════════
                    HERO — full-viewport 3D scene
                ══════════════════════════════════════════════════════════ */}
                <div className="relative w-full overflow-hidden" style={{ height: '100dvh' }}>

                    {/* Industrial dark floor */}
                    <div className="absolute inset-0 bg-[#060606]" />

                    {/* Subtle accent glow centred behind model */}
                    <div
                        className="absolute inset-0 z-[1] pointer-events-none"
                        style={{
                            background: `radial-gradient(ellipse 55% 65% at 50% 58%, ${theme.accent}07 0%, transparent 70%)`,
                        }}
                    />

                    {/* Grid texture overlay for industrial feel */}
                    <div
                        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.025]"
                        style={{
                            backgroundImage: `
                                linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
                            `,
                            backgroundSize: '60px 60px',
                        }}
                    />

                    {/* 3D Canvas */}
                    <div className="absolute inset-0 z-[2]">
                        <MannequinCanvas accentColor={theme.accent} />
                    </div>

                    {/* Bottom gradient fade into page background */}
                    <div
                        className="absolute inset-x-0 bottom-0 h-56 pointer-events-none z-[3]"
                        style={{ background: `linear-gradient(to top, #060606 0%, transparent 100%)` }}
                    />

                    {/* ── Welcome text — top-left below navbar ── */}
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
                                fontFamily: 'var(--font-archivo-black), sans-serif',
                                textShadow: theme.mode === 'savage'
                                    ? `0 0 50px ${theme.accent}25`
                                    : 'none',
                            }}
                        >
                            Welcome<br />
                            <span style={{ color: theme.accent }}>Savage</span>
                        </h1>
                        <p className="text-sm opacity-35 mt-2.5 font-medium tracking-wide">
                            Let's crush today.
                        </p>
                    </motion.div>

                    {/* ── Floating action buttons — bottom ── */}
                    <div
                        className="absolute inset-x-0 z-[10] flex items-end justify-between"
                        style={{
                            bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 20px) + 3.5rem)',
                            padding: '0 clamp(1.5rem, 5vw, 7rem)',
                        }}
                    >
                        {/* Daily Challenge pill */}
                        <motion.button
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, type: 'spring', stiffness: 180, damping: 22 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => dailyChallenge && setIsChallengeOpen(true)}
                            className="flex items-center gap-3 px-5 py-3.5 rounded-2xl backdrop-blur-2xl"
                            style={{
                                background:   'rgba(0,0,0,0.7)',
                                border:       `1px solid ${theme.accent}30`,
                                boxShadow:    `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`,
                                touchAction:  'manipulation',
                            }}
                        >
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: `${theme.accent}18`, border: `1px solid ${theme.accent}30` }}
                            >
                                <Zap size={17} style={{ color: theme.accent }} />
                            </div>
                            <div className="text-left">
                                <p className="text-[8px] font-black uppercase tracking-[0.4em] opacity-35 leading-none mb-0.5">
                                    Today
                                </p>
                                <p className="text-[13px] font-black uppercase tracking-tight leading-tight">
                                    Daily Challenge
                                </p>
                                {challengeTimeLeft && (
                                    <p className="text-[9px] font-mono opacity-25 leading-tight mt-0.5">
                                        {challengeTimeLeft}
                                    </p>
                                )}
                            </div>
                        </motion.button>

                        {/* Quick Start button */}
                        {lastExercise && (
                            <motion.button
                                initial={{ opacity: 0, y: 24 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.65, type: 'spring', stiffness: 180, damping: 22 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setQuickStartOpen(true)}
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

                    {/* Scroll indicator */}
                    <motion.div
                        animate={{ y: [0, 5, 0] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[10] pointer-events-none"
                    >
                        <ChevronDown size={18} className="opacity-15" />
                    </motion.div>
                </div>

                {/* ══════════════════════════════════════════════════════════
                    SCROLLABLE CONTENT — below the fold
                ══════════════════════════════════════════════════════════ */}
                <div
                    className="relative -z-10 pointer-events-none h-8"
                    style={{ background: 'linear-gradient(to bottom, #060606, transparent)' }}
                />

                <section
                    className="py-12 px-6 sm:px-8 lg:px-24 lg:pl-32"
                    style={{ backgroundColor: theme.bg }}
                >
                    <div className="max-w-[1800px] mx-auto">

                        <DailyChallengeWidget />
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

                        {/* Bento Grid — heatmap centre */}
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
                {isChallengeOpen && dailyChallenge && (
                    <ChallengePlayer
                        isOpen={isChallengeOpen}
                        onClose={() => setIsChallengeOpen(false)}
                        challenge={dailyChallenge}
                    />
                )}

            </motion.main>
        </AnimatePresence>
    );
}
