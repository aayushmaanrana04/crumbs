import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveExtractedPage } from '../capture/save';
import { db, normalizeInsight } from '../db/schema';
import type { CompletionRequest } from '../providers/types';

const runTask = vi.fn<(task: string, request: CompletionRequest, docId?: string) => Promise<{ json: unknown; model: string }>>();
vi.mock('./run', () => ({ runTask: (...args: Parameters<typeof runTask>) => runTask(...args) }));

const { generateInsights } = await import('./insights');

const ending = 'The final section explains how the retry budget resets every hour.';
const draft = {
  kind: 'docs',
  gist: 'Retries are capped by a budget that resets hourly.',
  gistQuote: 'The final section explains how the retry budget',
  blocks: [],
  keyPoints: [{ text: 'The budget resets every hour.', quote: 'how the retry budget resets every hour' }],
  note: '',
  tags: ['retries'],
  entities: [],
};

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
  runTask.mockReset();
  runTask.mockResolvedValue({ json: draft, model: 'test-model' });
});

describe('generateInsights', () => {
  it('summarises a short page in one call', async () => {
    const markdown = Array.from({ length: 40 }, (_, i) => `Sentence ${i} about retries.`).join(' ') + ` ${ending}`;
    const { docId } = await saveExtractedPage({ url: 'https://a.dev/short', title: 'Short', excerpt: '', markdown, type: 'docs', selection: '' }, 'manual');
    await generateInsights(docId);
    expect(runTask).toHaveBeenCalledTimes(1);
    expect(normalizeInsight((await db.insights.get(docId))!).citations?.gist).not.toBeNull();
  });

  it('summarises a very long page in parts, then merges them, citing text near the end', async () => {
    // About 100k tokens: past the single-pass limit, so three parts plus a merge.
    const paragraph = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ') + '.';
    const markdown = Array.from({ length: 1400 }, () => paragraph).join('\n\n') + `\n\n${ending}`;
    const { docId } = await saveExtractedPage({ url: 'https://a.dev/long', title: 'Long', excerpt: '', markdown, type: 'docs', selection: '' }, 'manual');
    await generateInsights(docId);

    const prompts = runTask.mock.calls.map(([, request]) => request.prompt);
    expect(prompts.length).toBe(4);
    expect(prompts[0]).toContain('part 1 of 3');
    expect(prompts[2]).toContain(ending);
    expect(prompts[3]).toMatch(/^[\s\S]*Merge them into one summary/);

    const insight = normalizeInsight((await db.insights.get(docId))!);
    expect(insight.gist).toBe(draft.gist);
    expect(insight.citations?.gist?.start).toBeGreaterThan(markdown.length - ending.length - 1);
  });
});
