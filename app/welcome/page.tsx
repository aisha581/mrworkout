"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ShieldCheck, Download, Instagram, Smartphone, Lock, Target, Zap, ChevronRight, Users, Loader2, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "./welcome.css";

// Countdown Logic
function useCountdown(targetDate: Date) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0, hours: 0, minutes: 0, seconds: 0, total: 0
    });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;
            if (distance < 0) {
                clearInterval(interval);
                return;
            }
            setTimeLeft({
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000),
                total: distance
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    return timeLeft;
}

function WelcomeContent() {
    const searchParams = useSearchParams();
    const userCode = searchParams.get('code');
    const [stats, setStats] = useState<{ referrals: number; isFounder: boolean; email: string; name: string; founderId: string } | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    const countdown = useCountdown(targetDate);

    const referralLink = userCode ? `mrworkout.pro?ref=${userCode}` : "mrworkout.pro";
    const founderCardUrl = stats?.isFounder ? `/api/generate-founder-card?email=${encodeURIComponent(stats.email)}&id=${stats.founderId}&name=${encodeURIComponent(stats.name)}` : null;

    useEffect(() => {
        if (userCode) {
            fetch(`/api/user/stats?code=${userCode}`)
                .then(res => res.json())
                .then(data => {
                    if (data.email) setStats({ 
                        referrals: data.referrals, 
                        isFounder: !!data.isFounder,
                        email: data.email,
                        name: data.name,
                        founderId: data.founderId 
                    });
                })
                .catch(console.error);
        }
    }, [userCode]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleDownloadCard = async () => {
        if (!founderCardUrl) return;
        try {
            const response = await fetch(founderCardUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `MrWorkout_FounderCard_${stats?.founderId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const formatNum = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className="w-full max-w-5xl z-10 flex flex-col items-center gap-12 md:gap-20 py-10">
            
            {/* TOP CENTER: FOUNDER BADGE */}
            <div className="flex flex-col items-center gap-6 text-center w-full">
                {stats?.isFounder && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative group"
                    >
                        {/* Shimmer Effect */}
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }}
                            className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none rounded-2xl"
                        />
                        
                        <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-3xl bg-[#FFD700]/5 border-2 border-[#FFD700]/30 shadow-[0_0_50px_rgba(255,215,0,0.15)] backdrop-blur-3xl">
                            <ShieldCheck size={48} className="text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.5)]" />
                            <div className="space-y-1">
                                <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-[#FFD700]">
                                    FOUNDER #{stats.founderId} / 150
                                </h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Status: Secured & Locked</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                >
                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] text-white text-glow"
                        style={{ fontFamily: 'Archivo Black, sans-serif' }}>
                        WELCOME, <span className="text-[#00ffff]">{stats?.name || "INITIATE"}</span>
                    </h1>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-[#00ffff]/60">
                        {stats?.isFounder ? "YOU ARE AMONG THE FIRST 150. YOUR STATUS IS ABSOLUTE." : "WAITLIST STATUS: ACTIVE. FOUNDER SLOTS CLOSED."}
                    </p>
                </motion.div>
            </div>

            {/* MIDDLE: FOUNDER'S MANIFESTO */}
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-3xl p-10 md:p-16 rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-2xl relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-10 opacity-5">
                    <Target size={120} />
                </div>
                
                <div className="flex flex-col gap-10 relative z-10">
                    <div className="space-y-2">
                        <h3 className="text-[#00ffff] text-xs font-black uppercase tracking-[0.6em] mb-4">FOUNDER'S MANIFESTO</h3>
                        <div className="h-1 w-20 bg-[#00ffff]/40" />
                    </div>

                    <div className="space-y-8">
                        <p className="text-xl md:text-3xl font-black italic uppercase tracking-tight text-white leading-tight">
                            "WE DO NOT TRAIN TO MAINTAIN. WE TRAIN TO OVERTAKE. THE 3D REVOLUTION IS NOT ABOUT PIXELS—IT IS ABOUT PERSPECTIVE."
                        </p>
                        <ul className="space-y-4 text-sm md:text-base font-bold uppercase tracking-wide text-white/70">
                            <li className="flex gap-4">
                                <span className="text-[#00ffff]">01</span>
                                <span>Discipline over motivation. Always.</span>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-[#00ffff]">02</span>
                                <span>The clinic is the arena. The modules are your weapons.</span>
                            </li>
                            <li className="flex gap-4">
                                <span className="text-[#00ffff]">03</span>
                                <span>You are no longer an observer. You are the architect of your own evolution.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </motion.section>

            {/* LOWER: DAILY DIRECTIVE & REFERRAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                
                {/* Daily Directive Habit */}
                <motion.section
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="p-10 rounded-[32px] bg-white/[0.03] border border-white/5 backdrop-blur-xl flex flex-col justify-between h-full group"
                >
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-1">
                                <h3 className="text-[#00ffff] text-[10px] font-black uppercase tracking-[0.4em]">DAILY DIRECTIVE</h3>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">BASELINE MOBILITY</h2>
                            </div>
                            <Zap className="text-[#00ffff] opacity-30 group-hover:opacity-100 transition-opacity" size={24} />
                        </div>
                        <p className="text-white/60 text-sm leading-relaxed font-bold uppercase tracking-wide">
                            IMPLEMENT THE 90/90 STRETCH FOR 3 MINUTES PER SIDE. UNLOCK YOUR HIPS FOR THE 3D ENGINE CALIBRATION. STIFFNESS IS A SYSTEM FAILURE.
                        </p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black tracking-widest text-white/20">PROTOCOL ID: DM-001</span>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#00ffff] animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#00ffff]">INITIATED</span>
                        </div>
                    </div>
                </motion.section>

                {/* Recruitment Action */}
                <motion.section
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="p-10 rounded-[32px] bg-[#00ffff]/5 border border-[#00ffff]/20 backdrop-blur-xl flex flex-col gap-8 h-full"
                >
                    <div className="space-y-2">
                        <h3 className="text-[#00ffff] text-[10px] font-black uppercase tracking-[0.4em]">RECRUITMENT LINK</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">INVITE ATHLETES TO CLAIM REMAINING SLOTS</p>
                    </div>

                    <div className="relative group">
                        <div className="w-full bg-black/40 border-2 border-white/10 rounded-2xl py-5 px-6 font-mono text-sm text-white/80 flex items-center justify-between overflow-hidden">
                            <span className="truncate mr-4">{referralLink}</span>
                            <button 
                                onClick={handleCopyLink}
                                className="shrink-0 p-3 rounded-xl bg-[#00ffff] text-black hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,255,0.3)]"
                            >
                                {copySuccess ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        <Users className="text-[#00ffff]/60" size={24} />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Recruits Enlisted</span>
                            <span className="text-2xl font-black italic text-[#00ffff] tracking-tighter">{stats?.referrals ?? 0}</span>
                        </div>
                    </div>
                </motion.section>
            </div>

            {/* FOUNDER CARD ASSET */}
            {stats?.isFounder && (
                <motion.section
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="w-full flex flex-col items-center gap-10"
                >
                    <div className="flex flex-col items-center text-center gap-2">
                        <div className="h-[1px] w-24 bg-white/10" />
                        <h3 className="text-xs font-black uppercase tracking-[0.6em] text-white/30">VIRTUAL ASSET PREVIEW</h3>
                    </div>

                    <div className="relative group max-w-[600px] w-full aspect-[1.6/1] rounded-3xl overflow-hidden border-4 border-[#FFD700]/30 shadow-[0_0_80px_rgba(255,215,0,0.1)]">
                        {founderCardUrl && (
                            <img src={founderCardUrl} alt="Founder Card" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-8">
                            <button 
                                onClick={handleDownloadCard}
                                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#FFD700] text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,215,0,0.5)]"
                            >
                                <Download size={18} />
                                Download Master Card
                            </button>
                        </div>
                    </div>

                    {/* Social CTAs */}
                    <div className="flex flex-wrap justify-center gap-6 opacity-40 hover:opacity-100 transition-opacity">
                        <Link href="https://www.instagram.com" target="_blank" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] hover:text-[#00ffff] transition-colors">
                            <Instagram size={16} /> Share IG Story
                        </Link>
                        <Link href="https://www.tiktok.com" target="_blank" className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] hover:text-[#00ffff] transition-colors">
                            <Smartphone size={16} /> TikTok Signal
                        </Link>
                    </div>
                </motion.section>
            )}

            {/* HUD Status Bar */}
            <motion.footer 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="w-full pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6"
            >
                <div className="flex items-center gap-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">INITIATION STATUS: SECURED</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">VAULT: ONLINE</span>
                </div>
                <div className="flex items-center gap-2">
                    <Lock size={12} />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">ENCRYPTED HUD</span>
                </div>
            </motion.footer>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@700;800&display=swap');
                .font-mono { font-family: 'JetBrains Mono', monospace; }
                .text-glow { text-shadow: 0 0 30px rgba(255, 255, 255, 0.2); }
            `}</style>
        </div>
    );
}

export default function WelcomeDashboard() {
    return (
        <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center px-6 md:px-12 overflow-x-hidden relative">
            {/* HUD Background elements */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none hud-grid" />
            <div className="absolute top-0 w-full h-40 bg-gradient-to-b from-[#00ffff]/5 to-transparent pointer-events-none" />
            
            <Suspense fallback={<div className="text-[#00ffff] font-black animate-pulse py-20">CALIBRATING HUD...</div>}>
                <WelcomeContent />
            </Suspense>
        </div>
    );
}


