"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useVoiceLogger } from '@/hooks/useVoiceLogger';
import { parseWorkoutIntent } from '@/utils/workoutParser';

interface VoiceCommandProps {
    onWorkoutLogged?: (intent: any) => void;
    onTranscript?: (text: string) => void;
    onListeningChange?: (isListening: boolean) => void;
}

export default function VoiceCommand({ onWorkoutLogged, onTranscript, onListeningChange }: VoiceCommandProps) {
    const { theme } = useTheme();
    const { isListening, transcript, startListening, stopListening, error } = useVoiceLogger();
    const [recognizedExercise, setRecognizedExercise] = useState<string | null>(null);

    useEffect(() => {
        onListeningChange?.(isListening);
    }, [isListening, onListeningChange]);

    useEffect(() => {
        if (transcript) {
            console.log('📝 Transcript received in VoiceCommand:', transcript);
            onTranscript?.(transcript);

            // Parse workout intent
            const intent = parseWorkoutIntent(transcript);
            console.log('🎯 Intent parsed in VoiceCommand:', intent);

            if (intent.isValid) {
                // Show exercise recognition feedback
                if (intent.exerciseType) {
                    const exerciseName = intent.exerciseType.replace('_', ' ').toUpperCase();
                    setRecognizedExercise(exerciseName);
                    console.log('✅ Exercise recognized:', exerciseName);

                    // Auto-reset after 2 seconds
                    setTimeout(() => {
                        setRecognizedExercise(null);
                    }, 2000);
                }

                onWorkoutLogged?.(intent);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transcript]);

    const handleClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="fixed bottom-8 right-8 z-50"
        >
            {/* Listening/Recognition indicator */}
            <AnimatePresence>
                {(isListening || recognizedExercise) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -top-16 right-0 px-4 py-2 rounded-full backdrop-blur-xl"
                        style={{
                            backgroundColor: theme.cardBg,
                            border: `1px solid ${theme.borderColor}`,
                        }}
                    >
                        <div className="flex items-center gap-2">
                            <motion.div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: theme.accent }}
                                animate={{
                                    scale: isListening && !recognizedExercise ? [1, 1.5, 1] : 1,
                                    opacity: isListening && !recognizedExercise ? [1, 0.5, 1] : 1,
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: isListening && !recognizedExercise ? Infinity : 0,
                                }}
                            />
                            <span className="text-sm font-medium" style={{ color: theme.accent }}>
                                {recognizedExercise
                                    ? `${theme.mode === 'savage' ? 'Savage' : 'Amazing'}! Performing ${recognizedExercise}...`
                                    : 'Listening...'
                                }
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Microphone button */}
            <motion.button
                onClick={handleClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative w-16 h-16 rounded-full backdrop-blur-xl flex items-center justify-center"
                style={{
                    backgroundColor: isListening ? theme.accent : theme.cardBg,
                    border: `2px solid ${theme.accent}`,
                    boxShadow: isListening
                        ? `0 0 30px ${theme.accent}, 0 8px 24px ${theme.accent}60`
                        : `0 4px 12px ${theme.accent}30`,
                }}
            >
                {/* Pulsing glow rings when listening */}
                <AnimatePresence>
                    {isListening && (
                        <>
                            <motion.div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    border: `2px solid ${theme.accent}`,
                                }}
                                animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.6, 0, 0.6],
                                }}
                                transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                }}
                            />
                            <motion.div
                                className="absolute inset-0 rounded-full"
                                style={{
                                    border: `2px solid ${theme.accent}`,
                                }}
                                animate={{
                                    scale: [1, 1.8, 1],
                                    opacity: [0.4, 0, 0.4],
                                }}
                                transition={{
                                    duration: 1.5,
                                    delay: 0.5,
                                    repeat: Infinity,
                                }}
                            />
                        </>
                    )}
                </AnimatePresence>

                <Mic
                    size={24}
                    strokeWidth={2}
                    style={{
                        color: isListening
                            ? (theme.mode === 'savage' ? '#0D0D0D' : '#fff')
                            : theme.accent
                    }}
                />
            </motion.button>

            {/* Error display */}
            {error && (
                <div className="absolute -top-20 right-0 px-3 py-1 rounded-lg bg-red-500/20 border border-red-500/50 text-xs text-red-400">
                    {error}
                </div>
            )}
        </motion.div>
    );
}
