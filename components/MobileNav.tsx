"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { useCircuit } from '@/contexts/CircuitContext';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Home, Library, Database, Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_RED = "#FF3131"; // Savage Red Accent

const NAV_ITEMS = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/library', icon: Library, label: 'Armory' },
    { href: '/vault', icon: Database, label: 'Vault' },
    { href: '/rank', icon: Trophy, label: 'Rank' },
    { href: '/store', icon: Zap, label: 'Store' },
];

export default function MobileNav() {
    const { theme } = useTheme();
    const { queue } = useCircuit();
    const { isPlayerOpen } = useWorkout();
    const pathname = usePathname();

    return (
        <motion.nav
            initial={{ y: 100 }}
            animate={{ y: isPlayerOpen ? 100 : 0 }}
            transition={{ type: 'spring', stiffness: 120, damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden px-6 pb-8 pt-4 isolate"
            style={{ pointerEvents: isPlayerOpen ? 'none' : 'auto' }}
        >
            {/* Premium Glassmorphism Container */}
            <div 
                className="absolute inset-x-0 bottom-0 top-0 -z-10 backdrop-blur-3xl border-t border-white/5"
                style={{ 
                    backgroundColor: 'rgba(5, 5, 5, 0.8)',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.5)'
                }}
            />

            <div className="flex justify-around items-end max-w-lg mx-auto relative">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    const badge = item.href === '/vault' && queue.length > 0 ? queue.length : 0;
                    return (
                        <Link key={item.href} href={item.href} className="flex-1">
                            <NavItem
                                icon={item.icon}
                                label={item.label}
                                isActive={isActive}
                                theme={theme}
                                badge={badge}
                            />
                        </Link>
                    );
                })}
            </div>
        </motion.nav>
    );
}

function NavItem({ icon: Icon, label, isActive, badge = 0 }: any) {
    return (
        <motion.div
            whileTap={{ scale: 0.9 }}
            className="flex flex-col items-center gap-1.5 py-2 relative"
        >
            {/* Active Glow behind icon */}
            <AnimatePresence>
                {isActive && (
                    <motion.div
                        layoutId="navGlow"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        className="absolute inset-0 -z-10 blur-xl rounded-full"
                        style={{ backgroundColor: `${NAV_RED}30` }}
                    />
                )}
            </AnimatePresence>

            {/* Icon with optional badge */}
            <div className="relative">
                <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className="transition-all duration-300"
                    style={{
                        color: isActive ? NAV_RED : 'rgba(255,255,255,0.3)',
                        filter: isActive ? `drop-shadow(0 0 8px ${NAV_RED}80)` : 'none'
                    }}
                />
                <AnimatePresence>
                    {badge > 0 && (
                        <motion.span
                            key="badge"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="absolute -top-1.5 -right-2 min-w-[16px] h-4 rounded-full flex items-center justify-center font-black text-black"
                            style={{
                                fontSize: '9px',
                                backgroundColor: NAV_RED,
                                boxShadow: `0 0 8px ${NAV_RED}80`,
                                padding: '0 3px',
                            }}
                        >
                            {badge > 9 ? '9+' : badge}
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>
            
            <span
                className="text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300"
                style={{
                    color: isActive ? NAV_RED : 'rgba(255,255,255,0.2)',
                    textShadow: isActive ? `0 0 10px ${NAV_RED}40` : 'none'
                }}
            >
                {label}
            </span>

            {/* Active Indicator Bar */}
            {isActive && (
                <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-2 w-8 h-0.5 rounded-full"
                    style={{ 
                        backgroundColor: NAV_RED,
                        boxShadow: `0 0 15px ${NAV_RED}`
                    }}
                />
            )}
        </motion.div>
    );
}
