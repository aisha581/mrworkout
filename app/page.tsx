"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Users, Activity, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import WelcomeOverlay from "@/components/WelcomeOverlay";

const OVERLAY_TEXTS = [
    { text: "We'll build your plan.", time: 0 },
    { text: "Your goal, your level, your schedule.", time: 2.0 },
    { text: "Workouts that tell you exactly what to do.", time: 5.0 },
    { text: "Targeting the right muscles, the right way.", time: 8.0 },
    { text: "Track reps, calories, and streaks.", time: 11.0 },
    { text: "No guessing. No wasted time.", time: 14.0 },
    { text: "Ready to transform?", time: 17.0 }
];

export default function WaitlistPage() {
    const router = useRouter();
    const [isMuted, setIsMuted] = useState(true);
    const [currentTextIdx, setCurrentTextIdx] = useState(-1);
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [isFinalAction, setIsFinalAction] = useState(false);
    const [showTapOverlay, setShowTapOverlay] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    
    // Media Ready States
    const [videoReady, setVideoReady] = useState(false);
    const [audioReady, setAudioReady] = useState(false);
    
    // Hybrid Hero: Audio can start even if video is buffering, but button shows loading state
    const isAudioReady = audioReady;

    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);

    // Caption Logic + Pre-fetching
    useEffect(() => {
        // Pre-fetch welcome page early for zero-latency redirect
        router.prefetch("/welcome");
        
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            const currentTime = audio.currentTime;
            
            let activeIdx = -1;
            for (let i = 0; i < OVERLAY_TEXTS.length; i++) {
                if (currentTime >= OVERLAY_TEXTS[i].time) {
                    activeIdx = i;
                }
            }
            
            if (activeIdx !== currentTextIdx) {
                setCurrentTextIdx(activeIdx);
                if (activeIdx === OVERLAY_TEXTS.length - 1) {
                    setIsFinalAction(true);
                    emailInputRef.current?.focus();
                }
            }
        };

        audio.addEventListener("timeupdate", handleTimeUpdate);
        return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
    }, [currentTextIdx]);

    // DRIFT CORRECTION
    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current && audioRef.current && !audioRef.current.muted && videoReady) {
                const diff = Math.abs(audioRef.current.currentTime - videoRef.current.currentTime);
                if (diff > 0.1) {
                    audioRef.current.currentTime = videoRef.current.currentTime;
                }
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [videoReady]);

    const masterPlay = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
        }
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(console.error);
        }
    };

    const handleEnableAudio = () => {
        if (audioRef.current) {
            audioRef.current.muted = false;
            setIsMuted(false);
            setShowTapOverlay(false);
            masterPlay();
        }
    };

    const handleToggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !audioRef.current.muted;
            setIsMuted(audioRef.current.muted);
            if (!audioRef.current.muted) {
                setShowTapOverlay(false);
                masterPlay();
            }
        }
    };

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const referredBy = searchParams?.get('ref');
    const role = searchParams?.get('role') || 'athlete';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || status === "submitting") return;

        setStatus("submitting");
        
        // Google Sheets Bridge URL (Hard-coded for debugging)
        const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzXz13ekRsxGtJoBg0l0zx2GsNFX5DbzaummNivLtA0dzIRERW38wFhFIQc0Zcu3cny/exec";
        console.log("[DEBUG] Posting to:", GOOGLE_SHEETS_URL);

        // SPEED FIX: Instant Optimistic Redirect
        const welcomeUrl = `/welcome?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
        router.push(welcomeUrl);

        try {
            // 1. Send to Vercel API (Background)
            fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, name, referredBy, role })
            }).catch(err => console.error("Internal DB update failed:", err));

            // 2. Send to Google Sheets (New Bridge - DEBUG MODE)
            console.log("[DEBUG] TEST CALL: Posting to URL ->", GOOGLE_SHEETS_URL);
            
            fetch(GOOGLE_SHEETS_URL, {
                method: "POST",
                mode: "no-cors", 
                headers: { "Content-Type": "text/plain" },
                body: JSON.stringify({ email, name, role, site: "mrworkout.pro", timestamp: new Date().toISOString() })
            }).then((res) => {
                console.log("[DEBUG] Google Sheets POST initiated (no-cors). Response Status:", res.status);
            }).catch(err => {
                console.error("[DEBUG] Google Sheets Bridge failed:", err);
                alert("Connection Error");
            });
            
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate([50, 20, 50]);
            }
        } catch (err) {
            console.warn("Optimistic redirect initiated, sync handled in background.");
        }
    };

    const handleEnterClinic = () => {
        localStorage.setItem('savage_onboarded', 'true');
        router.push('/dashboard');
    };

    return (
        <div className="flex flex-col lg:flex-row h-[100dvh] w-full overflow-hidden bg-[#0a0a0a] text-white font-sans pb-[80px] lg:pb-0">
            
            {/* Optimized Hero Section: Static WebP for Performance */}
            <div className="relative w-full lg:w-1/2 h-[45dvh] lg:h-full bg-black flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5">
                <motion.div 
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute inset-0 z-0"
                >
                    <img 
                        src="/hero_clinic.png" 
                        alt="The Clinic" 
                        className="w-full h-full object-cover opacity-60"
                    />
                </motion.div>

                {/* Sub-caption Text Overlay */}
                <div className="absolute top-[10%] lg:top-[15%] w-full text-center px-8 z-20 pointer-events-none">
                    <AnimatePresence mode="wait">
                        {currentTextIdx !== -1 && (
                            <motion.h2
                                key={currentTextIdx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.5 }}
                                className="text-xl md:text-3xl font-black uppercase italic tracking-tighter"
                                style={{ 
                                    textShadow: "0 4px 12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 255, 255, 0.3)",
                                    fontFamily: 'var(--font-archivo-black), sans-serif'
                                }}
                            >
                                {OVERLAY_TEXTS[currentTextIdx].text}
                            </motion.h2>
                        )}
                    </AnimatePresence>
                </div>

                {/* Status Indicator */}
                <div className="absolute bottom-8 left-8 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#00ffff] animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">SYSTEM LIVE</span>
                </div>
            </div>

            {/* Right Panel: Form Area */}
            <div className="relative w-full lg:w-1/2 h-[55dvh] lg:h-full bg-[#0a0a0a] flex flex-col items-center justify-center px-8 lg:px-24">
                
                <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-[#00ffff]/10 to-transparent pointer-events-none" />

                <div className="w-full max-w-lg relative z-10 flex flex-col gap-10 text-center lg:text-left">
                    
                    {/* Social Proof Status Line */}
                    <div className="flex flex-col lg:flex-row items-center gap-3 lg:gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] shadow-inner backdrop-blur-3xl">
                        <div className="flex -space-x-2">
                             {[1,2,3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-zinc-800 flex items-center justify-center overflow-hidden">
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                                </div>
                             ))}
                        </div>
                        <div className="flex flex-col text-center lg:text-left">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ffff] opacity-80">
                                CLINIC STATUS: PRE-LAUNCH
                            </span>
                            <span className="text-xs font-black uppercase tracking-tighter text-white">
                                1,248 ATHLETES ENLISTED
                            </span>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        {status === "success" ? (
                            <motion.div 
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center lg:items-start gap-6"
                            >
                                <div className="w-24 h-24 rounded-full bg-[#00ffff]/20 border-4 border-[#00ffff] flex items-center justify-center shadow-[0_0_50px_rgba(0,255,255,0.3)]">
                                    <motion.div
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                    >
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    </motion.div>
                                </div>
                                <div className="text-center lg:text-left">
                                    <h2 className="text-4xl lg:text-6xl font-black uppercase italic tracking-tighter mb-2" style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}>
                                        YOU'RE IN <br />
                                        <span className="text-[#00ffff]">THE CLINIC</span>
                                    </h2>
                                    <p className="text-[#00ffff] font-bold uppercase tracking-widest text-sm opacity-80">
                                        Check your inbox for your credentials shortly.
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="form"
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="space-y-8"
                            >
                                <div>
                                    <h1 className="text-4xl lg:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter mb-4" style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}>
                                        DROP YOUR EMAIL <br />
                                        <span className="text-[#00ffff]" style={{ textShadow: '0 0 30px rgba(0,255,255,0.4)' }}>FOR EARLY ACCESS</span>
                                    </h1>
                                    <p className="text-white/40 font-medium tracking-[0.05em] text-sm lg:text-base max-w-sm mx-auto lg:mx-0">
                                        Be the first to build with Savage coaching. Limited spots for Phase O release.
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                placeholder="FULL NAME"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                required
                                                className="w-full bg-white/[0.03] backdrop-blur-xl border-2 border-white/10 rounded-2xl py-6 px-8 outline-none transition-all focus:border-[#00ffff]/40 focus:bg-white/[0.08] text-xl font-bold tracking-widest placeholder:text-white/10 uppercase"
                                            />
                                        </div>

                                        <div className="relative group">
                                            <input
                                                ref={emailInputRef}
                                                type="email"
                                                placeholder="ATHLETE@DOMAIN.COM"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                className="w-full bg-white/[0.03] backdrop-blur-xl border-2 border-white/10 rounded-2xl py-6 px-8 outline-none transition-all focus:border-[#00ffff]/40 focus:bg-white/[0.08] text-xl font-bold tracking-widest placeholder:text-white/10 uppercase"
                                            />
                                        </div>
                                    </div>

                                    <motion.button
                                        type="submit"
                                        disabled={status === "submitting"}
                                        className="w-full py-6 rounded-2xl font-black text-2xl tracking-tighter uppercase transition-all shadow-xl bg-[#00ffff] text-black hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_50px_rgba(0,255,255,0.5)] flex items-center justify-center gap-3"
                                    >
                                        {status === "submitting" ? (
                                            <>
                                                <Loader2 className="animate-spin" />
                                                VERIFYING STATUS...
                                            </>
                                        ) : "JOIN THE CLINIC"}
                                    </motion.button>

                                    <AnimatePresence>
                                        {status === "error" && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-red-500 text-center font-bold text-xs uppercase tracking-widest bg-red-500/10 py-3 rounded-lg border border-red-500/20"
                                            >
                                                Connection lost. Try again, Athlete.
                                            </motion.p>
                                        )}
                                    </AnimatePresence>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer */}
                    <div className="pt-8 border-t border-white/5 opacity-30 mx-auto lg:mx-0">
                        <p className="text-[10px] uppercase font-bold tracking-[0.3em]">
                            Powered by Mr. Workout | Savage Protocol v.1
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');
                :root {
                    --font-archivo-black: 'Archivo Black', sans-serif;
                }
            `}</style>
        </div>
    );
}
