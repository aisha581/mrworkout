"use client";

/**
 * AuthModal — three auth paths:
 *   1. Google OAuth  (signIn "google" via NextAuth)
 *   2. OTP code      (supabase.auth.signInWithOtp → 6-digit box → verifyOtp)
 *   3. Password      (NextAuth credentials → auto-fallback to OTP on failure)
 *
 * Phase flow:
 *   "email"    → user types email, clicks "Send Code"
 *   "code"     → 6-digit boxes appear, email field hidden
 *   "password" → optional fallback, auto-switches to OTP on wrong credentials
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
    Mail, Lock, Loader2, AlertCircle,
    ArrowLeft, Zap, X, ShieldCheck,
} from "lucide-react";

const CYAN         = "#00FFFF";
const RESEND_SECS  = 30;

// ── Google SVG ────────────────────────────────────────────────────────────────
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

// ── 6-digit OTP boxes ─────────────────────────────────────────────────────────
function OtpBoxes({ value, onChange, disabled, onComplete }: {
    value:      string;
    onChange:   (v: string) => void;
    disabled:   boolean;
    onComplete: () => void;
}) {
    const ref = useRef<HTMLInputElement>(null);

    // Auto-focus when boxes mount
    useEffect(() => { setTimeout(() => ref.current?.focus(), 120); }, []);

    const handleInput = (raw: string) => {
        const digits = raw.replace(/\D/g, "").slice(0, 6);
        onChange(digits);
        if (digits.length === 6) onComplete();
    };

    return (
        <div className="relative" onClick={() => ref.current?.focus()}>
            {/* Invisible real input — captures physical keyboard + iOS numpad */}
            <input
                ref={ref}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={value}
                onChange={e => handleInput(e.target.value)}
                disabled={disabled}
                autoComplete="one-time-code"
                aria-label="6-digit verification code"
                className="absolute inset-0 opacity-0 w-full h-full cursor-default z-10"
            />
            {/* Visual digit tiles */}
            <div className="flex gap-2 justify-center select-none">
                {Array.from({ length: 6 }).map((_, i) => {
                    const ch     = value[i] ?? "";
                    const active = !disabled && value.length === i;
                    return (
                        <div
                            key={i}
                            className="w-11 h-14 rounded-xl flex items-center justify-center text-xl font-black"
                            style={{
                                background: ch     ? `${CYAN}14`                      : "rgba(255,255,255,0.04)",
                                border:     active ? `1.5px solid ${CYAN}`
                                          : ch    ? `1px solid ${CYAN}55`
                                          :          "1px solid rgba(255,255,255,0.10)",
                                boxShadow:  active ? `0 0 16px ${CYAN}45`             : "none",
                                color:      CYAN,
                                fontFamily: "var(--font-archivo-black), sans-serif",
                                transition: "all 0.12s",
                            }}
                        >
                            {ch}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AuthModalProps {
    onClose?:    () => void;   // renders as overlay sheet when provided
    redirectTo?: string;       // default "/auth-redirect"
}

type Phase = "email" | "code" | "password";

// ── Supabase helpers ──────────────────────────────────────────────────────────

/** Send a 6-digit OTP (or magic-link on legacy projects — behaviour set in Supabase dashboard) */
async function sbSendOTP(email: string) {
    return supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,   // creates account on first use — no sign-up step needed
            // Do NOT set emailRedirectTo. Omitting it lets the Supabase project's
            // "Enable Email OTP" setting take effect and deliver a 6-digit code.
        },
    });
}

/**
 * Verify the 6-digit code.
 * Tries 'magiclink' first (works for both magic-link tokens and OTP codes on
 * most Supabase projects), then falls back to 'email' and 'signup' to handle
 * any project configuration.
 */
async function sbVerifyOTP(email: string, token: string) {
    const types = ["magiclink", "email", "signup"] as const;
    for (const type of types) {
        const res = await supabase.auth.verifyOtp({ email, token, type });
        if (!res.error) return res;
    }
    // Return last error so caller can surface it
    return supabase.auth.verifyOtp({ email, token, type: "magiclink" });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuthModal({
    onClose,
    redirectTo = "/auth-redirect",
}: AuthModalProps) {
    const router = useRouter();

    const [phase,        setPhase]        = useState<Phase>("email");
    const [email,        setEmail]        = useState("");
    const [password,     setPassword]     = useState("");
    const [code,         setCode]         = useState("");
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState<string | null>(null);
    const [resendIn,     setResendIn]     = useState(0);
    const [autoSwitched, setAutoSwitched] = useState(false);
    const [isInApp,      setIsInApp]      = useState(false);

    // In-app browser detection (TikTok / Instagram / Snapchat etc.)
    useEffect(() => {
        if (typeof navigator === "undefined") return;
        setIsInApp(
            /Instagram|FBAN|FBAV|TikTok|Snapchat|Twitter|Line|MicroMessenger|LinkedInApp/
                .test(navigator.userAgent)
        );
    }, []);

    // Resend countdown ticker
    useEffect(() => {
        if (resendIn <= 0) return;
        const id = setTimeout(() => setResendIn(n => n - 1), 1000);
        return () => clearTimeout(id);
    }, [resendIn]);

    const clrErr = () => setError(null);

    // ── Finish: set onboarding flag and navigate ────────────────────────────
    const finish = () => {
        try { localStorage.setItem("mw_onboarded", "1"); } catch {}
        router.replace(redirectTo === "/auth-redirect" ? "/" : redirectTo);
    };

    // ── Path 1: Google OAuth ────────────────────────────────────────────────
    const handleGoogle = async () => {
        setLoading(true); clrErr();
        await signIn("google", { callbackUrl: redirectTo });
        // (page navigates away — loading stays true intentionally)
    };

    // ── Path 2a: Send OTP ───────────────────────────────────────────────────
    const handleSendCode = async () => {
        if (!email.includes("@")) { setError("Enter a valid email address."); return; }
        setLoading(true); clrErr();

        const { error: err } = await sbSendOTP(email);
        setLoading(false);

        if (err) {
            setError(err.message ?? "Couldn't send code — please try again.");
            return;
        }

        // Transition: hide email input, show OTP boxes
        setCode("");
        setPhase("code");
        setResendIn(RESEND_SECS);
        setAutoSwitched(false);
    };

    // ── Path 2b: Verify OTP ─────────────────────────────────────────────────
    const handleVerifyCode = async () => {
        if (code.length !== 6) { setError("Enter the full 6-digit code."); return; }
        setLoading(true); clrErr();

        const res = await sbVerifyOTP(email, code);
        setLoading(false);

        if (res.error) {
            setError("Incorrect or expired code — check your inbox and try again.");
            return;
        }
        finish();
    };

    // ── Path 3: Password ────────────────────────────────────────────────────
    // On ANY failure (wrong password OR user doesn't exist yet), automatically:
    //   1. Attempt to register via /api/auth/register
    //   2. If registration succeeds, sign in again
    //   3. If that still fails, silently send an OTP and switch to "code" phase
    const handlePassword = async () => {
        if (!email.includes("@") || !password) {
            setError("Enter your email and password.");
            return;
        }
        setLoading(true); clrErr();

        // First, try sign-in
        let result = await signIn("credentials", { email, password, redirect: false });

        if (!result?.error) {
            setLoading(false);
            router.replace(redirectTo);
            return;
        }

        // Sign-in failed — try to auto-create the account, then sign in again
        try {
            const reg = await fetch("/api/auth/register", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({ email, password }),
            });
            if (reg.ok) {
                result = await signIn("credentials", { email, password, redirect: false });
                if (!result?.error) {
                    setLoading(false);
                    router.replace(redirectTo);
                    return;
                }
            }
        } catch { /* network error — fall through to OTP */ }

        // Both sign-in + sign-up failed — seamlessly send OTP instead
        const { error: otpErr } = await sbSendOTP(email);
        setLoading(false);

        if (!otpErr) {
            setPassword("");
            setCode("");
            setAutoSwitched(true);
            setPhase("code");
            setResendIn(RESEND_SECS);
        } else {
            // Absolute last resort: surface a real error
            setError("Sign-in failed. Try Google or check your connection.");
        }
    };

    // ── Resend ──────────────────────────────────────────────────────────────
    const handleResend = async () => {
        setCode(""); clrErr();
        setLoading(true);
        const { error: err } = await sbSendOTP(email);
        setLoading(false);
        if (err) { setError(err.message ?? "Couldn't resend — try again."); return; }
        setResendIn(RESEND_SECS);
    };

    // ── Shared error banner ─────────────────────────────────────────────────
    const Err = () => error ? (
        <motion.div
            key={error}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2 px-4 py-3 rounded-2xl text-xs font-medium leading-snug"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#fca5a5" }}
        >
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
        </motion.div>
    ) : null;

    const isModal = !!onClose;

    // ── Inner content ───────────────────────────────────────────────────────
    const inner = (
        <div className="relative w-full max-w-sm mx-auto px-5 py-9 flex flex-col">

            {/* ── In-app browser warning ──────────────────────── */}
            <AnimatePresence>
                {isInApp && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-5"
                    >
                        <div
                            className="flex items-start gap-3 rounded-2xl px-4 py-3 text-xs font-medium leading-snug"
                            style={{ background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.25)", color: "#fbbf24" }}
                        >
                            <span className="shrink-0 text-base leading-none">⚡</span>
                            <span>
                                <strong>Pro Tip:</strong> Tap <strong>⋮</strong> then{" "}
                                <strong>"Open in Browser"</strong> for a smoother sign-in.
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Close (modal mode only) ──────────────────────── */}
            {isModal && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-0 w-9 h-9 rounded-full flex items-center justify-center opacity-30 hover:opacity-70 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                    aria-label="Close"
                >
                    <X size={15} />
                </button>
            )}

            {/* ── Brand ───────────────────────────────────────── */}
            <div className="flex flex-col items-center mb-7">
                <div
                    className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4"
                    style={{ background: `${CYAN}12`, border: `1.5px solid ${CYAN}35`, boxShadow: `0 0 30px ${CYAN}20` }}
                >
                    <span className="text-2xl font-black" style={{ color: CYAN, fontFamily: "var(--font-archivo-black), sans-serif" }}>W</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.55em] opacity-25 mb-1">Mr. Workout</p>
                <AnimatePresence mode="wait">
                    <motion.h1
                        key={phase}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="text-[22px] font-black uppercase leading-tight text-center"
                        style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                    >
                        {phase === "code" ? "Enter Your Code" : "Access The Clinic"}
                    </motion.h1>
                </AnimatePresence>
            </div>

            {/* ══════════════════════════════════════════════════
                PHASE: email  — initial screen
            ══════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
            {phase === "email" && (
                <motion.div
                    key="email"
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 18 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col gap-3"
                >
                    {/* Google */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleGoogle}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", touchAction: "manipulation" }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                        Continue with Google
                    </motion.button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-0.5">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">or</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                    </div>

                    {/* Email input */}
                    <div className="relative">
                        <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: `${CYAN}70` }} />
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={e => { setEmail(e.target.value); clrErr(); }}
                            onKeyDown={e => e.key === "Enter" && handleSendCode()}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-20 disabled:opacity-50"
                            style={{
                                background:  "rgba(255,255,255,0.05)",
                                border:      email.includes("@") ? `1px solid ${CYAN}50` : "1px solid rgba(255,255,255,0.10)",
                                color:       "#fff",
                                caretColor:  CYAN,
                                transition:  "border-color 0.18s",
                            }}
                            autoComplete="email"
                        />
                    </div>

                    <Err />

                    {/* PRIMARY CTA — Send Code (cyan glow, shows spinner while loading) */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSendCode}
                        disabled={loading}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-60"
                        style={{
                            background:  `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)`,
                            boxShadow:   `0 0 38px ${CYAN}55, 0 6px 24px rgba(0,0,0,0.45)`,
                            touchAction: "manipulation",
                        }}
                    >
                        {loading
                            ? <Loader2 size={16} className="animate-spin text-black" />
                            : <><ShieldCheck size={15} /> Send 6-Digit Code</>
                        }
                    </motion.button>

                    <p className="text-center text-[10px] opacity-20 font-medium -mt-0.5">
                        We'll email you a code. No password needed.
                    </p>

                    {/* Password fallback link */}
                    <button
                        onClick={() => { setPhase("password"); clrErr(); }}
                        disabled={loading}
                        className="text-center text-[11px] font-black uppercase tracking-widest mt-0.5 py-1 transition-opacity disabled:opacity-30"
                        style={{ color: "rgba(255,255,255,0.20)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.48)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.20)")}
                    >
                        Use Password Instead →
                    </button>
                </motion.div>
            )}

            {/* ══════════════════════════════════════════════════
                PHASE: code  — OTP verification
            ══════════════════════════════════════════════════ */}
            {phase === "code" && (
                <motion.div
                    key="code"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col gap-4"
                >
                    {/* Context banner */}
                    <AnimatePresence mode="wait">
                        {autoSwitched ? (
                            <motion.div
                                key="switched"
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl px-4 py-3 text-xs font-medium leading-snug text-center"
                                style={{ background: `${CYAN}0d`, border: `1px solid ${CYAN}30`, color: CYAN }}
                            >
                                Password didn't match — we sent a login code to{" "}
                                <strong>{email}</strong> instead.
                            </motion.div>
                        ) : (
                            <motion.div key="normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                                <p className="text-xs opacity-35 font-medium leading-relaxed">
                                    Code sent to{" "}
                                    <span className="font-black" style={{ color: CYAN, opacity: 1 }}>{email}</span>
                                </p>
                                <p className="text-[10px] opacity-20 mt-0.5">Check your inbox and spam folder.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* 6-digit boxes */}
                    <OtpBoxes
                        value={code}
                        onChange={v => { setCode(v); clrErr(); }}
                        disabled={loading}
                        onComplete={handleVerifyCode}
                    />

                    <Err />

                    {/* Verify button — lights up cyan when 6 digits filled */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleVerifyCode}
                        disabled={loading || code.length !== 6}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2.5 disabled:opacity-40"
                        style={{
                            background:  code.length === 6 ? `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)` : "rgba(255,255,255,0.08)",
                            boxShadow:   code.length === 6 ? `0 0 38px ${CYAN}55` : "none",
                            color:       code.length === 6 ? "#000" : "rgba(255,255,255,0.25)",
                            touchAction: "manipulation",
                            transition:  "all 0.18s",
                        }}
                    >
                        {loading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <><Zap size={15} fill="currentColor" /> Unlock</>
                        }
                    </motion.button>

                    {/* Resend row */}
                    <div className="flex items-center justify-between pt-0.5">
                        <button
                            onClick={() => { setPhase("email"); setCode(""); setAutoSwitched(false); clrErr(); }}
                            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest opacity-25 hover:opacity-55 transition-opacity"
                        >
                            <ArrowLeft size={12} /> Back
                        </button>

                        {resendIn > 0 ? (
                            <span className="text-xs opacity-20 font-medium tabular-nums">
                                Resend in {resendIn}s
                            </span>
                        ) : (
                            <button
                                onClick={handleResend}
                                disabled={loading}
                                className="text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-30"
                                style={{ color: CYAN, opacity: 0.6 }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                            >
                                Didn't get a code? Resend
                            </button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ══════════════════════════════════════════════════
                PHASE: password  — optional fallback
            ══════════════════════════════════════════════════ */}
            {phase === "password" && (
                <motion.div
                    key="password"
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22 }}
                    className="flex flex-col gap-3"
                >
                    <p className="text-[10px] opacity-25 font-medium text-center leading-snug -mt-1 mb-0.5">
                        Wrong password or new account? We'll automatically send you a code.
                    </p>

                    {/* Email */}
                    <div className="relative">
                        <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: `${CYAN}70` }} />
                        <input
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={e => { setEmail(e.target.value); clrErr(); }}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-20 disabled:opacity-50"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                border:     email.includes("@") ? `1px solid ${CYAN}50` : "1px solid rgba(255,255,255,0.10)",
                                color: "#fff", caretColor: CYAN,
                            }}
                            autoComplete="email"
                        />
                    </div>

                    {/* Password */}
                    <div className="relative">
                        <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-25" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); clrErr(); }}
                            onKeyDown={e => e.key === "Enter" && handlePassword()}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-20 disabled:opacity-50"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                border:     "1px solid rgba(255,255,255,0.10)",
                                color: "#fff", caretColor: CYAN,
                            }}
                            autoComplete="current-password"
                        />
                    </div>

                    <Err />

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handlePassword}
                        disabled={loading}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-55"
                        style={{
                            background:  `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)`,
                            boxShadow:   `0 0 30px ${CYAN}45`,
                            touchAction: "manipulation",
                        }}
                    >
                        {loading
                            ? <Loader2 size={16} className="animate-spin text-black" />
                            : "Sign In"
                        }
                    </motion.button>

                    <button
                        onClick={() => { setPhase("email"); clrErr(); }}
                        className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest opacity-25 hover:opacity-55 transition-opacity mt-0.5"
                    >
                        <ArrowLeft size={12} /> Use a code instead
                    </button>
                </motion.div>
            )}
            </AnimatePresence>

            <p className="text-center text-[10px] opacity-10 font-medium mt-7 leading-relaxed">
                By continuing you agree to our Terms &amp; Privacy Policy.
            </p>
        </div>
    );

    // ── Full-page layout ────────────────────────────────────────────────────
    if (!isModal) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#060606] relative overflow-hidden">
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${CYAN}09 0%, transparent 65%)` }}
                />
                <div
                    className="fixed inset-0 pointer-events-none opacity-[0.016]"
                    style={{ backgroundImage: `linear-gradient(${CYAN}80 1px, transparent 1px), linear-gradient(90deg, ${CYAN}80 1px, transparent 1px)`, backgroundSize: "48px 48px" }}
                />
                <div className="relative z-10 w-full">{inner}</div>
            </div>
        );
    }

    // ── Bottom-sheet modal layout ───────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.84)", backdropFilter: "blur(14px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <motion.div
                initial={{ y: 56, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 56, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="w-full sm:max-w-sm relative overflow-hidden"
                style={{
                    background:   "linear-gradient(160deg, #0b0b0b 0%, #060606 100%)",
                    border:       `1px solid ${CYAN}16`,
                    borderBottom: "none",
                    borderRadius: "32px 32px 0 0",
                }}
                onClick={e => e.stopPropagation()}
            >
                <div
                    className="absolute top-0 inset-x-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${CYAN}50, transparent)` }}
                />
                <div className="flex justify-center pt-3 sm:hidden">
                    <div className="w-10 h-1 rounded-full" style={{ background: `${CYAN}22` }} />
                </div>
                {inner}
            </motion.div>
        </motion.div>
    );
}
