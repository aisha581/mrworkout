import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
    viewportFit:        'cover',
    width:              'device-width',
    initialScale:       1,
    maximumScale:       1,
    userScalable:       false,
    themeColor:         '#00E5CC',
};

import { Inter, Archivo_Black } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";
import ThemeEffect from "@/components/ThemeEffect";
import { WorkoutProvider } from "@/contexts/WorkoutContext";
import { CircuitProvider } from "@/contexts/CircuitContext";
import NextAuthProvider from "@/components/NextAuthProvider";
import RestTimer from "@/components/RestTimer";
import PRCelebration from "@/components/PRCelebration";
import MusicPlayer from "@/components/MusicPlayer";
import CircuitPlayer from "@/components/CircuitPlayer";
import WelcomeOverlay from "@/components/WelcomeOverlay";
import GlitchOverlay from "@/components/GlitchOverlay";

const inter = Inter({ subsets: ["latin"] });
const archivoBlack = Archivo_Black({
    subsets: ["latin"],
    weight: "400",
    variable: '--font-archivo-black',
});

export const metadata: Metadata = {
    title:       "Mr. Workout — Pro Workout App & CNS Recovery Tracker",
    description: "Stop exercising. Start missions. Mr. Workout is the elite pro workout app with a built-in CNS Recovery Tracker, 89-move Armoury, and Tactical Readiness scoring. Lock in your Founder Rate today.",
    manifest:    "/manifest.webmanifest",
    keywords:    ["pro workout app", "CNS recovery tracker", "tactical readiness score", "savage fitness app", "workout tracking", "exercise library", "muscle building app", "progressive overload tracker"],
    authors:     [{ name: "Mr. Workout" }],
    creator:     "Mr. Workout",
    metadataBase: new URL("https://mrworkout.pro"),
    alternates:  { canonical: "https://mrworkout.pro" },
    openGraph: {
        type:        "website",
        url:         "https://mrworkout.pro",
        siteName:    "Mr. Workout",
        title:       "Mr. Workout — Pro Workout App & CNS Recovery Tracker",
        description: "Stop exercising. Start missions. The elite fitness app with CNS recovery science, 89-move Armoury, and personalised daily missions. Founder Rate — $9.99/mo.",
        images:      [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mr. Workout — Pro Workout App" }],
    },
    twitter: {
        card:        "summary_large_image",
        title:       "Mr. Workout — Pro Workout App & CNS Recovery Tracker",
        description: "Stop exercising. Start missions. Elite fitness tracking with CNS recovery science & 89-move Armoury.",
        images:      ["/og-image.png"],
    },
    appleWebApp: {
        capable:         true,
        statusBarStyle:  "black-translucent",
        title:           "Mr. Workout",
    },
    icons: {
        apple: "/apple-icon",
    },
};

import MobileNav from "@/components/MobileNav";
import FloatingCoach from "@/components/FloatingCoach";
import AudioManager from "@/components/AudioManager";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} ${archivoBlack.variable}`} suppressHydrationWarning>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            window.addEventListener('error', (e) => {
                                if (e.message && (e.message.includes('ChunkLoadError') || e.message.includes('Loading chunk'))) {
                                    console.warn('ChunkLoadError detected, reloading...');
                                    window.location.reload();
                                }
                            }, true);
                            if ('serviceWorker' in navigator) {
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js').catch(function(){});
                                });
                            }
                        `,
                    }}
                />
                <NextAuthProvider>
                    <ThemeProvider>
                        <WorkoutProvider>
                            <CircuitProvider>
                                <ThemeEffect />
                                <RestTimer />
                                <PRCelebration />
                                <MusicPlayer />
                                <CircuitPlayer />
                                {children}
                                <GlitchOverlay />
                                <MobileNav />
                                <FloatingCoach />
                                <AudioManager />
                            </CircuitProvider>
                        </WorkoutProvider>
                    </ThemeProvider>
                </NextAuthProvider>
            </body>
        </html>
    );
}
