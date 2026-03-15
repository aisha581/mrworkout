"use client";

import { motion } from "framer-motion";
import { Share2, Instagram, ChevronRight, Target, Zap, Twitter } from "lucide-react";
import Link from "next/link";
import "./welcome.css";

export default function WelcomeDashboard() {
    const shareText = "I just gained entry to the @MrWorkout Clinic. The 3D revolution is coming. #MrWorkout";
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

    return (
        <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center px-4 py-12 md:py-24 overflow-x-hidden relative">
            {/* HUD Grid Effect */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none hud-grid" />
            
            {/* Tactical Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00ffff]/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#00ffff]/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="w-full max-w-4xl z-10 flex flex-col gap-12">
                {/* Header: Initiation Status */}
                <header className="flex flex-col items-center md:items-start gap-4">
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
                    
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter leading-[0.9] text-glow"
                        style={{ fontFamily: 'Archivo Black, sans-serif' }}
                    >
                        PHASE 1: <br className="md:hidden" />
                        <span className="text-[#00ffff]">THE INITIATION</span>
                    </motion.h1>
                </header>

                {/* Progress Card */}
                <motion.section
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-8 rounded-[32px] bg-white/[0.03] border border-white/5 backdrop-blur-3xl relative overflow-hidden group"
                >
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                        <div className="space-y-2">
                            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/40">
                                Mission Progress
                            </h3>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter">
                                Building the Foundation
                            </h2>
                        </div>
                        <span className="text-5xl font-black italic uppercase tracking-tighter text-[#00ffff]">
                            15%
                        </span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="relative h-6 w-full bg-white/[0.05] rounded-full overflow-hidden border border-white/10">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: "15%" }}
                            transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00ffff]/20 via-[#00ffff] to-[#00ffff] shadow-[0_0_20px_rgba(0,255,255,0.4)]"
                        />
                        {/* Notches */}
                        <div className="absolute inset-0 flex justify-between px-2 pointer-events-none">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="w-[1px] h-full bg-white/10" />
                            ))}
                        </div>
                    </div>

                    {/* Hud Details */}
                    <div className="mt-6 flex flex-wrap gap-4 opacity-40">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Target size={12} /> Data Sync: Connected
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest">
                            <Zap size={12} /> Modules: Pending
                        </div>
                    </div>
                </motion.section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left: Video Embed Area */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-6"
                    >
                        <div className="aspect-video rounded-[32px] bg-black border-2 border-white/5 overflow-hidden shadow-2xl relative group cursor-pointer">
                            {/* Placeholder Display */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#121212] to-zinc-900 overflow-hidden">
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ repeat: Infinity, duration: 3 }}
                                    className="w-24 h-24 rounded-full bg-[#00ffff]/10 border border-[#00ffff]/30 flex items-center justify-center backdrop-blur-md"
                                >
                                    <ChevronRight size={40} className="text-[#00ffff] ml-1" />
                                </motion.div>
                                <span className="mt-6 text-xs font-black uppercase tracking-[0.5em] text-[#00ffff]/60">
                                    Message from the Coach
                                </span>
                            </div>
                            
                            {/* Scanned Lines Effect */}
                            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%] z-20" />
                        </div>
                        <p className="text-white/40 text-sm font-medium leading-relaxed italic pr-4">
                            "The wait is your first workout. Discipline is how you answer it. Watch the brief above to understand Phase One."
                        </p>
                    </motion.div>

                    {/* Right: Daily Directive & Social */}
                    <div className="space-y-12">
                        {/* Daily Directive */}
                        <motion.section
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="p-8 rounded-[32px] bg-[#00ffff]/5 border border-[#00ffff]/10 backdrop-blur-2xl relative"
                        >
                            <h3 className="text-[#00ffff] text-xs font-black uppercase tracking-[0.4em] mb-4">
                                Daily Directive: 001
                            </h3>
                            <div className="space-y-4">
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                                    The 10-Minute Baseline
                                </h2>
                                <p className="text-white/60 text-sm leading-relaxed">
                                    Before the 3D modules drop, master your sleep. Zero screens 30 minutes before bed tonight. No excuses. Eliminate the noise. Prepare for the revolutionary shift in your training.
                                </p>
                            </div>
                            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30">
                                    Directive: 001
                                </span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#00ffff]">
                                    Awaiting Completion
                                </span>
                            </div>
                        </motion.section>

                        {/* Social Lock */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col gap-6"
                        >
                            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/20 text-center lg:text-left">
                                Secure the Perimeter
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link 
                                    href="https://www.instagram.com/mr.workout.pro" 
                                    target="_blank"
                                    className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] hover:border-[#00ffff]/30 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <Instagram size={20} className="text-[#00ffff]" />
                                        <span className="font-black italic uppercase tracking-tight text-sm">Join IG Meta</span>
                                    </div>
                                    <ChevronRight size={16} className="text-white/20 group-hover:text-[#00ffff] transition-colors" />
                                </Link>
                                
                                <Link
                                    href={twitterUrl}
                                    target="_blank"
                                    className="flex items-center justify-between p-6 rounded-2xl bg-[#00ffff] text-black hover:scale-[1.02] transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <Twitter size={20} />
                                        <span className="font-black italic uppercase tracking-tight text-sm">Share to X</span>
                                    </div>
                                    <Share2 size={16} className="group-hover:rotate-12 transition-transform" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

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
            
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');
            `}</style>
        </div>
    );
}
