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
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch('/api/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, name, source: `repair_${issue}` }),
            });
            if (res.ok) setStatus('success');
            else setStatus('error');
        } catch (err) {
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
                    className="w-full max-w-md bg-white text-black p-8 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                >
                    {status === 'success' ? (
                        <div className="text-center py-4">
                            <h3 className="text-2xl font-black uppercase mb-2">Access Granted</h3>
                            <p className="text-gray-600">Your specific repair protocol is being generated. Check your inbox.</p>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-2xl font-black uppercase mb-6 text-center">Join the Alpha Squad</h3>
                            <form onSubmit={handleJoin} className="flex flex-col gap-4">
                                <input 
                                    type="text" 
                                    placeholder="Full Name" 
                                    required
                                    className="bg-gray-100 border-none p-4 rounded-xl font-bold focus:ring-2 focus:ring-black outline-none"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <input 
                                    type="email" 
                                    placeholder="Enter your email" 
                                    required
                                    className="bg-gray-100 border-none p-4 rounded-xl font-bold focus:ring-2 focus:ring-black outline-none"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <button 
                                    className="bg-black text-white p-4 rounded-xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                                    disabled={status === 'loading'}
                                >
                                    {status === 'loading' ? 'Encrypting...' : 'Secure Early Access'}
                                </button>
                                {status === 'error' && <p className="text-red-500 text-xs text-center mt-2">Error connecting to Alpha Core. Try again.</p>}
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
