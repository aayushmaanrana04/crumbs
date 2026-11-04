import Dexie, { type EntityTable } from 'dexie';

// Local knowledge store. IDs are UUIDs so exports/imports stay stable across devices.

export type DocumentType = 'article' | 'docs' | 'repo' | 'pdf' | 'video' | 'selection' | 'other';

export interface KnowledgeDocument {
  id: string;
  url: string;
  canonicalUrl: string;
  title: string;
  author?: string;
  siteName?: string;
  publishedAt?: number;
  capturedAt: number;
  updatedAt: number;
  type: DocumentType;
  markdown: string;
  /** SHA-256 of normalised text, for exact-duplicate detection. */
  contentHash: string;
  /** 64-bit simhash as hex, for near-duplicate detection. */
  simhash: string;
  excerpt: string;
  /** How it was saved: a click/shortcut/menu, or auto-capture. */
  source: 'manual' | 'auto';
  /** When the full page was last opened in Carrel; unset means unread. */
  readAt?: number;
  userNotes: string;
  tags: string[];
  projectIds: string[];
}

export interface Chunk {
  id: string;
  docId: string;
  ordinal: number;
  text: string;
  /** Character offsets into the document markdown, for citations. */
  charStart: number;
  charEnd: number;
}

export interface Embedding {
  chunkId: string;
  docId: string;
  /** Provider + model id. Vectors from different models are never compared. */
  model: string;
  vector: Float32Array;
}

/** What kind of page this is; decides which blocks the summary uses. */
export const PAGE_KINDS = ['docs', 'tutorial', 'repo', 'data', 'research', 'comparison', 'release', 'pricing', 'discussion', 'news', 'opinion', 'other'] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

/** One structured part of a summary. Unused fields are empty so the shape works with strict JSON schemas. */
export type InsightBlock =
  | { type: 'steps'; title: string; items: { text: string; code: string; lang: string }[] }
  | { type: 'table'; title: string; columns: string[]; rows: string[][] }
  | { type: 'chart'; title: string; unit: string; series: { label: string; value: number }[] }
  | { type: 'list'; title: string; items: string[] }
  | { type: 'code'; title: string; lang: string; code: string }
  | { type: 'quote'; text: string; by: string }
  | { type: 'callout'; tone: 'warning' | 'info'; text: string };

/** AI summary of a saved page (format v2). */
export interface Insight {
  docId: string;
  version: 2;
  kind: PageKind;
  /** One sentence, point first. Shown in the Library list. */
  gist: string;
  keyPoints: string[];
  blocks: InsightBlock[];
  /** Something important missing from the saved text, or empty. */
  note: string;
  /** Suggested broad tags; applied to pages the user hasn't tagged. */
  tags: string[];
  entities: { name: string; type: EntityType }[];
  model: string;
  createdAt: number;
}

/** Format v1, still stored for pages summarised before v2 until they're re-summarised. */
export interface LegacyInsight {
  docId: string;
  version?: undefined;
  tldr: string;
  takeaways: string[];
  facts: string[];
  topics: string[];
  entities: { name: string; type: EntityType }[];
  terms: string[];
  model: string;
  createdAt: number;
}

export type StoredInsight = Insight | LegacyInsight;

/** Read any stored insight as v2, so the UI only handles one shape. */
export function normalizeInsight(raw: StoredInsight): Insight {
  if (raw.version === 2) return raw;
  return {
    docId: raw.docId,
    version: 2,
    kind: 'other',
    gist: raw.tldr,
    keyPoints: raw.takeaways,
    blocks: raw.facts.length ? [{ type: 'list', title: 'Facts and figures', items: raw.facts }] : [],
    note: '',
    tags: raw.topics,
    entities: raw.entities.filter((e) => e.type !== 'concept'),
    model: raw.model,
    createdAt: raw.createdAt,
  };
}

export type EntityType = 'concept' | 'technology' | 'person' | 'company' | 'product' | 'project';

export interface Entity {
  id: string;
  /** `${type}:${normalised name}`, unique. */
  key: string;
  type: EntityType;
  name: string;
}

export interface EntityAlias {
  alias: string;
  entityId: string;
}

/** An entity appearing in a chunk, with the exact quoted span as evidence. */
export interface Mention {
  id: string;
  entityId: string;
  docId: string;
  chunkId: string;
  quote: string;
}

export interface Relation {
  id: string;
  srcId: string;
  dstId: string;
  type: string;
  docId: string;
  chunkId: string;
  /** Verbatim quote from the chunk that supports this relation. */
  quote: string;
}

export interface ProjectQuestion {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  /** Notes and decisions, Markdown. */
  notes: string;
  questions: ProjectQuestion[];
  /** Pages the user said "Not now" to, so they aren't suggested again. */
  dismissed: string[];
}

export interface Highlight {
  id: string;
  docId: string;
  text: string;
  note: string;
  createdAt: number;
}

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';
export type JobType = 'insights' | 'embed';

export interface Job {
  id: string;
  type: JobType;
  docId: string;
  status: JobStatus;
  attempts: number;
  runAfter: number;
  createdAt: number;
  error?: string;
}

/** One outbound AI call. Doubles as the "what left this machine" log. */
export interface UsageRecord {
  id?: number;
  at: number;
  provider: string;
  model: string;
  task: string;
  docId?: string;
  inputTokens?: number;
  outputTokens?: number;
  ok: boolean;
  error?: string;
}

export class KnowledgeDB extends Dexie {
  documents!: EntityTable<KnowledgeDocument, 'id'>;
  chunks!: EntityTable<Chunk, 'id'>;
  embeddings!: Dexie.Table<Embedding, [string, string]>;
  insights!: EntityTable<StoredInsight, 'docId'>;
  entities!: EntityTable<Entity, 'id'>;
  entityAliases!: EntityTable<EntityAlias, 'alias'>;
  mentions!: EntityTable<Mention, 'id'>;
  relations!: EntityTable<Relation, 'id'>;
  projects!: EntityTable<Project, 'id'>;
  highlights!: EntityTable<Highlight, 'id'>;
  jobs!: EntityTable<Job, 'id'>;
  usage!: EntityTable<UsageRecord, 'id'>;

  constructor() {
    // The database keeps its original name so existing libraries survive the rename.
    super('summaryse');
    this.version(1).stores({
      documents: 'id, &canonicalUrl, contentHash, type, capturedAt, status, *tags, *projectIds',
      chunks: 'id, docId, [docId+ordinal]',
      embeddings: '[chunkId+model], docId, model',
      insights: 'docId',
      entities: 'id, &key, type',
      entityAliases: 'alias, entityId',
      mentions: 'id, entityId, docId, chunkId',
      relations: 'id, srcId, dstId, type, docId',
      projects: 'id, name',
      highlights: 'id, docId, createdAt',
      jobs: 'id, status, type, docId, [status+runAfter]',
      usage: '++id, at, provider, task',
    });
    // v2: index updatedAt so search can cheaply tell when the library changed.
    this.version(2).stores({
      documents: 'id, &canonicalUrl, contentHash, type, capturedAt, updatedAt, status, *tags, *projectIds',
    });
    // v3: AI status is derived from jobs and results (see library/ai-status.ts), not stored.
    this.version(3)
      .stores({ documents: 'id, &canonicalUrl, contentHash, type, capturedAt, updatedAt, *tags, *projectIds' })
      .upgrade((tx) =>
        tx
          .table('documents')
          .toCollection()
          .modify((doc: Record<string, unknown>) => {
            delete doc.status;
          }),
      );
    // v4: projects gain notes, open questions and dismissed suggestions, sorted by updatedAt.
    this.version(4)
      .stores({ projects: 'id, name, updatedAt' })
      .upgrade((tx) =>
        tx
          .table('projects')
          .toCollection()
          .modify((p: Record<string, unknown>) => {
            p.updatedAt ??= p.createdAt;
            p.notes ??= '';
            p.questions ??= [];
            p.dismissed ??= [];
          }),
      );
  }
}

export const db = new KnowledgeDB();
