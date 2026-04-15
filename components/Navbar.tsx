"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { useWorkout } from '@/contexts/WorkoutContext';
import ThemeToggle from './ThemeToggle';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function Navbar() {
    const { theme } = useTheme();
    const { isPlayerOpen } = useWorkout();

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: isPlayerOpen ? -100 : 0, opacity: isPlayerOpen ? 0 : 1 }}
            transition={{ type: 'spring', stiffness: 120, damping: 25 }}
            className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl"
            style={{
                pointerEvents: isPlayerOpen ? 'none' : 'auto',
                backgroundColor: theme.mode === 'savage'
                    ? 'rgba(10, 10, 10, 0.4)'
                    : 'rgba(255, 255, 255, 0.4)',
                borderBottom: theme.mode === 'savage'
                    ? '1px solid rgba(255, 255, 255, 0.06)'
                    : '1px solid rgba(0, 0, 0, 0.06)',
            }}
        >
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/">
                        <motion.div
                            className="flex items-center gap-3 cursor-pointer"
                            whileHover={{ scale: 1.02 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                            <div
                                className="p-2 rounded-xl backdrop-blur-xl"
                                style={{
                                    backgroundColor: theme.mode === 'savage'
                                        ? 'rgba(0, 255, 255, 0.08)'
                                        : 'rgba(183, 110, 121, 0.08)',
                                    border: `1px solid ${theme.mode === 'savage' ? 'rgba(0, 255, 255, 0.15)' : 'rgba(183, 110, 121, 0.15)'}`,
                                }}
                            >
                                <span
                                    className="font-black text-xl italic"
                                    style={{ color: theme.accent, fontFamily: 'var(--font-archivo-black), sans-serif', paddingRight: '2px' }}
                                >
                                    W
                                </span>
                            </div>
                            <h1 className="text-xl font-semibold tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                                Mr<span style={{ color: theme.accent }}>.</span>workout
                            </h1>
                        </motion.div>
                    </Link>

                    {/* Navigation Links - Minimal */}
                    <div className="hidden md:flex items-center gap-8">
                        {/* Reserved for future nav items */}
                    </div>

                    {/* Theme Toggle */}
                    <ThemeToggle />
                </div>
            </div>
        </motion.nav>
    );
}
