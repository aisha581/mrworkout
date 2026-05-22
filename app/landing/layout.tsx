import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Mr. Workout — Pro Workout App & CNS Recovery Tracker",
    description:
        "Stop exercising. Start missions. The elite pro workout app with a CNS Recovery Tracker, 89-move Armoury, and Tactical Readiness scoring. Lock in your Founder Rate — $9.99/mo.",
    alternates: { canonical: "https://mrworkout.pro/landing" },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
