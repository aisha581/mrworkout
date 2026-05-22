"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { Mic, MicOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useVoiceLogger } from '@/hooks/useVoiceLogger';
import { useState } from 'react';

export default function FloatingMic() {
    const { theme }                      = useTheme();
    const { addWorkout, startRestTimer } = useWorkout();
    const [expanded, setExpanded]        = useState(false);

    const { isListening, toggleListening, transcript } = useVoiceLogger({
        onWorkoutLogged: (intent) => {
            addWorkout(intent);
            startRestTimer(60);
            setExpanded(false);
        },
    });

    return (
        <div className="fixed bottom-[calc(max(env(safe-area-inset-bottom,0px),16px)+80px)] right-5 z-[140] flex flex-col items-end gap-2">
            {/* Transcript bubble */}
            <AnimatePresence>
                {isListening && transcript && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="px-4 py-2.5 rounded-2xl text-[11px] font-bold max-w-[220px] text-right"
                        style={{
                            background:  `${theme.accent}18`,
                            border:      `1px solid ${theme.accent}40`,
                            color:       theme.accent,
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        &ldquo;{transcript}&rdquo;
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Listening indicator label */}
            <AnimatePresence>
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                        style={{
                            background: `${theme.accent}15`,
                            border:     `1px solid ${theme.accent}35`,
                        }}
                    >
                        <motion.span
                            className="w-1.5 h-1.5 rounded-full"
                            animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 0.9, repeat: Infinity }}
                            style={{ background: theme.accent }}
                        />
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: theme.accent }}>
                            Listening
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mic FAB — only show when expanded or actively listening */}
            <AnimatePresence>
                {(expanded || isListening) && (
                    <motion.button
                        key="mic-btn"
                        initial={{ opacity: 0, scale: 0.7, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        onClick={() => {
                            navigator.vibrate?.(isListening ? [30, 20, 30] : [15]);
                            toggleListening();
                            if (!isListening) setExpanded(true);
                        }}
                        className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                            background:  isListening ? theme.accent : 'rgba(10,10,10,0.9)',
                            border:      `1.5px solid ${theme.accent}${isListening ? 'ff' : '60'}`,
                            boxShadow:   isListening
                                ? `0 0 28px ${theme.accent}80, 0 0 8px ${theme.accent}`
                                : `0 4px 24px rgba(0,0,0,0.6), 0 0 12px ${theme.accent}25`,
                        }}
                        aria-label={isListening ? "Stop listening" : "Start voice log"}
                    >
                        {/* Pulse ring when listening */}
                        {isListening && (
                            <motion.div
                                className="absolute inset-0 rounded-2xl pointer-events-none"
                                animate={{ boxShadow: [`0 0 0 0px ${theme.accent}50`, `0 0 0 10px ${theme.accent}00`] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                            />
                        )}
                        {isListening
                            ? <MicOff size={22} style={{ color: '#000' }} />
                            : <Mic    size={22} style={{ color: theme.accent }} />
                        }
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Small tab — tap to expand (always visible) */}
            {!expanded && !isListening && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => { navigator.vibrate?.(10); setExpanded(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl"
                    style={{
                        background:  'rgba(0,0,0,0.65)',
                        border:      `1px solid ${theme.accent}25`,
                        backdropFilter: 'blur(12px)',
                    }}
                    aria-label="Voice log a workout"
                >
                    <Mic size={13} style={{ color: theme.accent, opacity: 0.7 }} />
                    <span className="text-[8px] font-black uppercase tracking-[0.25em] opacity-40">Voice</span>
                </motion.button>
            )}

            {/* Collapse when expanded but not listening */}
            {expanded && !isListening && (
                <button
                    onClick={() => setExpanded(false)}
                    className="flex items-center gap-1 opacity-40 hover:opacity-70 transition-opacity"
                >
                    <X size={12} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Close</span>
                </button>
            )}
        </div>
    );
}
