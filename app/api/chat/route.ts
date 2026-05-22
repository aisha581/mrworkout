/**
 * /api/chat — Gym AI chat endpoint
 *
 * Guards:
 *   - Requires authenticated session (email)
 *   - Free users: 3 messages / 24-hour window (midnight reset)
 *   - Pro users:  unlimited
 *
 * Cost controls:
 *   - Model:      gpt-4o-mini (OpenAI) / claude-haiku (Anthropic fallback)
 *   - max_tokens: 400
 *   - Context:    last 4 messages only
 *
 * Logging:
 *   - Every call writes to api_usage (email, model, tokens, created_at)
 *
 * Supabase tables required:
 *   -- Run once in the Supabase SQL editor:
 *
 *   ALTER TABLE mw_users
 *     ADD COLUMN IF NOT EXISTS daily_chat_count int DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS daily_chat_reset  timestamptz;
 *
 *   CREATE TABLE IF NOT EXISTS api_usage (
 *     id                bigserial PRIMARY KEY,
 *     email             text,
 *     model             text,
 *     prompt_tokens     int,
 *     completion_tokens int,
 *     total_tokens      int,
 *     created_at        timestamptz DEFAULT now()
 *   );
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession }          from "next-auth";
import { authOptions }               from "@/lib/auth";
import { createClient }              from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Constants ─────────────────────────────────────────────────────────────────
const FREE_MSG_LIMIT   = 3;
const MAX_TOKENS       = 400;
const CONTEXT_MESSAGES = 4;   // last N messages sent to the model
const MODEL_OPENAI     = "gpt-4o-mini";
const MODEL_ANTHROPIC  = "claude-haiku-4-5-20251001";

// ── Label maps ────────────────────────────────────────────────────────────────
const GOAL_LABELS:  Record<string, string> = {
    MASS:  "build mass and size",
    SHRED: "get shredded and cut",
    POWER: "build raw strength and power",
};
const FOCUS_LABELS: Record<string, string> = {
    UPPER: "upper body (chest, back, shoulders, arms)",
    LOWER: "lower body (legs, glutes, core)",
    FULL:  "full body balanced training",
};
const LEVEL_LABELS: Record<string, string> = {
    BEGINNER:     "beginner (under 1 year)",
    INTERMEDIATE: "intermediate (1–3 years)",
    ADVANCED:     "advanced (3+ years)",
};

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(p: {
    name?:  string | null;
    goal?:  string | null;
    focus?: string | null;
    level?: string | null;
}): string {
    const name  = p.name?.split(" ")[0] ?? null;
    const goal  = p.goal  ? (GOAL_LABELS[p.goal]   ?? p.goal)  : null;
    const focus = p.focus ? (FOCUS_LABELS[p.focus]  ?? p.focus) : null;
    const level = p.level ? (LEVEL_LABELS[p.level]  ?? p.level) : null;

    const profile = [
        name  && `User's name: ${name}.`,
        goal  && `Goal: ${goal}.`,
        focus && `Training focus: ${focus}.`,
        level && `Experience: ${level}.`,
    ].filter(Boolean).join(" ");

    return `You are Gym, a world-class savage personal trainer. You are intense, concise, and technical. You know the 89 Antigravity maneuvers by heart. Address the user by their name and focus on their specific goal.

${profile ? `USER PROFILE:\n${profile}\n` : ""}RULES:
- Max 90 words unless user asks for a full breakdown
- Line breaks for mobile readability — never walls of text
- Direct. No filler. Maximum signal.
- Lead technique answers with the single cue that matters most
- Use the user's name occasionally — not every reply`;
}

// ── Logging helper (fire-and-forget) ─────────────────────────────────────────
function logUsage(
    email:             string,
    model:             string,
    promptTokens:      number,
    completionTokens:  number
) {
    void Promise.resolve(
        supabase.from("api_usage").insert({
            email,
            model,
            prompt_tokens:     promptTokens,
            completion_tokens: completionTokens,
            total_tokens:      promptTokens + completionTokens,
        })
    ).catch(() => {});
}

// ── OpenAI stream ─────────────────────────────────────────────────────────────
async function streamOpenAI(
    systemPrompt: string,
    messages:     { role: string; content: string }[],
    email:        string
): Promise<ReadableStream> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const stream = (await client.chat.completions.create({
        model:          MODEL_OPENAI,
        stream:         true,
        max_tokens:     MAX_TOKENS,
        stream_options: { include_usage: true },
        messages: [
            { role: "system", content: systemPrompt },
            ...(messages as any),
        ],
    } as any)) as unknown as AsyncIterable<any>;

    const encoder = new TextEncoder();
    return new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content ?? "";
                    if (text) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                    }
                    // Final chunk carries usage when stream_options.include_usage = true
                    if ((chunk as any).usage) {
                        const u = (chunk as any).usage;
                        logUsage(email, MODEL_OPENAI, u.prompt_tokens ?? 0, u.completion_tokens ?? 0);
                    }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (err: any) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
            } finally {
                controller.close();
            }
        },
    });
}

// ── Anthropic stream ──────────────────────────────────────────────────────────
async function streamAnthropic(
    systemPrompt: string,
    messages:     { role: string; content: string }[],
    email:        string
): Promise<ReadableStream> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const stream = client.messages.stream({
        model:      MODEL_ANTHROPIC,
        max_tokens: MAX_TOKENS,
        system:     systemPrompt,
        messages:   messages as any,
    });

    const encoder = new TextEncoder();
    return new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of stream) {
                    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
                    }
                    if (chunk.type === "message_delta" && (chunk as any).usage) {
                        const u = (chunk as any).usage;
                        logUsage(email, MODEL_ANTHROPIC, 0, u.output_tokens ?? 0);
                    }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (err: any) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
            } finally {
                controller.close();
            }
        },
    });
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    // ── 1. API key check ──────────────────────────────────────────────────────
    const hasOpenAI    = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
    if (!hasOpenAI && !hasAnthropic) {
        return NextResponse.json(
            { error: "no_key", message: "No AI API key configured." },
            { status: 503 }
        );
    }

    // ── 2. Auth check ─────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    const email   = (session?.user as any)?.email as string | undefined;
    if (!email) {
        return NextResponse.json(
            { error: "unauthenticated", message: "Log in to chat with Gym." },
            { status: 401 }
        );
    }

    // ── 3. Pro + usage check ──────────────────────────────────────────────────
    const [userRes, subRes] = await Promise.all([
        supabase
            .from("mw_users")
            .select("name, onboarding_goal, onboarding_focus, onboarding_level, daily_chat_count, daily_chat_reset")
            .eq("email", email)
            .maybeSingle(),
        supabase
            .from("mw_subscribers")
            .select("is_pro")
            .eq("email", email)
            .maybeSingle(),
    ]);

    const userRow = userRes.data;
    const isPro   = subRes.data?.is_pro ?? false;

    if (!isPro) {
        // Determine midnight (UTC) of the current day as the reset boundary
        const now          = new Date();
        const midnight     = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const lastReset    = userRow?.daily_chat_reset ? new Date(userRow.daily_chat_reset) : null;
        const needsReset   = !lastReset || lastReset < midnight;
        const currentCount = needsReset ? 0 : (userRow?.daily_chat_count ?? 0);

        if (currentCount >= FREE_MSG_LIMIT) {
            return NextResponse.json(
                {
                    error:   "rate_limit",
                    message: `You've used all ${FREE_MSG_LIMIT} free messages today. Upgrade to Savage Pro for unlimited access to Gym.`,
                },
                { status: 429 }
            );
        }

        // Increment counter (non-blocking)
        Promise.resolve(
            supabase
                .from("mw_users")
                .update({
                    daily_chat_count: currentCount + 1,
                    ...(needsReset ? { daily_chat_reset: now.toISOString() } : {}),
                })
                .eq("email", email)
        ).catch(() => {});
    }

    // ── 4. Parse + trim messages ──────────────────────────────────────────────
    const { messages: rawMessages } = await req.json() as {
        messages: { role: "user" | "assistant"; content: string }[];
    };

    // Only send the last CONTEXT_MESSAGES turns to the model
    const messages = rawMessages.slice(-CONTEXT_MESSAGES);

    // ── 5. Build profile (Supabase wins over client header) ───────────────────
    let profile: { name?: string | null; goal?: string | null; focus?: string | null; level?: string | null } =
        userRow
            ? { name: userRow.name, goal: userRow.onboarding_goal, focus: userRow.onboarding_focus, level: userRow.onboarding_level }
            : {};

    const lsProfile = req.headers.get("x-user-profile");
    if (lsProfile && !profile.goal) {
        try {
            const parsed = JSON.parse(decodeURIComponent(lsProfile));
            profile = { ...parsed, ...profile };
        } catch {}
    }

    const systemPrompt = buildSystemPrompt(profile);

    // ── 6. Stream ─────────────────────────────────────────────────────────────
    try {
        const readable = hasOpenAI
            ? await streamOpenAI(systemPrompt, messages, email)
            : await streamAnthropic(systemPrompt, messages, email);

        return new Response(readable, {
            headers: {
                "Content-Type":  "text/event-stream",
                "Cache-Control": "no-cache",
                Connection:      "keep-alive",
            },
        });
    } catch (err: any) {
        console.error("[/api/chat]", err.message);
        return NextResponse.json({ error: "server_error", message: err.message }, { status: 500 });
    }
}
