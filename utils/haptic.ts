/**
 * haptic — wraps navigator.vibrate for hardware feedback on primary actions.
 * Silently no-ops on devices that don't support the Vibration API (iOS Safari).
 */
export function haptic(pattern: number | number[] = 50) {
    try { navigator.vibrate?.(pattern); } catch {}
}

/** Light tap — selection / toggle */
export const hapticLight  = () => haptic(30);
/** Medium tap — primary CTA */
export const hapticMedium = () => haptic(50);
/** Heavy pulse — completion / unlock */
export const hapticHeavy  = () => haptic([40, 30, 80]);
