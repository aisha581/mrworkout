"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
    Mail, Lock, Loader2, AlertCircle,
    ArrowLeft, Zap, X, ShieldCheck,
} from "lucide-react";

const CYAN        = "#00FFFF";
const RESEND_SECS = 30;

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

// ── 6-box OTP input — one real <input> per box, auto-advances on digit ────────
function OtpBoxes({ value, onChange, onComplete, isVerifying, disabled }: {
    value:        string;
    onChange:     (v: string) => void;
    onComplete:   () => void;
    isVerifying?: boolean;
    disabled?:    boolean;
}) {
    const boxRefs    = useRef<(HTMLInputElement | null)[]>([]);
    const [focused, setFocused] = useState(-1);

    // Focus first empty box on mount
    useEffect(() => { setTimeout(() => boxRefs.current[0]?.focus(), 120); }, []);

    // When disabled/verifying, keep boxes non-interactive
    const isLocked = !!(disabled || isVerifying);

    const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const digit = e.target.value.replace(/\D/g, "").slice(-1);
        if (!digit) return;

        const chars  = value.padEnd(6, " ").split("");
        chars[i]     = digit;
        const newVal = chars.join("").replace(/ /g, "").slice(0, 6);
        onChange(newVal);

        // Advance focus
        if (i < 5) boxRefs.current[i + 1]?.focus();
        if (newVal.length === 6) onComplete();
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            if (value[i]) {
                // Clear current box
                const chars  = value.split("");
                chars[i]     = "";
                onChange(chars.join(""));
            } else if (i > 0) {
                // Move back and clear previous box
                const chars  = value.padEnd(6, " ").split("");
                chars[i - 1] = "";
                onChange(chars.join("").replace(/ /g, ""));
                boxRefs.current[i - 1]?.focus();
            }
        } else if (e.key === "ArrowLeft"  && i > 0) {
            boxRefs.current[i - 1]?.focus();
        } else if (e.key === "ArrowRight" && i < 5) {
            boxRefs.current[i + 1]?.focus();
        }
    };

    // Paste: distribute digits across boxes
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (!pasted) return;
        onChange(pasted);
        const nextIdx = Math.min(pasted.length, 5);
        boxRefs.current[nextIdx]?.focus();
        if (pasted.length === 6) onComplete();
    };

    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length: 6 }).map((_, i) => {
                const isFocused = focused === i && !isLocked;
                const hasDigit  = !!value[i];

                return (
                    <motion.input
                        key={i}
                        ref={el => { boxRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={2}
                        value={value[i] ?? ""}
                        onChange={e => !isLocked && handleChange(i, e)}
                        onKeyDown={e => !isLocked && handleKeyDown(i, e)}
                        onPaste={handlePaste}
                        onFocus={() => setFocused(i)}
                        onBlur={() => setFocused(-1)}
                        disabled={isLocked}
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        // Pulse cyan glow when verifying
                        animate={isVerifying ? {
                            boxShadow: [
                                `0 0 10px ${CYAN}44`,
                                `0 0 26px ${CYAN}BB`,
                                `0 0 10px ${CYAN}44`,
                            ],
                        } : {}}
                        transition={isVerifying ? {
                            duration:  0.85,
                            repeat:    Infinity,
                            ease:      "easeInOut",
                            delay:     i * 0.09,
                        } : {}}
                        className="w-11 h-14 rounded-xl text-xl font-black text-center outline-none"
                        style={{
                            background:  isVerifying ? `${CYAN}1E`
                                       : hasDigit    ? `${CYAN}14`
                                       :               "rgba(255,255,255,0.04)",
                            border:      isVerifying  ? `1.5px solid ${CYAN}`
                                       : isFocused    ? `1.5px solid ${CYAN}`
                                       : hasDigit     ? `1px solid ${CYAN}55`
                                       :                "1px solid rgba(255,255,255,0.10)",
                            boxShadow:   isFocused && !isVerifying ? `0 0 16px ${CYAN}45` : undefined,
                            color:       CYAN,
                            fontFamily:  "var(--font-archivo-black), sans-serif",
                            caretColor:  "transparent",
                            cursor:      isLocked ? "not-allowed" : "text",
                            transition:  "background 0.12s, border-color 0.12s",
                        }}
                    />
                );
            })}
        </div>
    );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface AuthModalProps {
    onClose?:         () => void;
    redirectTo?:      string;
    onAuthenticated?: () => void;
}

type Phase = "email" | "code" | "password";

// ── Supabase helpers ──────────────────────────────────────────────────────────
async function sbSendOTP(email: string) {
    return supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
    });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuthModal({
    onClose,
    redirectTo = "/auth-redirect",
    onAuthenticated,
}: AuthModalProps) {
    const router = useRouter();
    const { status: sessionStatus } = useSession();

    const [phase,        setPhase]        = useState<Phase>("email");
    const [email,        setEmail]        = useState("");
    const [password,     setPassword]     = useState("");
    const [code,         setCode]         = useState("");
    const [loading,      setLoading]      = useState(false);
    const [isVerifying,  setIsVerifying]  = useState(false);
    const [error,        setError]        = useState<string | null>(null);
    const [resendIn,     setResendIn]     = useState(0);
    const [autoSwitched, setAutoSwitched] = useState(false);
    const [isInApp,      setIsInApp]      = useState(false);

    useEffect(() => {
        if (typeof navigator === "undefined") return;
        setIsInApp(/Instagram|FBAN|FBAV|TikTok|Snapchat|Twitter|Line|MicroMessenger|LinkedInApp/.test(navigator.userAgent));
    }, []);

    // Auto-proceed if session already exists
    useEffect(() => {
        if (sessionStatus !== "authenticated") return;
        onAuthenticated ? onAuthenticated() : finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionStatus]);

    // Resend countdown
    useEffect(() => {
        if (resendIn <= 0) return;
        const id = setTimeout(() => setResendIn(n => n - 1), 1000);
        return () => clearTimeout(id);
    }, [resendIn]);

    const clrErr = () => setError(null);

    const finish = () => {
        try { localStorage.setItem("mw_onboarded", "1"); } catch {}
        if (onAuthenticated) {
            onAuthenticated();
        } else {
            router.replace(redirectTo === "/auth-redirect" ? "/" : redirectTo);
        }
    };

    // ── Path 1: Google ──────────────────────────────────────────────────────
    const handleGoogle = async () => {
        setLoading(true); clrErr();
        await signIn("google", { callbackUrl: redirectTo });
    };

    // ── Path 2a: Send OTP ───────────────────────────────────────────────────
    const handleSendCode = async () => {
        if (!email.includes("@")) { setError("Enter a valid email address."); return; }
        setLoading(true); clrErr();
        const { error: err } = await sbSendOTP(email);
        setLoading(false);
        if (err) { setError(err.message ?? "Couldn't send code — please try again."); return; }
        setCode("");
        setPhase("code");
        setResendIn(RESEND_SECS);
        setAutoSwitched(false);
    };

    // ── Path 2b: Verify OTP ─────────────────────────────────────────────────
    //
    // Spec:
    //   1. If < 6 digits and user manually taps Unlock → show red error.
    //   2. Spinner appears immediately on the button.
    //   3. Wait 800 ms before calling verifyOtp (Supabase propagation window).
    //   4. Try type:'magiclink', fall back to type:'signup'.
    //   5. Red "Incorrect or expired code" ONLY if both types return an error.
    //   6. On success → finish() which sets mw_onboarded and navigates.
    const handleVerifyCode = async () => {
        // Only show red for an explicitly incomplete manual tap
        if (code.length !== 6) {
            setError("Please enter the full 6-digit code.");
            return;
        }
        if (isVerifying) return;

        setIsVerifying(true);
        clrErr();

        // 800 ms delay — lets Supabase finish propagating the OTP
        await new Promise<void>(r => setTimeout(r, 800));

        // Attempt with magiclink, then signup (covers both Supabase project configs)
        let res = await supabase.auth.verifyOtp({ email, token: code, type: "magiclink" });
        if (res.error) {
            res = await supabase.auth.verifyOtp({ email, token: code, type: "signup" });
        }

        setIsVerifying(false);

        if (!res.error) {
            finish();
            return;
        }

        // Both types failed — show error and clear boxes for a fresh attempt
        setError("Incorrect or expired code. Try again.");
        setCode("");
    };

    // ── Path 3: Password (auto-falls back to OTP) ───────────────────────────
    const handlePassword = async () => {
        if (!email.includes("@") || !password) { setError("Enter your email and password."); return; }
        setLoading(true); clrErr();

        let result = await signIn("credentials", { email, password, redirect: false });
        if (!result?.error) { setLoading(false); router.replace(redirectTo); return; }

        try {
            const reg = await fetch("/api/auth/register", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            if (reg.ok) {
                result = await signIn("credentials", { email, password, redirect: false });
                if (!result?.error) { setLoading(false); router.replace(redirectTo); return; }
            }
        } catch { /* fall through */ }

        const { error: otpErr } = await sbSendOTP(email);
        setLoading(false);
        if (!otpErr) {
            setPassword(""); setCode(""); setAutoSwitched(true);
            setPhase("code"); setResendIn(RESEND_SECS);
        } else {
            setError("Sign-in failed. Try Google or check your connection.");
        }
    };

    // ── Resend ──────────────────────────────────────────────────────────────
    const handleResend = async () => {
        setCode(""); clrErr(); setLoading(true);
        const { error: err } = await sbSendOTP(email);
        setLoading(false);
        if (err) { setError(err.message ?? "Couldn't resend — try again."); return; }
        setResendIn(RESEND_SECS);
    };

    // ── Error banner ────────────────────────────────────────────────────────
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

    const inner = (
        <div className="relative w-full max-w-sm mx-auto px-5 py-9 flex flex-col">

            {/* In-app browser warning */}
            <AnimatePresence>
                {isInApp && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-5"
                    >
                        <div className="flex items-start gap-3 rounded-2xl px-4 py-3 text-xs font-medium leading-snug"
                            style={{ background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.25)", color: "#fbbf24" }}>
                            <span className="shrink-0 text-base leading-none">⚡</span>
                            <span><strong>Pro Tip:</strong> Tap <strong>⋮</strong> then <strong>"Open in Browser"</strong> for a smoother sign-in.</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Close (modal mode only) */}
            {isModal && (
                <button onClick={onClose}
                    className="absolute top-4 right-0 w-9 h-9 rounded-full flex items-center justify-center opacity-30 hover:opacity-70 transition-opacity"
                    style={{ background: "rgba(255,255,255,0.06)" }} aria-label="Close">
                    <X size={15} />
                </button>
            )}

            {/* Brand */}
            <div className="flex flex-col items-center mb-7">
                <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4"
                    style={{ background: `${CYAN}12`, border: `1.5px solid ${CYAN}35`, boxShadow: `0 0 30px ${CYAN}20` }}>
                    <span className="text-2xl font-black" style={{ color: CYAN, fontFamily: "var(--font-archivo-black), sans-serif" }}>W</span>
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.55em] opacity-25 mb-1">Mr. Workout</p>
                <AnimatePresence mode="wait">
                    <motion.h1
                        key={phase}
                        initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                        className="text-[22px] font-black uppercase leading-tight text-center"
                        style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
                    >
                        {phase === "code" ? "Enter Your Code" : "Access The Clinic"}
                    </motion.h1>
                </AnimatePresence>
            </div>

            {/* ══════════════════════════════════════════════════
                PHASE: email
            ══════════════════════════════════════════════════ */}
            <AnimatePresence mode="wait">
            {phase === "email" && (
                <motion.div key="email"
                    initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 18 }}
                    transition={{ duration: 0.22 }} className="flex flex-col gap-3">

                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleGoogle} disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-50"
                        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.14)", touchAction: "manipulation" }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
                        Continue with Google
                    </motion.button>

                    <div className="flex items-center gap-3 my-0.5">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-20">or</span>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                    </div>

                    <div className="relative">
                        <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: `${CYAN}70` }} />
                        <input type="email" placeholder="your@email.com" value={email}
                            onChange={e => { setEmail(e.target.value); clrErr(); }}
                            onKeyDown={e => e.key === "Enter" && handleSendCode()}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-20 disabled:opacity-50"
                            style={{
                                background:  "rgba(255,255,255,0.05)",
                                border:      email.includes("@") ? `1px solid ${CYAN}50` : "1px solid rgba(255,255,255,0.10)",
                                color:       "#fff", caretColor: CYAN, transition: "border-color 0.18s",
                            }}
                            autoComplete="email" />
                    </div>

                    <Err />

                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSendCode} disabled={loading}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-60"
                        style={{ background: `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)`, boxShadow: `0 0 38px ${CYAN}55, 0 6px 24px rgba(0,0,0,0.45)`, touchAction: "manipulation" }}>
                        {loading ? <Loader2 size={16} className="animate-spin text-black" /> : <><ShieldCheck size={15} /> Send 6-Digit Code</>}
                    </motion.button>

                    <p className="text-center text-[10px] opacity-20 font-medium -mt-0.5">
                        We'll email you a code. No password needed.
                    </p>

                    <button onClick={() => { setPhase("password"); clrErr(); }} disabled={loading}
                        className="text-center text-[11px] font-black uppercase tracking-widest mt-0.5 py-1 transition-opacity disabled:opacity-30"
                        style={{ color: "rgba(255,255,255,0.20)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.48)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.20)")}>
                        Use Password Instead →
                    </button>
                </motion.div>
            )}

            {/* ══════════════════════════════════════════════════
                PHASE: code — 6-box OTP
            ══════════════════════════════════════════════════ */}
            {phase === "code" && (
                <motion.div key="code"
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22 }} className="flex flex-col gap-4">

                    {/* Context banner */}
                    <AnimatePresence mode="wait">
                        {autoSwitched ? (
                            <motion.div key="switched" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                                className="rounded-2xl px-4 py-3 text-xs font-medium leading-snug text-center"
                                style={{ background: `${CYAN}0d`, border: `1px solid ${CYAN}30`, color: CYAN }}>
                                Password didn't match — we sent a login code to <strong>{email}</strong> instead.
                            </motion.div>
                        ) : (
                            <motion.div key="normal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                                <p className="text-xs opacity-35 font-medium leading-relaxed">
                                    Code sent to <span className="font-black" style={{ color: CYAN, opacity: 1 }}>{email}</span>
                                </p>
                                <p className="text-[10px] opacity-20 mt-0.5">Check your inbox and spam folder.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Subtitle / verifying state */}
                    <AnimatePresence mode="wait">
                        {isVerifying ? (
                            <motion.p key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2"
                                style={{ color: CYAN }}>
                                <Loader2 size={12} className="animate-spin" /> Verifying…
                            </motion.p>
                        ) : (
                            <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="text-center text-xs font-medium" style={{ color: `${CYAN}90` }}>
                                Enter the 6-digit code sent to your inbox
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {/* 6 individual boxes */}
                    <OtpBoxes
                        value={code}
                        onChange={v => { setCode(v); clrErr(); }}
                        onComplete={handleVerifyCode}
                        isVerifying={isVerifying}
                        disabled={loading}
                    />

                    <Err />

                    {/* Unlock button */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleVerifyCode}
                        disabled={isVerifying || loading}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
                        style={{
                            background:  code.length === 6 ? `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)` : "rgba(255,255,255,0.08)",
                            boxShadow:   code.length === 6 ? `0 0 38px ${CYAN}55` : "none",
                            color:       code.length === 6 ? "#000" : "rgba(255,255,255,0.25)",
                            touchAction: "manipulation",
                            transition:  "all 0.18s",
                        }}
                    >
                        {isVerifying
                            ? <Loader2 size={16} className="animate-spin" style={{ color: code.length === 6 ? "#000" : "currentColor" }} />
                            : <><Zap size={15} fill="currentColor" /> Unlock</>
                        }
                    </motion.button>

                    {/* Back + Resend row */}
                    <div className="flex items-center justify-between pt-0.5">
                        <button
                            onClick={() => { setPhase("email"); setCode(""); setAutoSwitched(false); clrErr(); }}
                            disabled={isVerifying}
                            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest opacity-25 hover:opacity-55 transition-opacity disabled:opacity-10">
                            <ArrowLeft size={12} /> Back
                        </button>

                        {resendIn > 0 ? (
                            <span className="text-xs opacity-20 font-medium tabular-nums">Resend in {resendIn}s</span>
                        ) : (
                            <button onClick={handleResend} disabled={loading || isVerifying}
                                className="text-xs font-black uppercase tracking-widest transition-opacity disabled:opacity-30"
                                style={{ color: CYAN, opacity: 0.6 }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}>
                                Didn't get a code? Resend
                            </button>
                        )}
                    </div>
                </motion.div>
            )}

            {/* ══════════════════════════════════════════════════
                PHASE: password
            ══════════════════════════════════════════════════ */}
            {phase === "password" && (
                <motion.div key="password"
                    initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.22 }} className="flex flex-col gap-3">

                    <p className="text-[10px] opacity-25 font-medium text-center leading-snug -mt-1 mb-0.5">
                        Wrong password or new account? We'll automatically send you a code.
                    </p>

                    <div className="relative">
                        <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: `${CYAN}70` }} />
                        <input type="email" placeholder="your@email.com" value={email}
                            onChange={e => { setEmail(e.target.value); clrErr(); }}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-20 disabled:opacity-50"
                            style={{ background: "rgba(255,255,255,0.05)", border: email.includes("@") ? `1px solid ${CYAN}50` : "1px solid rgba(255,255,255,0.10)", color: "#fff", caretColor: CYAN }}
                            autoComplete="email" />
                    </div>

                    <div className="relative">
                        <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-25" />
                        <input type="password" placeholder="Password" value={password}
                            onChange={e => { setPassword(e.target.value); clrErr(); }}
                            onKeyDown={e => e.key === "Enter" && handlePassword()}
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium outline-none placeholder:opacity-20 disabled:opacity-50"
                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "#fff", caretColor: CYAN }}
                            autoComplete="current-password" />
                    </div>

                    <Err />

                    <motion.button whileTap={{ scale: 0.97 }} onClick={handlePassword} disabled={loading}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5 disabled:opacity-55"
                        style={{ background: `linear-gradient(135deg, ${CYAN} 0%, #00C8C8 100%)`, boxShadow: `0 0 30px ${CYAN}45`, touchAction: "manipulation" }}>
                        {loading ? <Loader2 size={16} className="animate-spin text-black" /> : "Sign In"}
                    </motion.button>

                    <button onClick={() => { setPhase("email"); clrErr(); }}
                        className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-widest opacity-25 hover:opacity-55 transition-opacity mt-0.5">
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
                <div className="fixed inset-0 pointer-events-none"
                    style={{ background: `radial-gradient(ellipse 60% 50% at 50% 45%, ${CYAN}09 0%, transparent 65%)` }} />
                <div className="fixed inset-0 pointer-events-none opacity-[0.016]"
                    style={{ backgroundImage: `linear-gradient(${CYAN}80 1px, transparent 1px), linear-gradient(90deg, ${CYAN}80 1px, transparent 1px)`, backgroundSize: "48px 48px" }} />
                <div className="relative z-10 w-full">{inner}</div>
            </div>
        );
    }

    // ── Bottom-sheet modal ──────────────────────────────────────────────────
    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center"
            style={{ background: "rgba(0,0,0,0.84)", backdropFilter: "blur(14px)" }}
            onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <motion.div
                initial={{ y: 56, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 56, opacity: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="w-full sm:max-w-sm relative overflow-hidden"
                style={{ background: "linear-gradient(160deg, #0b0b0b 0%, #060606 100%)", border: `1px solid ${CYAN}16`, borderBottom: "none", borderRadius: "32px 32px 0 0" }}
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 inset-x-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${CYAN}50, transparent)` }} />
                <div className="flex justify-center pt-3 sm:hidden">
                    <div className="w-10 h-1 rounded-full" style={{ background: `${CYAN}22` }} />
                </div>
                {inner}
            </motion.div>
        </motion.div>
    );
}
