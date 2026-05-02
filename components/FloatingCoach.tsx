"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { usePathname } from "next/navigation";
import { hapticMedium } from "@/utils/haptic";
import CoachDrawer from "@/components/CoachDrawer";
import BrandLogo from "@/components/BrandLogo";

// Pages where the button should hide (has its own coach integration or is full-screen)
const HIDDEN_PATHS = ["/onboarding", "/login", "/join", "/auth-redirect"];

export default function FloatingCoach() {
    const { theme }        = useTheme();
    const pathname         = usePathname();
    const [open, setOpen]  = useState(false);

    // Hide on certain pages
    if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null;

    return (
        <>
            {/* ── Floating button ── */}
            <AnimatePresence>
                {!open && (
                    <motion.button
                        key="gym-fab"
                        initial={{ opacity: 0, scale: 0.7, y: 20 }}
                        animate={{ opacity: 1, scale: 1,   y: 0  }}
                        exit={{    opacity: 0, scale: 0.7, y: 20  }}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => { hapticMedium(); setOpen(true); }}
                        className="fixed z-[150] flex flex-col items-center justify-center font-black text-black select-none"
                        style={{
                            bottom:      "calc(max(env(safe-area-inset-bottom, 0px), 16px) + 72px)",
                            right:       "16px",
                            width:       "54px",
                            height:      "54px",
                            borderRadius: "18px",
                            background:  `linear-gradient(135deg, ${theme.accent} 0%, ${theme.accent}cc 100%)`,
                            boxShadow:   `0 0 28px ${theme.accent}60, 0 4px 20px rgba(0,0,0,0.5)`,
                            fontFamily:  "var(--font-archivo-black), sans-serif",
                            fontSize:    "18px",
                            touchAction: "manipulation",
                        }}
                        aria-label="Open Gym AI Coach"
                    >
                        {/* Pulse ring */}
                        <motion.div
                            className="absolute inset-0 rounded-[18px] pointer-events-none"
                            animate={{
                                boxShadow: [
                                    `0 0 0 0px ${theme.accent}50`,
                                    `0 0 0 10px ${theme.accent}00`,
                                ],
                            }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                        />
                        <BrandLogo
                            size={22}
                            fallback="G"
                            accent="#000"
                            className="relative z-10"
                        />
                        <span
                            className="relative z-10 text-[7px] font-black uppercase tracking-widest opacity-75 leading-none mt-0.5"
                        >
                            GYM
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>

            {/* ── Chat drawer ── */}
            <CoachDrawer
                isOpen={open}
                onClose={() => setOpen(false)}
                accent={theme.accent}
            />
        </>
    );
}
