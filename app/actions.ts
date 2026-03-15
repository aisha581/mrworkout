"use server";

import { kv } from "@vercel/kv";

/**
 * Gets the total number of enrolled athletes in the waitlist.
 * Used as a fallback for the founder number.
 */
export async function getFounderCount() {
    try {
        const count = await kv.llen("waitlist_athletes");
        return count || 1;
    } catch (error) {
        console.error("[KV_LLEN_FAIL]", error);
        return 1;
    }
}
