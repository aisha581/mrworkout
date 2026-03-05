"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WorkoutLog, createWorkoutLog } from '@/utils/workoutParser';

interface WorkoutContextType {
    workoutHistory: WorkoutLog[];
    addWorkout: (intent: any) => void;
    latestPR: WorkoutLog | null;
    clearPR: () => void;

    // Rest Timer State
    isTimerActive: boolean;
    timeRemaining: number;
    startRestTimer: (seconds?: number) => void;
    stopRestTimer: () => void;

    // Music Player State
    isMusicVisible: boolean;
    toggleMusic: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
    const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([]);
    const [latestPR, setLatestPR] = useState<WorkoutLog | null>(null);

    // Timer State
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);

    // Music State
    const [isMusicVisible, setIsMusicVisible] = useState(false);
    const toggleMusic = () => setIsMusicVisible(prev => !prev);

    // Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isTimerActive && timeRemaining > 0) {
            interval = setInterval(() => {
                setTimeRemaining((prev) => prev - 1);
            }, 1000);
        } else if (timeRemaining === 0 && isTimerActive) {
            // Timer Finished
            setIsTimerActive(false);
            // Optional: Play a sound or trigger a notification here
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerActive, timeRemaining]);

    const addWorkout = (intent: any) => {
        const newWorkout = createWorkoutLog(intent);

        // PR Check Logic
        if (newWorkout.weight) {
            // Find past exercises with the same title
            const pastLogs = workoutHistory.filter(
                log => log.title.toLowerCase() === newWorkout.title.toLowerCase() && log.weight !== undefined
            );

            if (pastLogs.length > 0) {
                // Find previous max weight
                const maxPastWeight = Math.max(...pastLogs.map(log => log.weight as number));
                if (newWorkout.weight > maxPastWeight) {
                    newWorkout.isPR = true;
                    setLatestPR(newWorkout);
                }
            } else {
                // First time doing this exercise with weight is technically a PR, but we won't spam the celebration
                // Just marking it for the vault
                newWorkout.isPR = true;
            }
        }

        setWorkoutHistory((prev) => [newWorkout, ...prev]);
    };

    const clearPR = () => setLatestPR(null);

    const startRestTimer = (seconds: number = 60) => {
        setTimeRemaining(seconds);
        setIsTimerActive(true);
    };

    const stopRestTimer = () => {
        setIsTimerActive(false);
        setTimeRemaining(0);
    };

    return (
        <WorkoutContext.Provider
            value={{
                workoutHistory,
                addWorkout,
                latestPR,
                clearPR,
                isTimerActive,
                timeRemaining,
                startRestTimer,
                stopRestTimer,
                isMusicVisible,
                toggleMusic,
            }}
        >
            {children}
        </WorkoutContext.Provider>
    );
}

export function useWorkout() {
    const context = useContext(WorkoutContext);
    if (!context) {
        throw new Error('useWorkout must be used within a WorkoutProvider');
    }
    return context;
}
