"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { useWorkout } from '@/contexts/WorkoutContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { X, CheckCircle, Flame } from 'lucide-react';
import { Exercise } from '@/data/libraryData';
import { addSetXP } from '@/utils/userStats';
import { checkAndUpdatePR } from '@/utils/prTracker';

interface LogSetModalProps {
    isOpen: boolean;
    onClose: () => void;
    exercise: Exercise;
}

export default function LogSetModal({ isOpen, onClose, exercise }: LogSetModalProps) {
    const { theme } = useTheme();
    const { addWorkout, startRestTimer } = useWorkout();

    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleLog = () => {
        if (!weight || !reps) return;

        // Trigger Success UI State
        setIsSuccess(true);

        // Map to Vault Intent Structure
        const intent = {
            exerciseType: exercise.id,
            weight: parseInt(weight),
            reps: parseInt(reps),
            action: 'log_set'
        };

        // Stamp last-set time so the daily reminder knows the user trained
        localStorage.setItem('mw_last_set_time', String(Date.now()));
        addSetXP();

        // PR detection — fires 'mw:new-pr' event if all-time record is broken
        checkAndUpdatePR(exercise.name, parseInt(weight), parseInt(reps));

        // Add to Global Context & Start Timer
        addWorkout(intent);
        startRestTimer(60);

        // Wait to show checkmark animation, then close
        setTimeout(() => {
            setIsSuccess(false);
            setWeight('');
            setReps('');
            onClose();
        }, 1500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleBackdropClick}
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0"
                >
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 backdrop-blur-3xl overflow-hidden relative"
                        style={{
                            backgroundColor: theme.cardBg,
                            border: `1px solid ${theme.borderColor}`,
                            boxShadow: theme.mode === 'savage'
                                ? `0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)`
                                : `0 20px 40px rgba(183, 110, 121, 0.1), inset 0 1px 0 rgba(255,255,255,0.3)`
                        }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="log-set-title"
                    >
                        {!isSuccess ? (
                            <>
                                {/* Header */}
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-1" style={{ color: theme.accent }}>
                                            Record Set
                                        </p>
                                        <h2 id="log-set-title" className="text-2xl font-bold tracking-tighter" style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}>
                                            {exercise.name}
                                        </h2>
                                    </div>
                                    <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                        <X size={20} className="opacity-50" />
                                    </button>
                                </div>

                                {/* Inputs */}
                                <div className="flex gap-4 mb-8">
                                    <div className="flex-1">
                                        <label htmlFor="weight-input" className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-60">Weight (KG)</label>
                                        <input
                                            id="weight-input"
                                            type="number"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-black/20 border outline-none rounded-2xl px-4 py-4 text-2xl font-bold text-center transition-all focus:bg-black/40"
                                            style={{ borderColor: theme.borderColor }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label htmlFor="reps-input" className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-60">Reps</label>
                                        <input
                                            id="reps-input"
                                            type="number"
                                            value={reps}
                                            onChange={(e) => setReps(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-black/20 border outline-none rounded-2xl px-4 py-4 text-2xl font-bold text-center transition-all focus:bg-black/40"
                                            style={{ borderColor: theme.borderColor }}
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <button
                                    onClick={handleLog}
                                    disabled={!weight || !reps}
                                    className="w-full py-4 rounded-2xl font-bold text-lg uppercase tracking-wider transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        backgroundColor: theme.accent,
                                        color: theme.mode === 'savage' ? '#000' : '#fff',
                                        boxShadow: (weight && reps) ? `0 10px 30px ${theme.accent}40` : 'none'
                                    }}
                                >
                                    Log to Vault
                                    <Flame size={20} className="group-hover:scale-110 transition-transform" />
                                </button>
                            </>
                        ) : (
                            /* Success State Animation */
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-8"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                                    style={{ backgroundColor: `${theme.accent}20` }}
                                >
                                    <CheckCircle size={48} style={{ color: theme.accent }} />
                                </motion.div>
                                <h3 className="text-2xl font-bold mb-2">Logged to Vault!</h3>
                                <p className="opacity-60 font-medium text-center">
                                    Rest timer automatically started.
                                </p>
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
