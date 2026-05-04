"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { useWorkout } from '@/contexts/WorkoutContext';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useIsPro } from '@/hooks/useIsPro';
import { Crown } from 'lucide-react';
import { useState } from 'react';
import dynamic from 'next/dynamic';

// Lazy-load so the Supabase client isn't bundled into the initial navbar chunk
const UpgradeModal = dynamic(() => import('./UpgradeModal'), { ssr: false });

export default function Navbar() {
    const { theme } = useTheme();
    const { isPlayerOpen } = useWorkout();
    const { isPro } = useIsPro();
    const [showUpgrade, setShowUpgrade] = useState(false);

    return (
        <>
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
                                    className="p-2 rounded-xl backdrop-blur-xl flex items-center justify-center"
                                    style={{
                                        backgroundColor: theme.mode === 'savage'
                                            ? 'rgba(0, 255, 255, 0.08)'
                                            : 'rgba(183, 110, 121, 0.08)',
                                        border: `1px solid ${theme.mode === 'savage' ? 'rgba(0, 255, 255, 0.15)' : 'rgba(183, 110, 121, 0.15)'}`,
                                        width: 40, height: 40,
                                    }}
                                >
                                    <BrandLogo size={24} fallback="W" accent={theme.accent} />
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

                        {/* Right: Upgrade / PRO badge + Theme Toggle */}
                        <div className="flex items-center gap-3">
                            {isPro ? (
                                <div
                                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full font-black uppercase tracking-[0.22em] text-[11px] whitespace-nowrap select-none"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,215,0,0.08))',
                                        border:     '1px solid rgba(255,215,0,0.50)',
                                        color:      '#FFD700',
                                        boxShadow:  '0 0 18px rgba(255,215,0,0.20)',
                                    }}
                                >
                                    <Crown size={11} fill="#FFD700" color="#FFD700" />
                                    Pro
                                </div>
                            ) : (
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowUpgrade(true)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-full font-black uppercase tracking-[0.2em] text-[11px] whitespace-nowrap"
                                    style={{
                                        background:  'linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,215,0,0.08))',
                                        border:      '1px solid rgba(255,215,0,0.50)',
                                        color:       '#FFD700',
                                        boxShadow:   '0 0 22px rgba(255,215,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
                                        touchAction: 'manipulation',
                                    }}
                                >
                                    <Crown size={11} fill="#FFD700" color="#FFD700" />
                                    Upgrade to Pro
                                </motion.button>
                            )}
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            </motion.nav>

            {/* Upgrade modal — rendered at root level so it overlays everything */}
            <AnimatePresence>
                {showUpgrade && (
                    <UpgradeModal onClose={() => setShowUpgrade(false)} />
                )}
            </AnimatePresence>
        </>
    );
}
