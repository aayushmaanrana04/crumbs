// Runs inside the page (injected on demand) and in tests against jsdom.
// Pulls the readable article out of a document and converts it to Markdown.
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import type { DocumentType } from '../db/schema';
import { cleanMarkdown } from './clean';

export interface ExtractedPage {
  url: string;
  /** From <link rel=canonical> or og:url, if the page declares one. */
  declaredCanonicalUrl?: string;
  title: string;
  author?: string;
  siteName?: string;
  publishedAt?: number;
  excerpt: string;
  markdown: string;
  type: DocumentType;
  /** Text the user had selected when saving, if any. */
  selection: string;
}

const MAX_MARKDOWN_CHARS = 500_000;

function meta(doc: Document, ...selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const value = doc.querySelector<HTMLMetaElement>(selector)?.content?.trim();
    if (value) return value;
  }
  return undefined;
}

function parseDate(value: string | undefined | null): number | undefined {
  if (!value) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : time;
}

function jsonLdDate(doc: Document): string | undefined {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data: unknown = JSON.parse(script.textContent ?? '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const date = (item as { datePublished?: unknown })?.datePublished;
        if (typeof date === 'string') return date;
      }
    } catch {
      // Malformed JSON-LD is common; ignore it.
    }
  }
  return undefined;
}

export function detectType(url: string): DocumentType {
  const { hostname, pathname } = new URL(url);
  const host = hostname.replace(/^www\./, '');
  if (host === 'github.com' && /^\/[^/]+\/[^/]+\/?$/.test(pathname)) return 'repo';
  if ((host === 'youtube.com' && pathname === '/watch') || host === 'youtu.be') return 'video';
  if (host.startsWith('docs.') || host.startsWith('developer.') || /\/(docs|reference|api|guide)s?(\/|$)/.test(pathname)) {
    return 'docs';
  }
  return 'article';
}

// Site chrome that Readability sometimes keeps (e.g. WordPress mega-menus inside <main>).
const CHROME_SELECTORS = [
  'nav',
  'aside',
  'footer',
  '[role="navigation"]',
  '[role="menu"]',
  '[role="menubar"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="search"]',
  '[aria-label*="menu" i]',
  '[class*="mega-menu"]',
  '[class*="breadcrumb"]',
  '[class*="cookie"]',
  '[class*="share-"]',
  '[class*="social-"]',
].join(',');

function removeSiteChrome(doc: Document): void {
  for (const el of doc.querySelectorAll(CHROME_SELECTORS)) {
    // Keep anything that contains the article itself.
    if (!el.querySelector('article, h1, [itemprop="articleBody"]')) el.remove();
  }
}

function createTurndown(): TurndownService {
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
  turndown.remove(['script', 'style', 'noscript', 'iframe', 'form', 'button']);
  return turndown;
}

export function extractPage(doc: Document, url: string, selection = ''): ExtractedPage {
  const clone = doc.cloneNode(true) as Document;
  removeSiteChrome(clone);
  const article = new Readability(clone, { charThreshold: 300 }).parse();
  const turndown = createTurndown();

  const declaredCanonicalUrl =
    doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href || meta(doc, 'meta[property="og:url"]');

  const title =
    article?.title?.trim() || meta(doc, 'meta[property="og:title"]') || doc.title.trim() || new URL(url).hostname;

  const markdown = article?.content
    ? cleanMarkdown(turndown.turndown(article.content), title)
    : (doc.body?.innerText ?? doc.body?.textContent ?? '').trim();

  return {
    url,
    declaredCanonicalUrl: declaredCanonicalUrl || undefined,
    title,
    author: article?.byline?.trim() || meta(doc, 'meta[name="author"]'),
    siteName: article?.siteName?.trim() || meta(doc, 'meta[property="og:site_name"]'),
    publishedAt: parseDate(
      article?.publishedTime ?? meta(doc, 'meta[property="article:published_time"]') ?? jsonLdDate(doc),
    ),
    excerpt: (article?.excerpt ?? meta(doc, 'meta[name="description"]', 'meta[property="og:description"]') ?? '')
      .trim()
      .slice(0, 500),
    markdown: markdown.slice(0, MAX_MARKDOWN_CHARS),
    type: detectType(url),
    selection: selection.trim(),
  };
}
