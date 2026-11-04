// Background only: extract a tab's content by injecting the extract script, then save it.
import { browser } from '#imports';
import { captureSettings, isAutoCaptureSite, isBlocked, isSensitiveUrl, sitePatterns } from '../settings/capture';
import type { ExtractedPage } from './extract';
import { CaptureError, saveExtractedPage, type SaveOutcome } from './save';
export { describeOutcome } from './describe';
import { isCapturableUrl } from './url';

export async function captureTab(tabId: number, source: 'manual' | 'auto', selection?: string): Promise<SaveOutcome> {
  const tab = await browser.tabs.get(tabId);
  if (tab.incognito) throw new CaptureError('Pages from incognito windows are never saved.');
  if (!tab.url || !isCapturableUrl(tab.url)) throw new CaptureError("This page can't be saved.");
  const settings = await captureSettings.getValue();
  if (isBlocked(tab.url, settings)) throw new CaptureError('This site is blocked in your capture settings.');
  if (source === 'auto' && (isSensitiveUrl(tab.url) || !isAutoCaptureSite(tab.url, settings))) {
    throw new CaptureError('Auto-capture is not enabled for this page.');
  }

  let page: ExtractedPage | undefined;
  try {
    const [injection] = await browser.scripting.executeScript({ target: { tabId }, files: ['/extract.js'] });
    page = injection?.result as ExtractedPage | undefined;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CaptureError(
      /PDF|extension gallery|chrome:\/\/|Cannot access/i.test(message)
        ? "Chrome doesn't allow saving this kind of page yet (PDFs and browser pages)."
        : `Couldn't read this page: ${message}`,
    );
  }
  if (!page) throw new CaptureError("Couldn't read this page.");
  if (selection) page.selection = selection.trim();
  return saveExtractedPage(page, source);
}

/** Brief confirmation inside the page. Self-contained because it's serialised into the tab. */
function renderToast(text: string, isError: boolean) {
  const id = 'summaryse-toast-host';
  document.getElementById(id)?.remove();
  const host = document.createElement('div');
  host.id = id;
  const root = host.attachShadow({ mode: 'closed' });
  const toast = document.createElement('div');
  toast.textContent = text;
  toast.setAttribute('role', 'status');
  // Matches the Toast component (design/summaryse.pen): ink background, 12px radius.
  toast.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:2147483647', 'padding:10px 14px',
    'border-radius:12px', 'font:500 13px/1.4 system-ui,-apple-system,sans-serif',
    `color:${isError ? '#F8A89C' : '#FFFFFF'}`, 'background:#1A1A19',
    'box-shadow:0 6px 20px rgba(0,0,0,.18)', 'transition:opacity .15s, transform .15s',
    'opacity:0', 'transform:translateY(4px)',
  ].join(';');
  root.appendChild(toast);
  document.documentElement.appendChild(host);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'none';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => host.remove(), 250);
  }, 2600);
}

export async function showToast(tabId: number, text: string, isError = false): Promise<void> {
  await browser.scripting
    .executeScript({ target: { tabId }, func: renderToast, args: [text, isError] })
    .catch(() => undefined); // Restricted pages can't show it; the action badge still updates.
}

const AUTO_SCRIPT_ID = 'summaryse-autocapture';

/** Register the auto-capture script for every opted-in site we still have access to. */
export async function syncAutoCaptureScripts(): Promise<void> {
  const { autoCaptureSites } = await captureSettings.getValue();
  const matches: string[] = [];
  for (const site of autoCaptureSites) {
    const patterns = sitePatterns(site);
    if (await browser.permissions.contains({ origins: patterns })) matches.push(...patterns);
  }
  const existing = await browser.scripting.getRegisteredContentScripts({ ids: [AUTO_SCRIPT_ID] });
  if (existing.length > 0) await browser.scripting.unregisterContentScripts({ ids: [AUTO_SCRIPT_ID] });
  if (matches.length > 0) {
    await browser.scripting.registerContentScripts([
      { id: AUTO_SCRIPT_ID, js: ['content-scripts/autocapture.js'], matches, runAt: 'document_idle', persistAcrossSessions: true },
    ]);
  }
}
