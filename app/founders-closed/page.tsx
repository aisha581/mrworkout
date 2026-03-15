"use client";

import { motion } from "framer-motion";
import { Lock, ArrowRight, ShieldAlert, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import "../welcome/welcome.css";

function FoundersClosedContent() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    return (
        <div className="w-full max-w-4xl z-10 flex flex-col items-center gap-12 py-20 text-center">
            
            {/* HEADLINE: RED ALERT */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
            >
                <div className="flex items-center justify-center gap-3 text-[#ff3b3b]">
                    <ShieldAlert size={32} className="animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-[0.8em]">SYSTEM ALERT</span>
                </div>
                <h1 className="text-5xl sm:text-7xl md:text-9xl font-black italic uppercase tracking-tighter leading-[0.8] text-[#ff3b3b] drop-shadow-[0_0_30px_rgba(255,59,59,0.3)]"
                    style={{ fontFamily: 'Archivo Black, sans-serif' }}>
                    FOUNDER SLOTS:<br />CLOSED
                </h1>
                <p className="text-lg md:text-2xl font-black uppercase tracking-[0.2em] text-white pt-4">
                    THE ALPHA SQUAD IS FULL. <span className="text-[#ff3b3b]">151 / 150</span>
                </p>
            </motion.div>

            {/* CENTRAL IMAGE: THE SEALED VAULT */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative group max-w-[800px] w-full aspect-[16/9] rounded-3xl overflow-hidden border-4 border-[#ff3b3b]/20 shadow-[0_0_100px_rgba(255,59,59,0.1)]"
            >
                <img 
                    src="/vault_closed.png" 
                    alt="Vault Sealed" 
                    className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="px-8 py-4 bg-black/80 border-2 border-[#ff3b3b] backdrop-blur-xl rounded-xl">
                        <span className="text-[#ff3b3b] text-2xl font-black tracking-widest uppercase italic">ENTRY DENIED</span>
                    </div>
                </div>
            </motion.div>

            {/* EXPLANATION TEXT */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5 }}
                className="max-w-2xl space-y-6"
            >
                <p className="text-xl md:text-2xl font-bold uppercase tracking-wide leading-relaxed">
                    The initial 150 Founder Slots have been claimed. <br className="hidden md:block" />
                    Entry to the Inner Circle is now <span className="text-[#ff3b3b]">LOCKED</span>.
                </p>
                <p className="text-sm md:text-base text-white/40 font-bold uppercase tracking-widest">
                    These athletes will define the future of Mr. Workout. 
                    Your focus must now shift to Phase 2.
                </p>
            </motion.div>

            {/* CALL TO ACTION */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col items-center gap-8 w-full"
            >
                <Link href="/" className="group relative">
                    <div className="absolute -inset-1 bg-[#ff3b3b] rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
                    <button className="relative px-12 py-6 bg-black border-2 border-[#ff3b3b] rounded-2xl flex items-center gap-4 hover:bg-[#ff3b3b] hover:text-black transition-all">
                        <span className="text-xl font-black uppercase tracking-tighter italic">JOIN THE PHASE 2 WAITLIST</span>
                        <ArrowRight size={24} />
                    </button>
                </Link>
                
                <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30">NEXT WAVE CALIBRATING...</p>
                    <div className="flex gap-1">
                        {[1, 2, 3].map(i => (
                            <motion.div
                                key={i}
                                animate={{ opacity: [0.2, 1, 0.2] }}
                                transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
                                className="w-12 h-1 bg-[#ff3b3b]/40 rounded-full"
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

export default function FoundersClosed() {
    return (
        <div className="min-h-screen bg-[#060606] text-white flex flex-col items-center justify-center px-6 md:px-12 overflow-x-hidden relative">
            {/* Industrial Background Grid */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none hud-grid" />
            
            <Suspense fallback={<div className="text-[#ff3b3b] font-black animate-pulse py-20 uppercase tracking-[0.4em]">SYNCING VAULT STATUS...</div>}>
                <FoundersClosedContent />
            </Suspense>

            {/* Cinematic Industrial Edge Overlay */}
            <div className="absolute inset-0 pointer-events-none border-[30px] md:border-[60px] border-black/80" />
            
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap');
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
