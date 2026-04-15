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

import DailyGoalRing from "@/components/DailyGoalRing";
import FloatingMic from "@/components/FloatingMic";
import MuscleHeatmap from "@/components/MuscleHeatmap";
import SavageTip from "@/components/SavageTip";
import ExerciseCard from "@/components/ExerciseCard";
import CircuitBuilder from "@/components/CircuitBuilder";
import DailyChallengeWidget from "@/components/DailyChallengeWidget";
import type { LiveExercise } from "@/app/library/page";

export default function Home() {
    const { theme } = useTheme();

    const { workoutHistory, addWorkout, startRestTimer } = useWorkout();

    const [showToast,    setShowToast]    = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [coreExercises, setCoreExercises] = useState<LiveExercise[]>([]);

    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const res = await fetch('/api/library');
                if (res.ok) {
                    const data: LiveExercise[] = await res.json();
                    const targetIds = ['pushup', 'squat', 'lunge'];
                    const filtered  = data.filter(ex => targetIds.includes(ex.id));
                    const ordered   = targetIds
                        .map(id => filtered.find(ex => ex.id === id))
                        .filter(Boolean) as LiveExercise[];
                    setCoreExercises(ordered);
                }
            } catch (error) {
                console.error("Failed to fetch library:", error);
            }
        };
        fetchLibrary();
        const interval = setInterval(fetchLibrary, 3000);
        return () => clearInterval(interval);
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
                className="min-h-screen relative overflow-hidden pb-24 lg:pb-0"
            >
                <Navbar />
                <Sidebar />

                {/* Background */}
                <div
                    className="fixed inset-0 -z-10 bg-[#060606]"
                    style={{
                        backgroundImage: `
                            radial-gradient(circle at 15% 50%, rgba(2, 11, 20, 0.4), transparent 25%),
                            radial-gradient(circle at 85% 30%, rgba(0, 230, 255, 0.03), transparent 25%),
                            radial-gradient(circle at 50% 100%, rgba(2, 11, 20, 0.6), transparent 40%)
                        `,
                    }}
                />

                <section className="pt-28 pb-16 px-6 sm:px-8 lg:px-24 lg:pl-32">
                    <div className="max-w-[1800px] mx-auto">

                        {/* Welcome header */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="mb-8"
                        >
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h1
                                        className="text-5xl lg:text-7xl font-bold mb-3 uppercase"
                                        style={{
                                            letterSpacing: '-0.04em',
                                            fontFamily: 'var(--font-archivo-black), sans-serif',
                                        }}
                                    >
                                        Welcome back,{' '}
                                        <br />
                                        <span style={{ color: theme.accent }}>Savage</span>
                                    </h1>
                                    <p className="text-lg opacity-60">
                                        Let's crush today's workout goals
                                    </p>
                                </div>

                                <div className="hidden xl:flex items-center gap-5 bg-white/5 backdrop-blur-md pl-6 pr-3 py-3 rounded-full border border-white/10">
                                    <div className="flex flex-col items-end">
                                        <span className="text-sm font-bold opacity-90 uppercase tracking-widest">7 Day Streak</span>
                                        <span style={{ color: theme.accent }} className="text-xs font-semibold">Keep it burning 🔥</span>
                                    </div>
                                    <div
                                        className="w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-2xl shadow-lg"
                                        style={{ borderColor: theme.accent, backgroundColor: `${theme.accent}15`, color: theme.accent }}
                                    >
                                        S
                                    </div>
                                </div>
                            </div>
                        </motion.div>

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

                        {/* Bento Grid — Heatmap centre */}
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

                            {/* ── Wireframe Mannequin ── */}
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
            </motion.main>
        </AnimatePresence>
    );
}
