"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Volume2, Loader2, Crown, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { hapticLight, hapticMedium, hapticHeavy } from "@/utils/haptic";
import { openUpgradeModal } from "@/utils/openUpgradeModal";
import { loadProfile } from "@/utils/missionGenerator";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
    role:    "user" | "assistant";
    content: string;
}

interface Props {
    isOpen:  boolean;
    onClose: () => void;
    accent:  string;
}

// ── Quick prompts ─────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
    "What's today's mission?",
    "How do I progress muscle-ups?",
    "Fix my plateau on push press",
    "I'm sore — train or rest?",
];

// ── Gym avatar ────────────────────────────────────────────────────────────────
function GymAvatar({ accent, size = 36 }: { accent: string; size?: number }) {
    return (
        <div
            className="flex items-center justify-center rounded-xl shrink-0 font-black text-black select-none"
            style={{
                width:      size,
                height:     size,
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}99 100%)`,
                fontSize:   size * 0.36,
                boxShadow:  `0 0 18px ${accent}55`,
                fontFamily: "var(--font-archivo-black), sans-serif",
            }}
        >
            G
        </div>
    );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({
    msg, accent, isStreaming,
}: { msg: Message; accent: string; isStreaming?: boolean }) {
    const isGym = msg.role === "assistant";
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex gap-2.5 ${isGym ? "items-start" : "items-end justify-end"}`}
        >
            {isGym && <GymAvatar accent={accent} size={28} />}
            <div
                className={`max-w-[84%] px-4 py-3 text-sm font-medium leading-relaxed rounded-2xl ${
                    isGym ? "rounded-tl-sm" : "rounded-br-sm"
                }`}
                style={{
                    background: isGym
                        ? "rgba(255,255,255,0.055)"
                        : `linear-gradient(135deg, ${accent}22, ${accent}15)`,
                    border: isGym
                        ? "1px solid rgba(255,255,255,0.07)"
                        : `1px solid ${accent}30`,
                }}
            >
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                {isStreaming && (
                    <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.75, repeat: Infinity }}
                        className="inline-block w-[5px] h-[14px] ml-1 rounded-sm align-middle"
                        style={{ background: accent }}
                    />
                )}
            </div>
        </motion.div>
    );
}

// ── Upgrade gate ─────────────────────────────────────────────────────────────
function UpgradeGate({ accent, onClose, onUpgrade }: {
    accent: string; onClose: () => void; onUpgrade: () => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center rounded-[26px] overflow-hidden"
            style={{ background: "#0b0b0b" }}
        >
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,215,0,0.06) 0%, transparent 65%)" }}
            />
            <motion.div
                animate={{ rotate: [0, -6, 6, -3, 3, 0] }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="relative z-10 w-20 h-20 rounded-[24px] flex items-center justify-center mb-5"
                style={{
                    background: "linear-gradient(135deg, rgba(255,215,0,0.14), rgba(255,165,0,0.06))",
                    border:     "1px solid rgba(255,215,0,0.3)",
                    boxShadow:  "0 0 50px rgba(255,215,0,0.18)",
                }}
            >
                <Crown size={38} color="#FFD700" fill="rgba(255,215,0,0.3)" />
            </motion.div>
            <p className="relative z-10 text-[9px] font-black uppercase tracking-[0.55em] opacity-30 mb-2">
                Daily limit reached
            </p>
            <h2
                className="relative z-10 text-3xl font-black uppercase leading-tight mb-3"
                style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.03em" }}
            >
                3 free messages<br />
                <span style={{ color: "#FFD700" }}>used up</span>
            </h2>
            <p className="relative z-10 text-sm opacity-40 font-medium leading-relaxed mb-7 max-w-[240px]">
                Upgrade to Savage Pro for unlimited access to Gym — every day, no limits.
            </p>
            <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onUpgrade}
                className="relative z-10 w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm text-black flex items-center justify-center gap-2.5"
                style={{
                    background:  "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                    boxShadow:   "0 0 35px rgba(255,215,0,0.35)",
                    touchAction: "manipulation",
                }}
            >
                <Zap size={15} fill="currentColor" /> Unlock Savage Pro
            </motion.button>
            <button
                onClick={onClose}
                className="relative z-10 mt-4 text-xs opacity-25 hover:opacity-50 transition-opacity font-medium"
            >
                Maybe later
            </button>
        </motion.div>
    );
}

// ── Main drawer ───────────────────────────────────────────────────────────────
export default function CoachDrawer({ isOpen, onClose, accent }: Props) {
    const router = useRouter();
    const [messages,      setMessages]      = useState<Message[]>([]);
    const [input,         setInput]         = useState("");
    const [streaming,     setStreaming]      = useState(false);
    const [briefLoading,  setBriefLoading]  = useState(false);
    const [briefText,     setBriefText]     = useState<string | null>(null);
    const [noKey,         setNoKey]         = useState(false);
    const [rateLimited,   setRateLimited]   = useState(false);
    const [needsLogin,    setNeedsLogin]    = useState(false);
    const scrollRef  = useRef<HTMLDivElement>(null);
    const inputRef   = useRef<HTMLInputElement>(null);
    const abortRef   = useRef<AbortController | null>(null);
    const audioRef   = useRef<HTMLAudioElement | null>(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Focus on open, stop audio on close
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 340);
        } else {
            audioRef.current?.pause();
            abortRef.current?.abort();
        }
    }, [isOpen]);

    // Greeting on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role:    "assistant",
                content: "Gym here.\n\nI know every one of the 89 Antigravity maneuvers. Ask me about programming, technique, nutrition, or recovery — I'll give you the truth, not comfort.\n\nWhat do you need?",
            }]);
        }
    }, [isOpen, messages.length]);

    const getProfileHeader = () => {
        try {
            const p = loadProfile();
            if (!p) return "";
            return encodeURIComponent(JSON.stringify({ goal: p.goal, focus: p.focusArea, level: p.level }));
        } catch { return ""; }
    };

    const send = useCallback(async (text?: string) => {
        const content = (text ?? input).trim();
        if (!content || streaming) return;
        hapticMedium();
        setInput("");
        setNoKey(false);
        setRateLimited(false);
        setNeedsLogin(false);

        const history: Message[] = [...messages, { role: "user", content }];
        setMessages([...history, { role: "assistant", content: "" }]);
        setStreaming(true);

        abortRef.current = new AbortController();

        try {
            const res = await fetch("/api/chat", {
                method:  "POST",
                headers: {
                    "Content-Type":    "application/json",
                    "x-user-profile":  getProfileHeader(),
                },
                body:   JSON.stringify({ messages: history }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({ error: "server_error", message: "Request failed" }));
                // Rate limit → show upgrade gate
                if (res.status === 429) {
                    hapticHeavy();
                    setRateLimited(true);
                    // Remove the empty assistant bubble
                    setMessages(prev => prev.slice(0, -1));
                    setStreaming(false);
                    return;
                }
                // Not authenticated
                if (res.status === 401) {
                    setNeedsLogin(true);
                    setMessages(prev => prev.slice(0, -1));
                    setStreaming(false);
                    return;
                }
                if (res.status === 503) setNoKey(true);
                const { error } = body;
                setMessages(prev => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { role: "assistant", content: error ?? "Something went wrong." };
                    return copy;
                });
                setStreaming(false);
                return;
            }

            const reader  = res.body!.getReader();
            const decoder = new TextDecoder();
            let   buf     = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const raw = line.slice(6).trim();
                    if (raw === "[DONE]") continue;
                    try {
                        const { text: chunk } = JSON.parse(raw);
                        if (chunk) {
                            setMessages(prev => {
                                const copy = [...prev];
                                copy[copy.length - 1] = {
                                    ...copy[copy.length - 1],
                                    content: copy[copy.length - 1].content + chunk,
                                };
                                return copy;
                            });
                        }
                    } catch {}
                }
            }
        } catch (err: any) {
            if (err.name !== "AbortError") {
                setMessages(prev => {
                    const copy = [...prev];
                    copy[copy.length - 1] = { role: "assistant", content: "Connection interrupted." };
                    return copy;
                });
            }
        } finally {
            setStreaming(false);
        }
    }, [input, messages, streaming]);

    // Daily briefing: generate text then TTS
    const handleBrief = async () => {
        hapticMedium();
        setBriefLoading(true);
        setBriefText(null);
        audioRef.current?.pause();
        try {
            // Generate briefing text via /api/coach/brief (reuses existing endpoint)
            const res = await fetch("/api/coach/brief");
            const ct  = res.headers.get("content-type") ?? "";

            if (ct.includes("application/json")) {
                const { text } = await res.json();
                if (text) setBriefText(text);
            } else {
                // Audio blob from ElevenLabs
                const blob = await res.blob();
                const url  = URL.createObjectURL(blob);
                const text = decodeURIComponent(res.headers.get("x-brief-text") ?? "");
                if (text) setBriefText(text);
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.play().catch(() => {});
                audio.onended = () => URL.revokeObjectURL(url);
            }
        } catch {}
        setBriefLoading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-[600] bg-black/55 backdrop-blur-[4px]"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 z-[610] flex flex-col"
                        style={{
                            height:       "88dvh",
                            background:   "#0b0b0b",
                            borderRadius: "26px 26px 0 0",
                            border:       "1px solid rgba(255,255,255,0.07)",
                            borderBottom: "none",
                        }}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 320, damping: 38 }}
                        drag="y"
                        dragConstraints={{ top: 0 }}
                        dragElastic={{ top: 0, bottom: 0.35 }}
                        onDragEnd={(_, i) => { if (i.offset.y > 90) onClose(); }}
                    >
                        {/* ── Rate limit gate (overlays entire drawer) ── */}
                        <AnimatePresence>
                            {rateLimited && (
                                <UpgradeGate
                                    accent={accent}
                                    onClose={() => { setRateLimited(false); onClose(); }}
                                    onUpgrade={() => {
                                        hapticHeavy();
                                        onClose();
                                        openUpgradeModal();
                                    }}
                                />
                            )}
                        </AnimatePresence>

                        {/* Drag pill */}
                        <div className="flex justify-center pt-3 shrink-0">
                            <div className="w-9 h-[3px] rounded-full bg-white/15" />
                        </div>

                        {/* ── Header ── */}
                        <div
                            className="flex items-center gap-3 px-5 py-3.5 shrink-0"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                        >
                            <GymAvatar accent={accent} size={42} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-[0.55em] opacity-25">
                                    Mr. Workout AI
                                </p>
                                <h2
                                    className="text-xl font-black uppercase tracking-tight leading-none"
                                    style={{ fontFamily: "var(--font-archivo-black), sans-serif" }}
                                >
                                    GYM
                                </h2>
                                <p className="text-[10px] opacity-30 font-medium mt-0.5">
                                    Your savage personal trainer
                                </p>
                            </div>

                            {/* Brief button */}
                            <motion.button
                                whileTap={{ scale: 0.93 }}
                                onClick={handleBrief}
                                disabled={briefLoading}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest disabled:opacity-40"
                                style={{
                                    background:  `${accent}18`,
                                    border:      `1px solid ${accent}35`,
                                    color:       accent,
                                    touchAction: "manipulation",
                                }}
                            >
                                {briefLoading ? <Loader2 size={11} className="animate-spin" /> : <Volume2 size={11} />}
                                {briefLoading ? "…" : "Brief"}
                            </motion.button>

                            <button
                                onClick={() => { hapticLight(); onClose(); }}
                                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] active:scale-90 transition-transform ml-1"
                            >
                                <X size={15} className="opacity-45" />
                            </button>
                        </div>

                        {/* Brief text */}
                        <AnimatePresence>
                            {briefText && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-5 py-3 relative shrink-0"
                                    style={{ background: `${accent}0d`, borderBottom: `1px solid ${accent}20` }}
                                >
                                    <p className="text-[11px] font-medium opacity-75 leading-relaxed italic pr-6">
                                        "{briefText}"
                                    </p>
                                    <button onClick={() => setBriefText(null)} className="absolute top-3 right-5 opacity-25 hover:opacity-60">
                                        <X size={11} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* No API key */}
                        <AnimatePresence>
                            {noKey && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mx-4 mt-3 px-4 py-3 rounded-2xl shrink-0"
                                    style={{ background: "rgba(255,60,60,0.07)", border: "1px solid rgba(255,60,60,0.18)" }}
                                >
                                    <p className="text-[11px] font-bold text-red-400">
                                        Add OPENAI_API_KEY or ANTHROPIC_API_KEY to Vercel environment variables to enable Gym.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Needs login */}
                        <AnimatePresence>
                            {needsLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mx-4 mt-3 px-4 py-3 rounded-2xl shrink-0 flex items-center gap-3"
                                    style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.2)" }}
                                >
                                    <Crown size={14} color="#FFD700" className="shrink-0" />
                                    <p className="text-[11px] font-bold" style={{ color: "#FFD700" }}>
                                        Log in to chat with Gym.{" "}
                                        <button
                                            onClick={() => { onClose(); openUpgradeModal(); }}
                                            className="underline"
                                        >
                                            Upgrade →
                                        </button>
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3.5 overscroll-contain"
                        >
                            {messages.map((msg, i) => (
                                <Bubble
                                    key={i}
                                    msg={msg}
                                    accent={accent}
                                    isStreaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
                                />
                            ))}
                        </div>

                        {/* Quick prompts */}
                        {messages.length <= 1 && (
                            <div className="px-4 pb-2 shrink-0 overflow-x-auto">
                                <div className="flex gap-2 pb-1">
                                    {QUICK_PROMPTS.map(p => (
                                        <button
                                            key={p}
                                            onClick={() => { hapticLight(); send(p); }}
                                            className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap"
                                            style={{
                                                background:  "rgba(255,255,255,0.05)",
                                                border:      "1px solid rgba(255,255,255,0.08)",
                                                touchAction: "manipulation",
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input */}
                        <div
                            className="px-4 pt-2.5 shrink-0"
                            style={{
                                borderTop:     "1px solid rgba(255,255,255,0.05)",
                                paddingBottom: "max(env(safe-area-inset-bottom, 0px), 14px)",
                            }}
                        >
                            <div
                                className="flex items-center gap-2.5 px-4 rounded-2xl"
                                style={{
                                    background: "rgba(255,255,255,0.05)",
                                    border:     "1px solid rgba(255,255,255,0.08)",
                                    minHeight:  "50px",
                                }}
                            >
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                                    placeholder="Ask Gym anything…"
                                    disabled={streaming}
                                    className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:opacity-25 disabled:opacity-40"
                                    style={{ caretColor: accent }}
                                />
                                <motion.button
                                    whileTap={{ scale: 0.88 }}
                                    onClick={() => send()}
                                    disabled={!input.trim() || streaming}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-25 transition-colors"
                                    style={{
                                        background:  input.trim() && !streaming ? `linear-gradient(135deg, ${accent}, ${accent}bb)` : "rgba(255,255,255,0.07)",
                                        touchAction: "manipulation",
                                    }}
                                >
                                    {streaming
                                        ? <Loader2 size={14} className="animate-spin opacity-50" />
                                        : <Send size={13} style={{ color: input.trim() ? "#000" : "#fff" }} />
                                    }
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
