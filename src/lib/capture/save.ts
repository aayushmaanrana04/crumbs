import { db, type KnowledgeDocument } from '../db/schema';
import { rebuildChunks } from '../library/documents';
import { enqueueJobs } from '../library/jobs';
import type { ExtractedPage } from './extract';
import { hammingDistance, NEAR_DUPLICATE_BITS, normalizeForHash, sha256Hex, simhash } from './hash';
import { canonicalizeUrl, hostnameOf } from './url';

export type SaveStatus = 'saved' | 'updated' | 'unchanged' | 'duplicate';

export interface SaveOutcome {
  status: SaveStatus;
  docId: string;
  title: string;
  highlightAdded: boolean;
}

export class CaptureError extends Error {
  override name = 'CaptureError';
}

const MIN_TEXT_CHARS = 80;

/** Trust a declared canonical URL only when it points at the same site. */
export function chooseCanonical(page: ExtractedPage): string {
  const declared = page.declaredCanonicalUrl;
  if (declared && hostnameOf(declared) === hostnameOf(page.url)) {
    try {
      return canonicalizeUrl(declared);
    } catch {
      // Fall through to the page URL.
    }
  }
  return canonicalizeUrl(page.url);
}

async function findNearDuplicate(fingerprint: string): Promise<KnowledgeDocument | undefined> {
  let match: KnowledgeDocument | undefined;
  await db.documents.each((doc) => {
    if (!match && doc.simhash && hammingDistance(doc.simhash, fingerprint) <= NEAR_DUPLICATE_BITS) match = doc;
  });
  return match;
}

async function addHighlight(docId: string, text: string): Promise<boolean> {
  if (!text) return false;
  const exists = await db.highlights.where('docId').equals(docId).filter((h) => h.text === text).count();
  if (exists) return false;
  await db.highlights.add({ id: crypto.randomUUID(), docId, text, note: '', createdAt: Date.now() });
  return true;
}

/**
 * Store an extracted page. Duplicates are detected by canonical URL (updated in
 * place), then by exact content, then by near-identical content.
 */
export async function saveExtractedPage(page: ExtractedPage, source: 'manual' | 'auto'): Promise<SaveOutcome> {
  const normalized = normalizeForHash(page.markdown);
  if (normalized.length < MIN_TEXT_CHARS && !page.selection) {
    throw new CaptureError('There is no readable text on this page.');
  }

  const canonicalUrl = chooseCanonical(page);
  const contentHash = await sha256Hex(normalized);
  const fingerprint = simhash(normalized);
  const now = Date.now();

  const sameUrl = await db.documents.where('canonicalUrl').equals(canonicalUrl).first();
  if (sameUrl) {
    const changed = sameUrl.contentHash !== contentHash;
    if (changed) {
      const updated = { ...sameUrl, ...metadata(page), markdown: page.markdown, contentHash, simhash: fingerprint, updatedAt: now };
      await db.documents.put(updated);
      await rebuildChunks(updated);
      await enqueueJobs(sameUrl.id, ['insights', 'embed']);
    }
    const highlightAdded = await addHighlight(sameUrl.id, page.selection);
    return { status: changed ? 'updated' : 'unchanged', docId: sameUrl.id, title: sameUrl.title, highlightAdded };
  }

  const sameContent =
    (await db.documents.where('contentHash').equals(contentHash).first()) ?? (await findNearDuplicate(fingerprint));
  if (sameContent) {
    const highlightAdded = await addHighlight(sameContent.id, page.selection);
    return { status: 'duplicate', docId: sameContent.id, title: sameContent.title, highlightAdded };
  }

  const doc: KnowledgeDocument = {
    id: crypto.randomUUID(),
    url: page.url,
    canonicalUrl,
    ...metadata(page),
    capturedAt: now,
    updatedAt: now,
    markdown: page.markdown,
    contentHash,
    simhash: fingerprint,
    source,
    userNotes: '',
    tags: [],
    projectIds: [],
  };
  await db.documents.add(doc);
  await rebuildChunks(doc);
  await enqueueJobs(doc.id, ['insights', 'embed']);
  const highlightAdded = await addHighlight(doc.id, page.selection);
  return { status: 'saved', docId: doc.id, title: doc.title, highlightAdded };
}

function metadata(page: ExtractedPage) {
  return {
    title: page.title,
    author: page.author,
    siteName: page.siteName ?? hostnameOf(page.url),
    publishedAt: page.publishedAt,
    excerpt: page.excerpt,
    type: page.selection && normalizeForHash(page.markdown).length < MIN_TEXT_CHARS ? ('selection' as const) : page.type,
  };
}
