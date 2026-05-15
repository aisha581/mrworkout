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
    title:       "Mr. Workout | Savage Protocol v.1",
    description: "Stop decorating the gym. Enter the Clinic for savage routines, real-time tracking, and zero excuses. Built for those who actually train. #Fahhhhh",
    manifest:    "/manifest.webmanifest",
    keywords:    ["Savage Coaching", "Mr. Workout", "Fitness Protocol", "Sarcastic AI Coach", "Real-time Workout Timer"],
    authors:     [{ name: "Mr. Workout" }],
    creator:     "Mr. Workout",
    metadataBase: new URL("https://mrworkout.pro"),
    alternates:  { canonical: "https://mrworkout.pro" },
    openGraph: {
        type:        "website",
        url:         "https://mrworkout.pro",
        siteName:    "Mr. Workout",
        title:       "Mr. Workout | Savage Protocol v.1",
        description: "Stop decorating the gym. Enter the Clinic for savage routines, real-time tracking, and zero excuses. Built for those who actually train. #Fahhhhh",
        images:      [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mr. Workout — Savage Protocol v.1" }],
    },
    twitter: {
        card:        "summary_large_image",
        title:       "Mr. Workout | Savage Protocol v.1",
        description: "Stop decorating the gym. Enter the Clinic for savage routines, real-time tracking, and zero excuses. Built for those who actually train. #Fahhhhh",
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
