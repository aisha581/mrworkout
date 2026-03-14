import type { Metadata } from "next";
import { Inter, Archivo_Black } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";
import ThemeEffect from "@/components/ThemeEffect";
import { WorkoutProvider } from "@/contexts/WorkoutContext";
import { CircuitProvider } from "@/contexts/CircuitContext";
import RestTimer from "@/components/RestTimer";
import PRCelebration from "@/components/PRCelebration";
import MusicPlayer from "@/components/MusicPlayer";
import CircuitPlayer from "@/components/CircuitPlayer";
import WelcomeOverlay from "@/components/WelcomeOverlay";

const inter = Inter({ subsets: ["latin"] });
const archivoBlack = Archivo_Black({
    subsets: ["latin"],
    weight: "400",
    variable: '--font-archivo-black',
});

export const metadata: Metadata = {
    title: "Mr. Workout",
    description: "Savage Fitness Tracking",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} ${archivoBlack.variable}`} suppressHydrationWarning>
                <ThemeProvider>
                    <WorkoutProvider>
                        <CircuitProvider>
                            <ThemeEffect />
                            <RestTimer />
                            <PRCelebration />
                            <MusicPlayer />
                            <CircuitPlayer />
                            <WelcomeOverlay />
                            {children}
                        </CircuitProvider>
                    </WorkoutProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
