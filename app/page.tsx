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
    const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
    const [isFinalAction, setIsFinalAction] = useState(false);
    const [showTapOverlay, setShowTapOverlay] = useState(true);
    const [showWelcome, setShowWelcome] = useState(false);
    
    // Media Ready States
    const [videoReady, setVideoReady] = useState(false);
    const [audioReady, setAudioReady] = useState(false);
    const isMediaReady = videoReady && audioReady;

    const audioRef = useRef<HTMLAudioElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);

    // Caption Logic (Follow Video Time)
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            const currentTime = video.currentTime;
            
            let activeIdx = -1;
            for (let i = 0; i < OVERLAY_TEXTS.length; i++) {
                if (currentTime >= OVERLAY_TEXTS[i].time) {
                    activeIdx = i;
                }
            }
            
            if (activeIdx !== currentTextIdx) {
                setCurrentTextIdx(activeIdx);
                
                // Final Action trigger (Adjusted to new timestamps)
                if (activeIdx === OVERLAY_TEXTS.length - 1) {
                    setIsFinalAction(true);
                    emailInputRef.current?.focus();
                }
            }
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        return () => video.removeEventListener("timeupdate", handleTimeUpdate);
    }, [currentTextIdx]);

    // DRIFT CORRECTION - Every 2 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current && audioRef.current && !audioRef.current.muted) {
                const diff = Math.abs(audioRef.current.currentTime - videoRef.current.currentTime);
                if (diff > 0.1) {
                    console.log(`[SYNC] Drift detected (${diff.toFixed(3)}s). Snapping audio to video.`);
                    audioRef.current.currentTime = videoRef.current.currentTime;
                }
            }
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const masterPlay = () => {
        if (videoRef.current && audioRef.current) {
            // Master Trigger: Reset both and play at the exact same time
            videoRef.current.currentTime = 0;
            audioRef.current.currentTime = 0;
            
            Promise.all([
                videoRef.current.play(),
                audioRef.current.play()
            ]).catch(err => console.error("MasterPlay failed:", err));
        }
    };

    const handleEnableAudio = () => {
        if (audioRef.current && videoRef.current) {
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || status === "submitting") return;

        setStatus("submitting");
        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            });

            if (res.ok) {
                setStatus("success");
                setEmail("");
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate([100, 30, 100]);
                }
                setTimeout(() => setShowWelcome(true), 1500);
            } else {
                setStatus("error");
            }
        } catch (err) {
            setStatus("error");
        }
    };

    const handleEnterClinic = () => {
        localStorage.setItem('savage_onboarded', 'true');
        router.push('/dashboard');
    };

    return (
        <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-[#121212] text-white font-sans">
            
            {/* Welcome Overlay (Shown on success) */}
            <WelcomeOverlay 
                isVisible={showWelcome} 
                onEnter={handleEnterClinic} 
            />

            {/* Left Panel: Video (Top on Mobile) */}
            <div className="relative w-full lg:w-1/2 h-1/2 lg:h-full bg-black flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-white/5">
                <video
                    ref={videoRef}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    onCanPlayThrough={() => setVideoReady(true)}
                    {...({ fetchpriority: "high" } as any)}
                    className="w-full h-full object-contain"
                >
                    <source src="/Workout_Preview.mp4" type="video/mp4" />
                </video>

                {/* Sub-caption Text Overlay (Synced with Video Time) */}
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

                {/* Tap for Audio Overlay */}
                <AnimatePresence>
                    {showTapOverlay && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            onClick={handleEnableAudio}
                            disabled={!isMediaReady}
                            className={`absolute z-30 group flex flex-col items-center gap-4 p-8 rounded-full transition-all ${!isMediaReady ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <div className="w-20 h-20 flex items-center justify-center rounded-full bg-[#00ffff]/10 border-2 border-[#00ffff] text-[#00ffff] backdrop-blur-md shadow-[0_0_30px_rgba(0,255,255,0.4)] group-hover:scale-110 transition-transform">
                                {!isMediaReady ? (
                                    <Loader2 className="animate-spin" size={32} />
                                ) : (
                                    <Volume2 size={32} />
                                )}
                            </div>
                            <span className="font-black italic uppercase tracking-widest text-xs text-[#00ffff] drop-shadow-sm">
                                {!isMediaReady ? 'Buffering HD Media...' : 'Tap for Audio'}
                            </span>
                        </motion.button>
                    )}
                </AnimatePresence>

                {/* Mute Toggle Corner */}
                {!showTapOverlay && (
                    <button
                        onClick={handleToggleMute}
                        className="absolute bottom-6 left-6 z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/60 backdrop-blur-sm transition-all hover:text-white hover:scale-105"
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                )}
            </div>

            {/* Right Panel: Form (Bottom on Mobile) */}
            <div className="relative w-full lg:w-1/2 h-1/2 lg:h-full bg-[#121212] flex flex-col items-center justify-center px-8 lg:px-24">
                
                {/* Subtle Cyan Edge Glow (Right Edge) */}
                <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-[#00ffff]/10 to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ffff]/5 blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#00ffff]/5 blur-[80px] pointer-events-none" />

                <div className="w-full max-w-lg relative z-10 flex flex-col gap-12 text-center lg:text-left">
                    
                    {/* Social Proof Status Line */}
                    <div className="flex flex-col lg:flex-row items-center gap-3 lg:gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] shadow-inner backdrop-blur-3xl">
                        <div className="flex -space-x-2">
                             {[1,2,3].map(i => (
                                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#121212] bg-zinc-800 flex items-center justify-center overflow-hidden">
                                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-900" />
                                </div>
                             ))}
                        </div>
                        <div className="flex flex-col text-center lg:text-left">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00ffff] opacity-80">
                                Clinic Status: Pre-Launch
                            </span>
                            <span className="text-xs font-black uppercase tracking-tighter text-white">
                                1,248 ATHLETES ENLISTED
                            </span>
                        </div>
                    </div>

                    {/* Main Form Content */}
                    <div className="space-y-8">
                        <div>
                            <h1 className="text-4xl lg:text-6xl font-black uppercase italic leading-[0.9] tracking-tighter mb-4" style={{ fontFamily: 'var(--font-archivo-black), sans-serif' }}>
                                DROP YOUR EMAIL <br />
                                <span className="text-[#00ffff]" style={{ textShadow: '0 0 30px rgba(0,255,255,0.4)' }}>FOR EARLY ACCESS</span>
                            </h1>
                            <p className="text-white/40 font-medium uppercase tracking-[0.1em] text-sm lg:text-base max-w-sm mx-auto lg:mx-0">
                                Be the first to build with Savage coaching. Limited spots for Phase O release.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative group">
                                <input
                                    ref={emailInputRef}
                                    type="email"
                                    placeholder="ATHLETE@DOMAIN.COM"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={status === "success"}
                                    className="w-full bg-white/[0.03] backdrop-blur-xl border-2 border-white/10 rounded-2xl py-6 px-8 outline-none transition-all focus:border-[#00ffff]/40 focus:bg-white/[0.08] text-xl font-bold tracking-widest placeholder:text-white/10 uppercase"
                                />
                                <div className="absolute inset-0 rounded-2xl bg-[#00ffff]/5 blur-2xl group-focus-within:opacity-100 opacity-0 transition-opacity pointer-events-none" />
                            </div>

                            <motion.button
                                type="submit"
                                disabled={status === "submitting" || status === "success"}
                                animate={isFinalAction && status !== "success" ? {
                                    boxShadow: [
                                        "0 0 10px rgba(0, 255, 255, 0.3)",
                                        "0 0 40px rgba(0, 255, 255, 0.6)",
                                        "0 0 10px rgba(0, 255, 255, 0.3)"
                                    ],
                                    scale: [1, 1.02, 1]
                                } : {}}
                                transition={isFinalAction ? {
                                    repeat: Infinity,
                                    duration: 1.5
                                } : {}}
                                className={`w-full py-6 rounded-2xl font-black text-2xl tracking-tighter uppercase transition-all shadow-xl
                                    ${status === "success" 
                                        ? "bg-green-500/20 text-green-400 border border-green-500/50" 
                                        : "bg-[#00ffff] text-black hover:scale-[1.02] active:scale-[0.98] hover:shadow-[0_0_50px_rgba(0,255,255,0.5)]"
                                    }
                                `}
                            >
                                {status === "submitting" ? "PROCESSING..." : status === "success" ? "ENTRY GRANTED" : "JOIN THE CLINIC"}
                            </motion.button>

                            <AnimatePresence>
                                {status === "success" && (
                                    <motion.p 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-[#00ffff] text-center font-bold text-xs uppercase tracking-widest bg-[#00ffff]/10 py-3 rounded-lg border border-[#00ffff]/20"
                                    >
                                        Check your inbox for your Clinic credentials shortly.
                                    </motion.p>
                                )}
                            </AnimatePresence>

                            {status === "error" && (
                                <p className="text-red-500 text-center font-bold text-xs uppercase tracking-widest">
                                    ERROR SUBMITTING. DATABASE BUSY.
                                </p>
                            )}
                        </form>
                    </div>

                    {/* Savage Quote Footer */}
                    <div className="pt-8 border-t border-white/5 opacity-30 mx-auto lg:mx-0">
                        <p className="text-[10px] uppercase font-bold tracking-[0.3em]">
                            Powered by Mr. Workout | Savage Protocol v.1
                        </p>
                    </div>
                </div>

                {/* Live User Count Ticker */}
                <div className="absolute bottom-8 right-8 flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md">
                    <div className="relative flex items-center justify-center">
                        <Activity size={14} className="text-[#00ffff]" />
                        <span className="absolute inset-0 bg-[#00ffff] blur-sm opacity-50 animate-pulse" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#00ffff]/80 animate-pulse">
                        124 athletes currently in the Clinic.
                    </span>
                </div>
            </div>

            {/* Audio Experience */}
            <audio 
                ref={audioRef} 
                src="/Savage_VO.mp3" 
                preload="auto"
                onCanPlayThrough={() => setAudioReady(true)}
                muted={isMuted} 
            />

            {/* Global Styles for the Font */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');
                :root {
                    --font-archivo-black: 'Archivo Black', sans-serif;
                }
            `}</style>
        </div>
    );
}
