"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, AlertCircle, Zap } from "lucide-react";

export default function LoginPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [mode,     setMode]     = useState<"signin" | "signup">("signin");
    const [email,    setEmail]    = useState("");
    const [password, setPassword] = useState("");
    const [name,     setName]     = useState("");
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState<string | null>(null);

    // Already logged in — go home
    useEffect(() => {
        if (status === "authenticated") router.replace("/");
    }, [status, router]);

    const handleGoogleSignIn = async () => {
        setLoading(true);
        await signIn("google", { callbackUrl: "/auth-redirect" });
    };

    const handleGuestMode = () => {
        try { localStorage.setItem("mw_guest_mode", "true"); } catch {}
        router.replace("/");
    };

    const handleCredentials = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (mode === "signup") {
            // Register via Supabase (then sign in with NextAuth)
            const res = await fetch("/api/auth/register", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email, password, name }),
            });
            const json = await res.json();
            if (!res.ok) {
                setError(json.error ?? "Registration failed.");
                setLoading(false);
                return;
            }
        }

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError("Invalid email or password.");
            setLoading(false);
        } else {
            router.replace("/auth-redirect");
        }
    };

    if (status === "loading") {
        return (
            <div className="fixed inset-0 bg-[#060606] flex items-center justify-center">
                <Loader2 size={28} className="animate-spin opacity-30" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060606] flex flex-col items-center justify-center px-6">
            {/* Background glow */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 50%, rgba(0,229,204,0.07) 0%, transparent 70%)' }}
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-sm"
            >
                {/* Logo / Wordmark */}
                <div className="flex flex-col items-center mb-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.6em] opacity-25 mb-3">
                        Savage Fitness
                    </p>
                    <h1
                        className="text-5xl font-black uppercase leading-none text-center"
                        style={{
                            fontFamily:    'var(--font-archivo-black), sans-serif',
                            letterSpacing: '-0.04em',
                            color:         '#00E5CC',
                            textShadow:    '0 0 60px rgba(0,229,204,0.4)',
                        }}
                    >
                        Mr.<br />Workout
                    </h1>
                </div>

                {/* Google Sign In */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm mb-6 disabled:opacity-50"
                    style={{
                        background:  'rgba(255,255,255,0.07)',
                        border:      '1px solid rgba(255,255,255,0.12)',
                        color:       '#fff',
                        touchAction: 'manipulation',
                    }}
                >
                    <GoogleIcon />
                    Continue with Google
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Mode toggle */}
                <div className="flex bg-white/5 border border-white/10 p-1 rounded-2xl mb-5">
                    {(["signin", "signup"] as const).map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); setError(null); }}
                            className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                            style={{
                                background: mode === m ? 'rgba(0,229,204,0.12)' : 'transparent',
                                color:      mode === m ? '#00E5CC'               : 'rgba(255,255,255,0.35)',
                                border:     mode === m ? '1px solid rgba(0,229,204,0.2)' : 'none',
                            }}
                        >
                            {m === "signin" ? "Sign In" : "Create Account"}
                        </button>
                    ))}
                </div>

                {/* Credentials form */}
                <form onSubmit={handleCredentials} className="flex flex-col gap-3">
                    {mode === "signup" && (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                className="w-full px-4 py-3.5 rounded-2xl text-sm font-medium outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:border-[#00E5CC]/40 transition-colors"
                            />
                        </div>
                    )}
                    <div className="relative">
                        <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:border-[#00E5CC]/40 transition-colors"
                        />
                    </div>
                    <div className="relative">
                        <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:border-[#00E5CC]/40 transition-colors"
                        />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                            <AlertCircle size={13} />
                            {error}
                        </div>
                    )}

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black mt-1 flex items-center justify-center gap-2 disabled:opacity-60"
                        style={{
                            background:  'linear-gradient(135deg, #00E5CC 0%, #00B5A0 100%)',
                            boxShadow:   '0 0 30px rgba(0,229,204,0.3)',
                            touchAction: 'manipulation',
                        }}
                    >
                        {loading
                            ? <Loader2 size={16} className="animate-spin" />
                            : (mode === "signin" ? "Sign In" : "Create Account")
                        }
                    </motion.button>
                </form>

                {/* Guest Mode */}
                <div className="flex items-center gap-3 mt-6 mb-4">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">or</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGuestMode}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black uppercase tracking-[0.15em] text-xs"
                    style={{
                        background:  'rgba(255,255,255,0.04)',
                        border:      '1px solid rgba(255,255,255,0.08)',
                        color:       'rgba(255,255,255,0.45)',
                        touchAction: 'manipulation',
                    }}
                >
                    <Zap size={13} />
                    Continue as Guest
                </motion.button>

                <p className="text-center text-[10px] opacity-20 mt-4 font-medium leading-relaxed">
                    By continuing you agree to the Terms of Service and Privacy Policy.
                </p>
            </motion.div>
        </div>
    );
}

// Inline Google SVG icon
function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
    );
}
