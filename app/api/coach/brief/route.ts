import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

const GOAL_LABELS: Record<string, string> = {
    MASS:  "build mass",
    SHRED: "get shredded",
    POWER: "get stronger",
};

export async function GET(req: NextRequest) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 503 });
    }

    const session = await getServerSession(authOptions);
    const email   = (session?.user as any)?.email;

    let name  = "Savage";
    let goal  = "get stronger";

    if (email) {
        try {
            const { data } = await supabase
                .from("mw_users")
                .select("name, onboarding_goal")
                .eq("email", email)
                .maybeSingle();
            if (data?.name)            name = data.name.split(" ")[0];
            if (data?.onboarding_goal) goal = GOAL_LABELS[data.onboarding_goal] ?? goal;
        } catch {}
    }

    // Generate the briefing text with Claude
    const message = await anthropic.messages.create({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [
            {
                role:    "user",
                content: `Write a 2-sentence daily training briefing spoken directly to ${name}. Their goal is to ${goal}. Start with "Savage," or their name. Keep it intense, motivating, under 40 words. No hashtags. Speak like an elite coach.`,
            },
        ],
    });

    const text = (message.content[0] as any).text as string;

    // Convert to speech via ElevenLabs
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    const elKey   = process.env.ELEVENLABS_API_KEY;

    if (!voiceId || !elKey) {
        // No TTS configured — return the text only
        return NextResponse.json({ text });
    }

    try {
        const ttsRes = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method:  "POST",
                headers: {
                    "xi-api-key":   elKey,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_turbo_v2_5",
                    voice_settings: {
                        stability:        0.38,
                        similarity_boost: 0.82,
                        style:            0.25,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!ttsRes.ok) {
            return NextResponse.json({ text });
        }

        const audioBuffer = await ttsRes.arrayBuffer();
        return new Response(audioBuffer, {
            headers: {
                "Content-Type":  "audio/mpeg",
                "x-brief-text":  encodeURIComponent(text),
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json({ text });
    }
}
