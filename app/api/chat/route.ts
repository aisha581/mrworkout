import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Label maps ────────────────────────────────────────────────────────────────
const GOAL_LABELS: Record<string, string> = {
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

function buildSystemPrompt(profile: {
    name?:  string | null;
    goal?:  string | null;
    focus?: string | null;
    level?: string | null;
}): string {
    const name  = profile.name?.split(" ")[0] ?? null;
    const goal  = profile.goal  ? GOAL_LABELS[profile.goal]  ?? profile.goal  : null;
    const focus = profile.focus ? FOCUS_LABELS[profile.focus] ?? profile.focus : null;
    const level = profile.level ? LEVEL_LABELS[profile.level] ?? profile.level : null;

    const profileLine = [
        name  && `User's name: ${name}.`,
        goal  && `Goal: ${goal}.`,
        focus && `Training focus: ${focus}.`,
        level && `Experience: ${level}.`,
    ].filter(Boolean).join(" ");

    return `You are Gym, a world-class savage personal trainer. You are intense, concise, and technical. You know the 89 Antigravity maneuvers by heart. Address the user by their name and focus on their specific goal.

${profileLine ? `USER PROFILE:\n${profileLine}\n` : ""}
RULES:
- Keep answers under 90 words unless the user asks for a deep breakdown
- Use line breaks for mobile readability — never write walls of text
- Be direct. No filler. Cut the fluff.
- Reference the user's specific goal and focus area in every answer when relevant
- For exercise technique questions: lead with the cue that matters most
- Call the user by name occasionally — not every message`;
}

async function streamOpenAI(
    systemPrompt: string,
    messages: { role: string; content: string }[]
): Promise<ReadableStream> {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const stream = await client.chat.completions.create({
        model:    "gpt-4o-mini",
        stream:   true,
        max_tokens: 300,
        messages: [
            { role: "system", content: systemPrompt },
            ...(messages as any),
        ],
    });

    const encoder = new TextEncoder();
    return new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content ?? "";
                    if (text) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
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

async function streamAnthropic(
    systemPrompt: string,
    messages: { role: string; content: string }[]
): Promise<ReadableStream> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const stream = client.messages.stream({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 300,
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

export async function POST(req: NextRequest) {
    const hasOpenAI    = !!process.env.OPENAI_API_KEY;
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

    if (!hasOpenAI && !hasAnthropic) {
        return NextResponse.json(
            { error: "No AI API key configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to your environment." },
            { status: 503 }
        );
    }

    const session = await getServerSession(authOptions);
    const { messages } = await req.json() as {
        messages: { role: "user" | "assistant"; content: string }[];
    };

    // Fetch personalized profile from Supabase
    let profile: { name?: string | null; goal?: string | null; focus?: string | null; level?: string | null } = {};
    const email = (session?.user as any)?.email;
    if (email) {
        try {
            const { data } = await supabase
                .from("mw_users")
                .select("name, onboarding_goal, onboarding_focus, onboarding_level")
                .eq("email", email)
                .maybeSingle();
            if (data) {
                profile = { name: data.name, goal: data.onboarding_goal, focus: data.onboarding_focus, level: data.onboarding_level };
            }
        } catch {}
    }

    // Also check localStorage profile via a header (sent by client)
    const lsProfile = req.headers.get("x-user-profile");
    if (lsProfile && !profile.goal) {
        try {
            const parsed = JSON.parse(decodeURIComponent(lsProfile));
            profile = { ...parsed, ...profile }; // Supabase wins
        } catch {}
    }

    const systemPrompt = buildSystemPrompt(profile);

    try {
        const readable = hasOpenAI
            ? await streamOpenAI(systemPrompt, messages)
            : await streamAnthropic(systemPrompt, messages);

        return new Response(readable, {
            headers: {
                "Content-Type":  "text/event-stream",
                "Cache-Control": "no-cache",
                Connection:      "keep-alive",
            },
        });
    } catch (err: any) {
        console.error("[/api/chat]", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
