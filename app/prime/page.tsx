"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import {
    Zap, Crown, Dumbbell, BarChart3,
    Trophy, Flame, CheckCircle2, Loader2,
    ArrowLeft,
} from "lucide-react";

const FEATURES = [
    { icon: Dumbbell,   text: "All 89 moves — full Armory unlocked"        },
    { icon: Zap,        text: "Custom Routines — build & save any circuit"  },
    { icon: BarChart3,  text: "Advanced analytics — volume, PRs, trends"   },
    { icon: Trophy,     text: "Global Leaderboard — compete worldwide"      },
    { icon: Flame,      text: "Streak protection & daily mission streaks"   },
    { icon: Crown,      text: "Exclusive themes — Founder, Gold, Obsidian"  },
];

interface PlanCardProps {
    tag?:         string;
    tagColor?:    string;
    title:        string;
    subtitle:     string;
    price:        string;
    period:       string;
    note?:        string;
    accentColor:  string;
    borderColor:  string;
    glowColor:    string;
    ctaLabel:     string;
    loading:      boolean;
    onSelect:     () => void;
}

function PlanCard({
    tag, tagColor, title, subtitle, price, period, note,
    accentColor, borderColor, glowColor, ctaLabel, loading, onSelect,
}: PlanCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-[28px] p-6 flex flex-col"
            style={{
                background:   `linear-gradient(135deg, ${accentColor}0a 0%, rgba(6,6,6,0.9) 100%)`,
                border:       `1px solid ${borderColor}`,
                boxShadow:    `0 0 40px ${glowColor}`,
            }}
        >
            {tag && (
                <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
                    style={{ background: tagColor, color: '#000' }}
                >
                    {tag}
                </div>
            )}

            <p className="text-[10px] font-black uppercase tracking-[0.45em] opacity-35 mb-1">{subtitle}</p>
            <h2
                className="text-3xl font-black uppercase leading-none mb-4"
                style={{
                    fontFamily:    'var(--font-archivo-black), sans-serif',
                    letterSpacing: '-0.03em',
                    color:         accentColor,
                    textShadow:    `0 0 30px ${glowColor}`,
                }}
            >
                {title}
            </h2>

            <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-5xl font-black" style={{ fontFamily: 'var(--font-archivo-black)', color: '#fff' }}>
                    {price}
                </span>
                <span className="text-sm opacity-40 font-medium">{period}</span>
            </div>
            {note && <p className="text-[11px] opacity-30 font-medium mb-5">{note}</p>}

            <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onSelect}
                disabled={loading}
                className="mt-auto w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{
                    background:  `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
                    color:       '#000',
                    boxShadow:   `0 0 30px ${glowColor}`,
                    touchAction: 'manipulation',
                }}
            >
                {loading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <><Zap size={15} fill="currentColor" />{ctaLabel}</>
                }
            </motion.button>
        </motion.div>
    );
}

export default function PrimePage() {
    const { data: session } = useSession();
    const router             = useRouter();
    const [loadingPlan, setLoadingPlan] = useState<'monthly' | 'annual' | null>(null);

    const handleCheckout = async (plan: 'monthly' | 'annual') => {
        setLoadingPlan(plan);
        try {
            const res  = await fetch("/api/checkout", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email: session?.user?.email, plan }),
            });
            const { url, error } = await res.json();
            if (url)   window.location.href = url;
            if (error) setLoadingPlan(null);
        } catch {
            setLoadingPlan(null);
        }
    };

    const goToCheckout = (plan: 'monthly' | 'annual') => {
        if (!session) {
            router.push(`/login?next=/prime`);
        } else {
            handleCheckout(plan);
        }
    };

    return (
        <div className="min-h-screen flex flex-col pb-24" style={{ background: '#060606', color: '#fff' }}>
            {/* Background atmosphere */}
            <div
                className="fixed inset-0 pointer-events-none z-0"
                style={{
                    background: [
                        'radial-gradient(ellipse 70% 35% at 50% 0%, rgba(0,229,204,0.07) 0%, transparent 60%)',
                        'radial-gradient(ellipse 50% 40% at 90% 100%, rgba(255,215,0,0.05) 0%, transparent 50%)',
                    ].join(','),
                }}
            />

            <div className="relative z-10 w-full max-w-sm mx-auto px-5 pt-12">

                {/* Back */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest opacity-30 hover:opacity-60 transition-opacity mb-8"
                >
                    <ArrowLeft size={14} /> Back
                </button>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <p className="text-[10px] font-black uppercase tracking-[0.55em] opacity-25 mb-3">
                        Choose Your Plan
                    </p>
                    <h1
                        className="text-5xl font-black uppercase leading-[0.9]"
                        style={{
                            fontFamily:    'var(--font-archivo-black), sans-serif',
                            letterSpacing: '-0.04em',
                        }}
                    >
                        Go
                        <span style={{ color: '#00E5CC', textShadow: '0 0 40px rgba(0,229,204,0.5)' }}>
                            {" "}Savage
                        </span>
                        <br />Pro
                    </h1>
                    <p className="text-sm opacity-35 mt-3">7-day free trial on all plans. Cancel anytime.</p>
                </motion.div>

                {/* Pricing cards */}
                <div className="flex flex-col gap-4 mb-8">

                    {/* Savage Monthly */}
                    <PlanCard
                        subtitle="Savage Monthly"
                        title="Monthly"
                        price="$9.99"
                        period="/ month"
                        note="Billed monthly after free trial."
                        accentColor="#00E5CC"
                        borderColor="rgba(0,229,204,0.2)"
                        glowColor="rgba(0,229,204,0.08)"
                        ctaLabel="Start Free Trial"
                        loading={loadingPlan === 'monthly'}
                        onSelect={() => goToCheckout('monthly')}
                    />

                    {/* Founder Annual */}
                    <PlanCard
                        tag="Best Value — Save 34%"
                        tagColor="#FFD700"
                        subtitle="Founder Annual"
                        title="Annual"
                        price="$79"
                        period="/ year"
                        note="That's $6.58/mo — Founder pricing, locked for life."
                        accentColor="#FFD700"
                        borderColor="rgba(255,215,0,0.25)"
                        glowColor="rgba(255,215,0,0.10)"
                        ctaLabel="Lock In Founder Rate"
                        loading={loadingPlan === 'annual'}
                        onSelect={() => goToCheckout('annual')}
                    />
                </div>

                {/* Feature list */}
                <div className="mb-8">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 mb-4 text-center">
                        Everything Included
                    </p>
                    <div className="flex flex-col gap-3">
                        {FEATURES.map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3">
                                <CheckCircle2 size={15} color="#00E5CC" className="shrink-0" />
                                <span className="text-sm opacity-65 font-medium">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="text-center text-[10px] opacity-15 font-medium leading-relaxed">
                    Secured by Stripe · No hidden fees · Cancel in 2 taps
                </p>
            </div>
        </div>
    );
}
