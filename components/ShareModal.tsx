"use client";

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Share2 } from 'lucide-react';
import { WorkoutLog } from '@/utils/workoutParser';
import { getUserStats, getRankInfo, computeCNSScore } from '@/utils/userStats';
import html2canvas from 'html2canvas';

interface ShareModalProps {
    isOpen:     boolean;
    onClose:    () => void;
    workoutLog: WorkoutLog | null;
}

export default function ShareModal({ isOpen, onClose, workoutLog }: ShareModalProps) {
    const cardRef    = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [streak,    setStreak]    = useState(0);
    const [rankName,  setRankName]  = useState('Recruit');
    const [totalXP,   setTotalXP]   = useState(0);
    const [cnsScore,  setCnsScore]  = useState(100);

    useEffect(() => {
        if (!isOpen) return;
        const stats = getUserStats();
        const rank  = getRankInfo(stats.totalXP);
        setStreak(stats.currentStreak);
        setRankName(rank.levelName);
        setTotalXP(stats.totalXP);
        setCnsScore(computeCNSScore(stats));
    }, [isOpen]);

    const handleShare = async () => {
        if (!cardRef.current) return;
        setIsSharing(true);
        try {
            const canvas = await html2canvas(cardRef.current, {
                useCORS:         true,
                backgroundColor: null,
                scale:           3,
            });
            const dataUrl = canvas.toDataURL('image/png');
            const res     = await fetch(dataUrl);
            const blob    = await res.blob();
            const file    = new File([blob], `mrworkout-status-${Date.now()}.png`, { type: 'image/png' });

            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    title: 'Mr. Workout — Savage Status',
                    text:  `CNS ${cnsScore}% · ${streak} day streak · ${rankName}`,
                    files: [file],
                });
            } else if (navigator.share) {
                await navigator.share({
                    title: 'Mr. Workout — Savage Status',
                    text:  `CNS ${cnsScore}% · ${streak} day streak · ${rankName}`,
                });
            } else {
                const a  = document.createElement('a');
                a.href   = dataUrl;
                a.download = `mrworkout-status-${Date.now()}.png`;
                a.click();
            }
        } catch (err) {
            // user cancelled — no-op
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex flex-col items-center justify-start bg-black overflow-y-auto"
                >
                    {/* Back arrow */}
                    <div className="w-full max-w-sm px-4 pt-6 pb-4 flex items-center">
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2 text-sm font-black uppercase tracking-widest opacity-70 hover:opacity-100 transition-opacity"
                            style={{ color: '#00FFFF' }}
                        >
                            <ArrowLeft size={18} />
                            Back
                        </button>
                    </div>

                    {/* Card preview */}
                    <div className="w-full max-w-sm px-4 pb-6">
                        <div
                            ref={cardRef}
                            className="relative w-full overflow-hidden"
                            style={{
                                aspectRatio:  '9/16',
                                borderRadius: 24,
                                background:   'linear-gradient(160deg, #050505 0%, #0a0a0a 40%, #060e0e 100%)',
                            }}
                        >
                            {/* Grid texture */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    backgroundImage:
                                        'linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)',
                                    backgroundSize: '32px 32px',
                                }}
                            />

                            {/* Radial cyan glow */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background:
                                        'radial-gradient(ellipse 60% 50% at 50% 55%, rgba(0,255,255,0.10) 0%, transparent 70%)',
                                }}
                            />

                            {/* Cyan mannequin silhouette */}
                            <div
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                style={{ opacity: 0.13 }}
                            >
                                <svg
                                    viewBox="0 0 200 400"
                                    width="55%"
                                    fill="#00FFFF"
                                    style={{ filter: 'drop-shadow(0 0 22px #00FFFF)' }}
                                >
                                    {/* head */}
                                    <ellipse cx="100" cy="32" rx="22" ry="26" />
                                    {/* neck */}
                                    <rect x="91" y="55" width="18" height="18" rx="4" />
                                    {/* torso */}
                                    <path d="M60 73 Q55 110 58 160 Q70 175 100 175 Q130 175 142 160 Q145 110 140 73 Q120 65 100 65 Q80 65 60 73Z" />
                                    {/* left upper arm */}
                                    <path d="M60 78 Q38 90 32 130 Q40 140 52 135 Q58 100 68 85Z" />
                                    {/* left forearm */}
                                    <path d="M32 130 Q24 165 28 185 Q38 188 48 182 Q50 160 52 135Z" />
                                    {/* right upper arm */}
                                    <path d="M140 78 Q162 90 168 130 Q160 140 148 135 Q142 100 132 85Z" />
                                    {/* right forearm */}
                                    <path d="M168 130 Q176 165 172 185 Q162 188 152 182 Q150 160 148 135Z" />
                                    {/* left thigh */}
                                    <path d="M62 172 Q55 220 58 265 Q72 272 84 265 Q85 220 80 172Z" />
                                    {/* left shin */}
                                    <path d="M58 265 Q55 310 60 340 Q72 345 82 338 Q84 308 84 265Z" />
                                    {/* right thigh */}
                                    <path d="M138 172 Q145 220 142 265 Q128 272 116 265 Q115 220 120 172Z" />
                                    {/* right shin */}
                                    <path d="M142 265 Q145 310 140 340 Q128 345 118 338 Q116 308 116 265Z" />
                                </svg>
                            </div>

                            {/* Mr. Workout badge */}
                            <div className="absolute top-7 left-7 flex items-center gap-2">
                                <div
                                    style={{
                                        width: 28, height: 28,
                                        borderRadius: 8,
                                        background:   'rgba(0,255,255,0.12)',
                                        border:       '1px solid rgba(0,255,255,0.30)',
                                        display:      'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 13, fontWeight: 900, color: '#00FFFF',
                                    }}
                                >W</div>
                                <span
                                    style={{
                                        fontSize: 11, fontWeight: 900,
                                        letterSpacing: '0.12em', color: '#00FFFF',
                                        textTransform: 'uppercase',
                                        opacity: 0.80,
                                    }}
                                >Mr.workout</span>
                            </div>

                            {/* CNS score — hero number */}
                            <div
                                className="absolute inset-0 flex flex-col items-center justify-center"
                                style={{ paddingTop: '10%' }}
                            >
                                <p
                                    style={{
                                        fontSize: 11, fontWeight: 900,
                                        letterSpacing: '0.45em', color: '#00FFFF',
                                        textTransform: 'uppercase', opacity: 0.55,
                                        marginBottom: 4,
                                    }}
                                >CNS Recovery</p>
                                <p
                                    style={{
                                        fontSize: 80, fontWeight: 900,
                                        lineHeight: 1, color: '#00FFFF',
                                        textShadow: '0 0 50px rgba(0,255,255,0.70), 0 0 100px rgba(0,255,255,0.30)',
                                        fontFamily: 'var(--font-archivo-black), sans-serif',
                                        letterSpacing: '-0.03em',
                                    }}
                                >{cnsScore}<span style={{ fontSize: 36 }}>%</span></p>

                                {/* Workout title if present */}
                                {workoutLog?.title && (
                                    <p
                                        style={{
                                            fontSize: 13, fontWeight: 900,
                                            letterSpacing: '0.18em', color: '#fff',
                                            textTransform: 'uppercase', opacity: 0.45,
                                            marginTop: 10,
                                        }}
                                    >{workoutLog.title}</p>
                                )}
                            </div>

                            {/* Stats pills — bottom */}
                            <div
                                className="absolute bottom-16 left-0 right-0 flex justify-center gap-3 px-6"
                            >
                                {[
                                    { label: 'Streak', value: `${streak}d` },
                                    { label: 'Rank',   value: rankName },
                                    { label: 'XP',     value: `${totalXP}` },
                                ].map(({ label, value }) => (
                                    <div
                                        key={label}
                                        style={{
                                            flex: 1, textAlign: 'center',
                                            padding: '8px 4px',
                                            borderRadius: 12,
                                            background: 'rgba(0,255,255,0.07)',
                                            border:     '1px solid rgba(0,255,255,0.18)',
                                        }}
                                    >
                                        <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', color: '#00FFFF', opacity: 0.55, textTransform: 'uppercase' }}>{label}</p>
                                        <p style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginTop: 2 }}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Branding footer */}
                            <div className="absolute bottom-6 left-0 right-0 text-center">
                                <span
                                    style={{
                                        fontSize: 9, fontWeight: 900,
                                        letterSpacing: '0.30em', color: '#00FFFF',
                                        textTransform: 'uppercase', opacity: 0.35,
                                    }}
                                >mrworkout.app</span>
                            </div>
                        </div>
                    </div>

                    {/* Share button */}
                    <div className="w-full max-w-sm px-4 pb-10">
                        <button
                            onClick={handleShare}
                            disabled={isSharing}
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[13px] flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                            style={{
                                background:  'linear-gradient(135deg, #00FFFF, #00C8C8)',
                                color:       '#000',
                                boxShadow:   '0 0 32px rgba(0,255,255,0.45)',
                                opacity:     isSharing ? 0.7 : 1,
                            }}
                        >
                            {isSharing ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Share2 size={17} />
                                    Share My Status
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
