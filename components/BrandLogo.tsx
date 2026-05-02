"use client";

import { useState } from "react";

interface BrandLogoProps {
    /** Size in px for the logo image / fallback container */
    size?:     number;
    /** Fallback text/letter if no logo image is found */
    fallback?: string;
    /** Accent color used for fallback styling */
    accent?:   string;
    className?: string;
}

/**
 * Drop your logo at /public/brand-icon.png (or .svg) and it renders automatically.
 * If the file is missing the fallback letter shows instead — zero breaking changes.
 */
export default function BrandLogo({
    size     = 28,
    fallback = "W",
    accent   = "#00E5CC",
    className = "",
}: BrandLogoProps) {
    const [imgFailed, setImgFailed] = useState(false);

    if (!imgFailed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src="/brand-icon.png"
                alt="Mr. Workout"
                width={size}
                height={size}
                className={`object-contain ${className}`}
                style={{ width: size, height: size }}
                onError={() => setImgFailed(true)}
            />
        );
    }

    // Fallback — identical to the current "W" / "G" glyphs
    return (
        <span
            className={`font-black italic select-none ${className}`}
            style={{
                color:      accent,
                fontFamily: "var(--font-archivo-black), sans-serif",
                fontSize:   size * 0.75,
                lineHeight: 1,
            }}
        >
            {fallback}
        </span>
    );
}
