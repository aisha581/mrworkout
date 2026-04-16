"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Returns true if the current user has an active Pro subscription.
 * Priority: server-side session flag → localStorage fallback (set by Stripe success page).
 */
export function useIsPro(): { isPro: boolean; isLoading: boolean } {
    const { data: session, status } = useSession();
    const [localPro, setLocalPro]   = useState(false);

    useEffect(() => {
        try {
            setLocalPro(localStorage.getItem("mw_is_pro") === "true");
        } catch {}
    }, []);

    const sessionPro = (session?.user as any)?.isPro === true;
    const isPro      = sessionPro || localPro;
    const isLoading  = status === "loading";

    return { isPro, isLoading };
}
