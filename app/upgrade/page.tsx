"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
    Zap, CheckCircle2, Lock, Crown,
    Dumbbell, BarChart3, Trophy, Loader2,
} from "lucide-react";

const PRO_FEATURES = [
    { icon: Dumbbell,  text: "Unlock all 89 moves — full Armory access"     },
    { icon: Zap,       text: "Custom Routines — build & save any circuit"    },
    { icon: BarChart3, text: "Advanced analytics — volume, PRs, trends"      },
    { icon: Trophy,    text: "Full Leaderboard — compete globally"            },
    { icon: Crown,     text: "Exclusive themes — Founder, Gold, Obsidian"    },
];

export default function UpgradePage() {
    const { data: session } = useSession();
    const router            = useRouter();
    const [loading, setLoading] = useState(false);

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/checkout", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email: session?.user?.email }),
            });
            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center pb-20 px-5"
            style={{ background: '#060606', color: '#fff' }}
        >
            {/* Background atmosphere */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    background: [
                        'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(0,229,204,0.08) 0%, transparent 60%)',
                        'radial-gradient(ellipse 50% 50% at 80% 100%, rgba(255,215,0,0.04) 0%, transparent 50%)',
                    ].join(','),
                }}
            />

            <div className="relative z-10 w-full max-w-sm pt-16">

                {/* Crown badge */}
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                    className="flex justify-center mb-8"
                >
                    <div
                        className="w-20 h-20 rounded-[28px] flex items-center justify-center"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.08))',
                            border:     '1px solid rgba(255,215,0,0.3)',
                            boxShadow:  '0 0 40px rgba(255,215,0,0.15)',
                        }}
                    >
                        <Crown size={36} color="#FFD700" fill="rgba(255,215,0,0.3)" />
                    </div>
                </motion.div>

                {/* Headline */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-center mb-2"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30 mb-3">
                        Savage Pro
                    </p>
                    <h1
                        className="text-5xl font-black uppercase leading-[0.92]"
                        style={{
                            fontFamily:    'var(--font-archivo-black), sans-serif',
                            letterSpacing: '-0.04em',
                        }}
                    >
                        Unlock All<br />
                        <span style={{ color: '#00E5CC', textShadow: '0 0 40px rgba(0,229,204,0.5)' }}>
                            89 Moves
                        </span>
                    </h1>
                    <p className="text-sm opacity-40 mt-4 leading-relaxed">
                        Everything you need to train like a savage.<br />
                        Cancel anytime.
                    </p>
                </motion.div>

                {/* Price card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="rounded-[28px] p-6 mt-8 mb-6"
                    style={{
                        background: 'linear-gradient(135deg, rgba(0,229,204,0.08) 0%, rgba(0,180,160,0.04) 100%)',
                        border:     '1px solid rgba(0,229,204,0.2)',
                    }}
                >
                    <div className="flex items-baseline justify-between mb-1">
                        <div className="flex items-baseline gap-1">
                            <span
                                className="text-5xl font-black"
                                style={{ fontFamily: 'var(--font-archivo-black)', color: '#00E5CC' }}
                            >
                                $9
                            </span>
                            <span className="text-lg opacity-40 font-bold">.99</span>
                            <span className="text-xs opacity-40 font-medium ml-1">/ month</span>
                        </div>
                        <div
                            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider"
                            style={{
                                background: 'rgba(255,215,0,0.12)',
                                border:     '1px solid rgba(255,215,0,0.25)',
                                color:      '#FFD700',
                            }}
                        >
                            7-Day Free Trial
                        </div>
                    </div>
                    <p className="text-xs opacity-30 font-medium">Billed monthly after trial. Cancel any time.</p>
                </motion.div>

                {/* Feature list */}
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
                    className="flex flex-col gap-3 mb-8"
                >
                    {PRO_FEATURES.map(({ icon: Icon, text }) => (
                        <motion.div
                            key={text}
                            variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                            className="flex items-center gap-4"
                        >
                            <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                    background: 'rgba(0,229,204,0.08)',
                                    border:     '1px solid rgba(0,229,204,0.15)',
                                }}
                            >
                                <Icon size={16} color="#00E5CC" />
                            </div>
                            <p className="text-sm font-medium opacity-70">{text}</p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* CTA */}
                <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={session ? handleCheckout : () => router.push('/login?next=/upgrade')}
                    disabled={loading}
                    className="w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-3 disabled:opacity-60"
                    style={{
                        background:  'linear-gradient(135deg, #00E5CC 0%, #00B5A0 100%)',
                        boxShadow:   '0 0 50px rgba(0,229,204,0.4), 0 8px 32px rgba(0,0,0,0.5)',
                        touchAction: 'manipulation',
                    }}
                >
                    {loading ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <>
                            <Zap size={18} fill="currentColor" />
                            {session ? "Start 7-Day Free Trial" : "Sign In to Unlock Pro"}
                        </>
                    )}
                </motion.button>

                <p className="text-center text-[10px] opacity-20 mt-4 font-medium">
                    Secure payment via Stripe · No surprise charges
                </p>

                {/* Already have an account */}
                <p className="text-center text-xs opacity-30 mt-8">
                    Already Pro?{" "}
                    <button
                        onClick={() => router.push("/")}
                        className="underline underline-offset-2 opacity-60 hover:opacity-100 transition-opacity"
                    >
                        Go home
                    </button>
                </p>
            </div>
        </div>
    );
}
