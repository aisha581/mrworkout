import { useWorkout } from '@/contexts/WorkoutContext';
import { useMemo, useState, useEffect } from 'react';

export function useSavagePoints() {
    const { workoutHistory } = useWorkout();
    const [spentPoints, setSpentPoints] = useState(0);

    // Load spent points on mount
    useEffect(() => {
        const savedSpent = localStorage.getItem('savage-spent-points');
        if (savedSpent) {
            setSpentPoints(parseInt(savedSpent, 10));
        }
    }, []);

    const spendPoints = (amount: number): boolean => {
        // Calculate max available fresh without relying on the memoized state to avoid race conditions
        let currentEarned = 0;
        workoutHistory.forEach(log => currentEarned += 10 + (log.isPR ? 50 : 0));
        let vol = 0;
        workoutHistory.forEach(l => {
            if (l.weight && l.reps) vol += l.weight * l.reps * l.sets;
            else if (l.weight) vol += l.weight * l.sets;
        });
        currentEarned += Math.floor(vol / 1000) * 5;

        // Check if we can afford it
        if (currentEarned - spentPoints >= amount) {
            const newSpent = spentPoints + amount;
            setSpentPoints(newSpent);
            localStorage.setItem('savage-spent-points', newSpent.toString());
            return true;
        }
        return false;
    };

    const memoizedPoints = useMemo(() => {
        let points = 0;
        let prCount = 0;
        let totalVolumeKg = 0;

        workoutHistory.forEach(log => {
            points += 10;
            if (log.isPR) {
                points += 50;
                prCount++;
            }
            if (log.weight && log.reps) {
                totalVolumeKg += log.weight * log.reps * log.sets;
            } else if (log.weight) {
                totalVolumeKg += log.weight * log.sets;
            }
        });

        const volumeBonus = Math.floor(totalVolumeKg / 1000) * 5;
        const totalEarned = points + volumeBonus;

        return {
            totalPoints: totalEarned - spentPoints,
            earnedPoints: totalEarned,
            spentPoints,
            breakdown: {
                basePoints: workoutHistory.length * 10,
                prPoints: prCount * 50,
                volumePoints: volumeBonus,
                totalVolumeKg,
                prCount
            }
        };
    }, [workoutHistory, spentPoints]);

    return { ...memoizedPoints, spendPoints };
}
