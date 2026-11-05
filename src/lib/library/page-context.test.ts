import { beforeEach, describe, expect, it } from 'vitest';
import { chooseCanonical, saveExtractedPage } from '../capture/save';
import { db } from '../db/schema';
import { pageContext } from './page-context';

const text = (topic: string) => Array.from({ length: 30 }, (_, i) => `Line ${i} about ${topic} and how it works in practice.`).join(' ');

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('pageContext', () => {
  it('finds the saved copy of the page, related pages with a reason, and notes', async () => {
    const a = await saveExtractedPage({ url: 'https://blog.dev/langgraph', title: 'LangGraph supervisor agents', excerpt: '', markdown: text('LangGraph supervisor agents handoffs'), type: 'article', selection: '' }, 'manual');
    await saveExtractedPage({ url: 'https://other.dev/sourdough', title: 'Sourdough', excerpt: '', markdown: text('sourdough starter hydration'), type: 'article', selection: '' }, 'manual');
    await db.documents.update(a.docId, { userNotes: 'Try handoffs first.' });

    const ctx = await pageContext({ url: 'https://docs.dev/multi-agent', title: 'Multi-agent supervisor', lead: 'LangGraph supervisor agents route work with handoffs.' });
    expect(ctx.saved).toBeUndefined();
    expect(ctx.related.map((r) => r.doc.title)).toEqual(['LangGraph supervisor agents']);
    expect(ctx.related[0]!.why).toMatch(/^Mentions /);
    expect(ctx.notes.map((n) => n.text)).toEqual(['Try handoffs first.']);

    const self = await pageContext({ url: 'https://blog.dev/langgraph?utm_source=x', title: 'LangGraph supervisor agents' });
    expect(self.saved?.id).toBe(a.docId);
    expect(self.related.map((r) => r.doc.id)).not.toContain(a.docId);
  });

  it('finds a page saved under the canonical address it declares', async () => {
    const page = { url: 'https://www.uber.com/en-IN/blog/traffic/', declaredCanonicalUrl: 'https://www.uber.com/blog/traffic/', title: 'Traffic forecasting', excerpt: '', markdown: text('traffic forecasting graphs'), type: 'article' as const, selection: '' };
    const { docId } = await saveExtractedPage(page, 'manual');
    const ctx = await pageContext({ url: page.url, canonicalUrl: chooseCanonical(page), title: page.title });
    expect(ctx.saved?.id).toBe(docId);
    expect(ctx.related.map((r) => r.doc.id)).not.toContain(docId);
  });

  it('ignores words that are common across the library', async () => {
    for (const topic of ['sourdough', 'bicycles', 'gardening', 'chess', 'pottery']) {
      await saveExtractedPage({ url: `https://${topic}.dev/`, title: topic, excerpt: '', markdown: text(`${topic} is good and works well whenever you try`), type: 'article', selection: '' }, 'manual');
    }
    const ctx = await pageContext({ url: 'https://new.dev/x', title: 'Kubernetes probes', lead: 'This is good and works well whenever you deploy.' });
    expect(ctx.related).toEqual([]);
    const match = await pageContext({ url: 'https://new.dev/y', title: 'Pottery and chess', lead: 'Pottery glazes and chess openings.' });
    expect(match.related).toEqual([]); // one distinctive word each isn't enough
  });

  it('falls back to pages from the same site and ignores single-word matches', async () => {
    await saveExtractedPage({ url: 'https://react.dev/learn/state', title: 'Managing state', excerpt: '', markdown: text('state reducers context'), type: 'docs', selection: '' }, 'manual');
    const ctx = await pageContext({ url: 'https://react.dev/learn/thinking', title: 'Thinking in components' });
    expect(ctx.related).toEqual([expect.objectContaining({ why: 'Same site' })]);

    const none = await pageContext({ url: 'https://elsewhere.dev/x', title: 'Practice' });
    expect(none.related).toEqual([]);
  });
});
