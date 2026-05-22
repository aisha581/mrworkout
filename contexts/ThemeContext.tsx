"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'savage' | 'mrs' | 'inferno' | 'midnight' | 'gold';

interface ThemeConfig {
    mode: ThemeMode;
    bg: string;
    accent: string;
    bgGlow: string;
    cardBg: string;
    borderColor: string;
}

interface ThemeContextType {
    theme: ThemeConfig;
    setThemeMode: (mode: ThemeMode) => void;
}

const themeConfigs: Record<ThemeMode, ThemeConfig> = {
    savage: {
        mode: 'savage',
        bg: '#121212', // Deep charcoal
        accent: '#00FFFF', // Electric cyan
        bgGlow: 'radial-gradient(ellipse at 50% 20%, rgba(0, 255, 255, 0.25) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0, 255, 255, 0.15) 0%, transparent 50%)',
        cardBg: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'rgba(0, 255, 255, 0.2)',
    },
    mrs: {
        mode: 'mrs',
        bg: 'linear-gradient(135deg, #FFC0E1 0%, #E8CAF0 25%, #C8B3E5 50%, #B8C5E8 75%, #B8D4E8 100%)', // Multi-color pastel
        accent: '#FF9AC1', // Vibrant rose
        bgGlow: 'radial-gradient(ellipse at 20% 30%, rgba(255, 179, 217, 0.45) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(200, 179, 229, 0.35) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(184, 197, 232, 0.40) 0%, transparent 50%)',
        cardBg: 'rgba(255, 255, 255, 0.25)',
        borderColor: 'rgba(183, 110, 121, 0.22)',
    },
    inferno: {
        mode: 'inferno',
        bg: '#0A0202', // Black/dark maroon
        accent: '#FF3300', // Neon crimson
        bgGlow: 'radial-gradient(ellipse at 50% 20%, rgba(255, 51, 0, 0.25) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 51, 0, 0.15) 0%, transparent 50%)',
        cardBg: 'rgba(255, 51, 0, 0.02)',
        borderColor: 'rgba(255, 51, 0, 0.3)',
    },
    midnight: {
        mode: 'midnight',
        bg: '#03000A', // Deep space violet
        accent: '#B026FF', // Neon purple
        bgGlow: 'radial-gradient(ellipse at 50% 20%, rgba(176, 38, 255, 0.25) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(176, 38, 255, 0.15) 0%, transparent 50%)',
        cardBg: 'rgba(176, 38, 255, 0.02)',
        borderColor: 'rgba(176, 38, 255, 0.3)',
    },
    gold: {
        mode: 'gold',
        bg: '#050400', // Jet black
        accent: '#FFD700', // Pure Gold
        bgGlow: 'radial-gradient(ellipse at 50% 20%, rgba(255, 215, 0, 0.20) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(255, 215, 0, 0.10) 0%, transparent 50%)',
        cardBg: 'rgba(255, 215, 0, 0.02)',
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>('savage');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load saved theme from localStorage
        const savedMode = localStorage.getItem('theme-mode') as ThemeMode;
        if (savedMode && Object.keys(themeConfigs).includes(savedMode)) {
            setMode(savedMode);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Apply dark class for ALL dark themes (everything except Mrs Mode currently)
        if (mode !== 'mrs') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Save to localStorage
        localStorage.setItem('theme-mode', mode);
    }, [mode, mounted]);

    const setThemeMode = (newMode: ThemeMode) => {
        setMode(newMode);
    };

    const theme = themeConfigs[mode];

    return (
        <ThemeContext.Provider value={{ theme, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
