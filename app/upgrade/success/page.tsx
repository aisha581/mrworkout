"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Crown, Zap } from "lucide-react";

export default function UpgradeSuccessPage() {
    const router = useRouter();

    useEffect(() => {
        // Mark pro in localStorage as immediate client-side confirmation
        // (server-side is set by Stripe webhook)
        try { localStorage.setItem("mw_is_pro", "true"); } catch {}
    }, []);

    return (
        <div className="fixed inset-0 bg-[#060606] flex flex-col items-center justify-center px-8 text-center">
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,215,0,0.08) 0%, transparent 70%)' }}
            />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="relative z-10 flex flex-col items-center gap-5 max-w-sm w-full"
            >
                <div
                    className="w-24 h-24 rounded-[32px] flex items-center justify-center mb-2"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.08))',
                        border:     '1px solid rgba(255,215,0,0.3)',
                        boxShadow:  '0 0 60px rgba(255,215,0,0.2)',
                    }}
                >
                    <Crown size={44} color="#FFD700" fill="rgba(255,215,0,0.3)" />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">
                    Welcome to
                </p>
                <h1
                    className="text-5xl font-black uppercase leading-none"
                    style={{
                        fontFamily:    'var(--font-archivo-black), sans-serif',
                        letterSpacing: '-0.03em',
                        color:         '#FFD700',
                        textShadow:    '0 0 60px rgba(255,215,0,0.5)',
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
                    className="mt-4 flex items-center gap-3 px-8 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black w-full justify-center"
                    style={{
                        background:  'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                        boxShadow:   '0 0 40px rgba(255,215,0,0.35)',
                        touchAction: 'manipulation',
                    }}
                >
                    <Zap size={16} fill="currentColor" />
                    Start Training
                </motion.button>
            </motion.div>
        </div>
    );
}
