"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { LiveExercise } from '@/app/library/page';
import { incrementWorkoutStats } from '@/utils/userStats';

const SUMMARY_KEY = 'mw_last_summary';

interface CircuitState {
    queue: LiveExercise[];
    currentIndex: number;
    currentSet: number;
    loopCount: number;
    isResting: boolean;
    isCircuitActive: boolean;
    totalTime: number;
    restTimeRemaining: number;
    isComplete: boolean;
}

interface CircuitContextType extends CircuitState {
    addToQueue: (exercise: LiveExercise) => void;
    removeFromQueue: (id: string) => void;
    setQueue: (queue: LiveExercise[]) => void;
    startCircuit: () => void;
    stopCircuit: () => void;
    startRest: () => void;
    completeWorkout: () => void;
    handleLoopComplete: () => void;
    handleRestComplete: () => void;
    isComplete: boolean;
    clearComplete: () => void;
}

const STORAGE_KEY = 'mw_routine';

function loadRoutine(): LiveExercise[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as LiveExercise[]) : [];
    } catch {
        return [];
    }
}

function saveRoutine(queue: LiveExercise[]) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)); } catch {}
}

const CircuitContext = createContext<CircuitContextType | undefined>(undefined);

export function CircuitProvider({ children }: { children: ReactNode }) {
    const [queue, setQueueState] = useState<LiveExercise[]>([]);

    // Hydrate from localStorage once on mount (client only)
    useEffect(() => {
        const saved = loadRoutine();
        if (saved.length > 0) setQueueState(saved);
    }, []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const [loopCount, setLoopCount] = useState(1);
    const [isResting, setIsResting] = useState(false);
    const [isCircuitActive, setIsCircuitActive] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const [restTimeRemaining, setRestTimeRemaining] = useState(30);
    const [isComplete, setIsComplete] = useState(false);

    // Total workout timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isCircuitActive && !isResting) {
            interval = setInterval(() => {
                setTotalTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isCircuitActive, isResting]);

    // Rest timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isResting && restTimeRemaining > 0) {
            interval = setInterval(() => {
                setRestTimeRemaining(prev => prev - 1);
            }, 1000);
        } else if (isResting && restTimeRemaining === 0) {
            handleRestComplete();
        }
        return () => clearInterval(interval);
    }, [isResting, restTimeRemaining]);

    const addToQueue = (exercise: LiveExercise) => {
        setQueueState(prev => {
            const next = [...prev, exercise];
            saveRoutine(next);
            return next;
        });
    };

    const removeFromQueue = (id: string) => {
        setQueueState(prev => {
            const next = prev.filter(ex => ex.id !== id);
            saveRoutine(next);
            return next;
        });
    };

    const setQueue = (newQueue: LiveExercise[]) => {
        saveRoutine(newQueue);
        setQueueState(newQueue);
    };

    const startCircuit = () => {
        if (queue.length === 0) return;
        setCurrentIndex(0);
        setCurrentSet(1);
        setLoopCount(1);
        setIsResting(false);
        setIsCircuitActive(true);
        setIsComplete(false);
        setTotalTime(0);
        // Trigger "Mission Initialized" audio via AudioManager
        try { window.dispatchEvent(new CustomEvent("mw:mission-start")); } catch {}
    };

    const stopCircuit = () => {
        setIsCircuitActive(false);
        setIsResting(false);
        setIsComplete(false);
    };

    const startRest = () => {
        setRestTimeRemaining(30);
        setIsResting(true);
    };

    const clearComplete = () => {
        setIsComplete(false);
        setIsCircuitActive(false);
    };

    const completeWorkout = () => {
        // Persist summary data for the /summary page
        const workoutName = queue.length > 0
            ? (queue.length === 1 ? queue[0].name : `${queue.length}-Exercise Circuit`)
            : 'Workout';
        try {
            localStorage.setItem(SUMMARY_KEY, JSON.stringify({
                exerciseCount: queue.length,
                xpGained:      100,
                workoutName,
            }));
        } catch {}
        // Increment persistent XP + streak
        incrementWorkoutStats(100);
        setIsCircuitActive(false);
        setIsComplete(true);
    };

    const handleLoopComplete = () => {
        if (loopCount < 3) {
            setLoopCount(prev => prev + 1);
        } else {
            // End of set
            if (currentSet < 3) {
                // More sets in this exercise
                setIsResting(true);
                setRestTimeRemaining(60); // Default 60s rest
            } else {
                // End of all sets for this exercise
                if (currentIndex < queue.length - 1) {
                    // Next exercise
                    setIsResting(true);
                    setRestTimeRemaining(60);
                } else {
                    // Workout complete!
                    stopCircuit();
                }
            }
        }
    };

    const handleRestComplete = () => {
        setIsResting(false);
        const nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
            // All exercises done
            setIsCircuitActive(false);
            setIsComplete(true);
        } else {
            setCurrentIndex(nextIndex);
            setCurrentSet(1);
            setLoopCount(1);
        }
    };

    return (
        <CircuitContext.Provider
            value={{
                queue,
                currentIndex,
                currentSet,
                loopCount,
                isResting,
                isCircuitActive,
                totalTime,
                restTimeRemaining,
                isComplete,
                addToQueue,
                removeFromQueue,
                setQueue,
                startCircuit,
                stopCircuit,
                startRest,
                completeWorkout,
                handleLoopComplete,
                handleRestComplete,
                clearComplete,
            }}
        >
            {children}
        </CircuitContext.Provider>
    );
}

export function useCircuit() {
    const context = useContext(CircuitContext);
    if (!context) {
        throw new Error('useCircuit must be used within a CircuitProvider');
    }
    return context;
}
