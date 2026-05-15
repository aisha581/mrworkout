import type { Metadata, Viewport } from "next";
import { Analytics } from '@vercel/analytics/next';

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
    title:       "Mr. Workout | Stop Decorating, Start Training.",
    description: "The Clinic is open. Access the Savage Protocol v.1 and get roasted into the best shape of your life.",
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
        title:       "Mr. Workout | Stop Decorating, Start Training.",
        description: "The Clinic is open. Access the Savage Protocol v.1 and get roasted into the best shape of your life.",
        images:      [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mr. Workout — Savage Protocol v.1" }],
    },
    twitter: {
        card:        "summary_large_image",
        title:       "Mr. Workout | Stop Decorating, Start Training.",
        description: "The Clinic is open. Access the Savage Protocol v.1 and get roasted into the best shape of your life.",
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
            <head>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "Mr. Workout",
                            "url": "https://mrworkout.pro",
                            "applicationCategory": "HealthApplication",
                            "operatingSystem": "Web, iOS, Android",
                            "description": "Stop decorating the gym. Enter the Clinic for savage routines, real-time tracking, and zero excuses. Built for those who actually train.",
                            "featureList": [
                                "Savage Protocol real-time workout timer",
                                "89-move Armoury exercise library",
                                "CNS Recovery Tracker",
                                "Sarcastic AI Coach",
                                "Circuit Mode with PR tracking",
                                "XP-based progression system"
                            ],
                            "offers": {
                                "@type": "Offer",
                                "name": "Savage Protocol",
                                "price": "9.99",
                                "priceCurrency": "USD",
                                "description": "Full access to Mr. Workout's Savage Protocol — real-time training, AI coaching, and CNS recovery science."
                            },
                            "aggregateRating": {
                                "@type": "AggregateRating",
                                "ratingValue": "5",
                                "reviewCount": "1"
                            },
                            "author": {
                                "@type": "Organization",
                                "name": "Mr. Workout"
                            }
                        })
                    }}
                />
            </head>
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
                <Analytics />
            </body>
        </html>
    );
}
