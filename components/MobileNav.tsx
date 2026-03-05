"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { Home, Library, Database, Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function MobileNav() {
    const { theme } = useTheme();
    const pathname = usePathname();

    return (
        <motion.nav
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed bottom-0 left-0 right-0 z-[100] lg:hidden px-4 pb-6 pt-4 backdrop-blur-3xl"
            style={{
                backgroundColor: 'rgba(10, 10, 10, 0.85)', // Dark frosted-glass effect
                borderTop: `1px solid ${theme.accent}`, // Thin cyan top border
                boxShadow: `0 -10px 50px rgba(0,0,0,0.8)`,
            }}
        >
            <div className="flex justify-around items-end max-w-sm mx-auto relative px-2">

                {/* 1. Home Link */}
                <Link href="/" className="w-1/5">
                    <NavItem icon={Home} label="Home" isActive={pathname === '/'} theme={theme} />
                </Link>

                {/* 2. Armory Link */}
                <Link href="/library" className="w-1/5">
                    <NavItem icon={Library} label="Armory" isActive={pathname === '/library'} theme={theme} />
                </Link>

                {/* 3. Vault Link */}
                <Link href="/workouts" className="w-1/5">
                    <NavItem icon={Database} label="Vault" isActive={pathname === '/workouts'} theme={theme} />
                </Link>

                {/* 4. Leaderboard Link */}
                <Link href="/leaderboard" className="w-1/5">
                    <NavItem icon={Trophy} label="Rank" isActive={pathname === '/leaderboard'} theme={theme} />
                </Link>

                {/* 5. Store Link */}
                <Link href="/store" className="w-1/5">
                    <NavItem icon={Zap} label="Store" isActive={pathname === '/store'} theme={theme} />
                </Link>

            </div>
        </motion.nav>
    );
}

// Sub-component for clean mapping
function NavItem({ icon: Icon, label, isActive, theme }: any) {
    return (
        <motion.div
            whileTap={{ scale: 1.1 }}
            className="flex flex-col items-center gap-1.5 p-2 rounded-2xl relative"
        >
            <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{
                    color: isActive ? theme.accent : '#666',
                    transition: 'color 0.3s ease',
                }}
            />
            <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{
                    color: isActive ? theme.accent : '#666',
                    transition: 'color 0.3s ease',
                }}
            >
                {label}
            </span>

            {/* Active Glow Dot */}
            {isActive && (
                <motion.div
                    layoutId="mobileNavActiveIndicator"
                    className="absolute -bottom-2 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: theme.accent, boxShadow: `0 0 10px ${theme.accent}` }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                />
            )}
        </motion.div>
    );
}
