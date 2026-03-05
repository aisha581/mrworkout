"use client";

import { useCircuit } from '@/contexts/CircuitContext';
import { motion } from 'framer-motion';

export default function CircuitHUD() {
    const { queue, currentIndex, currentSet, loopCount } = useCircuit();
    const currentExercise = queue[currentIndex];
    const nextExercise = queue[currentIndex + 1];

    if (!currentExercise) return null;

    return (
        <div className="absolute inset-0 pointer-events-none z-30">
            {/* Top Left: Next Up */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-10 left-10 p-4 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10"
            >
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#00FFFF]/60 mb-1">Next Up</p>
                <p className="font-bold text-lg uppercase tracking-tight">
                    {nextExercise ? nextExercise.name : "Finisher"}
                </p>
            </motion.div>

            {/* Top Right: Intensity Meter */}
            <div className="absolute top-10 right-10 flex flex-col items-end">
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#00FFFF]/60 mb-2">Intensity</p>
                <div className="w-48 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                        initial={{ width: "20%" }}
                        animate={{
                            width: ["30%", "60%", "40%", "80%", "50%"],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="h-full bg-[#00FFFF]"
                        style={{ boxShadow: '0 0 15px #00FFFF' }}
                    />
                </div>
            </div>

            {/* Bottom Left: Set Tracker */}
            <div className="absolute bottom-12 left-10">
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#00FFFF]/60 mb-1">Progress</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black italic">SET {currentSet}</span>
                    <span className="text-xl opacity-40 font-bold uppercase">of 3</span>
                </div>
            </div>

            {/* Bottom Center: Rep Goal */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-center">
                <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#00FFFF]/60 mb-1">Rep Goal</p>
                <h2 className="text-7xl font-black uppercase italic tracking-tighter text-[#00FFFF]" style={{ textShadow: '0 0 30px rgba(0,255,255,0.4)' }}>
                    20 REPS
                </h2>
                <div className="flex justify-center gap-1 mt-2">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`h-1 w-8 rounded-full transition-colors duration-500 ${i <= loopCount ? 'bg-[#00FFFF]' : 'bg-white/10'}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
