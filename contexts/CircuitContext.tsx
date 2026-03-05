"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { LiveExercise } from '@/app/library/page';

interface CircuitState {
    queue: LiveExercise[];
    currentIndex: number;
    currentSet: number;
    loopCount: number;
    isResting: boolean;
    isCircuitActive: boolean;
    totalTime: number;
    restTimeRemaining: number;
}

interface CircuitContextType extends CircuitState {
    addToQueue: (exercise: LiveExercise) => void;
    removeFromQueue: (id: string) => void;
    setQueue: (queue: LiveExercise[]) => void;
    startCircuit: () => void;
    stopCircuit: () => void;
    handleLoopComplete: () => void;
    handleRestComplete: () => void;
}

const CircuitContext = createContext<CircuitContextType | undefined>(undefined);

export function CircuitProvider({ children }: { children: ReactNode }) {
    const [queue, setQueueState] = useState<LiveExercise[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentSet, setCurrentSet] = useState(1);
    const [loopCount, setLoopCount] = useState(1);
    const [isResting, setIsResting] = useState(false);
    const [isCircuitActive, setIsCircuitActive] = useState(false);
    const [totalTime, setTotalTime] = useState(0);
    const [restTimeRemaining, setRestTimeRemaining] = useState(60);

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
        setQueueState(prev => [...prev, exercise]);
    };

    const removeFromQueue = (id: string) => {
        setQueueState(prev => prev.filter(ex => ex.id !== id));
    };

    const setQueue = (newQueue: LiveExercise[]) => {
        setQueueState(newQueue);
    };

    const startCircuit = () => {
        if (queue.length === 0) return;
        setCurrentIndex(0);
        setCurrentSet(1);
        setLoopCount(1);
        setIsResting(false);
        setIsCircuitActive(true);
        setTotalTime(0);

        // Request fullscreen if possible (handled in UI component usually, but state is here)
    };

    const stopCircuit = () => {
        setIsCircuitActive(false);
        setIsResting(false);
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
        if (currentSet < 3) {
            setCurrentSet(prev => prev + 1);
            setLoopCount(1);
        } else {
            setCurrentIndex(prev => prev + 1);
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
                addToQueue,
                removeFromQueue,
                setQueue,
                startCircuit,
                stopCircuit,
                handleLoopComplete,
                handleRestComplete,
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
