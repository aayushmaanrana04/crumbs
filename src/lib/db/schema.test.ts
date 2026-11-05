import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';

describe('database upgrades', () => {
  it('upgrades a version 1 library without losing pages or projects', async () => {
    // A library as the first release stored it.
    const old = new Dexie('summaryse');
    old.version(1).stores({
      documents: 'id, &canonicalUrl, contentHash, type, capturedAt, status, *tags, *projectIds',
      projects: 'id, name',
    });
    await old.table('documents').put({ id: 'd1', canonicalUrl: 'a.dev/x', title: 'X', status: 'ready', tags: ['t'], projectIds: ['p1'], capturedAt: 1 });
    await old.table('projects').put({ id: 'p1', name: 'P', createdAt: 5 });
    old.close();

    const { db } = await import('./schema');
    await db.open();
    expect(db.verno).toBe(4);
    const doc = (await db.documents.get('d1')) as unknown as Record<string, unknown>;
    expect(doc.title).toBe('X');
    expect(doc).not.toHaveProperty('status');
    expect(await db.projects.get('p1')).toMatchObject({ updatedAt: 5, notes: '', questions: [], dismissed: [] });
    expect(await db.projects.orderBy('updatedAt').count()).toBe(1);
  });
});
