"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Instagram, ChevronRight, Target, Zap, Twitter, Lock, Copy, Check, Users, ShieldCheck, Download, Smartphone } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "./welcome.css";

// Countdown Logic
function useCountdown(targetDate: Date) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        total: 0
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
    targetDate.setDate(targetDate.getDate() + 7); // 7 Days from now
    const countdown = useCountdown(targetDate);

    const shareText = "I just gained entry to the @MrWorkout Clinic. The 3D revolution is coming. #MrWorkout";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    const referralLink = userCode ? `mrworkout.pro?ref=${userCode}` : "mrworkout.pro";

    const founderCardUrl = stats?.isFounder ? `/api/generate-founder-card?email=${encodeURIComponent(stats.email)}&id=${stats.founderId}&name=${encodeURIComponent(stats.name)}` : null;

    useEffect(() => {
        if (userCode) {
            fetch(`/api/user/stats?code=${userCode}`)
                .then(res => res.json())
                .then(data => {
                    if (data.referrals !== undefined) setStats({ 
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
        <div className="w-full max-w-4xl z-10 flex flex-col gap-10 md:gap-14">
            
            {/* Header: Initiation Status */}
            <header className="flex flex-col items-center md:items-start gap-6 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/10"
                    >
                        <span className="w-2 h-2 rounded-full bg-[#00ffff] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#00ffff]/80">
                            Protocol Alpha-01 Activated
                        </span>
                    </motion.div>

                    {/* FOUNDER BADGE */}
                    {stats?.isFounder && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 shadow-[0_0_15px_rgba(255,215,0,0.2)]"
                        >
                            <ShieldCheck size={12} className="text-[#FFD700]" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#FFD700]">
                                FOUNDER STATUS: ACTIVE
                            </span>
                        </motion.div>
                    )}
                </div>
                
                <div className="space-y-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl sm:text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] text-glow"
                        style={{ fontFamily: 'Archivo Black, sans-serif' }}
                    >
                        WELCOME TO THE CLINIC, <br className="md:hidden" />
                        <span className="text-[#00ffff]">{stats?.name || "INITIATE"}</span>
                    </motion.h1>

                    {stats?.isFounder ? (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.8 }}
                            transition={{ delay: 0.5 }}
                            className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-[#FFD700] italic bg-[#FFD700]/10 px-4 py-2 rounded-lg border border-[#FFD700]/20 inline-block mt-4"
                        >
                            YOU ARE AMONG THE FIRST 150. YOUR STATUS IS LOCKED.
                        </motion.p>
                    ) : (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            transition={{ delay: 0.5 }}
                            className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#00ffff] italic"
                        >
                            WAITLIST STATUS: ACTIVE. FOUNDER SLOTS CLOSED.
                        </motion.p>
                    )}
                </div>
            </header>

            {/* FOUNDER CARD PREVIEW & SHARE */}
            {stats?.isFounder && (
                <motion.section
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-8 rounded-[32px] border-2 border-[#FFD700]/20 bg-[#FFD700]/5 backdrop-blur-3xl space-y-8"
                >
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#FFD700]">FOUNDER VIRTUAL ASSET</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest text-center md:text-left">IDENTIFIER: FOUNDER #{stats?.founderId} / 150</p>
                    </div>

                    <div className="relative group mx-auto max-w-[500px] aspect-[1.6/1] rounded-2xl overflow-hidden border border-[#FFD700]/30 shadow-[0_0_50px_rgba(255,215,0,0.1)]">
                        {/* Shimmer Effect */}
                        <motion.div 
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear", delay: 1 }}
                            className="absolute inset-0 z-10 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                        />
                        
                        {founderCardUrl && (
                            <img 
                                src={founderCardUrl} 
                                alt="Founder Card" 
                                className="w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#FFD700]">Digital Asset Verified</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button 
                            onClick={handleDownloadCard}
                            className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-xs"
                        >
                            <Download size={18} className="text-[#00ffff]" />
                            Download Card
                        </button>
                        <Link 
                            href="https://www.instagram.com" 
                            target="_blank"
                            className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/20 hover:bg-[#FFD700]/20 transition-all font-black uppercase tracking-widest text-xs text-[#FFD700]"
                        >
                            <Instagram size={18} />
                            Share IG Story
                        </Link>
                        <Link 
                            href="https://www.tiktok.com" 
                            target="_blank"
                            className="flex items-center justify-center gap-3 p-5 rounded-2xl bg-black border border-white/10 hover:bg-white/5 transition-all font-black uppercase tracking-widest text-xs text-white"
                        >
                            <Smartphone size={18} />
                            TikTok Link
                        </Link>
                    </div>
                </motion.section>
            )}

            {/* VIRAL REFERRAL MODULE */}
            <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
                <div className="p-8 rounded-[32px] border border-white/10 bg-white/[0.03] flex flex-col gap-6">
                    <div className="space-y-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00ffff]">RECRUITMENT LINK</h3>
                        <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">Share to move up the ranks</p>
                    </div>
                    
                    <div className="relative group">
                        <div className="w-full bg-black/40 border-2 border-white/10 rounded-2xl py-4 px-6 font-mono text-xs md:text-sm text-white/80 flex items-center justify-between overflow-hidden">
                            <span className="truncate mr-4">{referralLink}</span>
                            <button 
                                onClick={handleCopyLink}
                                className="shrink-0 p-2 rounded-lg bg-[#00ffff]/10 border border-[#00ffff]/20 text-[#00ffff] hover:bg-[#00ffff]/20 transition-all active:scale-95"
                            >
                                {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                            </button>
                        </div>
                    </div>

                    <p className="text-[10px] font-black uppercase tracking-tighter text-white/30 italic">
                        RECRUIT 3 ATHLETES TO UNLOCK PHASE 2 EARLY.
                    </p>
                </div>

                <div className="p-8 rounded-[32px] border border-[#00ffff]/10 bg-[#00ffff]/5 flex flex-col justify-center items-center gap-2 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Users size={80} />
                    </div>
                    
                    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00ffff]/60">RECRUITS JOINED</span>
                    <motion.span 
                        key={stats?.referrals}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="text-7xl font-black italic tracking-tighter text-[#00ffff]"
                    >
                        {stats?.referrals ?? "..."}
                    </motion.span>
                    
                    <div className="w-full h-1.5 bg-white/5 rounded-full mt-4 overflow-hidden max-w-[200px]">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(((stats?.referrals ?? 0) / 3) * 100, 100)}%` }}
                            className="h-full bg-[#00ffff] shadow-[0_0_15px_rgba(0,255,255,0.5)]"
                        />
                    </div>
                </div>
            </motion.section>

            {/* COUNTDOWN MODULE */}
            <motion.section 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 py-10 px-6 rounded-[32px] border-2 border-[#00ffff]/20 bg-[#00ffff]/5 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,255,255,0.1)] relative"
            >
                <div className="flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#00ffff] opacity-60">
                        SYSTEM CALIBRATION IN PROGRESS...
                    </span>
                    <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-[#00ffff]/40 to-transparent" />
                </div>

                <div className="flex items-center gap-4 md:gap-8 font-mono text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    <div className="flex flex-col items-center">
                        <span>{formatNum(countdown.days)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 mt-2">Days</span>
                    </div>
                    <span className="text-white/20 mb-6">:</span>
                    <div className="flex flex-col items-center">
                        <span>{formatNum(countdown.hours)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 mt-2">Hrs</span>
                    </div>
                    <span className="text-white/20 mb-6">:</span>
                    <div className="flex flex-col items-center">
                        <span>{formatNum(countdown.minutes)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 mt-2">Min</span>
                    </div>
                    <span className="text-white/20 mb-6">:</span>
                    <div className="flex flex-col items-center">
                        <span>{formatNum(countdown.seconds)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/20 mt-2">Sec</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 border border-white/5">
                    <Lock size={12} className="text-[#00ffff]/60" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                         Athlete ID: <span className="text-[#00ffff] opacity-100">Verified</span>. Data locked in Vault.
                    </span>
                </div>
            </motion.section>

            {/* Progress & Directive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
                
                {/* Progress Card */}
                <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 backdrop-blur-3xl relative overflow-hidden group h-full flex flex-col justify-between"
                >
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/40">
                                    Mission Progress
                                </h3>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                                    The Foundation
                                </h2>
                            </div>
                            <span className="text-4xl font-black italic uppercase tracking-tighter text-[#00ffff]">
                                15%
                            </span>
                        </div>

                        <div className="relative h-4 w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/10">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "15%" }}
                                transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00ffff]/20 via-[#00ffff] to-[#00ffff] shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                            />
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-4 opacity-40">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Target size={12} /> Sync: Online
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Zap size={12} /> Status: Waiting
                        </div>
                    </div>
                </motion.section>

                {/* Daily Directive Card */}
                <motion.section
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 backdrop-blur-2xl relative h-full"
                >
                    <h3 className="text-[#00ffff] text-xs font-black uppercase tracking-[0.4em] mb-4">
                        Daily Directive: 001
                    </h3>
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                            Baseline Discipline
                        </h2>
                        <p className="text-white/60 text-sm leading-relaxed">
                            Master your environment. Zero screens 30 minutes before bed. Eliminate noise. Prepare for the revolutionary shift in training modules.
                        </p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                            #001
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#00ffff]">
                            INITIATED
                        </span>
                    </div>
                </motion.section>
            </div>

            {/* Social Share Call to Action */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col items-center gap-6"
            >
                <div className="flex flex-col items-center text-center gap-2 opacity-30">
                    <span className="text-xs font-black uppercase tracking-[0.5em]">Broadcast Initiation</span>
                    <div className="h-[1px] w-48 bg-white/10" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <Link 
                        href="https://www.instagram.com/mr.workout.pro" 
                        target="_blank"
                        className="flex items-center justify-center gap-4 p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-[#00ffff]/30 transition-all group"
                    >
                        <Instagram size={20} className="text-[#00ffff]" />
                        <span className="font-black italic uppercase tracking-widest text-sm">Follow the Clinic</span>
                    </Link>
                    
                    <Link
                        href={twitterUrl}
                        target="_blank"
                        className="flex items-center justify-center gap-4 p-6 rounded-2xl bg-[#00ffff] text-black hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(0,255,255,0.3)]"
                    >
                        <Twitter size={20} />
                        <span className="font-black italic uppercase tracking-widest text-sm">Share Admission</span>
                    </Link>
                </div>
            </motion.div>

            {/* Footer Ticker */}
            <footer className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
                <span className="text-[10px] uppercase font-black tracking-[0.3em]">
                    Clinic Onboarding // Athlete-Initiated
                </span>
                <Link href="/" className="text-[10px] uppercase font-black tracking-[0.3em] hover:text-[#00ffff] transition-colors">
                    Return to Hub
                </Link>
            </footer>
        </div>
    );
}

export default function WelcomeDashboard() {
    return (
        <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center px-4 py-8 md:py-20 overflow-x-hidden relative">
            {/* HUD Grid Effect */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none hud-grid" />
            
            {/* Tactical Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00ffff]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00ffff]/5 blur-[120px] rounded-full pointer-events-none" />

            <Suspense fallback={<div className="text-[#00ffff] font-black animate-pulse">Initializing HUD...</div>}>
                <WelcomeContent />
            </Suspense>
            
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@700;800&display=swap');
                
                .font-mono {
                    font-family: 'JetBrains Mono', monospace;
                }
            `}</style>
        </div>
    );
}
