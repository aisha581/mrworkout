"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function ThemeToggle() {
    const { theme, setThemeMode } = useTheme();
    const isMrMode = theme.mode !== 'mrs'; // Now treats all premium dark themes as "Savage Mode" on the toggle

    return (
        <div className="flex items-center gap-4" role="group" aria-label="Theme Switcher">
            <span
                className={`text-xs font-bold uppercase tracking-tighter transition-all duration-600 ${!isMrMode ? 'opacity-90' : 'opacity-30'
                    }`}
                style={{
                    color: !isMrMode ? theme.accent : 'inherit',
                    letterSpacing: '0.1em'
                }}
                aria-hidden="true"
            >
                MRS
            </span>

            <motion.button
                onClick={() => setThemeMode(isMrMode ? 'mrs' : 'savage')}
                className="relative rounded-full focus:outline-none backdrop-blur-2xl"
                style={{
                    width: '68px',
                    height: '36px',
                    backgroundColor: isMrMode
                        ? 'rgba(0, 255, 255, 0.08)'
                        : 'rgba(183, 110, 121, 0.08)',
                    border: `1px solid ${isMrMode ? 'rgba(0, 255, 255, 0.15)' : 'rgba(183, 110, 121, 0.15)'}`,
                    boxShadow: isMrMode
                        ? 'inset 0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 255, 255, 0.1)'
                        : 'inset 0 2px 8px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(183, 110, 121, 0.1)',
                }}
                whileTap={{ scale: 0.96 }}
                aria-label={`Switch to ${isMrMode ? 'Mrs Workout' : 'Savage'} Mode`}
                aria-pressed={isMrMode}
            >
                <motion.div
                    className="absolute rounded-full backdrop-blur-sm"
                    style={{
                        width: '28px',
                        height: '28px',
                        top: '3px',
                        backgroundColor: theme.accent,
                        boxShadow: `0 4px 12px ${isMrMode ? 'rgba(0, 255, 255, 0.4)' : 'rgba(183, 110, 121, 0.4)'}, 0 2px 4px rgba(0, 0, 0, 0.2)`,
                    }}
                    animate={{
                        left: isMrMode ? 'calc(100% - 31px)' : '3px',
                    }}
                    transition={{
                        type: 'spring',
                        stiffness: 700,
                        damping: 35,
                        mass: 0.8,
                    }}
                />
            </motion.button>

            <span
                className={`text-xs font-bold uppercase tracking-tighter transition-all duration-600 ${isMrMode ? 'opacity-90' : 'opacity-30'
                    }`}
                style={{
                    color: isMrMode ? theme.accent : 'inherit',
                    letterSpacing: '0.1em'
                }}
                aria-hidden="true"
            >
                MR
            </span>
        </div>
    );
}
