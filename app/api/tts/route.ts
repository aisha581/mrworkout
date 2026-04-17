import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const { text } = await req.json() as { text: string };

    if (!text?.trim()) {
        return NextResponse.json({ error: "text required" }, { status: 400 });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    const apiKey  = process.env.ELEVENLABS_API_KEY;

    if (!voiceId || !apiKey) {
        return NextResponse.json({ error: "ElevenLabs not configured" }, { status: 503 });
    }

    try {
        const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method:  "POST",
                headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
                body: JSON.stringify({
                    text,
                    model_id: "eleven_turbo_v2_5",
                    voice_settings: {
                        stability:         0.35,
                        similarity_boost:  0.85,
                        style:             0.30,
                        use_speaker_boost: true,
                    },
                }),
            }
        );

        if (!res.ok) {
            const msg = await res.text();
            return NextResponse.json({ error: msg }, { status: res.status });
        }

        const buffer = await res.arrayBuffer();
        return new Response(buffer, {
            headers: {
                "Content-Type":  "audio/mpeg",
                "Cache-Control": "no-store",
            },
        });
    } catch (err: any) {
        console.error("[/api/tts]", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
