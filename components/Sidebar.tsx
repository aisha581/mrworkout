"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { Home, Dumbbell, Brain, Settings, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Music2 } from 'lucide-react';

export default function Sidebar() {
    const { theme } = useTheme();
    const pathname = usePathname();
    const { isMusicVisible, toggleMusic } = useWorkout();

    const navItems = [
        { icon: Home, label: 'Home', href: '/' },
        { icon: Library, label: 'Library', href: '/library' },
        { icon: Dumbbell, label: 'Workouts', href: '/workouts' },
        { icon: Brain, label: 'AI Coach', href: '/ai-coach' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];

    return (
        <motion.aside
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden lg:block"
        >
            <div
                className="flex flex-col gap-4 p-3 rounded-3xl backdrop-blur-3xl transition-colors duration-500"
                style={{
                    backgroundColor: theme.cardBg,
                    border: `1px solid ${theme.borderColor}`,
                }}
            >
                {navItems.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                        <Link href={item.href} key={item.label}>
                            <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="relative p-3 rounded-2xl transition-all duration-300 flex items-center justify-center cursor-pointer"
                                style={{
                                    backgroundColor: isActive
                                        ? `${theme.accent}15`
                                        : 'transparent',
                                }}
                                title={item.label}
                            >
                                <item.icon
                                    size={24}
                                    strokeWidth={1.5}
                                    style={{
                                        color: isActive ? theme.accent : theme.mode === 'savage' ? '#666' : '#999'
                                    }}
                                />
                                {isActive && (
                                    <motion.div
                                        layoutId="activeIndicator"
                                        className="absolute inset-0 rounded-2xl pointer-events-none"
                                        style={{
                                            border: `2px solid ${theme.accent}40`,
                                        }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </motion.div>
                        </Link>
                    );
                })}

                {/* Divider */}
                <div className="w-full h-[1px] bg-white/10 my-1 rounded-full" />

                {/* Music Station Toggle */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleMusic}
                    className="relative p-3 rounded-2xl transition-all duration-300 flex items-center justify-center cursor-pointer mt-1"
                    style={{
                        backgroundColor: isMusicVisible ? 'rgba(29, 185, 84, 0.15)' : 'transparent',
                    }}
                    title="Music Station"
                >
                    <Music2
                        size={24}
                        strokeWidth={1.5}
                        style={{
                            color: isMusicVisible ? '#1DB954' : theme.mode === 'savage' ? '#666' : '#999',
                            filter: isMusicVisible ? 'drop-shadow(0 0 8px rgba(29, 185, 84, 0.5))' : 'none'
                        }}
                    />
                    {isMusicVisible && (
                        <motion.div
                            layoutId="musicIndicator"
                            className="absolute inset-0 rounded-2xl pointer-events-none"
                            style={{
                                border: '2px solid rgba(29, 185, 84, 0.4)',
                            }}
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                    )}
                </motion.button>
            </div>
        </motion.aside>
    );
}
