// Background only: extract a tab's content by injecting the extract script, then save it.
import { browser } from '#imports';
import { captureSettings, isAutoCaptureSite, isBlocked, isSensitiveUrl, sitePatterns } from '../settings/capture';
import type { ExtractedPage } from './extract';
import { CaptureError, chooseCanonical, saveExtractedPage, type SaveOutcome } from './save';
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

// The extension API as it's named inside the page, where renderToast runs.
declare const chrome: typeof browser;

/**
 * Brief confirmation inside the page, with an optional button that opens the side panel.
 * Self-contained because it's serialised into the tab.
 */
function renderToast(text: string, isError: boolean, action: string | null) {
  const id = 'crumbs-toast-host';
  document.getElementById(id)?.remove();
  const host = document.createElement('div');
  host.id = id;
  const root = host.attachShadow({ mode: 'closed' });
  const toast = document.createElement('div');
  toast.setAttribute('role', 'status');
  toast.append(text);
  // Matches the Toast component (design/summaryse.pen): ink background, 12px radius.
  toast.style.cssText = [
    'position:fixed', 'bottom:24px', 'right:24px', 'z-index:2147483647', 'display:flex', 'align-items:center',
    'gap:12px', `padding:${action ? '6px 6px 6px 14px' : '10px 14px'}`,
    'border-radius:12px', 'font:500 13px/1.4 system-ui,-apple-system,sans-serif',
    `color:${isError ? '#F8A89C' : '#FFFFFF'}`, 'background:#1A1A19',
    'box-shadow:0 6px 20px rgba(0,0,0,.18)', 'transition:opacity .15s, transform .15s',
    'opacity:0', 'transform:translateY(4px)',
  ].join(';');
  const hide = () => {
    toast.style.opacity = '0';
    setTimeout(() => host.remove(), 250);
  };
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action;
    button.style.cssText = [
      'all:unset', 'cursor:pointer', 'padding:5px 10px', 'border-radius:8px',
      'font:600 13px/1.4 system-ui,-apple-system,sans-serif', 'color:#1A1A19', 'background:#FFFFFF',
    ].join(';');
    // The click is the user gesture Chrome needs to open the side panel.
    button.onclick = () => {
      void chrome.runtime.sendMessage({ rpc: 'panel.open', args: {} });
      hide();
    };
    toast.appendChild(button);
  }
  root.appendChild(toast);
  document.documentElement.appendChild(host);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'none';
  });
  // Longer when there's a button to reach, and held while the pointer is on it.
  let timer = setTimeout(hide, action ? 6000 : 2600);
  toast.onmouseenter = () => clearTimeout(timer);
  toast.onmouseleave = () => (timer = setTimeout(hide, 2000));
}

export async function showToast(tabId: number, text: string, options: { error?: boolean; action?: string } = {}): Promise<void> {
  await browser.scripting
    .executeScript({ target: { tabId }, func: renderToast, args: [text, !!options.error, options.action ?? null] })
    .catch(() => undefined); // Restricted pages can't show it; the action badge still updates.
}

export interface PagePreview {
  url: string;
  title: string;
  /** The address the page is saved under, so the panel can find it in the library. */
  canonicalUrl: string;
  siteName?: string;
  excerpt: string;
  /** Opening text, for matching and as context for quick ask. */
  lead: string;
}

const LEAD_CHARS = 6000;

/** Read a tab without saving it, for the side panel. Null when the page can't or mustn't be read. */
export async function previewTab(tabId: number): Promise<PagePreview | null> {
  const tab = await browser.tabs.get(tabId);
  if (tab.incognito || !tab.url || !isCapturableUrl(tab.url)) return null;
  if (isBlocked(tab.url, await captureSettings.getValue())) return null;
  try {
    const [injection] = await browser.scripting.executeScript({ target: { tabId }, files: ['/extract.js'] });
    const page = injection?.result as ExtractedPage | undefined;
    if (!page) return null;
    return { url: page.url, title: page.title, canonicalUrl: chooseCanonical(page), siteName: page.siteName, excerpt: page.excerpt, lead: page.markdown.slice(0, LEAD_CHARS) };
  } catch {
    return null; // No access to this tab (opened without a click, or a restricted page).
  }
}

// Pre-rename id, kept so an update replaces the script already registered.
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
