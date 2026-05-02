"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Returns true if the current user has an active Pro subscription.
 *
 * Source of truth priority:
 *   1. Authenticated session (NextAuth) — always wins when loaded
 *   2. localStorage "mw_is_pro" — only trusted for guests / while session loads
 *
 * When a session is present and says isPro=false, stale localStorage is cleared
 * so a previous test account can never ghost a fresh sign-up.
 */
export function useIsPro(): { isPro: boolean; isLoading: boolean } {
    const { data: session, status } = useSession();
    const [localPro, setLocalPro]   = useState(false);

    useEffect(() => {
        try {
            setLocalPro(localStorage.getItem("mw_is_pro") === "true");
        } catch {}
    }, []);

    const sessionLoaded = status === "authenticated" || status === "unauthenticated";
    const sessionPro    = (session?.user as any)?.isPro === true;

    // If the session has loaded and says non-pro, clear any stale localStorage flag
    useEffect(() => {
        if (sessionLoaded && session && !sessionPro) {
            try {
                localStorage.removeItem("mw_is_pro");
                setLocalPro(false);
            } catch {}
        }
    }, [sessionLoaded, session, sessionPro]);

    // While session is still loading, fall back to localStorage so UI doesn't flash
    const isPro     = sessionLoaded ? sessionPro : (sessionPro || localPro);
    const isLoading = status === "loading";

    return { isPro, isLoading };
}
