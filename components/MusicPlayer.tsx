"use client";

import { useWorkout } from '@/contexts/WorkoutContext';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function MusicPlayer() {
    const { isMusicVisible, toggleMusic } = useWorkout();
    const { theme } = useTheme();

    return (
        <AnimatePresence>
            {isMusicVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="fixed bottom-6 left-[100px] z-50 w-[350px] shadow-2xl rounded-[24px] overflow-hidden backdrop-blur-3xl"
                    style={{
                        backgroundColor: theme.mode === 'savage' ? '#181818' : theme.cardBg,
                        border: `1px solid ${theme.mode === 'savage' ? '#1DB954' : theme.borderColor}`,
                        boxShadow: theme.mode === 'savage' ? `0 10px 40px rgba(29, 185, 84, 0.2)` : undefined
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/20">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                            <span className="font-bold text-sm tracking-widest uppercase" style={{ color: '#1DB954' }}>
                                Savage Station
                            </span>
                        </div>
                        <button
                            onClick={toggleMusic}
                            className="p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <X size={16} className="opacity-60 hover:opacity-100" />
                        </button>
                    </div>

                    {/* Spotify Iframe */}
                    <div className="p-4" style={{ height: '390px' }}>
                        <iframe
                            style={{ borderRadius: '12px' }}
                            src="https://open.spotify.com/embed/playlist/37i9dQZF1EIeO6KqI6iZ9D?utm_source=generator&theme=0"
                            width="100%"
                            height="352"
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                        ></iframe>
                        <p className="text-[10px] opacity-40 text-center mt-3 leading-tight">
                            Use player controls for volume. <br />
                            Auto-mutes background elements are limited by cross-origin security.
                        </p>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
