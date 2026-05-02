"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface Props {
    accent: string;
    streak: number;
    totalXP: number;
}

export default function NeuralRecoveryRing({ accent, streak, totalXP }: Props) {
    const [tick, setTick] = useState(0);

    // Derive a CNS recovery score (70–100) from streak + XP
    const raw = Math.min(100, 70 + Math.floor((streak * 3 + totalXP / 50) % 30));
    const score = raw;
    const radius = 72;
    const stroke = 5;
    const circ   = 2 * Math.PI * radius;
    const dash   = (score / 100) * circ;

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 2800);
        return () => clearInterval(id);
    }, []);

    const status = score >= 90 ? "OPTIMAL" : score >= 75 ? "RECOVERED" : "LOADING";
    const statusColor = score >= 90 ? accent : score >= 75 ? "#7fff7f" : "#ff9f3f";

    return (
        <div className="relative flex flex-col items-center justify-center select-none" style={{ minHeight: 220 }}>

            {/* Outer ambient glow */}
            <div
                className="absolute rounded-full pointer-events-none"
                style={{
                    width: 200, height: 200,
                    background: `radial-gradient(circle, ${accent}12 0%, transparent 70%)`,
                    filter: "blur(18px)",
                }}
            />

            {/* Rotating scan arc */}
            <motion.div
                className="absolute"
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                style={{ width: 168, height: 168 }}
            >
                <svg width="168" height="168" viewBox="0 0 168 168">
                    <circle
                        cx="84" cy="84" r={radius}
                        fill="none"
                        stroke={`${accent}18`}
                        strokeWidth={stroke}
                    />
                    {/* Glow arc sweep */}
                    <circle
                        cx="84" cy="84" r={radius}
                        fill="none"
                        stroke={accent}
                        strokeWidth={stroke + 1}
                        strokeDasharray={`${circ * 0.18} ${circ * 0.82}`}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 8px ${accent})` }}
                    />
                </svg>
            </motion.div>

            {/* Static progress ring */}
            <svg
                width="168" height="168"
                viewBox="0 0 168 168"
                className="absolute"
                style={{ transform: "rotate(-90deg)" }}
            >
                {/* Track */}
                <circle cx="84" cy="84" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
                {/* Progress */}
                <motion.circle
                    cx="84" cy="84" r={radius}
                    fill="none"
                    stroke={accent}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - dash }}
                    transition={{ duration: 2.2, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 6px ${accent}80)` }}
                />
            </svg>

            {/* Pulsing inner ring */}
            <motion.div
                className="absolute rounded-full"
                animate={{ scale: [1, 1.04, 1], opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 130, height: 130, border: `1px solid ${accent}40` }}
            />

            {/* Center content */}
            <div className="relative flex flex-col items-center gap-1 z-10">
                <motion.p
                    key={tick}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="font-black leading-none tabular-nums"
                    style={{
                        fontFamily: "var(--font-archivo-black), sans-serif",
                        fontSize:   "2.8rem",
                        color:      accent,
                        textShadow: `0 0 24px ${accent}80`,
                    }}
                >
                    {score}
                    <span className="text-lg opacity-50">%</span>
                </motion.p>
                <p className="text-[8px] font-black uppercase tracking-[0.5em] opacity-40">CNS Recovery</p>
                <motion.div
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="flex items-center gap-1.5 mt-1"
                >
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
                    />
                    <span className="text-[7px] font-black uppercase tracking-[0.45em]" style={{ color: statusColor }}>
                        {status}
                    </span>
                </motion.div>
            </div>

            {/* HUD tick marks */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <div
                    key={i}
                    className="absolute pointer-events-none"
                    style={{
                        width: 2, height: i % 3 === 0 ? 8 : 5,
                        background: `${accent}${i % 3 === 0 ? '60' : '30'}`,
                        transformOrigin: "50% 84px",
                        transform: `rotate(${deg}deg) translateY(-84px)`,
                        top: "50%", left: "50%",
                        marginLeft: -1, marginTop: -84,
                    }}
                />
            ))}
        </div>
    );
}
