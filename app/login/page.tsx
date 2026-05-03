"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import AuthModal from "@/components/AuthModal";

export default function LoginPage() {
    const { status } = useSession();
    const router      = useRouter();

    // Already authenticated — go home
    useEffect(() => {
        if (status === "authenticated") router.replace("/");
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="fixed inset-0 bg-[#060606] flex items-center justify-center">
                <Loader2 size={28} className="animate-spin opacity-30" />
            </div>
        );
    }

    return <AuthModal redirectTo="/auth-redirect" />;
}
