import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

// Goal + focus human-readable labels
const GOAL_LABELS: Record<string, string>  = {
    MASS:  "Build Mass (hypertrophy & size)",
    SHRED: "Get Shredded (fat loss & conditioning)",
    POWER: "Get Strong (strength & explosiveness)",
};
const FOCUS_LABELS: Record<string, string> = {
    UPPER: "Upper Body — chest, back, shoulders, arms",
    LOWER: "Lower Body — legs, glutes, core",
    FULL:  "Full Body — balanced training",
};
const LEVEL_LABELS: Record<string, string> = {
    BEGINNER:     "Beginner (under 1 year)",
    INTERMEDIATE: "Intermediate (1–3 years)",
    ADVANCED:     "Advanced (3+ years)",
};

function buildSystemPrompt(profile: {
    goal?:  string | null;
    focus?: string | null;
    level?: string | null;
    name?:  string | null;
}): string {
    const name  = profile.name  ? `The user's name is ${profile.name}.` : "";
    const goal  = profile.goal  ? `Training goal: ${GOAL_LABELS[profile.goal]  ?? profile.goal}.`  : "";
    const focus = profile.focus ? `Focus area: ${FOCUS_LABELS[profile.focus]   ?? profile.focus}.` : "";
    const level = profile.level ? `Experience level: ${LEVEL_LABELS[profile.level] ?? profile.level}.` : "";

    return `You are THE COACH — the AI training advisor inside Mr. Workout.

PERSONALITY:
- Intense, direct, and relentlessly motivating
- Expert in the 89 Antigravity calisthenic maneuvers (advanced bodyweight movements)
- You combine elite sports science with real-world grit
- You call the user "Savage" when appropriate
- You cut through excuses. No fluff. Maximum signal.
- Short answers by default (under 100 words). Go deeper only if asked.
- Use line breaks to keep things readable on mobile

EXPERTISE:
- Calisthenics: muscle-ups, planche progressions, front levers, handstands, rings, plyometrics
- Strength programming: periodization, progressive overload, deload weeks
- Body composition: fat loss protocols, hypertrophy principles, nutrition timing
- Recovery: sleep, HRV, active rest, mobility work

USER PROFILE:
${[name, goal, focus, level].filter(Boolean).join(" ")}

Keep every response sharp and actionable. If the user is struggling, push harder. If they're winning, celebrate and raise the bar.`;
}

export async function POST(req: NextRequest) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json(
            { error: "ANTHROPIC_API_KEY not configured. Add it to your environment variables." },
            { status: 503 }
        );
    }

    const session = await getServerSession(authOptions);
    const { messages } = await req.json() as {
        messages: { role: "user" | "assistant"; content: string }[];
    };

    // Fetch user profile from Supabase for context
    let profile: { goal?: string | null; focus?: string | null; level?: string | null; name?: string | null } = {};
    const email = (session?.user as any)?.email;
    if (email) {
        try {
            const { data } = await supabase
                .from("mw_users")
                .select("onboarding_goal, onboarding_focus, onboarding_level, name")
                .eq("email", email)
                .maybeSingle();
            if (data) {
                profile = {
                    goal:  data.onboarding_goal,
                    focus: data.onboarding_focus,
                    level: data.onboarding_level,
                    name:  data.name,
                };
            }
        } catch {}
    }

    const systemPrompt = buildSystemPrompt(profile);

    try {
        const stream = anthropic.messages.stream({
            model:      "claude-opus-4-5",
            max_tokens: 512,
            system:     systemPrompt,
            messages,
        });

        // Stream SSE back to the client
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of stream) {
                        if (
                            chunk.type === "content_block_delta" &&
                            chunk.delta.type === "text_delta"
                        ) {
                            const text = chunk.delta.text;
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                            );
                        }
                    }
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (err: any) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
                    );
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type":  "text/event-stream",
                "Cache-Control": "no-cache",
                Connection:      "keep-alive",
            },
        });
    } catch (err: any) {
        console.error("[coach/chat]", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
