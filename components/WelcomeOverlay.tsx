"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSavageSounds } from '@/hooks/useSavageSounds';
import { useTheme } from '@/contexts/ThemeContext';
import { Zap, ChevronRight } from 'lucide-react';
import { saveProfile, loadProfile, type Goal, type FocusArea } from '@/utils/missionGenerator';

interface WelcomeOverlayProps {
    isVisible: boolean;
    onEnter:   () => void;
}

type Step = 'splash' | 'goal';

const GOALS: { value: Goal; label: string; sub: string }[] = [
    { value: 'MASS',  label: 'Build Mass',  sub: 'Hypertrophy & size'     },
    { value: 'SHRED', label: 'Shred',       sub: 'Fat loss & conditioning' },
    { value: 'POWER', label: 'Power',       sub: 'Strength & explosiveness'},
];

const FOCUS: { value: FocusArea; label: string }[] = [
    { value: 'UPPER', label: 'Upper Body' },
    { value: 'LOWER', label: 'Lower Body' },
    { value: 'FULL',  label: 'Full Body'  },
];

export default function WelcomeOverlay({ isVisible, onEnter }: WelcomeOverlayProps) {
    const { playEntryClang } = useSavageSounds();
    const { theme }          = useTheme();

    const [step,        setStep]       = useState<Step>('splash');
    const [goal,        setGoal]       = useState<Goal | null>(null);
    const [focusArea,   setFocusArea]  = useState<FocusArea>('FULL');
    const [profileDone, setProfileDone] = useState(false);

    // Skip goal step if profile already saved
    useEffect(() => {
        if (loadProfile()) setProfileDone(true);
    }, []);

    const handleEnterSplash = () => {
        if (profileDone) {
            playEntryClang();
            onEnter();
        } else {
            setStep('goal');
        }
    };

    const handleConfirmGoal = () => {
        if (!goal) return;
        saveProfile({ goal, focusArea });
        playEntryClang();
        onEnter();
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#060606] overflow-hidden"
                >
                    {/* Radial glow */}
                    <div
                        className="absolute inset-0 opacity-40 pointer-events-none"
                        style={{ background: `radial-gradient(circle at center, ${theme.accent}18 0%, transparent 65%)` }}
                    />

                    {/* Industrial grid */}
                    <div
                        className="absolute inset-0 opacity-[0.025] pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(${theme.accent} 1px, transparent 1px), linear-gradient(90deg, ${theme.accent} 1px, transparent 1px)`,
                            backgroundSize: '100px 100px',
                        }}
                    />

                    <AnimatePresence mode="wait">

                        {/* ── Step 0: Splash ──────────────────────────────── */}
                        {step === 'splash' && (
                            <motion.div
                                key="splash"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.35 }}
                                className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg"
                            >
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 20 }}
                                    className="text-[160px] font-black italic mb-2 leading-none select-none"
                                    style={{
                                        color:      theme.accent,
                                        fontFamily: 'var(--font-archivo-black), sans-serif',
                                        textShadow: `0 0 60px ${theme.accent}40`,
                                    }}
                                >
                                    W
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter mb-2 italic">
                                            MR. WORKOUT
                                        </h1>
                                        <div className="flex items-center justify-center gap-2 mb-8">
                                            <div className="h-[2px] w-8 bg-white/20" />
                                            <span className="text-xs font-black uppercase tracking-[0.4em] text-white/40">
                                                The Clinic Awaits
                                            </span>
                                            <div className="h-[2px] w-8 bg-white/20" />
                                        </div>
                                    </div>

                                    <p className="text-base text-white/50 font-medium tracking-tight px-4">
                                        Forge your body. Master the routine.<br />
                                        No shortcuts. Just Savage execution.
                                    </p>

                                    <motion.button
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleEnterSplash}
                                        className="group relative flex items-center gap-3 px-12 py-5 rounded-[24px] overflow-hidden mx-auto"
                                        style={{ touchAction: 'manipulation' }}
                                    >
                                        <div className="absolute inset-0" style={{ backgroundColor: theme.accent }} />
                                        <span className="relative z-10 text-black font-black uppercase italic tracking-tighter text-xl">
                                            {profileDone ? 'Enter The Clinic' : "Let's Begin"}
                                        </span>
                                        <ChevronRight className="relative z-10 text-black group-hover:translate-x-1 transition-transform" size={24} />
                                    </motion.button>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1.0 }}
                                    className="mt-16 flex items-center gap-3 text-white/20"
                                >
                                    <Zap size={14} fill="currentColor" />
                                    <span className="text-[10px] uppercase font-bold tracking-[0.5em]">System Status: Savage</span>
                                </motion.div>
                            </motion.div>
                        )}

                        {/* ── Step 1: Goal Selection ───────────────────────── */}
                        {step === 'goal' && (
                            <motion.div
                                key="goal"
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ duration: 0.35 }}
                                className="relative z-10 flex flex-col px-6 max-w-sm w-full"
                            >
                                <p className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30 mb-3">
                                    Step 1 of 1
                                </p>
                                <h2
                                    className="text-3xl font-black uppercase leading-tight mb-1"
                                    style={{ fontFamily: 'var(--font-archivo-black), sans-serif', letterSpacing: '-0.03em' }}
                                >
                                    What's your <span style={{ color: theme.accent }}>mission?</span>
                                </h2>
                                <p className="text-xs opacity-30 font-medium mb-8">
                                    Your daily workout will be built around this goal.
                                </p>

                                {/* Goal buttons */}
                                <div className="flex flex-col gap-3 mb-8">
                                    {GOALS.map(g => (
                                        <motion.button
                                            key={g.value}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => setGoal(g.value)}
                                            className="flex items-center justify-between px-5 py-4 rounded-2xl border transition-all"
                                            style={{
                                                background:   goal === g.value ? `${theme.accent}18` : 'rgba(255,255,255,0.03)',
                                                borderColor:  goal === g.value ? theme.accent : 'rgba(255,255,255,0.08)',
                                                touchAction:  'manipulation',
                                            }}
                                        >
                                            <div className="text-left">
                                                <p className="font-black text-sm uppercase tracking-tight">{g.label}</p>
                                                <p className="text-[10px] opacity-40 font-medium mt-0.5">{g.sub}</p>
                                            </div>
                                            {goal === g.value && (
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="w-5 h-5 rounded-full flex items-center justify-center"
                                                    style={{ backgroundColor: theme.accent }}
                                                >
                                                    <div className="w-2 h-2 rounded-full bg-black" />
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Focus area pills */}
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30 mb-3">
                                    Focus Area
                                </p>
                                <div className="flex gap-2 mb-8">
                                    {FOCUS.map(f => (
                                        <button
                                            key={f.value}
                                            onClick={() => setFocusArea(f.value)}
                                            className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all"
                                            style={{
                                                background:  focusArea === f.value ? `${theme.accent}18` : 'rgba(255,255,255,0.03)',
                                                borderColor: focusArea === f.value ? theme.accent : 'rgba(255,255,255,0.08)',
                                                color:       focusArea === f.value ? theme.accent : 'rgba(255,255,255,0.4)',
                                                touchAction: 'manipulation',
                                            }}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Confirm */}
                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    onClick={handleConfirmGoal}
                                    disabled={!goal}
                                    className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2 transition-opacity"
                                    style={{
                                        background:  goal ? `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}cc 100%)` : 'rgba(255,255,255,0.1)',
                                        opacity:     goal ? 1 : 0.4,
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    <Zap size={15} fill="currentColor" />
                                    Lock In My Mission
                                </motion.button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
