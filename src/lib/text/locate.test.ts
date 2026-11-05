import { describe, expect, it } from 'vitest';
import { locateQuote } from './locate';

const PAGE = `## Shutdown

Kubernetes sends **SIGTERM**, waits \`terminationGracePeriodSeconds\` (30 seconds by default),
then sends SIGKILL.

Add a readiness probe that starts failing as soon as the process receives SIGTERM, so the endpoints controller removes the pod first.`;

const cited = (quote: string) => {
  const span = locateQuote(quote, PAGE);
  return span && PAGE.slice(span.start, span.end);
};

describe('locateQuote', () => {
  it('finds a quote across Markdown syntax, case and line breaks', () => {
    expect(cited('kubernetes sends SIGTERM, waits terminationGracePeriodSeconds (30 seconds by default), then sends SIGKILL')).toBe(
      'Kubernetes sends **SIGTERM**, waits `terminationGracePeriodSeconds` (30 seconds by default),\nthen sends SIGKILL.',
    );
  });

  it('matches when the model changed a word in the middle', () => {
    const span = cited('Add a readiness probe that starts failing as soon as the process gets SIGTERM, so the endpoints controller removes the pod first.');
    expect(span).toBe('Add a readiness probe that starts failing as soon as the process receives SIGTERM, so the endpoints controller removes the pod first.');
  });

  it('rejects quotes that are not in the page or too short to trust', () => {
    expect(locateQuote('Pods are restarted automatically after a crash.', PAGE)).toBeNull();
    expect(locateQuote('then sends', PAGE)).toBeNull();
    expect(locateQuote('', PAGE)).toBeNull();
  });
});

describe('locateQuote with opening words', () => {
  const page = 'Intro. The hit ratio is pretty high (over 99.9%). We load only 1% of the entries.\nSee [the docs](https://example.com/docs/a-b) for details on caching.';

  it('runs from the opening words to the end of the sentence, past decimals', () => {
    const span = locateQuote('The hit ratio is pretty high', page)!;
    expect(page.slice(span.start, span.end)).toBe('The hit ratio is pretty high (over 99.9%).');
  });

  it('matches link text without its URL', () => {
    const span = locateQuote('See the docs for details on caching', page)!;
    expect(page.slice(span.start, span.end)).toBe('See [the docs](https://example.com/docs/a-b) for details on caching.');
  });
});

describe('locateQuote from mid-sentence', () => {
  it('widens to the whole sentence', () => {
    const page = 'Some cities seem to have this figured out better than us. Others do not.';
    const span = locateQuote('seem to have this figured out better', page)!;
    expect(page.slice(span.start, span.end)).toBe('Some cities seem to have this figured out better than us.');
  });
});
