"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ExerciseCard from '@/components/ExerciseCard';
import type { Exercise } from '@/data/libraryData';

// Extended Exercise to account for dynamic API availability states
export interface LiveExercise extends Exercise {
    isAvailable?: boolean;
    audioUrl?: string;
}

const CATEGORIES = [
    { id: 'Chest', label: 'CHEST', iconUrl: '/images/chest-bg.jpg' },
    { id: 'Back', label: 'BACK', iconUrl: '/images/back-bg.jpg' },
    { id: 'Legs', label: 'LEGS', iconUrl: '/images/legs-bg.jpg' },
    { id: 'Arms', label: 'ARMS', iconUrl: '/images/arms-bg.jpg' },
    { id: 'Core', label: 'CORE', iconUrl: '/images/core-bg.jpg' },
];

// Reusable transition variants for layout swapping
const viewVariants = {
    initial: { opacity: 0, scale: 0.95, filter: 'blur(10px)' },
    animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
    exit: { opacity: 0, scale: 1.05, filter: 'blur(10px)' },
};

export default function LibraryPage() {
    const { theme } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [exercises, setExercises] = useState<LiveExercise[]>([]);

    // Hot-Reloading Fetch Logic
    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const res = await fetch('/api/library');
                if (res.ok) {
                    const data = await res.json();
                    setExercises(data);
                }
            } catch (error) {
                console.error("Failed to fetch library:", error);
            }
        };

        fetchLibrary(); // Initial fetch
        const interval = setInterval(fetchLibrary, 3000); // Poll every 3 seconds for drop-in MP4s
        return () => clearInterval(interval);
    }, []);

    // Filter exercises based on selected category from the live API data
    const filteredExercises = useMemo(() => {
        if (!selectedCategory) return [];
        return exercises.filter(ex => ex.category === selectedCategory);
    }, [selectedCategory, exercises]);

    return (
        <AnimatePresence mode="wait">
            <motion.main
                key={theme.mode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                className="min-h-screen relative overflow-hidden pb-24 lg:pb-0"
            >
                <Navbar />
                <Sidebar />

                {/* Background with radial glow matching Dashboard */}
                <div
                    className="fixed inset-0 -z-10 transition-all duration-[800ms]"
                    style={{
                        background: theme.bgGlow,
                    }}
                />

                <section className="pt-28 pb-16 px-6 sm:px-8 lg:px-24 lg:pl-32">
                    <div className="max-w-[1800px] mx-auto relative">

                        {/* Header Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-12 text-center"
                        >
                            <h1
                                className="text-5xl lg:text-7xl font-bold mb-4 tracking-tighter uppercase"
                                style={{
                                    fontFamily: 'var(--font-archivo-black), sans-serif',
                                    textShadow: theme.mode === 'savage' ? `0 0 40px ${theme.accent}40` : 'none'
                                }}
                            >
                                THE <span style={{ color: theme.accent }}>ARMORY</span>
                            </h1>
                            <p className="text-lg opacity-60 font-medium tracking-wide uppercase">
                                SELECT YOUR TARGET
                            </p>
                        </motion.div>

                        {/* Animated View Container with Savage Cyan Glow during transition */}
                        <div className="relative">

                            {/* Ambient Glow behind the views */}
                            <AnimatePresence>
                                {selectedCategory && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-0 pointer-events-none"
                                        style={{
                                            background: `radial-gradient(circle at top, ${theme.accent}20 0%, transparent 60%)`,
                                            filter: 'blur(60px)'
                                        }}
                                    />
                                )}
                            </AnimatePresence>

                            <AnimatePresence mode="wait">
                                {!selectedCategory ? (
                                    /* --- VIEW 1: CATEGORY GRID --- */
                                    <motion.div
                                        key="category-grid"
                                        variants={viewVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6 relative z-10"
                                    >
                                        {CATEGORIES.map((category, idx) => (
                                            <motion.div
                                                key={category.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                onClick={() => setSelectedCategory(category.id)}
                                                className="group relative h-40 lg:h-64 rounded-[24px] overflow-hidden flex flex-col items-center justify-center cursor-pointer backdrop-blur-3xl transition-all duration-300"
                                                style={{
                                                    backgroundColor: theme.cardBg,
                                                    border: `1px solid ${theme.borderColor}`,
                                                }}
                                                whileHover={{ y: -5, scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {/* Savage Cyan Hover Glow Effect */}
                                                <div
                                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                                                    style={{ boxShadow: `inset 0 0 50px ${theme.accent}40`, border: `2px solid ${theme.accent}80`, borderRadius: '24px' }}
                                                />

                                                {/* High Contrast Background Placeholder */}
                                                <div
                                                    className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity duration-500"
                                                    style={{
                                                        background: `radial-gradient(circle at center, ${theme.accent}60 0%, transparent 70%)`,
                                                        filter: 'blur(20px)'
                                                    }}
                                                />

                                                {/* Category Label */}
                                                <h3
                                                    className="text-2xl lg:text-3xl font-bold tracking-tighter uppercase z-10 transition-transform duration-300 group-hover:scale-110"
                                                    style={{
                                                        fontFamily: 'var(--font-archivo-black), sans-serif',
                                                    }}
                                                >
                                                    {category.label}
                                                </h3>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                ) : (
                                    /* --- VIEW 2: EXERCISE LIST --- */
                                    <motion.div
                                        key="exercise-list"
                                        variants={viewVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                        className="relative z-10"
                                    >
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                                            <h2 className="text-3xl lg:text-4xl font-bold tracking-tighter uppercase" style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}>
                                                {selectedCategory} <span style={{ color: theme.accent }}>TARGETS</span>
                                            </h2>

                                            {/* Navigation Fix: Return to Category Grid */}
                                            <button
                                                onClick={() => setSelectedCategory(null)}
                                                className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider backdrop-blur-xl transition-all hover:-translate-x-2"
                                                style={{
                                                    border: `1px solid ${theme.borderColor}`,
                                                    backgroundColor: theme.cardBg
                                                }}
                                            >
                                                ← Back to Categories
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                                            {filteredExercises.map((exercise, idx) => (
                                                <ExerciseCard
                                                    key={exercise.id}
                                                    exercise={exercise}
                                                    delay={idx * 0.15}
                                                />
                                            ))}
                                            {filteredExercises.length === 0 && (
                                                <div className="col-span-full py-24 text-center opacity-50 rounded-[32px] border" style={{ borderColor: theme.borderColor, backgroundColor: theme.cardBg }}>
                                                    <h3 className="text-2xl font-bold mb-2">No exercises found</h3>
                                                    <p>We couldn't find any target data for this category.</p>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </section>

                {/* Mobile Navigation Bar */}
                <MobileNav />
            </motion.main>
        </AnimatePresence>
    );
}
