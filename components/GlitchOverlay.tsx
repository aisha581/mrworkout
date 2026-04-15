"use client";

// Fires a 220 ms CRT-glitch flash whenever the pathname changes.
// Rendered once in RootLayout so it covers every route transition.
// z-[999] + pointer-events-none → never blocks interaction.

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function GlitchOverlay() {
    const pathname   = usePathname();
    const overlayRef = useRef<HTMLDivElement>(null);
    const scanRef    = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const overlay = overlayRef.current;
        const scan    = scanRef.current;
        if (!overlay || !scan) return;

        // Re-trigger by removing and re-adding the CSS animation class
        overlay.classList.remove('glitch-overlay');
        scan.classList.remove('glitch-scanline');

        // Micro-delay lets the browser flush the class removal
        const id = requestAnimationFrame(() => {
            overlay.classList.add('glitch-overlay');
            scan.classList.add('glitch-scanline');
        });
        return () => cancelAnimationFrame(id);
    }, [pathname]);

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-[999] pointer-events-none overflow-hidden"
            style={{
                background: 'rgba(0, 255, 255, 0.025)',
                mixBlendMode: 'overlay',
                opacity: 0,        // initial state; animation overrides this
            }}
        >
            <div ref={scanRef} />
        </div>
    );
}
