// ─────────────────────────────────────────────────────────────────────────────
//  savageNotifications.ts — three push notification templates
// ─────────────────────────────────────────────────────────────────────────────

const ICON = '/icons/icon-192.png';

async function requestAndFire(body: string, title = 'Mr. Workout'): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const fire = () => new Notification(title, { body, icon: ICON });

    if (Notification.permission === 'granted') {
        fire();
    } else if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') fire();
    }
    // 'denied' — silently skip
}

/** CNS is fully recovered — call to arms. */
export function notifyCNSReady(): void {
    requestAndFire('CNS is at 100%. No excuses. The Armoury is waiting. ⚡️');
}

/** Streak is about to expire (call when 36–47 h since last set). */
export function notifyStreakWarning(): void {
    requestAndFire('Your streak is about to expire. Get in one set — keep the fire alive. 🔥');
}

/** New personal record — fired immediately after detection. */
export function notifyPR(exerciseName: string): void {
    requestAndFire(`You just hit a new PR in ${exerciseName}. That's history. 🏆`, 'NEW PERSONAL RECORD');
}
