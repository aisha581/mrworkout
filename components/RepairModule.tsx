"use client";

import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene3D from './Scene3D';
import { motion } from 'framer-motion';

interface RepairModuleProps {
    issue: string;
    title: string;
    description: string;
    accentColor: string;
    stats: { label: string; value: string }[];
}

export default function RepairModule({ issue, title, description, accentColor, stats }: RepairModuleProps) {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    const handleJoin = async (e: React.FormEvent) => {
        console.log("[REPAIR_DIAGNOSTIC] handleJoin START");
        e.preventDefault();
        
        if (!email) {
            console.warn("[REPAIR_DIAGNOSTIC] ABORT: Email field is empty");
            return;
        }

        console.log("[REPAIR_DIAGNOSTIC] PROCESSING: ", { email, name, source: `repair_${issue}` });
        setStatus('loading');
        
        try {
            const signupUrl = '/api/signup';
            console.log("[REPAIR_DIAGNOSTIC] FETCH START -> ", signupUrl);
            
            const res = await fetch(signupUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.toLowerCase().trim(), name: name.trim(), source: `repair_${issue}` }),
            });

            console.log("[REPAIR_DIAGNOSTIC] FETCH END. Status: ", res.status);
            const result = await res.json();
            console.log("[REPAIR_DIAGNOSTIC] PAYLOAD: ", result);

            if (res.ok) {
                setStatus('success');
            } else {
                console.error("[REPAIR_DIAGNOSTIC] SERVER ERROR: ", result.error || "Unknown error");
                setStatus('error');
            }
        } catch (err) {
            console.error("[REPAIR_DIAGNOSTIC] NETWORK ERROR: ", err);
            setStatus('error');
        }
    };

    return (
        <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden flex flex-col items-center">
            {/* Background 3D Scene */}
            <div className="absolute inset-0 z-0 opacity-40">
                <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
                    <Scene3D accentColor={accentColor} mode="mr" />
                </Canvas>
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 w-full max-w-4xl px-6 py-20 flex flex-col items-center">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <span 
                        className="text-xs uppercase tracking-[0.3em] font-black py-1 px-4 border border-white/20 rounded-full bg-white/5 backdrop-blur-md inline-block mb-6"
                        style={{ color: accentColor, borderColor: accentColor }}
                    >
                        Calibration Required: {issue}
                    </span>
                    <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-6">
                        {title}
                    </h1>
                    <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
                        {description}
                    </p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-16">
                    {stats.map((stat, i) => (
                        <motion.div 
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-xl text-center"
                        >
                            <div className="text-sm uppercase tracking-widest text-gray-500 mb-2">{stat.label}</div>
                            <div className="text-2xl font-black italic" style={{ color: accentColor }}>{stat.value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Conversion Widget */}
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="w-full max-w-md bg-white text-black p-8 rounded-3xl shadow-[0_0_80px_rgba(255,255,255,0.2)] border-4 border-black"
                >
                    {status === 'success' ? (
                        <div className="text-center py-4">
                            <div className="text-5xl mb-4">🛡️</div>
                            <h3 className="text-2xl font-black uppercase mb-2">Leaks Sealed</h3>
                            <p className="text-gray-600">Your custom 3D recovery protocol is being calculated. Stand by for dispatch.</p>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-3xl font-black uppercase mb-2 text-center italic tracking-tighter">REPAIR THE LEAK</h3>
                            <p className="text-center text-gray-500 text-xs font-bold uppercase tracking-widest mb-8">Secure Founding Athlete Status</p>
                            <form onSubmit={handleJoin} className="flex flex-col gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Full Name" 
                                    required
                                    className="bg-gray-100 border-2 border-transparent p-4 rounded-xl font-bold focus:border-black outline-none transition-all"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <input 
                                    type="email" 
                                    placeholder="Email Address" 
                                    required
                                    className="bg-gray-100 border-2 border-transparent p-4 rounded-xl font-bold focus:border-black outline-none transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <button 
                                    className="bg-black text-white p-5 rounded-xl font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-xl"
                                    disabled={status === 'loading'}
                                >
                                    {status === 'loading' ? 'Encrypting...' : 'Initiate Repair Protocol'}
                                </button>
                                {status === 'error' && <p className="text-red-500 text-xs text-center mt-2 font-bold uppercase">Critical Link Error. Retry.</p>}
                            </form>
                        </>
                    )}
                </motion.div>

                <p className="mt-12 text-gray-600 text-[10px] uppercase tracking-widest">
                    Alpha Squad Founders receive 24-hr early access to the 3D Movement Clinic.
                </p>
            </div>

            {/* Bottom Glow */}
            <div 
                className="absolute bottom-0 w-full h-[50vh] opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle at center, ${accentColor} 0%, transparent 70%)` }}
            />
        </div>
    );
}
