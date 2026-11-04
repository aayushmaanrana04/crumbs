import { beforeEach, describe, expect, it } from 'vitest';
import { db, type KnowledgeDocument } from '../db/schema';
import { deleteAllData } from './documents';
import { createProject } from './projects';

const doc = (id: string): KnowledgeDocument => ({
  id, url: `https://x.dev/${id}`, canonicalUrl: `x.dev/${id}`, title: id, capturedAt: 1, updatedAt: 1, type: 'article',
  markdown: '', contentHash: id, simhash: '0', excerpt: '', source: 'manual', userNotes: '', tags: [], projectIds: [],
});

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('deleteAllData', () => {
  it('empties the library but keeps the AI activity log', async () => {
    await db.documents.bulkAdd([doc('a'), doc('b')]);
    await db.highlights.add({ id: 'h', docId: 'a', text: 'quote', note: '', createdAt: 1 } as never);
    await createProject('Agents', '');
    await db.usage.add({ id: 'u', at: 1, task: 'insights', provider: 'openai', model: 'm', ok: true } as never);

    await deleteAllData();

    expect(await db.documents.count()).toBe(0);
    expect(await db.highlights.count()).toBe(0);
    expect(await db.projects.count()).toBe(0);
    expect(await db.usage.count()).toBe(1);
  });
});
