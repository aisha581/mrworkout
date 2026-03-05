"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion } from 'framer-motion';

export default function Waveform() {
    const { theme } = useTheme();

    const bars = Array.from({ length: 5 });

    return (
        <div className="flex items-center justify-center gap-1.5 h-12">
            {bars.map((_, index) => (
                <motion.div
                    key={index}
                    className="w-1 rounded-full"
                    style={{
                        backgroundColor: theme.accent,
                    }}
                    animate={{
                        height: ['20%', '100%', '20%'],
                        opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: index * 0.15,
                        ease: 'easeInOut',
                    }}
                />
            ))}
        </div>
    );
}
