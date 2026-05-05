/**
 * Dispatches 'mw:open-upgrade' — the Navbar listens and opens UpgradeModal.
 * Call this from any Pro lock in the app instead of router.push('/join').
 */
export function openUpgradeModal() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mw:open-upgrade'));
    }
}
