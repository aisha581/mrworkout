"use client";

import { motion } from "framer-motion";
import { getRankInfo } from "@/utils/userStats";

interface Props {
    xp:          number;
    accentColor: string;
}

export default function XPBar({ xp, accentColor }: Props) {
    const rank = getRankInfo(xp);

    return (
        <div
            className="fixed bottom-0 inset-x-0 z-[200] pointer-events-none"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            {/* Track */}
            <div className="h-[3px] w-full bg-white/[0.04]">
                {/* Fill */}
                <motion.div
                    className="h-full"
                    style={{
                        background: `linear-gradient(90deg, ${accentColor}99 0%, ${accentColor} 100%)`,
                        boxShadow:  `0 0 10px ${accentColor}80, 0 0 4px ${accentColor}`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${rank.progress}%` }}
                    transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.3 }}
                />
            </div>
        </div>
    );
}
