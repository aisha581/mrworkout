"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ShieldCheck, Download, Share2, Instagram, Smartphone, Lock, Target, Zap, ChevronRight, Users, Loader2, Volume2, VolumeX, Medal } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toPng, toBlob } from "html-to-image";
import { saveAs } from "file-saver";
import { getFounderCount } from "../actions";
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

const DAILY_DIRECTIVES = [
    "MOBILITY AUDIT: 10 mins deep squat hold. Document the tightness. We fix it in Phase 2.",
    "MINDSET SHIFT: Remove one 'ego lift' from your routine today. Focus on tempo and 3D control.",
    "CORE CALIBRATION: 3 rounds of 60s dead bugs. Precision over speed. The 3D engine requires a stable axis.",
    "RECOVERY PROTOCOL: 20 mins of nasal breathing during walking. Lower the system stress for activation.",
    "POSTURE CHECK: Every 2 hours today, reset your scapula. Small adjustments lead to systemic change.",
    "HYDRATION SECURED: Add electrolytes to 4L of water. Optimal conductivity for neuromuscular speed.",
    "MISSION READY: Review Phase 1 progress. Tomorrow, we prepare for the 3D Module activation."
];

function WelcomeContent() {
    const searchParams = useSearchParams();
    const userCode = searchParams.get('code');
    const paramName = searchParams.get('name');
    const paramEmail = searchParams.get('email');
    
    // Fallback data for optimistic redirect
    const [stats, setStats] = useState<{ referrals: number; isFounder: boolean; email: string; name: string; founderId: string; joinedAt?: string } | null>(
        paramName ? { referrals: 0, isFounder: true, email: paramEmail || "", name: paramName, founderId: "???", joinedAt: Date.now().toString() } : null
    );
    const [copySuccess, setCopySuccess] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [mobileImage, setMobileImage] = useState<string | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const captureRef = useRef<HTMLDivElement>(null);

    const referralLink = `https://mrworkout.pro?ref=${userCode}`;

    // Calculate current directive day
    const joinedDate = stats?.joinedAt ? new Date(parseInt(stats.joinedAt)) : new Date();
    const daysSinceJoined = Math.floor((new Date().getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
    const currentDay = Math.min(Math.max(daysSinceJoined, 0), 6); // Cap at 7 days (0-6)
    const currentDirective = DAILY_DIRECTIVES[currentDay];

    const phase2Target = new Date('2026-03-29T00:00:00');
    const countdown = useCountdown(phase2Target);

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
                        founderId: data.founderId,
                        joinedAt: data.joinedAt
                    });
                })
                .catch(console.error);
        }
    }, [userCode]);

    // DB Fix: Ensure we have a founder number, even if re-entry or optimistic
    useEffect(() => {
        if (!stats || stats.founderId === "???") {
            getFounderCount().then(count => {
                const formattedCount = count.toString().padStart(3, '0');
                setStats(prev => prev ? { ...prev, founderId: formattedCount } : {
                    referrals: 0,
                    isFounder: true,
                    email: paramEmail || "",
                    name: paramName || "ATHLETE",
                    founderId: formattedCount,
                    joinedAt: Date.now().toString()
                });
            });
        }
    }, [paramName, paramEmail, stats]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleDownloadCard = async () => {
        if (!captureRef.current) return;
        setIsDownloading(true);
        
        try {
            // Give extra time for fonts to settle
            await new Promise(r => setTimeout(r, 800));
            
            const options = {
                quality: 1.0,
                pixelRatio: 2,
                skipAutoScale: true,
                cacheBust: true,
                backgroundColor: "#000",
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                }
            };

            const isMobile = /iPhone|iPad|iPod|Android/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : "");

            if (isMobile) {
                const dataUrl = await toPng(captureRef.current, options);
                setMobileImage(dataUrl);
            } else {
                const blob = await toBlob(captureRef.current, options);
                if (blob) {
                    saveAs(blob, `MR_WORKOUT_FOUNDER_CARD_${stats?.founderId || 'ATHLETE'}.png`);
                }
            }
        } catch (err) {
            console.error("Capture failed:", err);
            alert("Capture failed. Try taking a screenshot or use a desktop browser.");
        } finally {
            setIsDownloading(false);
        }
    };

    const handleShare = async () => {
        if (!navigator.share) {
            alert("Sharing not supported on this browser. Copy the link instead.");
            return;
        }
        setIsSharing(true);
        try {
            await navigator.share({
                title: "MR. WORKOUT | FOUNDER",
                text: "I just secured my Founder Status at the Mr. Workout Clinic. The 3D revolution has begun. join the squad.",
                url: referralLink,
            });
        } catch (err) {
            console.warn("Share cancelled or failed:", err);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="w-full max-w-5xl z-10 flex flex-col items-center gap-12 md:gap-20 py-10 pb-32">
            
            {/* Header section */}
            <div className="flex flex-col items-center gap-6 text-center w-full">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    <h1 className="text-4xl sm:text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] text-white text-glow"
                        style={{ fontFamily: 'Archivo Black, sans-serif' }}>
                        WELCOME, <span className="text-[#00ffff]">{stats?.name || "ATHLETE"}</span>
                    </h1>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.4em] text-[#00ffff]/60">
                        {stats?.isFounder ? "Your status is secured among the first 150 athletes." : "Waitlist status: Active. Founder slots are closed."}
                    </p>
                </motion.div>
            </div>

            {/* FOUNDER CARD AREA (The Hero Asset) */}
            {stats?.isFounder && (
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex flex-col items-center gap-8"
                >
                    {/* The Actual Card DOM for html2canvas */}
                    <div className="relative group p-1 shadow-[0_0_100px_rgba(255,215,0,0.1)] rounded-[40px] bg-gradient-to-br from-[#FFD700]/40 via-transparent to-[#FFD700]/20">
                        <div 
                            ref={cardRef}
                            className="relative w-[340px] sm:w-[500px] md:w-[600px] aspect-[1.6/1] rounded-[38px] overflow-hidden bg-black flex flex-col p-8 sm:p-12 border border-white/10"
                            style={{ backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(255, 215, 0, 0.05) 0%, transparent 40%)' }}
                        >
                            {/* Card Decorative Elements */}
                            <div className="absolute top-0 right-0 p-10 opacity-10">
                                <Medal size={120} className="text-[#FFD700]" />
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#FFD700]/5 to-transparent pointer-events-none" />

                            <div className="relative z-10 flex flex-col justify-between h-full uppercase italic">
                                <div>
                                    <h4 className="text-[10px] font-black tracking-[0.5em] text-[#FFD700] mb-2">MR. WORKOUT // CLINIC</h4>
                                    <div className="h-[2px] w-12 bg-[#FFD700]" />
                                </div>

                                <div className="space-y-1">
                                    <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white leading-none">
                                        {stats.name}
                                    </h2>
                                    <p className="text-lg sm:text-2xl font-black text-[#FFD700] tracking-tight">
                                        FOUNDING ATHLETE #{stats.founderId}
                                    </p>
                                </div>

                                <div className="flex justify-between items-end border-t border-white/20 pt-6">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-bold tracking-[0.3em] text-white/40">TIER STATUS</p>
                                        <p className="text-xs font-black text-white">ALPHA SQUAD (01/150)</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] font-bold tracking-[0.3em] text-white/40">ACCESS KEY</p>
                                        <p className="text-xs font-black text-white px-3 py-1 bg-white/10 rounded-md">{stats.founderId}-{stats.name.slice(0,3)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Panel */}
                    <div className="flex flex-wrap justify-center gap-4">
                        <button 
                            onClick={handleDownloadCard}
                            disabled={isDownloading}
                            className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#FFD700] text-black font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl hover:shadow-[#FFD700]/20 min-w-[220px] justify-center"
                        >
                            {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                            {isDownloading ? "GENERATING..." : "DOWNLOAD FOUNDER CARD"}
                        </button>
                        <button 
                            onClick={handleShare}
                            disabled={isSharing}
                            className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl min-w-[220px] justify-center"
                        >
                            {isSharing ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                            {isSharing ? "SHARING..." : "SHARE STATUS"}
                        </button>
                    </div>

                    {/* HIDDEN CAPTURE TARGET: 1080x1920 (Instagram Story Optimized) */}
                    <div className="fixed -left-[4000px] top-0 pointer-events-none">
                        <div 
                            ref={captureRef}
                            id="founder-card-capture"
                            className="w-[1080px] h-[1920px] bg-black flex flex-col items-center justify-between p-24 font-archivo overflow-hidden"
                            style={{ 
                                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.15) 0%, transparent 80%)',
                                fontFamily: 'Archivo Black, sans-serif'
                            }}
                        >
                            {/* Top Branding */}
                            <div className="w-full flex flex-col items-center gap-10 mt-20">
                                <Medal size={280} className="text-[#FFD700] drop-shadow-[0_0_50px_rgba(255,215,0,0.3)]" />
                                <div className="h-[6px] w-64 bg-[#FFD700]" />
                                <h4 className="text-3xl font-black tracking-[1em] text-[#FFD700] uppercase italic">MR. WORKOUT // CLINIC</h4>
                            </div>

                            {/* Center Name & ID: HIGH QUALITY BLACK/GOLD */}
                            <div className="w-full flex flex-col items-center text-center gap-12">
                                <p className="text-4xl font-black text-white/40 tracking-[0.8em] uppercase">INITIATION STATUS: ENROLLED</p>
                                
                                <div className="space-y-6">
                                    <h2 className="text-[170px] font-black tracking-tighter text-white uppercase italic leading-[0.85] text-glow">
                                        FOUNDER<br/>#{stats?.founderId || "001"}
                                    </h2>
                                </div>

                                <div className="mt-12 w-80 h-[2px] bg-white/20" />
                                
                                <h3 className="text-7xl font-black tracking-widest text-[#FFD700] uppercase italic">
                                    {stats?.name || "ATHLETE"}
                                </h3>
                            </div>

                            {/* Bottom Stats & QR Placeholder */}
                            <div className="w-full flex flex-col items-center gap-16 mb-20">
                                <div className="grid grid-cols-2 w-full border-t-2 border-white/10 pt-20 gap-12">
                                    <div className="space-y-4">
                                        <p className="text-2xl font-bold tracking-[0.5em] text-white/40 uppercase">TIER STATUS</p>
                                        <p className="text-4xl font-black text-white uppercase italic">GOLD TIER ACCESS</p>
                                    </div>
                                    <div className="text-right space-y-4">
                                        <p className="text-2xl font-bold tracking-[0.5em] text-white/40 uppercase">SECURED KEY</p>
                                        <p className="text-4xl font-black text-[#FFD700] uppercase italic">
                                            {stats?.founderId || "001"}-{(stats?.name || "ATHLETE").slice(0,3).toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-4 text-center">
                                    <p className="text-2xl font-black text-[#FFD700] tracking-[1.2em] uppercase">PHASE 1 DEPLOYED</p>
                                    <p className="text-white/20 text-xl font-bold tracking-widest">WWW.MRWORKOUT.PRO</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* FULL SCREEN MOBILE PREVIEW OVERLAY */}
            <AnimatePresence>
                {mobileImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-0 m-0"
                    >
                        {/* Close Button Top Right */}
                        <div className="absolute top-8 right-8 z-50">
                            <button 
                                onClick={() => setMobileImage(null)}
                                className="p-5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-xl transition-all border border-white/20"
                            >
                                <Lock className="rotate-45" size={28} />
                            </button>
                        </div>

                        {/* Instruction Top */}
                        <div className="absolute top-10 left-10 z-50 pointer-events-none">
                            <span className="text-[#FFD700] text-[10px] font-black uppercase tracking-[0.5em] bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-[#FFD700]/20">
                                CARD PREVIEW
                            </span>
                        </div>

                        {/* THE IMAGE (Hold to Save) */}
                        <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#060606]">
                            <img 
                                src={mobileImage} 
                                alt="Founder Card" 
                                className="h-full w-full object-contain shadow-[0_0_100px_rgba(255,215,0,0.2)]"
                            />
                            
                            {/* Instruction Bottom */}
                            <div className="absolute bottom-12 w-full flex flex-col items-center gap-4 pointer-events-none">
                                <motion.p 
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="text-white text-xs font-black uppercase tracking-[0.6em] text-center bg-black/60 backdrop-blur-2xl px-10 py-5 rounded-3xl border border-white/10"
                                >
                                    HOLD TO SAVE TO PHOTOS
                                </motion.p>
                                <div className="flex items-center gap-6 opacity-40">
                                    <ShieldCheck size={16} className="text-[#00ffff]" />
                                    <div className="h-[1px] w-12 bg-white/20" />
                                    <Zap size={16} className="text-[#00ffff]" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content sections unified on one page */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                
                {/* Manifesto Section */}
                <motion.section
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="p-10 rounded-[40px] border border-white/5 bg-white/[0.02] backdrop-blur-3xl flex flex-col gap-8 md:col-span-2"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Target className="text-[#00ffff]" size={24} />
                            <h3 className="text-[#00ffff] text-xs font-black uppercase tracking-[0.6em]">FOUNDER'S MANIFESTO</h3>
                        </div>
                        <p className="text-2xl sm:text-3xl font-black italic uppercase text-white leading-tight">
                            "WE DO NOT TRAIN TO MAINTAIN. WE TRAIN TO OVERTAKE."
                        </p>
                        <p className="text-white/60 text-base leading-relaxed font-medium max-w-2xl">
                            The 3D revolution is not about pixels. It is about perspective. 
                            You are no longer an observer. You are the architect of your own evolution.
                        </p>
                    </div>
                </motion.section>

                {/* Recruitment Section */}
                <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="md:col-span-2 p-10 rounded-[40px] bg-[#00ffff]/5 border border-[#00ffff]/10 backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-10"
                >
                    <div className="space-y-4 text-center md:text-left">
                        <h3 className="text-[#00ffff] text-xs font-black uppercase tracking-[0.6em]">RECRUITMENT PROTOCOL</h3>
                        <p className="text-white/80 font-medium">
                            Recruit 3 athletes to unlock Phase 2 early. Grab the remaining founder slots before they are sealed.
                        </p>
                        <div className="flex items-center justify-center md:justify-start gap-4">
                            <div className="px-4 py-2 bg-black/40 rounded-full border border-white/10 flex items-center gap-2">
                                <Users size={14} className="text-[#00ffff]" />
                                <span className="text-xs font-black text-white">{stats?.referrals ?? 0} RECRUITS</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
                        <div className="bg-black border-2 border-white/5 rounded-2xl py-4 px-6 font-mono text-xs text-white/40 flex items-center gap-4">
                            <span className="truncate max-w-[150px]">{referralLink}</span>
                            <button onClick={handleCopyLink} className="text-[#00ffff] hover:scale-110 transition-transform">
                                {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        <button 
                            onClick={handleCopyLink}
                            className="bg-[#00ffff] text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] transition-all"
                        >
                            COPY LINK
                        </button>
                    </div>
                </motion.section>
            </div>

            {/* DAILY DIRECTIVE */}
            <motion.section
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="w-full p-10 rounded-[40px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent backdrop-blur-3xl overflow-hidden relative"
            >
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-3 h-3 bg-[#39ff14] rounded-full shadow-[0_0_15px_#39ff14]" />
                            <motion.div 
                                animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute inset-0 bg-[#39ff14] rounded-full"
                            />
                        </div>
                        <h3 className="text-white text-xs font-black uppercase tracking-[0.6em] flex items-center gap-2">
                            DAILY DIRECTIVE <span className="opacity-20">//</span> DAY {currentDay + 1}
                        </h3>
                    </div>
                    <span className="text-[10px] font-bold text-white/20 tracking-widest uppercase">STATUS: ACTIVE</span>
                </div>

                <div className="space-y-6 relative z-10">
                    <h2 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white leading-tight">
                        {currentDirective.split(':')[0]}
                    </h2>
                    <p className="text-xl sm:text-2xl font-medium text-[#00ffff] leading-relaxed italic opacity-90">
                        "{currentDirective.split(':').slice(1).join(':').trim()}"
                    </p>
                </div>

                {/* Decorative background grid */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#39ff14]/5 blur-[80px] -z-10" />
            </motion.section>

            {/* PHASE 2 COUNTDOWN TIMER */}
            <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="w-full p-10 rounded-[40px] border border-[#00ffff]/10 bg-[#00ffff]/[0.02] backdrop-blur-3xl flex flex-col items-center gap-8"
            >
                <div className="flex flex-col items-center gap-2 text-center">
                    <h3 className="text-[#00ffff] text-xs font-black uppercase tracking-[0.6em]">PHASE 2: 3D MODULE ACTIVATION</h3>
                    <div className="h-[2px] w-24 bg-[#00ffff]/20" />
                </div>

                <div className="flex items-center gap-4 sm:gap-8 font-mono">
                    {[
                        { label: 'DAYS', value: countdown.days },
                        { label: 'HOURS', value: countdown.hours },
                        { label: 'MINS', value: countdown.minutes },
                        { label: 'SECS', value: countdown.seconds }
                    ].map((unit, i) => (
                        <div key={unit.label} className="flex items-center gap-4 sm:gap-8">
                            <div className="flex flex-col items-center">
                                <span className="text-4xl sm:text-6xl font-black text-[#00ffff] text-glow leading-none">
                                    {unit.value.toString().padStart(2, '0')}
                                </span>
                                <span className="text-[10px] font-bold text-white/30 tracking-widest mt-2">{unit.label}</span>
                            </div>
                            {i < 3 && (
                                <span className="text-2xl sm:text-4xl font-black text-white/10 mb-6">:</span>
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-white/40 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-center max-w-md leading-relaxed">
                    Founding Athletes receive <span className="text-[#00ffff]">24-hour early access</span> to the 3D Movement Clinic.
                </p>
            </motion.section>

            {/* HUD Status Footer */}
            <motion.footer 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="w-full pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6"
            >
                <div className="flex flex-wrap justify-center gap-6">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">INITIATION STATUS: SECURED</span>
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">VAULT: ONLINE</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.4em]">
                    <Lock size={10} />
                    <span>ENCRYPTED HUD v.1.0</span>
                </div>
            </motion.footer>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=JetBrains+Mono:wght@700;800&display=swap');
                .font-mono { font-family: 'JetBrains Mono', monospace; }
                .text-glow { text-shadow: 0 0 30px rgba(255, 255, 255, 0.2); }
                .hud-grid {
                    background-image: 
                        linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                }
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
            
            <Suspense fallback={<div className="text-[#00ffff] font-black animate-pulse py-20 uppercase tracking-[0.3em]">CALIBRATING HUD...</div>}>
                <WelcomeContent />
            </Suspense>
        </div>
    );
}


