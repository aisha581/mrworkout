"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
    Mail, Lock, Loader2, AlertCircle,
    ArrowLeft, Zap, X, ShieldCheck,
} from "lucide-react";

const CYAN = "#00FFFF";

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

// ── 6-digit OTP input ─────────────────────────────────────────────────────────
function OtpInput({
    value, onChange, disabled,
}: {
    value: string;
    onChange: (v: string) => void;
    disabled: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 200); }, []);

    return (
        <div className="relative">
            {/* Invisible real input */}
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={value}
                onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={disabled}
                className="absolute inset-0 opacity-0 w-full h-full cursor-default"
                autoComplete="one-time-code"
            />
            {/* Visual boxes */}
            <div className="flex gap-2 justify-center" onClick={() => inputRef.current?.focus()}>
                {Array.from({ length: 6 }).map((_, i) => {
                    const char    = value[i] ?? "";
                    const active  = value.length === i;
                    return (
                        <div
                            key={i}
                            className="w-11 h-14 rounded-xl flex items-center justify-center text-xl font-black transition-all"
                            style={{
                                background:  char ? `${CYAN}12` : "rgba(255,255,255,0.04)",
                                border:      active
                                    ? `1.5px solid ${CYAN}`
                                    : char
                                        ? `1px solid ${CYAN}50`
                                        : "1px solid rgba(255,255,255,0.10)",
                                boxShadow:   active ? `0 0 14px ${CYAN}40` : "none",
                                color:       CYAN,
                                fontFamily:  "var(--font-archivo-black), sans-serif",
                                transition:  "all 0.15s",
                            }}
                        >
                            {char}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AuthModalProps {
    /** If provided, renders as full-screen overlay with close button */
    onClose?:    () => void;
    /** Where to push after successful auth (default: "/auth-redirect") */
    redirectTo?: string;
}

type Screen = "default" | "otp-sent" | "password";

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuthModal({ onClose, redirectTo = "/auth-redirect" }: AuthModalProps) {
    const router = useRouter();

    const [screen,    setScreen]    = useState<Screen>("default");
    const [email,     setEmail]     = useState("");
    const [password,  setPassword]  = useState("");
    const [otpCode,   setOtpCode]   = useState("");
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState<string | null>(null);
    const [resendIn,  setResendIn]  = useState(0);
    const [isInApp,   setIsInApp]   = useState(false);

    // ── Detect in-app browser on mount ──────────────────────────────────────
    useEffect(() => {
        if (typeof navigator === "undefined") return;
        const ua = navigator.userAgent;
        setIsInApp(
            /Instagram|FBAN|FBAV|TikTok|Snapchat|Twitter|Line|MicroMessenger|LinkedInApp/.test(ua)
        );
    }, []);

    // ── Resend countdown ────────────────────────────────────────────────────
    useEffect(() => {
        if (resendIn <= 0) return;
        const id = setTimeout(() => setResendIn(n => n - 1), 1000);
        return () => clearTimeout(id);
    }, [resendIn]);

    const resetError = () => setError(null);

    // ── Path 1: Google OAuth ────────────────────────────────────────────────
    const handleGoogle = async () => {
        setLoading(true);
        resetError();
        await signIn("google", { callbackUrl: redirectTo });
    };

    // ── Path 2a: Send Magic Link / OTP ──────────────────────────────────────
    const handleSendOTP = async () => {
        if (!email.includes("@")) { setError("Enter a valid email address."); return; }
        setLoading(true);
        resetError();
        const { error: sbErr } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true },
        });
        setLoading(false);
        if (sbErr) {
            setError(sbErr.message ?? "Failed to send code. Try again.");
            return;
        }
        setScreen("otp-sent");
        setResendIn(60);
    };

    // ── Path 2b: Verify OTP ─────────────────────────────────────────────────
    const handleVerifyOTP = async () => {
        if (otpCode.length !== 6) { setError("Enter the full 6-digit code."); return; }
        setLoading(true);
        resetError();
        const { error: sbErr } = await supabase.auth.verifyOtp({
            email,
            token: otpCode,
            type:  "email",
        });
        setLoading(false);
        if (sbErr) {
            setError("Invalid or expired code. Try again.");
            return;
        }
        // Unlock dashboard gate
        try { localStorage.setItem("mw_onboarded", "1"); } catch {}
        router.replace(redirectTo === "/auth-redirect" ? "/" : redirectTo);
    };

    // ── Path 3: Password ────────────────────────────────────────────────────
    const handlePassword = async () => {
        if (!email.includes("@") || !password) {
            setError("Enter your email and password.");
            return;
        }
        setLoading(true);
        resetError();
        const result = await signIn("credentials", {
            email, password, redirect: false,
        });
        setLoading(false);
        if (result?.error) {
            setError("Incorrect email or password.");
        } else {
            router.replace(redirectTo);
        }
    };

    // ── Shared error block ──────────────────────────────────────────────────
    const ErrorBanner = () => error ? (
        <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium leading-snug"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", color: "#fca5a5" }}
        >
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
        </motion.div>
    ) : null;

    const isModal = !!onClose;

    const content = (
        <div className="relative w-full max-w-sm mx-auto px-5 py-10 flex flex-col gap-0">

            {/* ── In-app browser warning ──────────────────────────────────── */}
            <AnimatePresence>
                {isInApp && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-5"
                    >
                        <div
                            className="flex items-start gap-3 rounded-2xl px-4 py-3 text-xs font-medium leading-snug"
                            style={{
                                background: "rgba(255, 180, 0, 0.08)",
                                border:     "1px solid rgba(255, 180, 0, 0.25)",
                                color:      "#fbbf24",
                            }}
                        >
                            <span className="text-base leading-none shrink-0">⚡</span>
                            <span>
                                <strong>Pro Tip:</strong> Tap{" "}
                                <span className="font-black">⋮</span> and{" "}
                                <span className="font-black">"Open in Browser"</span> for a smoother sign-in experience.
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Close button (modal mode) ───────────────────────────────── */}
            {isModal && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-0 w-9 h-9 rounded-full flex items-center justify-center opacity-30 hover:opacity-70 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                >
                    <X size={15} />
                </button>
            )}

            {/* ── Brand ──────────────────────────────────────────────────── */}
            <div className="flex flex-col items-center mb-8">
                <div
                    className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4"
                    style={{
                        background: `${CYAN}12`,
                        border:     `1.5px solid ${CYAN}35`,
                        boxShadow:  `0 0 32px ${CYAN}20`,
                    }}
                >
                    <span
                        className="text-2xl font-black"
                        style={{ color: CYAN, fontFamily: "var(--font-archivo-black), sans-serif" }}
                    >W</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.55em] opacity-30 mb-1">
                    Mr. Workout
                </p>
                <h1
                    className="text-2xl font-black uppercase leading-tight text-center"
                    style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                >
                    {screen === "otp-sent" ? "Check Your Email" : "Access The Clinic"}
                </h1>
            </div>

            <AnimatePresence mode="wait">

                {/* ══ DEFAULT SCREEN ══════════════════════════════════════════ */}
                {screen === "default" && (
                    <motion.div
                        key="default"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col gap-3"
                    >
                        {/* Google */}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleGoogle}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                            style={{
                                background:  "rgba(255,255,255,0.06)",
                                border:      "1px solid rgba(255,255,255,0.14)",
                                touchAction: "manipulation",
                            }}
                        >
                            <GoogleIcon />
                            Continue with Google
                        </motion.button>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-1">
                            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-25">or</span>
                            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                        </div>

                        {/* Email input */}
                        <div className="relative">
                            <Mail
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ color: `${CYAN}70` }}
                            />
                            <input
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={e => { setEmail(e.target.value); resetError(); }}
                                onKeyDown={e => e.key === "Enter" && handleSendOTP()}
                                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-25"
                                style={{
                                    background:  "rgba(255,255,255,0.05)",
                                    border:      email.includes("@")
                                        ? `1px solid ${CYAN}50`
                                        : "1px solid rgba(255,255,255,0.10)",
                                    color:       "#fff",
                                    caretColor:  CYAN,
                                    transition:  "border-color 0.2s",
                                }}
                                autoComplete="email"
                            />
                        </div>

                        <ErrorBanner />

                        {/* PRIMARY: Send Login Code — cyan glow */}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleSendOTP}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-55"
                            style={{
                                background:  `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)`,
                                boxShadow:   `0 0 36px ${CYAN}55, 0 6px 20px rgba(0,0,0,0.4)`,
                                touchAction: "manipulation",
                            }}
                        >
                            {loading
                                ? <Loader2 size={16} className="animate-spin" />
                                : <><ShieldCheck size={15} /> Send Login Code</>
                            }
                        </motion.button>

                        {/* SECONDARY: Password fallback */}
                        <button
                            onClick={() => { setScreen("password"); resetError(); }}
                            className="text-center text-xs font-black uppercase tracking-widest mt-1 transition-opacity"
                            style={{ color: "rgba(255,255,255,0.25)" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
                        >
                            Use Password Instead →
                        </button>
                    </motion.div>
                )}

                {/* ══ OTP VERIFY SCREEN ═══════════════════════════════════════ */}
                {screen === "otp-sent" && (
                    <motion.div
                        key="otp-sent"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col gap-4"
                    >
                        <p className="text-center text-sm opacity-40 font-medium leading-relaxed -mt-2 mb-2">
                            A 6-digit code was sent to{" "}
                            <span className="font-black opacity-80" style={{ color: CYAN }}>{email}</span>
                        </p>

                        <OtpInput
                            value={otpCode}
                            onChange={v => { setOtpCode(v); resetError(); }}
                            disabled={loading}
                        />

                        <ErrorBanner />

                        {/* Verify */}
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleVerifyOTP}
                            disabled={loading || otpCode.length !== 6}
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-40"
                            style={{
                                background:  otpCode.length === 6
                                    ? `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)`
                                    : "rgba(255,255,255,0.08)",
                                boxShadow:   otpCode.length === 6 ? `0 0 36px ${CYAN}55` : "none",
                                color:       otpCode.length === 6 ? "#000" : "rgba(255,255,255,0.3)",
                                touchAction: "manipulation",
                                transition:  "all 0.2s",
                            }}
                        >
                            {loading
                                ? <Loader2 size={16} className="animate-spin" />
                                : <><Zap size={15} fill="currentColor" /> Verify & Enter</>
                            }
                        </motion.button>

                        {/* Resend + Back */}
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => { setScreen("default"); setOtpCode(""); resetError(); }}
                                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest opacity-30 hover:opacity-60 transition-opacity"
                            >
                                <ArrowLeft size={12} /> Back
                            </button>
                            {resendIn > 0 ? (
                                <span className="text-xs opacity-25 font-medium">
                                    Resend in {resendIn}s
                                </span>
                            ) : (
                                <button
                                    onClick={() => { setOtpCode(""); handleSendOTP(); }}
                                    disabled={loading}
                                    className="text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-40"
                                    style={{ color: CYAN, opacity: 0.7 }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.7")}
                                >
                                    Resend Code
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}

                {/* ══ PASSWORD SCREEN ═════════════════════════════════════════ */}
                {screen === "password" && (
                    <motion.div
                        key="password"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.25 }}
                        className="flex flex-col gap-3"
                    >
                        {/* Email */}
                        <div className="relative">
                            <Mail
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ color: `${CYAN}70` }}
                            />
                            <input
                                type="email"
                                placeholder="your@email.com"
                                value={email}
                                onChange={e => { setEmail(e.target.value); resetError(); }}
                                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-25"
                                style={{
                                    background: "rgba(255,255,255,0.05)",
                                    border:     email.includes("@")
                                        ? `1px solid ${CYAN}50`
                                        : "1px solid rgba(255,255,255,0.10)",
                                    color:      "#fff",
                                    caretColor: CYAN,
                                }}
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock
                                size={15}
                                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-30"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={e => { setPassword(e.target.value); resetError(); }}
                                onKeyDown={e => e.key === "Enter" && handlePassword()}
                                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-25"
                                style={{
                                    background: "rgba(255,255,255,0.05)",
                                    border:     "1px solid rgba(255,255,255,0.10)",
                                    color:      "#fff",
                                    caretColor: CYAN,
                                }}
                                autoComplete="current-password"
                            />
                        </div>

                        <ErrorBanner />

                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handlePassword}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-55"
                            style={{
                                background:  `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)`,
                                boxShadow:   `0 0 28px ${CYAN}45`,
                                touchAction: "manipulation",
                            }}
                        >
                            {loading
                                ? <Loader2 size={16} className="animate-spin" />
                                : "Sign In"
                            }
                        </motion.button>

                        <button
                            onClick={() => { setScreen("default"); resetError(); }}
                            className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest opacity-30 hover:opacity-60 transition-opacity mt-1"
                        >
                            <ArrowLeft size={12} /> Back to options
                        </button>
                    </motion.div>
                )}

            </AnimatePresence>

            {/* ── Footer ─────────────────────────────────────────────────── */}
            <p className="text-center text-[10px] opacity-15 font-medium mt-8 leading-relaxed">
                By continuing you agree to our Terms & Privacy Policy.
            </p>
        </div>
    );

    // Full-screen page mode
    if (!isModal) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#060606] relative overflow-hidden">
                {/* Ambient glow */}
                <div
                    className="fixed inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${CYAN}09 0%, transparent 65%)` }}
                />
                {/* Grid */}
                <div
                    className="fixed inset-0 pointer-events-none opacity-[0.018]"
                    style={{
                        backgroundImage: `linear-gradient(${CYAN}80 1px, transparent 1px), linear-gradient(90deg, ${CYAN}80 1px, transparent 1px)`,
                        backgroundSize:  "48px 48px",
                    }}
                />
                <div className="relative z-10 w-full">{content}</div>
            </div>
        );
    }

    // Modal overlay mode
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="w-full sm:max-w-sm relative overflow-hidden"
                style={{
                    background:   "linear-gradient(160deg, #0a0a0a 0%, #060606 100%)",
                    border:       `1px solid ${CYAN}18`,
                    borderBottom: "none",
                    borderRadius: "32px 32px 0 0",
                    // sm: full border
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top accent line */}
                <div
                    className="absolute top-0 inset-x-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${CYAN}50, transparent)` }}
                />
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-0 sm:hidden">
                    <div className="w-10 h-1 rounded-full" style={{ background: `${CYAN}25` }} />
                </div>
                {content}
            </motion.div>
        </motion.div>
    );
}
