import { beforeEach, describe, expect, it } from 'vitest';
import { saveExtractedPage } from '../capture/save';
import { db, type StoredInsight } from '../db/schema';
import { exportJson, importJson } from './transfer';

const markdown = Array.from({ length: 30 }, (_, i) => `Line ${i} on vector search and reciprocal rank fusion.`).join(' ');

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('export and import', () => {
  it('round-trips documents, highlights and insights, rebuilding passages', async () => {
    const { docId } = await saveExtractedPage(
      { url: 'https://a.dev/x', title: 'RRF', excerpt: '', markdown, type: 'article', selection: 'rank fusion' },
      'manual',
    );
    await db.insights.put({ docId, tldr: 'T', takeaways: [], facts: [], topics: [], entities: [], terms: [], model: 'm', createdAt: 1 } as StoredInsight);
    const blob = await exportJson();
    const file = new File([await blob.text()], 'backup.json');

    await Promise.all(db.tables.map((t) => t.clear()));
    expect(await importJson(file)).toEqual({ added: 1, skipped: 0 });
    expect(await db.highlights.count()).toBe(1);
    expect(await db.insights.get(docId)).toBeTruthy();
    expect(await db.chunks.where('docId').equals(docId).count()).toBeGreaterThan(0);
    // Insights came with the backup, so only embeddings are re-queued.
    expect((await db.jobs.toArray()).map((j) => j.type)).toEqual(['embed']);

    expect(await importJson(file)).toEqual({ added: 0, skipped: 1 });
  });

  it('rejects files that are not Summaryse backups', async () => {
    await expect(importJson(new File(['{"hello":1}'], 'x.json'))).rejects.toThrow();
  });
});
