"use client";

import { useState, useEffect, useCallback } from 'react';

interface VoiceLoggerResult {
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    toggleListening: () => void;
    error: string | null;
}

interface VoiceLoggerOptions {
    onWorkoutLogged?: (intent: any) => void;
    onTranscript?: (text: string) => void;
}

export function useVoiceLogger(options?: VoiceLoggerOptions): VoiceLoggerResult {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        // Check for browser support
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognitionInstance = new SpeechRecognition();
                recognitionInstance.continuous = false;
                recognitionInstance.interimResults = false;
                recognitionInstance.lang = 'en-US';

                recognitionInstance.onresult = (event: any) => {
                    const speechResult = event.results[0][0].transcript;
                    setTranscript(speechResult);
                    if (options?.onTranscript) {
                        options.onTranscript(speechResult);
                    }
                    if (options?.onWorkoutLogged) {
                        // For now we just pass the raw transcript as a simple object intent for compatibility
                        options.onWorkoutLogged({
                            originalText: speechResult,
                            title: 'Voice Logged Workout',
                            confidence: event.results[0][0].confidence
                        });
                    }
                    console.log('🎤 TRANSCRIPT RECEIVED:', speechResult);
                    console.log('📊 Confidence:', event.results[0][0].confidence);
                };

                recognitionInstance.onerror = (event: any) => {
                    console.error('❌ Speech recognition error:', event.error);
                    setError(`Recognition error: ${event.error}`);
                    setIsListening(false);
                };

                recognitionInstance.onstart = () => {
                    console.log('🎙️ Speech recognition started');
                };

                recognitionInstance.onend = () => {
                    setIsListening(false);
                    console.log('🛑 Speech recognition ended');
                };

                setRecognition(recognitionInstance);
            } else {
                const errorMsg = 'Speech recognition not supported in this browser';
                console.error('❌', errorMsg);
                setError(errorMsg);
            }
        }

        return () => {
            if (recognition) {
                recognition.stop();
            }
        };
    }, []);

    const startListening = useCallback(() => {
        if (recognition && !isListening) {
            setTranscript('');
            setError(null);
            try {
                recognition.start();
                setIsListening(true);
                console.log('AI Listening for workout command...');
            } catch (err) {
                console.error('Error starting recognition:', err);
                setError('Failed to start listening');
            }
        }
    }, [recognition, isListening]);

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            recognition.stop();
        }
    }, [recognition, isListening]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        toggleListening,
        error,
    };
}
