"use client";

import { useWorkout } from '@/contexts/WorkoutContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Zap } from 'lucide-react';

export default function PRCelebration() {
    const { latestPR, clearPR } = useWorkout();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Preload an optional victory sound (if added to public in the future)
        audioRef.current = new Audio('/sounds/victory.mp3');
        audioRef.current.volume = 0.5;
    }, []);

    useEffect(() => {
        if (latestPR) {
            // Trigger Confetti Explosion
            const duration = 3000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.8 },
                    colors: ['#00E6FF', '#FFD700', '#FFFFFF']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.8 },
                    colors: ['#00E6FF', '#FFD700', '#FFFFFF']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();

            // Attempt to play sound
            if (audioRef.current) {
                audioRef.current.play().catch(e => {
                    // Browser policy blocked autoplay, fail silently
                    console.log('Audio autoplay blocked, skipping victory sound.');
                });
            }

            // Auto-clear celebration after 5 seconds
            const timer = setTimeout(() => {
                clearPR();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [latestPR, clearPR]);

    return (
        <AnimatePresence>
            {latestPR && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none p-4"
                >
                    {/* Dark radial overlay for focus */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm -z-10" />

                    <motion.div
                        initial={{ scale: 0.5, y: 50 }}
                        animate={{ scale: 1, y: 0, transition: { type: 'spring', damping: 12 } }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="relative flex flex-col items-center text-center p-12 rounded-[40px] border border-[#00E6FF]/30 bg-[#0A0A0A]/90 shadow-[0_0_100px_rgba(0,230,255,0.2)]"
                        style={{ overflow: 'hidden' }}
                    >
                        {/* Shimmer effect */}
                        <motion.div
                            className="absolute inset-0 z-0 opacity-50"
                            animate={{
                                backgroundPosition: ['200% center', '-200% center']
                            }}
                            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                            style={{
                                background: 'linear-gradient(90deg, transparent, rgba(0,230,255,0.1), transparent)',
                                backgroundSize: '200% 100%'
                            }}
                        />

                        {/* Content */}
                        <div className="relative z-10 flex flex-col items-center">
                            <motion.div
                                initial={{ rotate: -180, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: 'spring', damping: 10, delay: 0.2 }}
                                className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_#FFD700]"
                                style={{ backgroundColor: 'rgba(255, 215, 0, 0.15)', border: '2px solid #FFD700' }}
                            >
                                <Crown size={48} color="#FFD700" fill="#FFD700" />
                            </motion.div>

                            <motion.h2
                                className="text-4xl sm:text-6xl font-black italic mb-4 tracking-tighter uppercase"
                                style={{
                                    fontFamily: 'var(--font-archivo-black)',
                                    color: '#fff',
                                    textShadow: '0 0 20px #00E6FF, 0 0 40px #00E6FF, 2px 2px 0 #000'
                                }}
                                animate={{ opacity: [0, 1, 0.5, 1, 1], textShadow: ['none', '0 0 20px #00E6FF'] }}
                                transition={{ duration: 0.5 }}
                            >
                                Savage PR
                            </motion.h2>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex items-center gap-4 text-2xl font-semibold"
                            >
                                <span className="opacity-80">{latestPR.title}</span>
                                <Zap className="text-[#00E6FF]" fill="#00E6FF" />
                                <span className="text-[#00E6FF]">{latestPR.weight} kg</span>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
