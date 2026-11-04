import { beforeEach, describe, expect, it } from 'vitest';
import { saveExtractedPage } from '../capture/save';
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
    expect(ctx.related[0]!.why).toMatch(/^Matches /);
    expect(ctx.notes.map((n) => n.text)).toEqual(['Try handoffs first.']);

    const self = await pageContext({ url: 'https://blog.dev/langgraph?utm_source=x', title: 'LangGraph supervisor agents' });
    expect(self.saved?.id).toBe(a.docId);
    expect(self.related.map((r) => r.doc.id)).not.toContain(a.docId);
  });

  it('falls back to pages from the same site and ignores single-word matches', async () => {
    await saveExtractedPage({ url: 'https://react.dev/learn/state', title: 'Managing state', excerpt: '', markdown: text('state reducers context'), type: 'docs', selection: '' }, 'manual');
    const ctx = await pageContext({ url: 'https://react.dev/learn/thinking', title: 'Thinking in components' });
    expect(ctx.related).toEqual([expect.objectContaining({ why: 'Same site' })]);

    const none = await pageContext({ url: 'https://elsewhere.dev/x', title: 'Practice' });
    expect(none.related).toEqual([]);
  });
});
