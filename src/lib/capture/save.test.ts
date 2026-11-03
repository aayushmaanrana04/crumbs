import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/schema';
import type { ExtractedPage } from './extract';
import { CaptureError, saveExtractedPage } from './save';

const body = Array.from({ length: 40 }, (_, i) => `Sentence ${i} about local-first software and IndexedDB storage.`).join(' ');

function extracted(overrides: Partial<ExtractedPage> = {}): ExtractedPage {
  return { url: 'https://blog.dev/post', title: 'Local-first', excerpt: '', markdown: body, type: 'article', selection: '', ...overrides };
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('saveExtractedPage', () => {
  it('saves a new page with passages and queued AI jobs', async () => {
    const outcome = await saveExtractedPage(extracted(), 'manual');
    expect(outcome.status).toBe('saved');
    const doc = await db.documents.get(outcome.docId);
    expect(doc?.canonicalUrl).toBe('blog.dev/post');
    expect(await db.chunks.where('docId').equals(outcome.docId).count()).toBeGreaterThan(0);
    expect((await db.jobs.toArray()).map((j) => j.type).sort()).toEqual(['embed', 'insights']);
  });

  it('recognises the same URL, and updates it when the content changed', async () => {
    const first = await saveExtractedPage(extracted(), 'manual');
    expect((await saveExtractedPage(extracted({ url: 'https://blog.dev/post/?utm_source=x' }), 'manual')).status).toBe('unchanged');
    const updated = await saveExtractedPage(extracted({ markdown: `${body} A brand new closing section.` }), 'manual');
    expect(updated).toMatchObject({ status: 'updated', docId: first.docId });
    expect(await db.documents.count()).toBe(1);
  });

  it('treats the same content at another URL as a duplicate', async () => {
    const first = await saveExtractedPage(extracted(), 'manual');
    const mirror = await saveExtractedPage(extracted({ url: 'https://mirror.dev/copy', markdown: body.replace('Sentence 5', 'Line 5') }), 'manual');
    expect(mirror).toMatchObject({ status: 'duplicate', docId: first.docId });
  });

  it('adds a selection as a highlight once', async () => {
    const first = await saveExtractedPage(extracted({ selection: 'IndexedDB storage' }), 'manual');
    expect(first.highlightAdded).toBe(true);
    const again = await saveExtractedPage(extracted({ selection: 'IndexedDB storage' }), 'manual');
    expect(again.highlightAdded).toBe(false);
    expect(await db.highlights.count()).toBe(1);
  });

  it('ignores a cross-site canonical URL and rejects empty pages', async () => {
    const outcome = await saveExtractedPage(extracted({ declaredCanonicalUrl: 'https://spam.example/' }), 'manual');
    expect((await db.documents.get(outcome.docId))?.canonicalUrl).toBe('blog.dev/post');
    await expect(saveExtractedPage(extracted({ url: 'https://x.dev', markdown: 'Hi' }), 'manual')).rejects.toBeInstanceOf(CaptureError);
  });
});
