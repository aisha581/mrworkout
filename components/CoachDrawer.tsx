"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Send, Zap, Mic, MicOff, Volume2, Loader2, ChevronDown,
} from "lucide-react";
import { hapticLight, hapticMedium } from "@/utils/haptic";
import { playBriefing, stopAudio } from "@/utils/audio";

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

// ── Suggested prompts ─────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
    "What's today's mission?",
    "How do I progress on muscle-ups?",
    "Best moves for shredding fast?",
    "I'm sore — should I train?",
];

// ── Coach avatar ──────────────────────────────────────────────────────────────
function CoachAvatar({ accent, size = 36 }: { accent: string; size?: number }) {
    return (
        <div
            className="flex items-center justify-center rounded-xl shrink-0 font-black text-black"
            style={{
                width:      size,
                height:     size,
                background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
                fontSize:   size * 0.38,
                boxShadow:  `0 0 16px ${accent}50`,
            }}
        >
            C
        </div>
    );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({
    msg, accent, streaming,
}: {
    msg: Message; accent: string; streaming?: boolean;
}) {
    const isCoach = msg.role === "assistant";
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className={`flex gap-3 ${isCoach ? "items-start" : "items-end justify-end"}`}
        >
            {isCoach && <CoachAvatar accent={accent} size={30} />}

            <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${
                    isCoach ? "rounded-tl-sm" : "rounded-br-sm"
                }`}
                style={{
                    background: isCoach
                        ? "rgba(255,255,255,0.06)"
                        : `linear-gradient(135deg, ${accent}22, ${accent}18)`,
                    border: isCoach
                        ? "1px solid rgba(255,255,255,0.07)"
                        : `1px solid ${accent}35`,
                    color: "#fff",
                }}
            >
                <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                {streaming && (
                    <motion.span
                        animate={{ opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="inline-block w-1.5 h-4 ml-1 rounded-sm align-middle"
                        style={{ background: accent }}
                    />
                )}
            </div>
        </motion.div>
    );
}

// ── Main drawer ───────────────────────────────────────────────────────────────
export default function CoachDrawer({ isOpen, onClose, accent }: Props) {
    const [messages,   setMessages]   = useState<Message[]>([]);
    const [input,      setInput]      = useState("");
    const [streaming,  setStreaming]  = useState(false);
    const [briefing,   setBriefing]   = useState(false);
    const [briefText,  setBriefText]  = useState<string | null>(null);
    const [noKey,      setNoKey]      = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLInputElement>(null);
    const abortRef  = useRef<AbortController | null>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, streaming]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 350);
        } else {
            stopAudio();
        }
    }, [isOpen]);

    // Greeting on first open
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role:    "assistant",
                content: "Savage. I'm The Coach.\n\nAsk me anything — programming, movement breakdowns, recovery, nutrition. I know all 89 Antigravity maneuvers and I'll tell you exactly what you need to hear.\n\nWhat do you need?",
            }]);
        }
    }, [isOpen, messages.length]);

    const sendMessage = useCallback(async (text?: string) => {
        const content = (text ?? input).trim();
        if (!content || streaming) return;

        hapticMedium();
        setInput("");
        setNoKey(false);

        const newMessages: Message[] = [
            ...messages,
            { role: "user", content },
        ];
        setMessages(newMessages);
        setStreaming(true);

        // Add empty assistant bubble that we'll fill in
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

        abortRef.current = new AbortController();

        try {
            const res = await fetch("/api/coach/chat", {
                method:  "POST",
                headers: { "Content-Type": "application/json" },
                body:    JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                }),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const { error } = await res.json();
                if (res.status === 503) setNoKey(true);
                setMessages(prev => {
                    const copy = [...prev];
                    copy[copy.length - 1] = {
                        role:    "assistant",
                        content: error ?? "Something went wrong. Try again.",
                    };
                    return copy;
                });
                setStreaming(false);
                return;
            }

            const reader  = res.body!.getReader();
            const decoder = new TextDecoder();
            let   buffer  = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";

                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6).trim();
                    if (payload === "[DONE]") break;
                    try {
                        const { text: chunk, error } = JSON.parse(payload);
                        if (error) {
                            setMessages(prev => {
                                const copy = [...prev];
                                copy[copy.length - 1] = { role: "assistant", content: error };
                                return copy;
                            });
                            break;
                        }
                        if (chunk) {
                            setMessages(prev => {
                                const copy = [...prev];
                                const last = copy[copy.length - 1];
                                copy[copy.length - 1] = {
                                    ...last,
                                    content: last.content + chunk,
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
                    copy[copy.length - 1] = {
                        role:    "assistant",
                        content: "Connection interrupted. Try again.",
                    };
                    return copy;
                });
            }
        } finally {
            setStreaming(false);
        }
    }, [input, messages, streaming]);

    const handleBriefing = async () => {
        hapticMedium();
        setBriefing(true);
        setBriefText(null);
        try {
            const result = await playBriefing();
            if (result.text) setBriefText(result.text);
        } catch {}
        setBriefing(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 z-[600] bg-black/50 backdrop-blur-[4px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sheet */}
                    <motion.div
                        className="fixed bottom-0 left-0 right-0 z-[610] flex flex-col"
                        style={{
                            height:          "88dvh",
                            background:      "#0c0c0c",
                            borderRadius:    "28px 28px 0 0",
                            border:          "1px solid rgba(255,255,255,0.07)",
                            borderBottom:    "none",
                        }}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", stiffness: 300, damping: 36 }}
                    >
                        {/* Drag pill */}
                        <div className="flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-10 h-1 rounded-full bg-white/15" />
                        </div>

                        {/* Header */}
                        <div
                            className="flex items-center gap-3 px-5 py-4 shrink-0"
                            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                        >
                            <CoachAvatar accent={accent} size={40} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.45em] opacity-30">
                                    Mr. Workout
                                </p>
                                <h2
                                    className="text-lg font-black uppercase leading-tight"
                                    style={{ fontFamily: "var(--font-archivo-black), sans-serif", letterSpacing: "-0.02em" }}
                                >
                                    The Coach
                                </h2>
                            </div>

                            {/* Daily briefing button */}
                            <motion.button
                                whileTap={{ scale: 0.93 }}
                                onClick={handleBriefing}
                                disabled={briefing}
                                className="flex items-center gap-2 px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest text-black disabled:opacity-50"
                                style={{
                                    background:  briefing
                                        ? "rgba(255,255,255,0.1)"
                                        : `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                                    color:       briefing ? "#fff" : "#000",
                                    touchAction: "manipulation",
                                }}
                            >
                                {briefing
                                    ? <Loader2 size={12} className="animate-spin" />
                                    : <Volume2 size={12} />
                                }
                                {briefing ? "Loading…" : "Brief"}
                            </motion.button>

                            <button
                                onClick={() => { hapticLight(); onClose(); }}
                                className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] active:scale-90 transition-transform"
                            >
                                <X size={16} className="opacity-50" />
                            </button>
                        </div>

                        {/* Brief text banner */}
                        <AnimatePresence>
                            {briefText && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="px-5 py-3 shrink-0"
                                    style={{
                                        background:   `${accent}0f`,
                                        borderBottom: `1px solid ${accent}20`,
                                    }}
                                >
                                    <p className="text-xs font-medium opacity-80 leading-relaxed italic">
                                        "{briefText}"
                                    </p>
                                    <button
                                        onClick={() => setBriefText(null)}
                                        className="absolute right-5 top-3 opacity-30"
                                    >
                                        <X size={12} />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* No API key warning */}
                        <AnimatePresence>
                            {noKey && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mx-5 mt-3 px-4 py-3 rounded-2xl shrink-0"
                                    style={{
                                        background: "rgba(255,80,80,0.08)",
                                        border:     "1px solid rgba(255,80,80,0.2)",
                                    }}
                                >
                                    <p className="text-xs font-bold text-red-400">
                                        ANTHROPIC_API_KEY not set. Add it to your Vercel environment variables to enable The Coach.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 overscroll-contain"
                        >
                            {messages.map((msg, i) => (
                                <Bubble
                                    key={i}
                                    msg={msg}
                                    accent={accent}
                                    streaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
                                />
                            ))}
                        </div>

                        {/* Quick prompts (only before user sends anything) */}
                        {messages.length <= 1 && (
                            <div className="px-5 pb-2 shrink-0">
                                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                    {QUICK_PROMPTS.map(p => (
                                        <button
                                            key={p}
                                            onClick={() => { hapticLight(); sendMessage(p); }}
                                            className="shrink-0 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap"
                                            style={{
                                                background:  "rgba(255,255,255,0.05)",
                                                border:      "1px solid rgba(255,255,255,0.09)",
                                                touchAction: "manipulation",
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Input bar */}
                        <div
                            className="px-4 pb-[max(env(safe-area-inset-bottom,0px),16px)] pt-3 shrink-0"
                            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                        >
                            <div
                                className="flex items-center gap-3 px-4 rounded-2xl"
                                style={{
                                    background: "rgba(255,255,255,0.05)",
                                    border:     "1px solid rgba(255,255,255,0.09)",
                                    minHeight:  "52px",
                                }}
                            >
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                    placeholder="Ask The Coach…"
                                    disabled={streaming}
                                    className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:opacity-25 disabled:opacity-50"
                                    style={{ caretColor: accent }}
                                />
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || streaming}
                                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 transition-all"
                                    style={{
                                        background:  input.trim() && !streaming
                                            ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
                                            : "rgba(255,255,255,0.08)",
                                        touchAction: "manipulation",
                                    }}
                                >
                                    {streaming
                                        ? <Loader2 size={15} className="animate-spin opacity-60" />
                                        : <Send size={14} style={{ color: input.trim() ? "#000" : "#fff" }} />
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
