"use client";

import { useTheme } from '@/contexts/ThemeContext';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { WorkoutLog } from '@/utils/workoutParser';
import { Crown, Share2 } from 'lucide-react';
import ShareModal from './ShareModal';

interface WorkoutCardProps {
    title: string;
    sets: number;
    duration: string;
    date: string;
    index: number;
    reps?: number;
    weight?: number;
    isPR?: boolean;
    onShare?: () => void;
}

function VaultCard({ title, sets, duration, date, index, reps, weight, isPR, onShare }: WorkoutCardProps) {
    const { theme } = useTheme();
    const cardRef = useRef<HTMLDivElement>(null);

    // Mouse tracking for tilt effect
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const rotateX = useTransform(mouseY, [-0.5, 0.5], [3, -3]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], [-3, 3]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!cardRef.current) return;

        const rect = cardRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const mouseXRelative = (e.clientX - centerX) / rect.width;
        const mouseYRelative = (e.clientY - centerY) / rect.height;

        mouseX.set(mouseXRelative);
        mouseY.set(mouseYRelative);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            ref={cardRef}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1, duration: 0.6 }}
            whileHover={{ y: -4 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
                backgroundColor: theme.cardBg,
                border: `1px solid ${theme.borderColor}`,
                boxShadow: theme.mode === 'savage'
                    ? `0 0 20px rgba(0, 229, 204, 0.15), 0 8px 32px rgba(0, 0, 0, 0.3)`
                    : `0 4px 24px rgba(183, 110, 121, 0.12), 0 8px 32px rgba(0, 0, 0, 0.04)`,
            }}
            className="min-w-[280px] p-6 rounded-[24px] backdrop-blur-3xl cursor-pointer"
        >
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ letterSpacing: '-0.02em' }}>
                    {title}
                </h3>
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
                    style={{
                        backgroundColor: `${theme.accent}20`,
                        color: theme.accent,
                    }}
                >
                    {sets}
                </div>
            </div>

            <div className="space-y-2">
                {reps && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="opacity-50">Reps</span>
                        <span className="font-medium">{reps}</span>
                    </div>
                )}
                {weight && (
                    <div className="flex items-center justify-between text-sm">
                        <span className="opacity-50">Weight</span>
                        <div className="flex items-center gap-2">
                            {isPR && <Crown size={14} className="text-[#FFD700]" fill="#FFD700" />}
                            <span className="font-medium">{weight}kg</span>
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-between text-sm">
                    <span className="opacity-50">Duration</span>
                    <span className="font-medium">{duration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="opacity-50">Date</span>
                    <span className="opacity-70">{date}</span>
                </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.borderColor }}>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: theme.mode === 'savage' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: theme.accent }}
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 1 }}
                        />
                    </div>
                    <span className="text-xs font-medium" style={{ color: theme.accent }}>
                        Complete
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onShare?.(); }}
                        className="ml-auto flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition"
                    >
                        <Share2 size={12} style={{ color: theme.accent }} /> Share
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

interface VaultGridProps {
    dynamicWorkouts?: WorkoutLog[];
}

export default function VaultGrid({ dynamicWorkouts = [] }: VaultGridProps) {
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);

    const defaultWorkouts = [
        { title: 'Chest Destruction', sets: 12, duration: '45 min', date: '2 hours ago' },
        { title: 'Morning Flow', sets: 8, duration: '30 min', date: 'Yesterday' },
        { title: 'Leg Day', sets: 15, duration: '52 min', date: '2 days ago' },
    ];

    // Combine dynamic workouts (newest first) with default workouts
    const allWorkouts = [
        ...dynamicWorkouts.map(w => ({
            log: w,
            title: w.title,
            sets: w.sets,
            duration: w.duration || '5 min',
            date: w.date,
            reps: w.reps,
            weight: w.weight,
            isPR: w.isPR,
        })),
        ...defaultWorkouts.map(w => ({
            log: { id: 'default', title: w.title, sets: w.sets, duration: w.duration, date: w.date, timestamp: Date.now() } as WorkoutLog,
            reps: undefined,
            weight: undefined,
            isPR: undefined,
            ...w
        })),
    ];

    const handleShare = (log: WorkoutLog) => {
        setSelectedLog(log);
        setShareModalOpen(true);
    };

    return (
        <div className="flex flex-col">
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
                {allWorkouts.map((workout, index) => (
                    <VaultCard
                        key={`${workout.title}-${index}`}
                        title={workout.title}
                        sets={workout.sets}
                        duration={workout.duration}
                        date={workout.date}
                        index={index}
                        reps={workout.reps}
                        weight={workout.weight}
                        isPR={(workout as any).isPR}
                        onShare={() => handleShare(workout.log)}
                    />
                ))}
            </div>

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                workoutLog={selectedLog}
            />
        </div>
    );
}
