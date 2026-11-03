// Library search, run in extension pages. Keyword search always works; meaning-based
// search joins in when an embedding model is configured.
import MiniSearch from 'minisearch';
import { db, type Chunk, type KnowledgeDocument } from '../db/schema';
import { rpc } from '../rpc/client';
import { taskSettings } from '../settings/tasks';
import { cosineSimilarity, reciprocalRankFusion } from './rank';

export interface PassageHit {
  chunk: Chunk;
  doc: KnowledgeDocument;
  /** 0-1, relative to the best hit in this result set. */
  relevance: number;
  terms: string[];
}

export interface SearchOptions {
  limit?: number;
  /** Restrict to these documents. */
  docIds?: Set<string>;
  semantic?: boolean;
}

export interface SearchResult {
  hits: PassageHit[];
  mode: 'hybrid' | 'keyword';
  /** Set when meaning-based search was wanted but failed. */
  semanticError?: string;
}

interface IndexedChunk {
  id: string;
  docId: string;
  text: string;
  title: string;
  tags: string;
}

let cache: { version: string; index: MiniSearch<IndexedChunk> } | null = null;

async function libraryVersion(): Promise<string> {
  const [docs, chunks, latest] = await Promise.all([
    db.documents.count(),
    db.chunks.count(),
    db.documents.orderBy('updatedAt').last(),
  ]);
  return `${docs}:${chunks}:${latest?.id ?? ''}:${latest?.updatedAt ?? 0}`;
}

async function keywordIndex(): Promise<MiniSearch<IndexedChunk>> {
  const version = await libraryVersion();
  if (cache?.version === version) return cache.index;

  const docs = new Map((await db.documents.toArray()).map((d) => [d.id, d]));
  const index = new MiniSearch<IndexedChunk>({
    fields: ['text', 'title', 'tags'],
    storeFields: ['docId'],
    searchOptions: { boost: { title: 3, tags: 2 }, prefix: true, fuzzy: 0.15, combineWith: 'OR' },
  });
  const chunks = await db.chunks.toArray();
  index.addAll(
    chunks.flatMap((chunk) => {
      const doc = docs.get(chunk.docId);
      return doc ? [{ id: chunk.id, docId: chunk.docId, text: chunk.text, title: doc.title, tags: doc.tags.join(' ') }] : [];
    }),
  );
  cache = { version, index };
  return index;
}

async function vectorSearch(query: string, docIds: Set<string> | undefined, limit: number): Promise<string[]> {
  const { space, vector } = await rpc('ai.embedQuery', { text: query });
  const scored: { id: string; score: number }[] = [];
  await db.embeddings
    .where('model')
    .equals(space)
    .each((embedding) => {
      if (docIds && !docIds.has(embedding.docId)) return;
      scored.push({ id: embedding.chunkId, score: cosineSimilarity(vector, embedding.vector) });
    });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.id);
}

export async function isSemanticSearchConfigured(): Promise<boolean> {
  return !!(await taskSettings.getValue()).embed.provider;
}

export async function searchPassages(query: string, options: SearchOptions = {}): Promise<SearchResult> {
  const limit = options.limit ?? 20;
  const trimmed = query.trim();
  if (!trimmed) return { hits: [], mode: 'keyword' };

  const index = await keywordIndex();
  const keywordHits = index
    .search(trimmed, options.docIds ? { filter: (r) => options.docIds!.has(r.docId as string) } : undefined)
    .slice(0, limit * 2);
  const termsById = new Map(keywordHits.map((h) => [String(h.id), h.terms]));
  const lists = [keywordHits.map((h) => String(h.id))];

  let mode: SearchResult['mode'] = 'keyword';
  let semanticError: string | undefined;
  if (options.semantic !== false && (await isSemanticSearchConfigured())) {
    try {
      lists.push(await vectorSearch(trimmed, options.docIds, limit * 2));
      mode = 'hybrid';
    } catch (error) {
      semanticError = error instanceof Error ? error.message : String(error);
    }
  }

  const fused = [...reciprocalRankFusion(lists)].sort((a, b) => b[1] - a[1]).slice(0, limit);
  const best = fused[0]?.[1] ?? 1;
  const chunks = await db.chunks.bulkGet(fused.map(([id]) => id));
  const docs = new Map((await db.documents.bulkGet(chunks.map((c) => c?.docId ?? ''))).flatMap((d) => (d ? [[d.id, d]] : [])));

  const hits: PassageHit[] = [];
  fused.forEach(([id, score], i) => {
    const chunk = chunks[i];
    const doc = chunk && docs.get(chunk.docId);
    if (chunk && doc) hits.push({ chunk, doc, relevance: score / best, terms: termsById.get(id) ?? [] });
  });
  return { hits, mode, semanticError };
}

/** One result per document, keeping its best passage. */
export function groupByDocument(hits: PassageHit[]): PassageHit[] {
  const seen = new Set<string>();
  return hits.filter((hit) => !seen.has(hit.doc.id) && seen.add(hit.doc.id));
}

