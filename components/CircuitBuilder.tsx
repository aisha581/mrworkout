"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { GripVertical, Play, Trash2, Plus, X, Search, Zap } from 'lucide-react';
import type { LiveExercise } from '@/app/library/page';
import { useState, useEffect, useMemo } from 'react';

export default function CircuitBuilder() {
    const { queue, setQueue, removeFromQueue, startCircuit, isCircuitActive, addToQueue } = useCircuit();
    const { theme } = useTheme();

    const [showPicker,  setShowPicker]  = useState(false);
    const [exercises,   setExercises]   = useState<LiveExercise[]>([]);
    const [search,      setSearch]      = useState('');
    const [loading,     setLoading]     = useState(false);

    useEffect(() => {
        if (!showPicker) return;
        setLoading(true);
        fetch('/api/library')
            .then(r => r.json())
            .then(data => { setExercises(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [showPicker]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return exercises;
        return exercises.filter(ex =>
            ex.name.toLowerCase().includes(q) ||
            ex.targetMuscle.toLowerCase().includes(q) ||
            ex.category.toLowerCase().includes(q)
        );
    }, [exercises, search]);

    if (isCircuitActive) return null;

    return (
        <>
            {/* ── Circuit Builder ─────────────────────────────────────────── */}
            <section className="mt-12 mb-16">
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <h2
                            className="text-3xl font-bold tracking-tighter uppercase"
                            style={{
                                fontFamily: 'var(--font-archivo-black), sans-serif',
                                textShadow: `0 0 20px ${theme.accent}30`,
                            }}
                        >
                            Create Your <span style={{ color: theme.accent }}>Circuit</span>
                        </h2>
                        <p className="text-sm opacity-40 mt-1 uppercase tracking-widest font-bold text-xs">
                            Build your savage sequence
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Add Exercise button */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowPicker(true)}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em]"
                            style={{
                                background: `${theme.accent}18`,
                                border:     `1px solid ${theme.accent}40`,
                                color:      theme.accent,
                                boxShadow:  `0 0 16px ${theme.accent}15`,
                            }}
                        >
                            <Plus size={14} />
                            Add Exercise
                        </motion.button>

                        {queue.length > 0 && (
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={startCircuit}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] text-black"
                                style={{
                                    background: theme.accent,
                                    boxShadow:  `0 0 28px ${theme.accent}50`,
                                }}
                            >
                                <Zap size={14} fill="currentColor" />
                                Start
                            </motion.button>
                        )}
                    </div>
                </div>

                <div
                    className="rounded-[32px] border overflow-hidden"
                    style={{
                        background:   'rgba(8,8,8,0.8)',
                        borderColor:  queue.length > 0 ? `${theme.accent}20` : 'rgba(255,255,255,0.05)',
                        minHeight:    200,
                    }}
                >
                    {queue.length === 0 ? (
                        <button
                            onClick={() => setShowPicker(true)}
                            className="w-full h-full flex flex-col items-center justify-center gap-4 py-16 transition-all group"
                        >
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110"
                                style={{
                                    background: `${theme.accent}10`,
                                    border:     `1px dashed ${theme.accent}40`,
                                }}
                            >
                                <Plus size={28} style={{ color: theme.accent, opacity: 0.7 }} />
                            </div>
                            <div className="text-center">
                                <p className="font-black uppercase tracking-[0.3em] text-xs" style={{ color: theme.accent, opacity: 0.7 }}>
                                    Add Your First Exercise
                                </p>
                                <p className="text-[10px] opacity-30 mt-1 uppercase tracking-widest">
                                    Tap to open exercise library
                                </p>
                            </div>
                        </button>
                    ) : (
                        <div className="p-6">
                            <Reorder.Group
                                axis="y"
                                values={queue}
                                onReorder={setQueue}
                                className="space-y-3"
                            >
                                <AnimatePresence>
                                    {queue.map((exercise, idx) => (
                                        <Reorder.Item
                                            key={exercise.id}
                                            value={exercise}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20, height: 0 }}
                                            className="relative flex items-center gap-4 p-4 rounded-2xl group cursor-grab active:cursor-grabbing"
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                border:     '1px solid rgba(255,255,255,0.07)',
                                            }}
                                        >
                                            {/* Index */}
                                            <span
                                                className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0"
                                                style={{ background: `${theme.accent}15`, color: theme.accent }}
                                            >
                                                {idx + 1}
                                            </span>

                                            <div className="text-white/20 group-hover:text-white/40 transition-colors shrink-0">
                                                <GripVertical size={18} />
                                            </div>

                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                                                style={{ background: `${theme.accent}10`, color: `${theme.accent}80` }}
                                            >
                                                {exercise.category[0]}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-sm truncate">{exercise.name}</p>
                                                <p className="text-[10px] opacity-40 uppercase tracking-widest truncate">{exercise.targetMuscle}</p>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-[9px] uppercase font-black opacity-30 tracking-widest">3 Sets</p>
                                                    <p className="text-[9px] uppercase font-black tracking-widest" style={{ color: theme.accent, opacity: 0.6 }}>Auto-Advance</p>
                                                </div>
                                                <button
                                                    onClick={() => removeFromQueue(exercise.id)}
                                                    className="p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </Reorder.Item>
                                    ))}
                                </AnimatePresence>
                            </Reorder.Group>

                            {/* Add more */}
                            <button
                                onClick={() => setShowPicker(true)}
                                className="w-full mt-3 py-3 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[10px] tracking-[0.25em] transition-all hover:opacity-80"
                                style={{
                                    background:  `${theme.accent}08`,
                                    border:      `1px dashed ${theme.accent}25`,
                                    color:       `${theme.accent}60`,
                                }}
                            >
                                <Plus size={12} /> Add More
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Exercise Picker Modal ────────────────────────────────────── */}
            <AnimatePresence>
                {showPicker && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[650] bg-black/75 backdrop-blur-sm"
                            onClick={() => setShowPicker(false)}
                        />

                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
                            className="fixed inset-x-0 bottom-0 z-[660] rounded-t-[32px] flex flex-col overflow-hidden"
                            style={{
                                background:   '#0a0a0a',
                                border:       `1px solid ${theme.accent}20`,
                                borderBottom: 'none',
                                maxHeight:    '82dvh',
                            }}
                        >
                            {/* Top accent line */}
                            <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}60, transparent)` }} />

                            {/* Drag handle */}
                            <div className="flex justify-center pt-3 shrink-0">
                                <div className="w-10 h-1 rounded-full" style={{ background: `${theme.accent}30` }} />
                            </div>

                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pt-4 pb-3 shrink-0">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.5em] opacity-30 mb-0.5">Circuit Builder</p>
                                    <h3
                                        className="text-xl font-black uppercase"
                                        style={{ fontFamily: 'var(--font-archivo-black), sans-serif', color: theme.accent }}
                                    >
                                        Select Exercise
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowPicker(false)}
                                    className="w-9 h-9 rounded-full flex items-center justify-center"
                                    style={{ background: 'rgba(255,255,255,0.07)' }}
                                >
                                    <X size={15} className="opacity-60" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="relative px-6 pb-3 shrink-0">
                                <Search size={15} className="absolute left-10 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search exercises or muscles…"
                                    autoComplete="off"
                                    className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm outline-none"
                                    style={{
                                        background:  'rgba(255,255,255,0.05)',
                                        border:      `1px solid ${search ? theme.accent + '50' : 'rgba(255,255,255,0.08)'}`,
                                        color:       '#fff',
                                    }}
                                />
                            </div>

                            {/* Exercise list */}
                            <div className="overflow-y-auto flex-1 px-4 pb-8">
                                {loading ? (
                                    <div className="flex items-center justify-center py-16 opacity-30">
                                        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: `${theme.accent}40`, borderTopColor: theme.accent }} />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="text-center py-16 opacity-30">
                                        <p className="font-black uppercase tracking-widest text-xs">No results</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filtered.map(ex => {
                                            const inQueue = queue.some(q => q.id === ex.id);
                                            return (
                                                <button
                                                    key={ex.id}
                                                    onClick={() => {
                                                        if (!inQueue) {
                                                            navigator.vibrate?.([15, 10, 20]);
                                                            addToQueue(ex);
                                                        }
                                                        setShowPicker(false);
                                                    }}
                                                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                                                    style={{
                                                        background:  inQueue ? `${theme.accent}12` : 'rgba(255,255,255,0.03)',
                                                        border:      `1px solid ${inQueue ? theme.accent + '40' : 'rgba(255,255,255,0.06)'}`,
                                                    }}
                                                >
                                                    <div
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0"
                                                        style={{ background: `${theme.accent}12`, color: `${theme.accent}90` }}
                                                    >
                                                        {ex.category[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm truncate">{ex.name}</p>
                                                        <p className="text-[10px] opacity-35 uppercase tracking-widest truncate">{ex.targetMuscle}</p>
                                                    </div>
                                                    <div
                                                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                                        style={{
                                                            background: inQueue ? `${theme.accent}20` : `${theme.accent}15`,
                                                            color:      theme.accent,
                                                        }}
                                                    >
                                                        {inQueue
                                                            ? <span className="text-[8px] font-black uppercase">✓</span>
                                                            : <Plus size={14} />
                                                        }
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
