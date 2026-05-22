"use client";

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useSavageSounds } from '@/hooks/useSavageSounds';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Zap, Trophy, TrendingUp } from 'lucide-react';
import { DailyChallenge } from '@/utils/dailyChallenge';
import canvasConfetti from 'canvas-confetti';

interface ChallengePlayerProps {
    isOpen: boolean;
    onClose: () => void;
    challenge: DailyChallenge;
}

export default function ChallengePlayer({ isOpen, onClose, challenge }: ChallengePlayerProps) {
    const { theme } = useTheme();
    const { playThud, playPing } = useSavageSounds();
    const [gameState, setGameState] = useState<'intro' | 'active' | 'complete'>('intro');
    const [timeLeft, setTimeLeft] = useState(60);
    const [reps, setReps] = useState<number | ''>('');
    const [isLevelUp, setIsLevelUp] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Reset game state when player opens/closes
    useEffect(() => {
        if (isOpen) {
            setGameState('intro');
            setTimeLeft(60);
            setReps('');
            setIsLevelUp(false);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [isOpen]);

    const startChallenge = () => {
        setGameState('active');
        playPing();

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setGameState('complete');
                    playPing();
                    return 0;
                }

                // Final 3 seconds countdown sound
                if (prev <= 4) {
                    playThud();
                }

                return prev - 1;
            });
        }, 1000);
    };

    const submitReps = () => {
        const finalReps = Number(reps) || 0;
        if (finalReps > challenge.averageReps) {
            setIsLevelUp(true);
            canvasConfetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: [theme.accent, '#FFFFFF', '#000000']
            });
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[600] flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-3xl"
            >
                {/* Exit Button */}
                <button
                    onClick={onClose}
                    className="absolute top-10 right-10 z-[700] p-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                    <X size={32} />
                </button>

                <div className="max-w-4xl w-full px-8 text-center">
                    {gameState === 'intro' && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="space-y-12"
                        >
                            <div className="space-y-4">
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="mx-auto w-24 h-24 rounded-3xl flex items-center justify-center text-black"
                                    style={{ backgroundColor: theme.accent }}
                                >
                                    <Zap size={48} fill="currentColor" />
                                </motion.div>
                                <h1 className="text-6xl font-black uppercase italic tracking-tighter">
                                    DAILY <span style={{ color: theme.accent }}>MISSION</span>
                                </h1>
                                <p className="text-xl opacity-60 uppercase tracking-widest font-bold">
                                    {challenge.exerciseId} • {challenge.goalType}
                                </p>
                            </div>

                            <div className="bg-[#181818] p-8 rounded-[32px] border border-white/5 space-y-6 max-w-2xl mx-auto">
                                <div className="p-6 rounded-2xl bg-black/40 border-l-4 border-[#00FFFF]" style={{ borderColor: theme.accent }}>
                                    <p className="text-xl italic font-medium">"{challenge.quote}"</p>
                                </div>
                                <div className="flex justify-center gap-12">
                                    <div>
                                        <p className="text-xs uppercase opacity-40 font-bold tracking-widest mb-1">Duration</p>
                                        <p className="text-3xl font-black">60 SECS</p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase opacity-40 font-bold tracking-widest mb-1">Target to Beat</p>
                                        <p className="text-3xl font-black" style={{ color: theme.accent }}>{challenge.averageReps}+ REPS</p>
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startChallenge}
                                className="px-16 py-6 rounded-3xl text-2xl font-black uppercase tracking-tighter text-black shadow-2xl transition-all"
                                style={{
                                    backgroundColor: theme.accent,
                                    boxShadow: `0 0 50px ${theme.accent}40`
                                }}
                            >
                                START CHALLENGE
                            </motion.button>
                        </motion.div>
                    )}

                    {gameState === 'active' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-12"
                        >
                            <div className="relative inline-block">
                                <motion.h2
                                    className="text-[250px] font-black italic tracking-tighter leading-none"
                                    animate={{ scale: timeLeft <= 5 ? [1, 1.05, 1] : 1 }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                    style={{ color: timeLeft <= 5 ? '#FF4A4A' : 'white' }}
                                >
                                    {timeLeft}
                                </motion.h2>
                                <motion.div
                                    className="absolute -top-10 -right-10 flex items-center justify-center w-24 h-24 rounded-full border-4 border-[#00FFFF] bg-black"
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 60, ease: "linear" }}
                                    style={{ borderColor: theme.accent }}
                                >
                                    <Zap size={32} className="text-[#00FFFF]" style={{ color: theme.accent }} />
                                </motion.div>
                            </div>

                            <h3 className="text-4xl font-black uppercase tracking-tighter" style={{ color: theme.accent }}>
                                PUSH TO THE LIMIT
                            </h3>

                            <div className="w-full max-w-md mx-auto h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-[#00FFFF]"
                                    initial={{ width: "100%" }}
                                    animate={{ width: `${(timeLeft / 60) * 100}%` }}
                                    transition={{ duration: 1, ease: 'linear' }}
                                    style={{ backgroundColor: theme.accent }}
                                />
                            </div>
                        </motion.div>
                    )}

                    {gameState === 'complete' && (
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="space-y-12"
                        >
                            {!isLevelUp ? (
                                <>
                                    <div className="space-y-4">
                                        <Trophy size={80} className="mx-auto text-white/20" />
                                        <h2 className="text-5xl font-black uppercase tracking-tighter italic">CHALLENGE COMPLETE</h2>
                                        <p className="text-xl opacity-60 uppercase tracking-widest font-bold">How many reps did you hit?</p>
                                    </div>

                                    <div className="max-w-xs mx-auto space-y-8">
                                        <input
                                            type="number"
                                            value={reps}
                                            onChange={(e) => setReps(e.target.value === '' ? '' : Number(e.target.value))}
                                            placeholder="Enter Reps"
                                            className="w-full bg-white/5 border border-white/10 rounded-3xl py-8 text-6xl font-black text-center focus:outline-none focus:border-[#00FFFF] transition-all"
                                            style={{ color: theme.accent }}
                                            autoFocus
                                        />

                                        <button
                                            onClick={submitReps}
                                            className="w-full py-6 rounded-3xl text-xl font-black uppercase tracking-tighter text-black"
                                            style={{ backgroundColor: theme.accent }}
                                        >
                                            Log Result
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="space-y-8"
                                >
                                    <div className="relative inline-block">
                                        <TrendingUp size={120} className="text-[#00FFFF] drop-shadow-[0_0_30px_rgba(0,255,255,0.4)]" style={{ color: theme.accent }} />
                                        <motion.div
                                            className="absolute -inset-4 border-2 border-[#00FFFF] rounded-full"
                                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            style={{ borderColor: theme.accent }}
                                        />
                                    </div>
                                    <h1 className="text-8xl font-black uppercase italic tracking-tighter" style={{ color: theme.accent }}>
                                        LEVEL UP
                                    </h1>
                                    <div className="space-y-2">
                                        <p className="text-4xl font-bold uppercase tracking-tight">Savage Status Verified</p>
                                        <p className="text-xl opacity-50 uppercase tracking-[0.3em] font-black">You are in the top 5% of athletes</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="px-12 py-5 border border-white/20 rounded-2xl font-black uppercase tracking-widest hover:bg-white/5 transition-all"
                                    >
                                        Return to Base
                                    </button>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
