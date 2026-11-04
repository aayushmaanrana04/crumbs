import { fakeBrowser } from 'wxt/testing/fake-browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveExtractedPage } from '../capture/save';
import { db, type Insight } from '../db/schema';
import type { ProviderAdapter } from '../providers/types';
import { providerSettings } from '../settings/providers';
import { taskSettings } from '../settings/tasks';

const complete = vi.fn<NonNullable<ProviderAdapter['complete']>>();
const embed = vi.fn<NonNullable<ProviderAdapter['embed']>>();

vi.mock('../providers/registry', async () => {
  const { PROVIDER_INFO } = await import('../providers/catalog');
  const stub: ProviderAdapter = { info: PROVIDER_INFO.openai, listModels: async () => [], complete, embed };
  return { BACKGROUND_ADAPTERS: { openai: stub } };
});

// The fake browser doesn't implement the action API; the badge isn't under test.
fakeBrowser.action = { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} } as never;

const { drainQueue } = await import('./queue');

const emptyBlock = { title: '', items: [], columns: [], rows: [], series: [], unit: '', code: '', lang: '', text: '', by: '', tone: 'none' };
const insight = {
  kind: 'opinion',
  gist: 'Local-first apps keep the primary copy of your data on your device.',
  gistQuote: 'A sentence the page never says.',
  keyPoints: [{ text: 'IndexedDB makes large local storage practical in browsers.', quote: 'Sentence 3 about local-first software and IndexedDB.' }],
  blocks: [{ ...emptyBlock, type: 'list', title: 'Why it matters', items: [{ text: 'Apps keep working offline.', code: '', lang: '' }] }],
  note: '',
  tags: ['Local First', 'storage'],
  entities: [{ name: 'IndexedDB', type: 'technology' }],
};
const markdown = Array.from({ length: 40 }, (_, i) => `Sentence ${i} about local-first software and IndexedDB.`).join(' ');

async function save() {
  return saveExtractedPage({ url: `https://a.dev/${Math.random()}`, title: 'LF', excerpt: '', markdown, type: 'article', selection: '' }, 'manual');
}

beforeEach(async () => {
  fakeBrowser.reset();
  fakeBrowser.action = { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {}, setTitle: async () => {} } as never;
  await Promise.all(db.tables.map((t) => t.clear()));
  complete.mockReset();
  embed.mockReset();
  await providerSettings.setValue({ ...(await providerSettings.getValue()), openai: { enabled: true, apiKey: 'k', baseUrl: '' } });
  await taskSettings.setValue({
    insights: { provider: 'openai', model: 'small' },
    answer: { provider: 'openai', model: 'big' },
    embed: { provider: 'openai', model: 'embed-1' },
  });
});

describe('job queue', () => {
  it('generates insights and embeddings, auto-tags, and logs each call', async () => {
    complete.mockResolvedValue({ text: JSON.stringify(insight), json: insight, model: 'small' });
    embed.mockImplementation(async (_c, _m, texts) => texts.map(() => [1, 0, 0]));
    const { docId } = await save();

    await drainQueue();

    expect(complete.mock.calls[0]![1]).toMatchObject({ model: 'small', effort: 'low' });
    const stored = await db.insights.get(docId);
    expect(stored).toMatchObject({ version: 2, kind: 'opinion', gist: insight.gist });
    // The key point's quote is in the page; the gist's isn't, so it has no citation.
    const cited = (stored as Insight).citations!;
    expect(cited.gist).toBeNull();
    expect(markdown.slice(cited.keyPoints[0]!.start, cited.keyPoints[0]!.end)).toBe('Sentence 3 about local-first software and IndexedDB.');
    const doc = await db.documents.get(docId);
    expect(doc?.tags).toEqual(['local-first', 'storage']);
    const chunks = await db.chunks.where('docId').equals(docId).count();
    expect(await db.embeddings.where('model').equals('openai:embed-1').count()).toBe(chunks);
    expect(await db.jobs.count()).toBe(0);
    expect((await db.usage.toArray()).map((u) => u.task).sort()).toEqual(['embed', 'insights']);
  });

  it('retries failures with backoff, then marks the document failed', async () => {
    complete.mockRejectedValue(new Error('boom'));
    embed.mockResolvedValue([]);
    await taskSettings.setValue({ ...(await taskSettings.getValue()), embed: { provider: '', model: '' } });
    const { docId } = await save();

    await drainQueue();
    let job = (await db.jobs.where('docId').equals(docId).toArray()).find((j) => j.type === 'insights')!;
    expect(job).toMatchObject({ status: 'queued', attempts: 1, error: 'boom' });
    expect(job.runAfter).toBeGreaterThan(Date.now());

    // Force the remaining attempts.
    for (let i = 0; i < 2; i++) {
      await db.jobs.update(job.id, { runAfter: 0 });
      await drainQueue();
    }
    job = (await db.jobs.get(job.id))!;
    expect(job).toMatchObject({ status: 'failed', attempts: 3 });
    expect(complete).toHaveBeenCalledTimes(3);
  });

  it('leaves jobs queued while no model is configured', async () => {
    await taskSettings.setValue({ insights: { provider: '', model: '' }, answer: { provider: '', model: '' }, embed: { provider: '', model: '' } });
    const { docId } = await save();
    await drainQueue();
    expect(complete).not.toHaveBeenCalled();
    expect(await db.jobs.where('docId').equals(docId).count()).toBe(2);
  });

  it('respects the daily background limit', async () => {
    const { usageLimits } = await import('../settings/tasks');
    await usageLimits.setValue({ dailyBackgroundCalls: 1 });
    await db.usage.add({ at: Date.now(), provider: 'openai', model: 'small', task: 'insights', ok: true });
    await save();
    await drainQueue();
    expect(complete).not.toHaveBeenCalled();
  });
});

describe('tag reuse', () => {
  it('tells the model which tags the library already uses', async () => {
    complete.mockResolvedValue({ text: '{}', json: insight, model: 'small' });
    embed.mockImplementation(async (_c, _m, texts) => texts.map(() => [1]));
    const first = await save();
    await db.documents.update(first.docId, { tags: ['accessibility-trees'] });
    await drainQueue();
    complete.mockClear();
    const other = Array.from({ length: 40 }, (_, i) => `Line ${i} on browser agents and accessibility snapshots.`).join(' ');
    await saveExtractedPage({ url: 'https://b.dev/2', title: 'B', excerpt: '', markdown: other, type: 'article', selection: '' }, 'manual');
    await drainQueue();
    const prompts = complete.mock.calls.map(([, request]) => request.prompt);
    expect(prompts.some((p) => p.includes('Tags already used in this library: accessibility-trees'))).toBe(true);
  });
});
