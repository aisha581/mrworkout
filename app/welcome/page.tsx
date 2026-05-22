"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, ShieldCheck, Download, Share2, Instagram, Smartphone, Lock, Target, Zap, ChevronRight, Users, Loader2, Volume2, VolumeX, Medal, MessageSquare, UserPlus, CheckCircle, Link2, Play } from "lucide-react";
import Link from "next/link";
import VideoPlayer from "@/components/VideoPlayer";
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
    const [stats, setStats] = useState<{ referrals: number; isFounder: boolean; email: string; name: string; founderId: string; joinedAt?: string; role?: string } | null>(
        paramName ? { referrals: 0, isFounder: true, email: paramEmail || "", name: paramName, founderId: "???", joinedAt: Date.now().toString(), role: searchParams.get('role') || 'athlete' } : null
    );

    const [videoExercise, setVideoExercise] = useState<any>(null);
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
                        joinedAt: data.joinedAt,
                        role: data.role
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
                    joinedAt: Date.now().toString(),
                    role: searchParams.get('role') || 'athlete'
                });
            });
        }
    }, [paramName, paramEmail, stats, searchParams]);

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
            // Track social share event
            fetch(`/api/marketing/track?type=social_share&email=${encodeURIComponent(stats?.email || "unknown")}`)
                .catch(err => console.error("Tracking failed:", err));

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
                    className="w-full flex flex-col items-center gap-10"
                >
                    {/* The Visual Card - STORY READY 9:16 */}
                    <div 
                        id="founder-card"
                        className={`relative w-full max-w-[380px] aspect-[9/16] rounded-[40px] overflow-hidden border border-white/20 shadow-2xl group ${
                            stats.role === 'partner' ? 'bg-[#000000] shadow-[0_0_80px_rgba(255,215,0,0.1)]' : 'bg-[#050505] shadow-[0_0_80px_rgba(57,255,20,0.15)]'
                        }`}
                    >
                        {/* Premium Card Background */}
                        <div className={`absolute inset-0 ${
                            stats.role === 'partner' 
                            ? 'bg-gradient-to-b from-[#1a1a1a] via-[#000000] to-[#000000]' 
                            : 'bg-gradient-to-b from-[#121212] via-[#050505] to-[#000000]'
                        }`} />
                        
                        {/* Dynamic Lighting Overlay */}
                        <div className={`absolute inset-0 opacity-50 ${
                            stats.role === 'partner'
                            ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.1),transparent_70%)]'
                            : 'bg-[radial-gradient(circle_at_50%_0%,rgba(57,255,20,0.1),transparent_70%)]'
                        }`} />
                        
                        {/* Card Content Area */}
                        <div className="relative h-full p-10 flex flex-col justify-between z-10">
                            {/* Header: Logo & Status */}
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <div className={`text-[10px] font-black tracking-[0.4em] uppercase opacity-80 ${
                                        stats.role === 'partner' ? 'text-[#FFD700]' : 'text-[#39ff14]'
                                    }`}>Verified Status</div>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                            stats.role === 'partner' ? 'bg-[#FFD700]' : 'bg-[#39ff14]'
                                        }`} />
                                        <span className="text-[10px] font-bold text-white tracking-widest uppercase italic">LIVE: FOUNDER</span>
                                    </div>
                                </div>
                                <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-xl grayscale invert opacity-60" />
                            </div>

                            {/* Mid Section: LARGE FOUNDER TEXT */}
                            <div className="py-6 sm:py-10">
                                <h1 className="text-[60px] sm:text-[80px] font-black italic tracking-tighter leading-[0.85] mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/30 uppercase">
                                    FOUNDER
                                </h1>
                                <div className={`h-[2px] w-16 mb-8 ${
                                    stats.role === 'partner' ? 'bg-[#FFD700]' : 'bg-[#39ff14]'
                                }`} />
                                
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <h2 className={`text-3xl sm:text-4xl font-black italic uppercase tracking-tighter drop-shadow-lg ${
                                            stats.role === 'partner' ? 'text-[#FFD700]' : 'text-[#39ff14]'
                                        }`}>
                                            {stats.name}
                                        </h2>
                                        <p className="text-lg sm:text-xl font-black text-white/90 tracking-tight uppercase">
                                            {stats.role === 'partner' ? 'ESTEEMED PARTNER' : 'FOUNDING ATHLETE'}
                                        </p>
                                        <div className="text-white/30 text-[9px] font-mono mt-2 tracking-widest uppercase">
                                            PROTOCOL_V1 // ID: #{stats.founderId}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer: Stats & Branding */}
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
                                    <div>
                                        <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Referrals</div>
                                        <div className="text-lg font-black text-white">{stats.referrals}</div>
                                    </div>
                                    <div>
                                        <div className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Status</div>
                                        <div className={`text-lg font-black italic uppercase tracking-tighter ${
                                            stats.role === 'partner' ? 'text-[#FFD700]' : 'text-[#00ffff]'
                                        }`}>ELITE</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end border-t border-white/5 pt-5">
                                    <div className="space-y-0.5">
                                        <div className={`text-[7px] font-black uppercase tracking-widest ${
                                            stats.role === 'partner' ? 'text-[#FFD700]' : 'text-[#39ff14]'
                                        }`}>The 3D Clinic</div>
                                        <div className="text-[8px] font-bold text-white/30 tracking-tighter uppercase italic">London • SG • NYC</div>
                                    </div>
                                    <div className="text-[7px] text-white/20 font-mono tracking-widest italic uppercase">Secure Asset</div>
                                </div>
                            </div>
                        </div>

                        {/* Aesthetic Glow Lines */}
                        <div className={`absolute top-0 right-0 w-[1px] h-32 bg-gradient-to-b from-transparent ${
                            stats.role === 'partner' ? 'via-[#FFD700]/30' : 'via-[#39ff14]/30'
                        } to-transparent`} />
                        <div className={`absolute bottom-0 left-0 w-[1px] h-32 bg-gradient-to-t from-transparent ${
                            stats.role === 'partner' ? 'via-[#FFD700]/30' : 'via-[#00ffff]/30'
                        } to-transparent`} />
                    </div>

                    {/* Action Panel */}
                    <div className="flex flex-wrap justify-center gap-4">
                        <button 
                            onClick={handleShare}
                            disabled={isSharing}
                            className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-[#39ff14] text-black font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl hover:shadow-[#39ff14]/20 min-w-[220px] justify-center"
                        >
                            {isSharing ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                            {isSharing ? "SHARING..." : "POST TO STORY"}
                        </button>
                        <button 
                            onClick={handleDownloadCard}
                            disabled={isDownloading}
                            className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-white/10 text-white border border-white/20 font-black uppercase tracking-widest text-sm hover:bg-white/20 transition-all min-w-[220px] justify-center"
                        >
                            {isDownloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                            {isDownloading ? "GENERATING..." : "DOWNLOAD CARD"}
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

            {/* DAILY ACTIONS */}
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
                            DAILY ACTIONS <span className="opacity-20">//</span> DAY {currentDay + 1}
                        </h3>
                    </div>
                    <span className="text-[10px] font-bold text-white/20 tracking-widest uppercase">STATUS: ACTIVE</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                    <div className="space-y-6">
                        {stats?.role === 'athlete' ? (
                            <ul className="space-y-5">
                                {[
                                    { text: "DM Coach your goals on WhatsApp", icon: <MessageSquare size={16} /> },
                                    { text: "Post Founder Card to IG Story & Tag @MrWorkout", icon: <Share2 size={16} /> },
                                    { text: "Follow @MrWorkout for Daily Drills", icon: <UserPlus size={16} /> }
                                ].map((action, idx) => (
                                    <li key={idx} className="flex items-center gap-5 text-white/90 group/item">
                                        <div className="w-10 h-10 rounded-xl bg-[#39ff14]/10 border border-[#39ff14]/30 flex items-center justify-center text-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.1)] group-hover/item:scale-110 transition-transform">
                                            {action.icon}
                                        </div>
                                        <span className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter">
                                            {action.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : stats?.role === 'partner' ? (
                            <div className="space-y-8">
                                <div className="p-8 rounded-3xl bg-gradient-to-br from-[#FFD700]/10 to-transparent border border-[#FFD700]/20 shadow-[0_0_30px_rgba(255,215,0,0.05)]">
                                    <h3 className="text-[10px] font-black tracking-[0.4em] text-[#FFD700] uppercase mb-6 flex items-center gap-2">
                                        <Medal size={14} /> Founder Partner Perks
                                    </h3>
                                    <ul className="grid grid-cols-1 gap-4">
                                        {[
                                            "20% Lifetime Commission on all referred athletes.",
                                            "Unlimited Free 3D Analysis for your personal content.",
                                            "Direct WhatsApp 'Founder Line' for 24/7 support.",
                                            "Early Access to the Mr. Workout AI App Beta."
                                        ].map((perk, idx) => (
                                            <li key={idx} className="flex gap-4 items-start group/perk">
                                                <div className="w-5 h-5 rounded-full bg-[#FFD700]/20 border border-[#FFD700]/50 flex items-center justify-center text-[10px] font-black text-[#FFD700] shrink-0 mt-0.5 group-hover/perk:scale-110 transition-transform">
                                                    ✓
                                                </div>
                                                <span className="text-sm sm:text-base font-bold text-white/90 leading-tight">
                                                    {perk}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <ul className="space-y-5">
                                    {[
                                        { text: "Verify Partner ID with Coach on WhatsApp", icon: <CheckCircle size={16} /> },
                                        { text: "Add 'Founder Partner @MrWorkout' to Bio", icon: <Link2 size={16} /> },
                                        { text: "Watch the Founder Pitch Video", icon: <Play size={16} />, trigger: () => setVideoExercise({ id: 'pitch', name: 'FOUNDER PITCH', videoUrl: 'https://player.vimeo.com/external/370365319.sd.mp4?s=d946d0a7949390234f6644f0be89679f168fa5e6&profile_id=164', savageTip: 'The 3D revolution is here. Secure your equity.' }) }
                                    ].map((action, idx) => (
                                        <li key={idx} className="flex items-center gap-5 text-white/90 group/item cursor-pointer" onClick={action.trigger}>
                                            <div className="w-10 h-10 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30 flex items-center justify-center text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.1)] group-hover/item:scale-110 transition-transform">
                                                {action.icon}
                                            </div>
                                            <span className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter">
                                                {action.text}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <>
                                <h2 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter text-white leading-tight">
                                    {currentDirective.split(':')[0]}
                                </h2>
                                <p className="text-xl sm:text-2xl font-medium text-[#00ffff] leading-relaxed italic opacity-90">
                                    "{currentDirective.split(':').slice(1).join(':').trim()}"
                                </p>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col justify-center gap-6 p-8 rounded-3xl bg-white/5 border border-white/10">
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black tracking-[0.3em] text-[#00ffff] uppercase">Exclusive Status</h4>
                            <p className="text-2xl font-black italic uppercase text-white">
                                {stats?.role === 'partner' ? "Founder Partner" : "Founder Member"}
                            </p>
                        </div>
                        
                        <a 
                            onClick={() => {
                                // Track WhatsApp Click
                                fetch(`/api/marketing/track?type=click&id=whatsapp&email=${encodeURIComponent(stats?.email || "unknown")}`)
                                    .catch(err => console.error("Tracking failed:", err));
                            }}
                            href={`https://wa.me/447341841844?text=${encodeURIComponent(
                                stats?.role === 'partner' 
                                ? "Coach, I'm in for the Founding Partner Perks. Let's get my first 3D scan started. My Partner ID is #" + stats.founderId
                                : "Coach, I'm a Founder Member! I've shared the card—ready for my 20% discount and 3D analysis."
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-5 rounded-2xl bg-[#25D366] text-black font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(37,211,102,0.3)]"
                        >
                            <Smartphone size={20} />
                            {stats?.role === 'partner' ? 'ACTIVATE PARTNER PERKS' : 'CLAIM DISCOUNT'}
                        </a>
                    </div>
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
            {/* Video Player for Pitch/Tutorials */}
            <VideoPlayer 
                isOpen={!!videoExercise}
                onClose={() => setVideoExercise(null)}
                exercise={videoExercise}
            />
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


