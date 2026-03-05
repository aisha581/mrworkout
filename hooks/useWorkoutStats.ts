"use client";

import { useState, useEffect } from 'react';

interface WorkoutStats {
    bpm: number;
    calories: number;
    intensity: number;
}

export function useWorkoutStats(): WorkoutStats {
    const [bpm, setBpm] = useState(140);
    const [calories, setCalories] = useState(847);
    const [intensity, setIntensity] = useState(8.5);

    useEffect(() => {
        // Update stats every 3 seconds
        const interval = setInterval(() => {
            // Realistic heart rate fluctuation between 138-142 BPM
            setBpm(prev => {
                const change = (Math.random() - 0.5) * 2; // ±1 BPM
                const newValue = prev + change;
                return Math.max(138, Math.min(142, newValue));
            });

            // Slowly increment calories (0-2 per interval)
            setCalories(prev => prev + Math.floor(Math.random() * 3));

            // Slightly vary intensity between 7.5-9.5
            setIntensity(prev => {
                const change = (Math.random() - 0.5) * 0.15;
                const newValue = prev + change;
                return Math.max(7.5, Math.min(9.5, newValue));
            });
        }, 3000); // 3 seconds

        return () => clearInterval(interval);
    }, []);

    return {
        bpm: Math.round(bpm),
        calories,
        intensity: Number(intensity.toFixed(1)),
    };
}
