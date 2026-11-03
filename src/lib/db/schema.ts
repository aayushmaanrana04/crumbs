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

export interface Insight {
  docId: string;
  tldr: string;
  takeaways: string[];
  facts: string[];
  topics: string[];
  entities: { name: string; type: EntityType }[];
  terms: string[];
  model: string;
  createdAt: number;
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

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
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

export interface LibraryStats {
  documents: number;
  highlights: number;
  projects: number;
  pendingJobs: number;
}

export class KnowledgeDB extends Dexie {
  documents!: EntityTable<KnowledgeDocument, 'id'>;
  chunks!: EntityTable<Chunk, 'id'>;
  embeddings!: Dexie.Table<Embedding, [string, string]>;
  insights!: EntityTable<Insight, 'docId'>;
  entities!: EntityTable<Entity, 'id'>;
  entityAliases!: EntityTable<EntityAlias, 'alias'>;
  mentions!: EntityTable<Mention, 'id'>;
  relations!: EntityTable<Relation, 'id'>;
  projects!: EntityTable<Project, 'id'>;
  highlights!: EntityTable<Highlight, 'id'>;
  jobs!: EntityTable<Job, 'id'>;
  usage!: EntityTable<UsageRecord, 'id'>;

  constructor() {
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
  }
}

export const db = new KnowledgeDB();

/** Counts for the library. Only jobs of `activeJobTypes` (tasks with a model set up) count as pending. */
export async function getLibraryStats(activeJobTypes: JobType[]): Promise<LibraryStats> {
  const [documents, highlights, projects, pendingJobs] = await Promise.all([
    db.documents.count(),
    db.highlights.count(),
    db.projects.count(),
    db.jobs
      .where('status')
      .anyOf('queued', 'running')
      .filter((j) => activeJobTypes.includes(j.type))
      .count(),
  ]);
  return { documents, highlights, projects, pendingJobs };
}
