import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const body    = await req.json();

    const { goal, focusArea, level, weeklySchedule } = body;

    // Update by email — works whether user is logged in or not
    // (session may not exist for guest users who only have localStorage)
    const email = (session?.user as any)?.email ?? body.email;

    if (!email) {
        // No session and no email provided — just acknowledge (localStorage already saved)
        return NextResponse.json({ ok: true, note: "no email — localStorage only" });
    }

    try {
        await supabase
            .from("mw_users")
            .upsert(
                {
                    email,
                    onboarding_goal:     goal,
                    onboarding_focus:    focusArea,
                    onboarding_level:    level,
                    weekly_schedule:     weeklySchedule,
                    onboarded:           true,
                },
                { onConflict: "email" }
            );

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("[profile/save]", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
