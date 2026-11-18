/** Registers the service worker so the app can be installed and shows an offline page. Production only: in dev it would cache Vite's files. */
export function registerServiceWorker() {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
            // Not fatal: the app works without it, just not installable/offline.
        });
    });
}
