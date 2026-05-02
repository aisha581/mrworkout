"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import ExerciseCard from '@/components/ExerciseCard';
import { useCircuit } from '@/contexts/CircuitContext';
import { Search, X, Filter, Building2, Dumbbell } from 'lucide-react';
import type { Exercise } from '@/data/libraryData';
import { EXERCISE_EQUIPMENT, type EquipmentType } from '@/data/libraryData';

// Extended Exercise to account for dynamic API availability states
export interface LiveExercise extends Exercise {
    isAvailable?: boolean;
    audioUrl?: string;
}

const MUSCLE_FILTERS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core'];
const EQUIPMENT_FILTERS: EquipmentType[] = ['Dumbbells', 'Barbell', 'Cable', 'Bodyweight', 'Machine'];
const HOME_EQUIPMENT: EquipmentType[] = ['Dumbbells', 'Bodyweight'];

export default function LibraryPage() {
    const { theme } = useTheme();

    const { setQueue, startCircuit } = useCircuit();
    const router = useRouter();

    const [exercises,         setExercises]       = useState<LiveExercise[]>([]);
    const [isLoading,         setIsLoading]       = useState(true);
    const [searchQuery,       setSearchQuery]     = useState('');
    const [selectedMuscle,      setSelectedMuscle]    = useState<string | null>(null);
    const [selectedEquipment,   setSelectedEquipment] = useState<EquipmentType | null>(null);
    const [gymMode,             setGymMode]           = useState<'GYM' | 'HOME'>('GYM');

    // ── Data Fetching ────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const res = await fetch('/api/library');
                if (res.ok) {
                    const data = await res.json();
                    setExercises(prev =>
                        JSON.stringify(prev) === JSON.stringify(data) ? prev : data
                    );
                    setIsLoading(false);
                }
            } catch (error) {
                console.error('Failed to fetch library:', error);
            }
        };
        fetchLibrary();
        const interval = setInterval(fetchLibrary, 5000);
        return () => clearInterval(interval);
    }, []);

    // ── Performance-Optimized Filtering ──────────────────────────────────────
    const displayedExercises = useMemo(() => {
        let filtered = exercises;

        // 0. Home mode — restrict to dumbbells + bodyweight
        if (gymMode === 'HOME') {
            filtered = filtered.filter(ex => HOME_EQUIPMENT.includes(EXERCISE_EQUIPMENT[ex.id] as EquipmentType));
        }

        // 1. Muscle Filter
        if (selectedMuscle) {
            const m = selectedMuscle.toLowerCase();
            filtered = filtered.filter(ex =>
                ex.category.toLowerCase() === m ||
                ex.targetMuscle.toLowerCase().includes(m)
            );
        }

        // 2. Equipment Filter (only relevant in GYM mode)
        if (selectedEquipment && gymMode === 'GYM') {
            filtered = filtered.filter(ex => EXERCISE_EQUIPMENT[ex.id] === selectedEquipment);
        }

        // 3. Search Intersect
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(ex =>
                ex.name.toLowerCase().includes(q) ||
                ex.targetMuscle.toLowerCase().includes(q) ||
                ex.category.toLowerCase().includes(q)
            );
        }

        return filtered;
    }, [exercises, searchQuery, selectedMuscle, selectedEquipment, gymMode]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleStartWorkout = useCallback((exercise: LiveExercise) => {
        navigator.vibrate?.([30, 20, 30]);
        setQueue([exercise]);
        router.push('/playground');
    }, [setQueue, router]);

    const resetFilters = () => {
        setSelectedMuscle(null);
        setSelectedEquipment(null);
        setSearchQuery('');
    };

    const isFiltered = !!(selectedMuscle || selectedEquipment || searchQuery);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <main
            className="min-h-screen relative overflow-x-hidden pb-24 lg:pb-0 font-sans"
            style={{ backgroundColor: theme.bg }}
        >
            <Navbar />
            <Sidebar />

            {/* Background glow */}
            <div
                className="fixed inset-0 -z-10 transition-all duration-[800ms]"
                style={{ background: theme.bgGlow }}
            />

            {/* ── STICKY HEADER ─────────────────────────────────────────────── */}
            <header 
                className="sticky top-0 z-40 pt-28 pb-6 px-6 sm:px-8 lg:px-24 lg:pl-32 backdrop-blur-xl border-b transition-all duration-300"
                style={{ 
                    borderBottomColor: isFiltered ? `${theme.accent}20` : 'rgba(255,255,255,0.05)',
                    backgroundColor: `${theme.bg}B0`,
                    boxShadow: isFiltered ? `0 10px 40px -10px ${theme.accent}15` : 'none'
                }}
            >
                <div className="max-w-[1800px] mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-6 flex-wrap">
                            <div>
                                <h1 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase leading-none mb-1"
                                    style={{
                                        fontFamily: 'var(--font-archivo-black), sans-serif',
                                        textShadow: `0 0 40px ${theme.accent}40`,
                                    }}
                                >
                                    THE <span style={{ color: theme.accent }}>ARMORY</span>
                                </h1>
                                <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Advanced Arsenal // v2.4</p>
                            </div>

                            {/* ── Home / Gym segmented control ── */}
                            <div
                                className="flex items-center rounded-2xl p-1 gap-1 self-start mt-1"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border:     '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                {(['GYM', 'HOME'] as const).map(mode => {
                                    const active = gymMode === mode;
                                    return (
                                        <button
                                            key={mode}
                                            onClick={() => {
                                                navigator.vibrate?.(8);
                                                setGymMode(mode);
                                                if (mode === 'HOME') setSelectedEquipment(null);
                                            }}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] transition-all duration-200"
                                            style={{
                                                background: active ? theme.accent : 'transparent',
                                                color:      active ? '#000' : 'rgba(255,255,255,0.35)',
                                                boxShadow:  active ? `0 0 14px ${theme.accent}50` : 'none',
                                            }}
                                        >
                                            {mode === 'GYM'
                                                ? <Building2 size={11} />
                                                : <Dumbbell  size={11} />
                                            }
                                            {mode}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search Bar with Glow */}
                        <div className="relative w-full max-w-sm">
                            <Search
                                size={18}
                                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                                style={{ color: searchQuery ? theme.accent : 'rgba(255,255,255,0.2)' }}
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search exercises, muscles..."
                                className="w-full py-4 pl-12 pr-12 rounded-2xl text-sm bg-black/40 text-white placeholder-white/20 outline-none transition-all duration-300"
                                style={{
                                    border: `1px solid ${searchQuery ? theme.accent + '40' : 'rgba(255,255,255,0.1)'}`,
                                    boxShadow: searchQuery ? `0 0 20px ${theme.accent}10, inset 0 0 10px ${theme.accent}05` : 'none',
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-all"
                                >
                                    <X size={14} className="text-white/40" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Dual-Row Filters */}
                    <div className="mt-8 space-y-4">
                        {/* Muscle Row */}
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30 shrink-0 min-w-[50px]">Muscle</span>
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-nowrap">
                                {MUSCLE_FILTERS.map(m => (
                                    <button
                                        key={m}
                                        onClick={() => {
                                            if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                                            setSelectedMuscle(selectedMuscle === m ? null : m);
                                        }}
                                        className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200"
                                        style={{
                                            background: selectedMuscle === m ? `${theme.accent}20` : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${selectedMuscle === m ? theme.accent : 'rgba(255,255,255,0.05)'}`,
                                            color: selectedMuscle === m ? theme.accent : 'rgba(255,255,255,0.4)',
                                            boxShadow: selectedMuscle === m ? `0 0 15px ${theme.accent}20` : 'none'
                                        }}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Equipment Row */}
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-30 shrink-0 min-w-[50px]">Equipment</span>
                            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar flex-nowrap">
                                {EQUIPMENT_FILTERS.map(e => (
                                    <button
                                        key={e}
                                        onClick={() => {
                                            if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                                            setSelectedEquipment(selectedEquipment === e ? null : e);
                                        }}
                                        className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200"
                                        style={{
                                            background: selectedEquipment === e ? `${theme.accent}15` : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${selectedEquipment === e ? theme.accent + '80' : 'rgba(255,255,255,0.05)'}`,
                                            color: selectedEquipment === e ? theme.accent : 'rgba(255,255,255,0.4)',
                                            boxShadow: selectedEquipment === e ? `0 0 15px ${theme.accent}10` : 'none'
                                        }}
                                    >
                                        {e === 'Cable' ? 'Cables' : e}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── CONTENT AREA ───────────────────────────────────────────────── */}
            <section className="py-12 px-6 sm:px-8 lg:px-24 lg:pl-32">
                <div className="max-w-[1800px] mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-px w-8 bg-current opacity-20" />
                            <h2 className="text-sm font-black uppercase tracking-[0.4em] opacity-60">
                                Results <span className="ml-2" style={{ color: theme.accent }}>{displayedExercises.length}</span>
                            </h2>
                        </div>
                        
                        {isFiltered && (
                            <button 
                                onClick={resetFilters}
                                className="text-[10px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2"
                            >
                                <X size={12} /> Clear Filters
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                        {isLoading ? (
                            // ── Loading Skeletons ────────────────────────────
                            // 8 placeholder cards prevent the "black void" while
                            // the API response is in-flight (~200-400 ms).
                            Array.from({ length: 8 }).map((_, i) => (
                                <ExerciseCardSkeleton key={i} />
                            ))
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {displayedExercises.map((exercise, idx) => (
                                    <motion.div
                                        key={exercise.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.2) }}
                                    >
                                        <ExerciseCard
                                            exercise={exercise}
                                            onStartWorkout={handleStartWorkout}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        )}
                    </div>

                    {displayedExercises.length === 0 && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-32 text-center rounded-[40px] border border-dashed border-white/10 bg-white/[0.01]"
                        >
                            <Filter size={48} className="mx-auto mb-6 opacity-10" />
                            <h3 className="text-2xl font-bold mb-2 uppercase tracking-tighter">Zero Hostiles Detected</h3>
                            <p className="text-white/40 max-w-xs mx-auto text-sm">No exercises match your current filter parameters. Try expanding your search or clearing filters.</p>
                            <button 
                                onClick={resetFilters}
                                className="mt-8 px-8 py-3 rounded-full bg-white text-black font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                            >
                                Reset Arsenal
                            </button>
                        </motion.div>
                    )}
                </div>
            </section>


        </main>
    );
}

// ── Exercise Card Skeleton ────────────────────────────────────────────────────
// Matches the exact dimensions of ExerciseCard so the layout doesn't shift
// when real cards replace the skeletons. Uses a shimmer animation to signal
// "loading" without displaying a black void.
function ExerciseCardSkeleton() {
    return (
        <div
            className="rounded-[24px] overflow-hidden"
            style={{
                backgroundColor: '#181818',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            {/* Video placeholder — h-48 matches ExerciseCard */}
            <div className="relative h-48 w-full overflow-hidden bg-[#0f0f0f]">
                <div className="absolute inset-0 skeleton-shimmer" />
            </div>

            {/* Text area */}
            <div className="p-6 bg-[#0c0c0c] space-y-3">
                {/* Title line */}
                <div className="h-5 w-3/4 rounded-lg overflow-hidden bg-white/5">
                    <div className="h-full w-full skeleton-shimmer" />
                </div>
                {/* Sub-title line */}
                <div className="h-3.5 w-1/2 rounded-lg overflow-hidden bg-white/5">
                    <div className="h-full w-full skeleton-shimmer" />
                </div>
                {/* Tip block */}
                <div className="mt-4 h-14 w-full rounded-xl overflow-hidden bg-white/[0.03]">
                    <div className="h-full w-full skeleton-shimmer" />
                </div>
            </div>

            <style jsx>{`
                @keyframes shimmer {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(100%);  }
                }
                .skeleton-shimmer {
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(255, 255, 255, 0.04) 50%,
                        transparent 100%
                    );
                    animation: shimmer 1.6s infinite;
                }
            `}</style>
        </div>
    );
}
