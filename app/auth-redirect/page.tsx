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
        if (status === "loading") return; // wait for session

        const hasProfile  = !!loadProfile();
        const isNewUser   = (session?.user as any)?.isNewUser === true;

        if (isNewUser || !hasProfile) {
            router.replace("/onboarding");
        } else {
            router.replace("/");
        }
    }, [status, session, router]);

    return (
        <div className="fixed inset-0 bg-[#060606] flex items-center justify-center">
            <Loader2 size={28} className="animate-spin opacity-30" />
        </div>
    );
}
