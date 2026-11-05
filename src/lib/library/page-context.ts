// What the side panel knows about the page you're on: whether it's saved, which saved
// pages relate to it and why, and your notes on those. Runs locally; no AI calls.
import { canonicalizeUrl, hostnameOf } from '../capture/url';
import { db, type KnowledgeDocument } from '../db/schema';
import { pagesSharingTerms } from '../search/search';
import { findRelated, type RelatedDocument } from './related';

export interface PageInfo {
  url: string;
  title: string;
  /** The address it's saved under, when the panel could read the page. */
  canonicalUrl?: string;
  /** Opening text of the page, when the panel was allowed to read it. */
  lead?: string;
}

export interface PageContext {
  saved?: KnowledgeDocument;
  related: RelatedDocument[];
  /** Your notes on the related pages (the saved page's own notes are shown with it). */
  notes: { doc: KnowledgeDocument; text: string }[];
}

const MAX_RELATED = 3;
const QUERY_WORDS = 60;

/** The library copy of a page, by the address it's saved under (often a declared canonical) or its own. */
export async function findSavedPage(page: PageInfo): Promise<KnowledgeDocument | undefined> {
  try {
    const urls = [...new Set([page.canonicalUrl, canonicalizeUrl(page.url)].filter((u): u is string => !!u))];
    return await db.documents.where('canonicalUrl').anyOf(urls).first();
  } catch {
    return undefined;
  }
}

export async function pageContext(page: PageInfo): Promise<PageContext> {
  const saved = await findSavedPage(page);
  const related = new Map<string, RelatedDocument>();

  // Saved pages: connections through shared names and tags come first.
  if (saved) for (const r of await findRelated(saved.id, MAX_RELATED)) related.set(r.doc.id, r);

  const text = `${page.title} ${page.lead ?? ''}`.split(/\s+/).slice(0, QUERY_WORDS).join(' ');
  if (text.trim() && related.size < MAX_RELATED) {
    const shared = await pagesSharingTerms(text, { exclude: saved?.id });
    const docs = await db.documents.bulkGet(shared.slice(0, MAX_RELATED).map((s) => s.docId));
    shared.forEach((s, i) => {
      const doc = docs[i];
      if (doc && related.size < MAX_RELATED && !related.has(doc.id)) related.set(doc.id, { doc, why: `Mentions ${s.terms.slice(0, 3).join(', ')}` });
    });
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
