"use client";

// Playground — the workout session screen.
// Reads mw_routine from localStorage via CircuitContext, starts the circuit,
// and hands off to the global CircuitPlayer overlay.

import { useEffect } from 'react';
import { useCircuit } from '@/contexts/CircuitContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function PlaygroundPage() {
    const { queue, startCircuit, isCircuitActive } = useCircuit();
    const { theme } = useTheme();

    // Auto-start as soon as the queue is available
    useEffect(() => {
        if (queue.length > 0 && !isCircuitActive) {
            startCircuit();
        }
    }, [queue, isCircuitActive, startCircuit]);

    // CircuitPlayer (in layout.tsx) takes over full-screen when isCircuitActive=true.
    // This page is just a holding screen while that triggers.
    return (
        <main className="min-h-screen flex flex-col items-center justify-center bg-[#060606]">
            <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center gap-4"
            >
                <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Zap size={40} fill={theme.accent} style={{ color: theme.accent }} />
                </motion.div>
                <p
                    className="text-xs font-black uppercase tracking-[0.4em] opacity-40"
                    style={{ color: theme.accent }}
                >
                    {queue.length > 0 ? 'Loading Session…' : 'No exercises in routine'}
                </p>
            </motion.div>
        </main>
    );
}
