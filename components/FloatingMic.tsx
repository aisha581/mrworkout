"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useVoiceLogger } from '@/hooks/useVoiceLogger';

export default function FloatingMic() {
    const { theme } = useTheme();
    const { addWorkout, startRestTimer } = useWorkout();

    const { isListening, toggleListening } = useVoiceLogger({
        onWorkoutLogged: (intent) => {
            // Add to Global Context & Start Timer upon recognized speech
            addWorkout(intent);
            startRestTimer(60);
        },
        onTranscript: (text) => {
            console.log('Floating Mic heard:', text);
        }
    });

    return (
        <div className="fixed top-1/2 right-6 -translate-y-1/2 z-[200]">
            <motion.button
                onClick={toggleListening}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                className="relative flex items-center justify-center rounded-full transition-all"
                style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: isListening ? theme.accent : '#0A0A0A',
                    border: `2px solid ${theme.accent}`,
                    boxShadow: isListening
                        ? `0 0 30px ${theme.accent}, inset 0 0 20px rgba(0,0,0,0.5)`
                        : `0 10px 30px rgba(0,0,0,0.8), 0 0 15px ${theme.accent}40`,
                }}
                aria-label={isListening ? "Stop voice logging" : "Start voice logging"}
                aria-pressed={isListening}
            >
                <span className="sr-only" aria-live="polite">
                    {isListening ? "Microphone is on, listening for workout..." : "Microphone is off."}
                </span>

                <AnimatePresence mode="wait">
                    {isListening ? (
                        <motion.div
                            key="recording"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            className="absolute inset-0 border-4 border-transparent rounded-full animate-spin"
                            style={{ borderTopColor: '#0A0A0A', borderRightColor: '#0A0A0A' }}
                        />
                    ) : null}
                </AnimatePresence>

                <Mic
                    size={28}
                    style={{
                        color: isListening ? '#0A0A0A' : theme.accent,
                        transform: isListening ? 'scale(1.1)' : 'scale(1)'
                    }}
                    className="transition-transform duration-300"
                />
            </motion.button>
        </div>
    );
}
