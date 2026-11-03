import { defineUnlistedScript } from '#imports';
import { extractPage } from '@/lib/capture/extract';

// Injected on demand into the tab being saved; its return value goes back to the background.
export default defineUnlistedScript(() => extractPage(document, location.href, window.getSelection()?.toString() ?? ''));
