import { describe, expect, it } from 'vitest';
import { normalizeTag } from '../library/documents';
import { codeFromPage, gistProblems, overlap, refineInsight, type RawBlock, type RawInsight } from './insight-quality';

describe('gistProblems', () => {
  it('flags gists that describe the page instead of stating its point', () => {
    for (const g of [
      'The article argues that backends should handle SIGTERM.',
      "Onramp's Android SDK documentation covers how to integrate the widget.",
      'An interview-style Swiggy blog post profiles Sagar Jounkani.',
      'This page explains graceful shutdown.',
      'Harness engineers argue that agent loops should expose decisions.',
    ]) {
      expect(gistProblems(g), g).toContain('describes-the-page');
    }
  });

  it('accepts point-first gists, including ones starting with a verb', () => {
    for (const g of [
      'Handle SIGTERM so in-flight requests finish before Kubernetes sends SIGKILL.',
      'Embed the Onramp crypto widget in Android and track orders through event callbacks.',
      'Guide agents with typed decisions instead of free text.',
      'Interview loops reward people who own problems end to end.',
      'Post-quantum signatures are now practical for TLS.',
    ]) {
      expect(gistProblems(g), g).toEqual([]);
    }
  });

  it('flags long or empty gists', () => {
    expect(gistProblems('word '.repeat(40))).toContain('too-long');
    expect(gistProblems('  ')).toContain('empty');
  });
});

const SOURCE = `
Kubernetes stops routing traffic, sends SIGTERM and waits a grace period of 30 seconds before SIGKILL.
Install with npm install @acme/sdk and call acme.start({ appId }) to begin.
Agents using snapshots completed 68 percent of tasks versus 41 percent with raw HTML, at 1,363 ms vs 185 ms.
“Find the most complex problem available, and own it completely.”
`;

const block = (over: Partial<RawBlock>): RawBlock => ({
  type: 'list', title: '', items: [], columns: [], rows: [], series: [], unit: '', code: '', lang: '', text: '', by: '', tone: 'none', ...over,
});

const raw = (over: Partial<RawInsight> = {}): RawInsight => ({
  kind: 'docs',
  gist: 'Handle SIGTERM so in-flight requests finish before Kubernetes sends SIGKILL.',
  gistQuote: '',
  keyPoints: [
    'Kubernetes stops routing traffic, sends SIGTERM, then SIGKILL after a grace period.',
    'Kubernetes stops routing new traffic and sends SIGTERM, then SIGKILL after the grace period.',
    'The post is dated August 31, 2026.',
  ].map((text) => ({ text, quote: '' })),
  blocks: [],
  note: '',
  tags: ['Kubernetes', 'kubernetes', 'Graceful Shutdown', 'signals', 'backend'],
  entities: [{ name: 'Kubernetes', type: 'technology' }, { name: 'kubernetes', type: 'technology' }, { name: 'Go', type: 'technology' }],
  ...over,
});

describe('refineInsight', () => {
  it('removes repeats and page details, and de-duplicates tags and entities', () => {
    const r = refineInsight(raw(), SOURCE, normalizeTag);
    expect(r.keyPoints).toEqual(['Kubernetes stops routing traffic, sends SIGTERM, then SIGKILL after a grace period.']);
    expect(r.tags).toEqual(['kubernetes', 'graceful-shutdown', 'signals']);
    expect(r.entities.map((e) => e.name)).toEqual(['Kubernetes', 'Go']);
  });

  it('keeps supporting quotes found in the page and clears invented ones', () => {
    const r = refineInsight(
      raw({
        gistQuote: 'Kubernetes stops routing traffic, sends SIGTERM and waits a grace period of 30 seconds before SIGKILL.',
        keyPoints: [
          { text: 'Snapshots beat raw HTML on task completion.', quote: 'Agents using snapshots completed 68 percent of tasks versus 41 percent with raw HTML' },
          { text: 'Install the SDK from npm.', quote: 'The SDK is distributed through npm and yarn.' },
        ],
      }),
      SOURCE,
      normalizeTag,
    );
    expect(r.gistQuote).toMatch(/^Kubernetes stops routing/);
    expect(r.keyPointQuotes).toEqual(['Agents using snapshots completed 68 percent of tasks versus 41 percent with raw HTML', '']);
  });

  it('keeps code that comes from the page and strips invented code', () => {
    const r = refineInsight(
      raw({
        blocks: [
          block({
            type: 'steps',
            title: 'Set up',
            items: [
              { text: 'Install the SDK.', code: 'npm install @acme/sdk', lang: 'bash' },
              { text: 'Start it.', code: 'acme.start({ appId })', lang: 'js' },
              { text: 'Configure retries.', code: 'acme.configureRetries(maxAttempts)', lang: 'js' },
            ],
          }),
        ],
      }),
      SOURCE,
      normalizeTag,
    );
    const steps = r.blocks[0];
    expect(steps?.type).toBe('steps');
    if (steps?.type !== 'steps') return;
    expect(steps.items.map((i) => i.code)).toEqual(['npm install @acme/sdk', 'acme.start({ appId })', '']);
  });

  it('drops chart points and table rows whose numbers are not in the page', () => {
    const r = refineInsight(
      raw({
        blocks: [
          block({ type: 'chart', title: 'Task completion', unit: '%', series: [{ label: 'Snapshots', value: 68 }, { label: 'Raw HTML', value: 41 }, { label: 'Vision', value: 55 }] }),
          block({ type: 'table', title: 'Latency', columns: ['Approach', 'Latency'], rows: [['LLM judge', '1,363 ms'], ['Primitive', '185 ms'], ['Cached', '12 ms']] }),
        ],
      }),
      SOURCE,
      normalizeTag,
    );
    expect(r.blocks[0]).toEqual({ type: 'chart', title: 'Task completion', unit: '%', series: [{ label: 'Snapshots', value: 68 }, { label: 'Raw HTML', value: 41 }] });
    expect(r.blocks[1]).toEqual({ type: 'table', title: 'Latency', columns: ['Approach', 'Latency'], rows: [['LLM judge', '1,363 ms'], ['Primitive', '185 ms']] });
  });

  it('keeps only verbatim quotes and drops blocks with too little left', () => {
    const r = refineInsight(
      raw({
        blocks: [
          block({ type: 'quote', text: '“Find the most complex problem available, and own it completely.”', by: 'Sagar' }),
          block({ type: 'quote', text: 'Always ship on Fridays.', by: 'Nobody' }),
          block({ type: 'chart', series: [{ label: 'Only one', value: 68 }] }),
          block({ type: 'list', title: 'Again', items: [{ text: 'Kubernetes stops routing traffic, sends SIGTERM, then SIGKILL.', code: '', lang: '' }] }),
        ],
      }),
      SOURCE,
      normalizeTag,
    );
    expect(r.blocks).toEqual([{ type: 'quote', text: 'Find the most complex problem available, and own it completely.', by: 'Sagar' }]);
  });

  it('drops a callout that restates a key point', () => {
    const r = refineInsight(
      raw({
        keyPoints: [{ text: 'Each SDK instance maps to one widget; reopening the widget requires a fresh SDK initialization.', quote: '' }],
        blocks: [block({ type: 'callout', tone: 'warning', text: 'Each SDK instance maps to one widget. To close and reopen Onramp Instant, you must initialise the SDK again.' })],
      }),
      SOURCE,
      normalizeTag,
    );
    expect(r.blocks).toEqual([]);
  });

  it('checks code against the page', () => {
    expect(codeFromPage('npm install @acme/sdk', SOURCE)).toBe(true);
    expect(codeFromPage('pip install something-else', SOURCE)).toBe(false);
  });

  it('measures overlap on content words', () => {
    expect(overlap('the cat sat on the mat', 'a cat sat on a mat')).toBe(1);
    expect(overlap('kubernetes signals', 'career advice')).toBe(0);
  });
});
