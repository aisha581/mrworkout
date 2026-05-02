import { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Derive the base URL from the incoming request so that both
// mrworkout.pro and mrworkout.vercel.app work without 401 errors.
// Each serverless invocation is isolated, so this is race-free.
function handler(req: NextRequest) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host  = req.headers.get("host") ?? "mrworkout.pro";
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
    return NextAuth(authOptions);
}

export async function GET(req: NextRequest, ctx: any) {
    return handler(req)(req, ctx);
}
export async function POST(req: NextRequest, ctx: any) {
    return handler(req)(req, ctx);
}
