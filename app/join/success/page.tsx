"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, Zap } from "lucide-react";

export default function JoinSuccessPage() {
    const router = useRouter();

    useEffect(() => {
        try { localStorage.setItem("mw_is_pro", "true"); } catch {}
    }, []);

    return (
        <div className="fixed inset-0 bg-[#060606] flex flex-col items-center justify-center px-8 text-center">
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,215,0,0.09) 0%, transparent 70%)" }}
            />
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative z-10 flex flex-col items-center gap-5 max-w-sm w-full"
            >
                <motion.div
                    animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="w-24 h-24 rounded-[32px] flex items-center justify-center"
                    style={{
                        background: "linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,165,0,0.08))",
                        border:     "1px solid rgba(255,215,0,0.35)",
                        boxShadow:  "0 0 70px rgba(255,215,0,0.22)",
                    }}
                >
                    <Crown size={46} color="#FFD700" fill="rgba(255,215,0,0.35)" />
                </motion.div>

                <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">
                    You're now a
                </p>
                <h1
                    className="text-5xl font-black uppercase leading-none"
                    style={{
                        fontFamily:    "var(--font-archivo-black), sans-serif",
                        letterSpacing: "-0.03em",
                        color:         "#FFD700",
                        textShadow:    "0 0 60px rgba(255,215,0,0.55)",
                    }}
                >
                    Savage<br />Pro
                </h1>
                <p className="text-sm opacity-40 font-medium">
                    All 89 moves unlocked. Build anything.
                </p>
                <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => router.replace("/")}
                    className="mt-3 flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black w-full justify-center"
                    style={{
                        background:  "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                        boxShadow:   "0 0 40px rgba(255,215,0,0.4)",
                        touchAction: "manipulation",
                    }}
                >
                    <Zap size={16} fill="currentColor" /> Start Training
                </motion.button>
            </motion.div>
        </div>
    );
}
