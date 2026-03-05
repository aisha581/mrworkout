"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ReactNode, useRef } from 'react';

interface LuxuryCardProps {
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    delay?: number;
}

export default function LuxuryCard({ children, className = '', style = {}, delay = 0 }: LuxuryCardProps) {
    const { theme } = useTheme();
    const cardRef = useRef<HTMLDivElement>(null);

    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [5, -5]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-5, 5]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseXRelative = (e.clientX - centerX) / rect.width;
        const mouseYRelative = (e.clientY - centerY) / rect.height;

        mouseX.set(mouseXRelative);
        mouseY.set(mouseYRelative);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -6, transition: { duration: 0.3 } }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
                ...style,
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.borderColor}`,
                boxShadow: theme.mode === 'savage'
                    ? `0 0 20px rgba(0, 229, 204, 0.1), 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)`
                    : `0 4px 24px rgba(183, 110, 121, 0.12), 0 8px 32px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
            }}
            className={`backdrop-blur-3xl ${className}`}
        >
            {children}
        </motion.div>
    );
}
