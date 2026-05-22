"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';

interface ToastProps {
    message: string;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, isVisible, onClose, duration = 3000 }: ToastProps) {
    const { theme } = useTheme();

    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-md"
                >
                    <div
                        className="px-6 py-4 rounded-[24px] backdrop-blur-3xl flex items-start gap-3 shadow-2xl"
                        style={{
                            backgroundColor: theme.cardBg,
                            border: `1px solid ${theme.borderColor}`,
                            boxShadow: theme.mode === 'savage'
                                ? `0 0 30px rgba(0, 229, 204, 0.2), 0 12px 40px rgba(0, 0, 0, 0.4)`
                                : `0 8px 32px rgba(183, 110, 121, 0.15), 0 12px 40px rgba(0, 0, 0, 0.1)`,
                        }}
                    >
                        {/* Success icon */}
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                                backgroundColor: `${theme.accent}20`,
                            }}
                        >
                            <CheckCircle2
                                size={20}
                                strokeWidth={2.5}
                                style={{ color: theme.accent }}
                            />
                        </div>

                        {/* Message */}
                        <div className="flex-1 pt-1">
                            <div className="text-sm font-semibold mb-1" style={{ color: theme.accent }}>
                                {theme.mode === 'savage' ? 'Savage!' : 'Amazing!'}
                            </div>
                            <p className="text-sm leading-relaxed opacity-90">
                                {message}
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
