"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useEffect } from "react";

export default function ThemeEffect() {
    const { theme } = useTheme();

    useEffect(() => {
        // Apply background gradient to body
        document.body.style.background = theme.bg;
        document.body.style.transition = 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    }, [theme.bg]);

    return null;
}
