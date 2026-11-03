import { defineContentScript } from '#imports';
import { rpc } from '@/lib/rpc/client';

// Registered at runtime, only on sites the user opted into. Saves the page once
// it has actually been read: visible for a while and scrolled through.
const MIN_VISIBLE_MS = 45_000;
const MIN_SCROLL_RATIO = 0.3;

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  main() {
    if (window.top !== window) return;
    let visibleMs = 0;
    let lastTick = Date.now();
    let maxScroll = 0;
    let sent = false;

    const scrollRatio = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      return scrollable <= 0 ? 1 : window.scrollY / scrollable;
    };

    const check = () => {
      const now = Date.now();
      if (document.visibilityState === 'visible') visibleMs += now - lastTick;
      lastTick = now;
      maxScroll = Math.max(maxScroll, scrollRatio());
      if (!sent && visibleMs >= MIN_VISIBLE_MS && maxScroll >= MIN_SCROLL_RATIO) {
        sent = true;
        clearInterval(timer);
        rpc('capture.auto').catch(() => undefined);
      }
    };

    const timer = setInterval(check, 5_000);
    window.addEventListener('scroll', () => (maxScroll = Math.max(maxScroll, scrollRatio())), { passive: true });
  },
});
