"use client";

import { motion } from "framer-motion";
import { computeCNSScore, getRecoveryWindow, type UserStats } from "@/utils/userStats";
import { useState, useEffect } from "react";

interface Props {
    accent:  string;
    vitals:  UserStats;
}

export default function NeuralRecoveryRing({ accent, vitals }: Props) {
    const [score, setScore] = useState(() => computeCNSScore(vitals));
    const [window_, setWindow_] = useState(() => getRecoveryWindow(vitals));

    // Refresh every minute so the score ticks up live
    useEffect(() => {
        const id = setInterval(() => {
            setScore(computeCNSScore(vitals));
            setWindow_(getRecoveryWindow(vitals));
        }, 60_000);
        return () => clearInterval(id);
    }, [vitals]);

    const radius = 72;
    const stroke = 5;
    const circ   = 2 * Math.PI * radius;
    const dash   = (score / 100) * circ;

    const status      = score >= 90 ? "OPTIMAL" : score >= 60 ? "RECOVERING" : "FATIGUED";
    const statusColor = score >= 90 ? accent : score >= 60 ? "#7fff7f" : "#ff6b35";
    const fatigueIdx  = 100 - score;

    return (
        <div className="relative flex flex-col items-center justify-center select-none" style={{ minHeight: 220 }}>

            {/* Outer ambient glow */}
            <div
                className="absolute rounded-full pointer-events-none"
                style={{
                    width: 210, height: 210,
                    background: `radial-gradient(circle, ${accent}14 0%, transparent 70%)`,
                    filter: "blur(20px)",
                }}
            />

            {/* Rotating scan arc */}
            <motion.div
                className="absolute"
                animate={{ rotate: 360 }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ width: 168, height: 168 }}
            >
                <svg width="168" height="168" viewBox="0 0 168 168">
                    <circle cx="84" cy="84" r={radius} fill="none" stroke={`${accent}14`} strokeWidth={stroke} />
                    <circle
                        cx="84" cy="84" r={radius}
                        fill="none"
                        stroke={accent}
                        strokeWidth={stroke + 1}
                        strokeDasharray={`${circ * 0.15} ${circ * 0.85}`}
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
                <circle cx="84" cy="84" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
                <motion.circle
                    cx="84" cy="84" r={radius}
                    fill="none"
                    stroke={statusColor}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - dash }}
                    transition={{ duration: 2.5, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 6px ${statusColor}80)` }}
                />
            </svg>

            {/* Pulsing inner ring */}
            <motion.div
                className="absolute rounded-full"
                animate={{ scale: [1, 1.04, 1], opacity: [0.2, 0.45, 0.2] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 130, height: 130, border: `1px solid ${accent}35` }}
            />

            {/* Center content */}
            <div className="relative flex flex-col items-center gap-1 z-10">
                <motion.p
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="font-black leading-none tabular-nums"
                    style={{
                        fontFamily: "var(--font-archivo-black), sans-serif",
                        fontSize:   "2.8rem",
                        color:      statusColor,
                        textShadow: `0 0 28px ${statusColor}80`,
                    }}
                >
                    {score}
                    <span className="text-lg opacity-50">%</span>
                </motion.p>
                <p className="text-[8px] font-black uppercase tracking-[0.5em] opacity-35">CNS Recovery</p>
                <motion.div
                    animate={{ opacity: [0.55, 1, 0.55] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
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
                        background: `${accent}${i % 3 === 0 ? '55' : '28'}`,
                        transformOrigin: "50% 84px",
                        transform: `rotate(${deg}deg) translateY(-84px)`,
                        top: "50%", left: "50%",
                        marginLeft: -1, marginTop: -84,
                    }}
                />
            ))}

            {/* Fatigue index + recovery window below ring */}
            <div className="absolute -bottom-12 flex items-center gap-4 whitespace-nowrap">
                <div className="text-center">
                    <p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-25">Fatigue</p>
                    <p className="text-[10px] font-black" style={{ color: fatigueIdx > 60 ? "#ff6b35" : accent }}>
                        {fatigueIdx}%
                    </p>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div className="text-center">
                    <p className="text-[7px] font-black uppercase tracking-[0.4em] opacity-25">Recovery</p>
                    <p className="text-[10px] font-black opacity-70">{window_}</p>
                </div>
            </div>
        </div>
    );
}
