"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { useSavagePoints } from '@/hooks/useSavagePoints';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Zap, ShieldCheck, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface StoreItem {
    id: 'inferno' | 'midnight' | 'gold';
    name: string;
    description: string;
    cost: number;
    colorHex: string;
    glowHex: string;
}

const STORE_ITEMS: StoreItem[] = [
    {
        id: 'inferno',
        name: 'Inferno Mode',
        description: 'Embrace the heat. Neon crimson accents with a deep maroon void.',
        cost: 1000,
        colorHex: '#FF3300',
        glowHex: 'rgba(255, 51, 0, 0.4)'
    },
    {
        id: 'midnight',
        name: 'Midnight Mode',
        description: 'For the night owls. Deep space violet with piercing neon purple.',
        cost: 2500,
        colorHex: '#B026FF',
        glowHex: 'rgba(176, 38, 255, 0.4)'
    },
    {
        id: 'gold',
        name: 'Gold Tier',
        description: 'Aesthetic perfection. Jet black backgrounds with pure 24k gold.',
        cost: 5000,
        colorHex: '#FFD700',
        glowHex: 'rgba(255, 215, 0, 0.4)'
    }
];

export default function StorePage() {
    const { theme, setThemeMode } = useTheme();
    const { totalPoints, spendPoints } = useSavagePoints();
    const [unlockedItems, setUnlockedItems] = useState<string[]>([]);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [justPurchased, setJustPurchased] = useState<string | null>(null);

    // Initial load of unlocks
    useEffect(() => {
        const savedUnlocks = localStorage.getItem('savage-unlocked-themes');
        if (savedUnlocks) {
            setUnlockedItems(JSON.parse(savedUnlocks));
        } else {
            // Default unlocks
            setUnlockedItems(['savage', 'mrs']);
            localStorage.setItem('savage-unlocked-themes', JSON.stringify(['savage', 'mrs']));
        }
    }, []);

    const handlePurchase = (item: StoreItem) => {
        if (totalPoints >= item.cost) {
            const success = spendPoints(item.cost);
            if (success) {
                // Update Local Storage Array
                const newUnlocks = [...unlockedItems, item.id];
                setUnlockedItems(newUnlocks);
                localStorage.setItem('savage-unlocked-themes', JSON.stringify(newUnlocks));

                // Immediately Equip
                setThemeMode(item.id);
                setJustPurchased(item.name);

                // Trigger FX
                setShowSuccessModal(true);
                triggerFireworks(item.colorHex);

                // Optional Audio Route
                try {
                    const audio = new Audio('/success.mp3'); // Fails gracefully if not present
                    audio.volume = 0.5;
                    audio.play().catch(() => { });
                } catch (e) { }

                setTimeout(() => setShowSuccessModal(false), 3000);
            }
        }
    };

    const triggerFireworks = (color: string) => {
        const duration = 2000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: [color, '#ffffff']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: [color, '#ffffff']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    };

    return (
        <div className="min-h-screen pb-[120px] px-6 pt-12 relative" style={{ backgroundColor: '#060606', color: '#fff' }}>
            {/* Background Aesthetic */}
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-40 transition-colors duration-1000"
                style={{
                    background: `radial-gradient(ellipse at top center, ${theme.mode === 'savage' ? 'rgba(0,230,255,0.1)' : theme.accent + '20'} 0%, transparent 60%),
                                 radial-gradient(ellipse at bottom, rgba(2, 11, 20, 0.5) 0%, transparent 100%)`
                }}
            />

            <div className="relative z-10 max-w-md mx-auto">
                {/* Header (Balance) */}
                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center"
                    >
                        <h1
                            className="text-4xl sm:text-5xl font-black italic tracking-tighter uppercase mb-4"
                            style={{ fontFamily: 'var(--font-archivo-black)', textShadow: '0 4px 20px rgba(0,230,255,0.3)' }}
                        >
                            The Vault
                        </h1>

                        {/* Glowing Balance Box */}
                        <div
                            className="px-6 py-3 rounded-2xl flex items-center gap-3 border backdrop-blur-md shadow-[0_0_30px_rgba(255,215,0,0.15)]"
                            style={{ backgroundColor: 'rgba(255,215,0,0.05)', borderColor: 'rgba(255,215,0,0.3)' }}
                        >
                            <Zap size={20} className="text-[#FFD700] drop-shadow-[0_0_8px_#FFD700]" fill="#FFD700" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold tracking-widest uppercase opacity-70 text-[#FFD700]">Available Balance</span>
                                <span className="text-2xl font-black tracking-wider text-[#FFD700] leading-none">{totalPoints.toLocaleString()} PTS</span>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Grid */}
                <motion.div
                    initial="hidden"
                    animate="show"
                    variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.1 } }
                    }}
                    className="flex flex-col gap-6"
                >
                    {STORE_ITEMS.map((item) => {
                        const isUnlocked = unlockedItems.includes(item.id);
                        const canAfford = totalPoints >= item.cost;
                        const isEquipped = theme.mode === item.id;

                        return (
                            <motion.div
                                key={item.id}
                                variants={{
                                    hidden: { opacity: 0, scale: 0.95 },
                                    show: { opacity: 1, scale: 1, transition: { type: 'spring' } }
                                }}
                                className="relative rounded-[24px] overflow-hidden backdrop-blur-xl border transition-all duration-300"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    borderColor: isEquipped ? item.colorHex : 'rgba(255,255,255,0.08)',
                                    boxShadow: isEquipped ? `0 0 30px ${item.glowHex}` : '0 8px 32px rgba(0,0,0,0.2)'
                                }}
                            >
                                {/* Preview Banner */}
                                <div
                                    className="h-24 w-full relative flex items-center justify-center overflow-hidden"
                                    style={{
                                        background: `linear-gradient(135deg, rgba(0,0,0,0.8) 0%, ${item.glowHex} 100%)`,
                                    }}
                                >
                                    <h3
                                        className="text-3xl font-black italic tracking-tighter uppercase z-10 drop-shadow-md"
                                        style={{ fontFamily: 'var(--font-archivo-black)', color: item.colorHex }}
                                    >
                                        {item.name}
                                    </h3>
                                    {/* Scanline overlay */}
                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] mix-blend-overlay opacity-50" />
                                </div>

                                {/* Body */}
                                <div className="p-5 flex flex-col">
                                    <p className="text-sm opacity-70 mb-5 font-medium leading-relaxed">
                                        {item.description}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto">
                                        {isUnlocked ? (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-white/50 bg-white/5 px-3 py-1.5 rounded-full">
                                                <ShieldCheck size={14} /> UNLOCKED
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-black tracking-wider">{item.cost.toLocaleString()}</span>
                                                <span className="text-xs font-bold opacity-50 uppercase tracking-widest mt-1">PTS</span>
                                            </div>
                                        )}

                                        {/* Action Button */}
                                        {isUnlocked ? (
                                            <button
                                                onClick={() => setThemeMode(item.id)}
                                                disabled={isEquipped}
                                                className={`px-5 py-2.5 rounded-full text-xs font-black tracking-widest uppercase transition-all ${isEquipped
                                                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                                    : 'bg-white text-black hover:scale-105'
                                                    }`}
                                            >
                                                {isEquipped ? 'Equipped' : 'Equip'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handlePurchase(item)}
                                                disabled={!canAfford}
                                                className={`px-5 py-2.5 rounded-full text-xs font-black tracking-widest uppercase flex items-center gap-2 transition-all ${canAfford
                                                    ? 'bg-white text-black hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.3)]'
                                                    : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                                                    }`}
                                            >
                                                {!canAfford && <Lock size={12} />}
                                                Purchase
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </div>

            {/* Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        className="fixed bottom-32 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[400px] z-[200] p-4 rounded-2xl backdrop-blur-2xl border shadow-2xl flex items-center justify-between"
                        style={{
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            borderColor: theme.accent,
                            boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${theme.accent}40`
                        }}
                    >
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-white/60 mb-1">Transaction Confirmed</span>
                            <span className="text-sm font-black tracking-wider" style={{ color: theme.accent }}>{justPurchased} UNLOCKED</span>
                        </div>
                        <ShieldCheck size={24} style={{ color: theme.accent }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
