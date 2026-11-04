import { beforeEach, describe, expect, it } from 'vitest';
import { db, type KnowledgeDocument } from '../db/schema';
import { findRelated } from './related';

const doc = (id: string, tags: string[] = []): KnowledgeDocument => ({
  id, url: `https://x.dev/${id}`, canonicalUrl: `x.dev/${id}`, title: id, capturedAt: 1, updatedAt: 1, type: 'article',
  markdown: '', contentHash: id, simhash: '0', excerpt: '', source: 'manual', userNotes: '', tags, projectIds: [],
});
const insight = (docId: string, names: string[]) => ({
  docId, tldr: '', takeaways: [], facts: [], topics: [], terms: [], model: 'm', createdAt: 1,
  entities: names.map((name) => ({ name, type: 'technology' as const })),
});

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('findRelated', () => {
  it('ranks shared entities above shared tags and explains why', async () => {
    await db.documents.bulkAdd([doc('a', ['agents']), doc('b', ['agents']), doc('c'), doc('d')]);
    await db.insights.bulkAdd([insight('a', ['Playwright', 'DOM']), insight('c', ['playwright']), insight('d', ['React'])]);
    const related = await findRelated('a');
    expect(related.map((r) => [r.doc.id, r.why])).toEqual([
      ['c', 'Both mention Playwright'],
      ['b', 'Shared tag: agents'],
    ]);
  });
});
