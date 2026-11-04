// What the side panel knows about the page you're on: whether it's saved, which saved
// pages relate to it and why, and your notes on those. Runs locally; no AI calls.
import { canonicalizeUrl, hostnameOf } from '../capture/url';
import { db, type KnowledgeDocument } from '../db/schema';
import { groupByDocument, searchPassages } from '../search/search';
import { findRelated, type RelatedDocument } from './related';

export interface PageInfo {
  url: string;
  title: string;
  /** Opening text of the page, when the panel was allowed to read it. */
  lead?: string;
}

export interface PageContext {
  saved?: KnowledgeDocument;
  related: RelatedDocument[];
  /** Your notes on the related pages (the saved page's own notes are shown with it). */
  notes: { doc: KnowledgeDocument; text: string }[];
}

const MAX_RELATED = 5;
const QUERY_WORDS = 60;

async function findSavedPage(url: string): Promise<KnowledgeDocument | undefined> {
  try {
    return await db.documents.where('canonicalUrl').equals(canonicalizeUrl(url)).first();
  } catch {
    return undefined;
  }
}

/** Keyword matches need at least two distinct terms, so one common word doesn't count as related. */
function keywordReason(terms: string[]): string | null {
  const unique = [...new Set(terms.map((t) => t.toLowerCase()))].filter((t) => t.length > 3);
  return unique.length >= 2 ? `Matches ${unique.slice(0, 3).join(', ')}` : null;
}

export async function pageContext(page: PageInfo): Promise<PageContext> {
  const saved = await findSavedPage(page.url);
  const related = new Map<string, RelatedDocument>();

  // Saved pages: connections through shared names and tags come first.
  if (saved) for (const r of await findRelated(saved.id, MAX_RELATED)) related.set(r.doc.id, r);

  const query = `${page.title} ${page.lead ?? ''}`.split(/\s+/).slice(0, QUERY_WORDS).join(' ');
  if (query.trim()) {
    const { hits } = await searchPassages(query, { semantic: false, limit: 40 });
    for (const hit of groupByDocument(hits)) {
      if (related.size >= MAX_RELATED) break;
      if (hit.doc.id === saved?.id || related.has(hit.doc.id)) continue;
      const why = keywordReason(hit.terms);
      if (why) related.set(hit.doc.id, { doc: hit.doc, why });
    }
  }

  // Other pages from the same site fill any remaining space.
  const host = hostnameOf(page.url);
  if (host && related.size < MAX_RELATED) {
    const sameSite = await db.documents
      .orderBy('capturedAt')
      .reverse()
      .filter((d) => d.id !== saved?.id && !related.has(d.id) && hostnameOf(d.url) === host)
      .limit(MAX_RELATED - related.size)
      .toArray();
    for (const doc of sameSite) related.set(doc.id, { doc, why: 'Same site' });
  }

  const list = [...related.values()];
  const notes = list
    .map((r) => r.doc)
    .filter((d) => !!d.userNotes.trim())
    .map((doc) => ({ doc, text: doc.userNotes.trim() }));
  return { saved, related: list, notes };
}

/** How many saved pages relate to a page; used for the toolbar badge in follow mode. */
export async function relatedCount(page: PageInfo): Promise<number> {
  const { saved, related } = await pageContext(page);
  return related.length + (saved ? 1 : 0);
}
