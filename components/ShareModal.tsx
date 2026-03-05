"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { WorkoutLog } from '@/utils/workoutParser';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { Share, X, ImageIcon, PenTool, CheckCircle2, Download } from 'lucide-react';
import MuscleHeatmap from './MuscleHeatmap';
import html2canvas from 'html2canvas';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    workoutLog: WorkoutLog | null;
}

type ShareMode = 'graphic' | 'photo';

export default function ShareModal({ isOpen, onClose, workoutLog }: ShareModalProps) {
    const { theme } = useTheme();
    const [mode, setMode] = useState<ShareMode>('graphic');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Hidden inputs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const exportNodeRef = useRef<HTMLDivElement>(null);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setPhotoUrl(event.target?.result as string);
                setMode('photo');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleExport = async () => {
        if (!exportNodeRef.current || !workoutLog) return;

        setIsExporting(true);
        try {
            // html2canvas rendering
            const canvas = await html2canvas(exportNodeRef.current, {
                useCORS: true,
                backgroundColor: null,
                scale: 3, // High-res export
            });

            const dataUrl = canvas.toDataURL('image/png');

            // Try Native Web Share API
            if (navigator.share) {
                try {
                    // Convert Data URL to Blob -> File
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    const file = new File([blob], `savage-pr-${Date.now()}.png`, { type: 'image/png' });

                    await navigator.share({
                        title: 'Savage Workout',
                        text: `Crushed a ${workoutLog.isPR ? 'new PR' : 'savage set'} on ${workoutLog.title}.`,
                        files: [file]
                    });
                } catch (shareErr) {
                    console.log('User cancelled share or API failed. Falling back to download.');
                    downloadFallback(dataUrl, `savage-pr-${Date.now()}.png`);
                }
            } else {
                // Fallback direct download
                downloadFallback(dataUrl, `savage-pr-${Date.now()}.png`);
            }

            onClose();
        } catch (err) {
            console.error('Failed to generate export:', err);
        } finally {
            setIsExporting(false);
        }
    };

    const downloadFallback = (dataUrl: string, filename: string) => {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
    };

    if (!workoutLog) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[150] flex flex-col items-center justify-end sm:justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="w-full max-w-sm rounded-t-[32px] sm:rounded-[32px] p-6 relative flex flex-col"
                        style={{
                            backgroundColor: theme.cardBg,
                            border: `1px solid ${theme.borderColor}`,
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold uppercase tracking-widest">Share to Story</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Mode Toggles */}
                        <div className="flex bg-black/40 p-1 rounded-2xl mb-6">
                            <button
                                onClick={() => setMode('graphic')}
                                className="flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                                style={{
                                    backgroundColor: mode === 'graphic' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: mode === 'graphic' ? '#fff' : 'rgba(255,255,255,0.4)'
                                }}
                            >
                                <PenTool size={16} /> Graphic
                            </button>
                            <button
                                onClick={() => {
                                    if (!photoUrl) fileInputRef.current?.click();
                                    else setMode('photo');
                                }}
                                className="flex-1 py-2 text-sm font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                                style={{
                                    backgroundColor: mode === 'photo' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    color: mode === 'photo' ? '#fff' : 'rgba(255,255,255,0.4)'
                                }}
                            >
                                <ImageIcon size={16} /> Photo
                            </button>
                        </div>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />

                        {/* The Export Node (9:16 Aspect Ratio Target) */}
                        <div className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden mb-6 mx-auto shadow-2xl"
                            id="share-target"
                            ref={exportNodeRef}
                            style={{
                                backgroundColor: '#060606', // Base fallback
                            }}
                        >
                            {/* Background Rendering */}
                            {mode === 'photo' && photoUrl ? (
                                <>
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url(${photoUrl})` }}
                                    />
                                    {/* Legibility Dark Overlay for Neon Text */}
                                    <div className="absolute inset-0 bg-black/60" />
                                </>
                            ) : (
                                /* Mesh Gradient Background for Graphic Mode */
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        backgroundImage: `
                                            radial-gradient(circle at 10% 20%, rgba(2, 11, 20, 0.8), transparent 40%),
                                            radial-gradient(circle at 90% 80%, rgba(0, 230, 255, 0.1), transparent 50%),
                                            radial-gradient(circle at 50% 50%, #060606, #0A0A0A)
                                        `
                                    }}
                                />
                            )}

                            {/* Verified Savage Badge (Top Left) */}
                            <div className="absolute top-6 left-6 flex items-center gap-2">
                                <CheckCircle2 size={16} color="#FFD700" fill="#FFD700" />
                                <span className="text-xs font-bold uppercase tracking-widest text-[#FFD700] drop-shadow-[0_0_5px_#FFD700]">
                                    Verified Savage
                                </span>
                            </div>

                            {/* Center Content: Stats & Heatmap */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                                {/* Title */}
                                <h1
                                    className="text-3xl sm:text-4xl uppercase mb-2"
                                    style={{ fontFamily: 'var(--font-archivo-black)' }}
                                >
                                    {workoutLog.title}
                                </h1>

                                {/* Stats Block */}
                                <div className="flex flex-col items-center mb-8">
                                    {workoutLog.weight && (
                                        <div
                                            className="text-5xl font-black italic tracking-tighter"
                                            style={{ color: '#00E6FF', textShadow: '0 0 20px rgba(0,230,255,0.5)' }}
                                        >
                                            {workoutLog.weight} KH
                                        </div>
                                    )}
                                    <div className="text-xl font-bold uppercase opacity-80 tracking-widest mt-2">{workoutLog.sets} Sets {workoutLog.reps ? `x ${workoutLog.reps} Reps` : ''}</div>
                                </div>

                                {/* Isolated Heatmap */}
                                <div className="w-[180px] h-[250px] relative pointer-events-none">
                                    <MuscleHeatmap isolatedLog={workoutLog} />
                                </div>
                            </div>

                            {/* Branding Footer */}
                            <div className="absolute bottom-6 w-full text-center">
                                <span className="text-[#00E6FF] text-[10px] font-bold tracking-[0.2em] opacity-80">
                                    LOGGED VIA COMMAND CENTER
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            {mode === 'photo' && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 py-4 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all bg-white/5 border border-white/10"
                                >
                                    Retake
                                </button>
                            )}
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex-[2] py-4 rounded-2xl font-bold uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2"
                                style={{
                                    backgroundColor: theme.accent,
                                    color: '#000',
                                    boxShadow: `0 0 20px ${theme.accent}60`
                                }}
                            >
                                {isExporting ? (
                                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Share size={18} /> Export to Story
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
