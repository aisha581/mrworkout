"use client";

/**
 * /auth-redirect
 *
 * Landing page after any sign-in. Decides where to send the user:
 *   - No profile saved  OR  session.user.isNewUser → /onboarding
 *   - Otherwise                                    → /
 *
 * Using client-side redirect so we can read localStorage before navigating.
 */

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loadProfile } from "@/utils/missionGenerator";
import { Loader2 } from "lucide-react";

export default function AuthRedirectPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (status === "loading") return;
        if (!session) return;

        const hasProfile = !!loadProfile();

        if (hasProfile) {
            // Profile already set — user came from biometric onboarding or is a returning user.
            // Mark as onboarded so the dashboard gate opens.
            try { localStorage.setItem("mw_onboarded", "1"); } catch {}
            router.replace("/");
        } else {
            // No profile — went directly to sign-in without onboarding.
            router.replace("/onboarding");
        }
    }, [status, session, router]);

    return (
        <div className="fixed inset-0 bg-[#060606] flex items-center justify-center">
            <Loader2 size={28} className="animate-spin opacity-30" />
        </div>
    );
}
