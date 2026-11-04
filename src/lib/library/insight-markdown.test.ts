import { describe, expect, it } from 'vitest';
import { normalizeInsight, type Insight, type LegacyInsight } from '../db/schema';
import { insightToMarkdown } from './insight-markdown';

describe('summaries', () => {
  it('reads old summaries in the new shape, dropping generic concepts', () => {
    const legacy: LegacyInsight = {
      docId: 'd', tldr: 'Gist.', takeaways: ['A'], facts: ['42 ms'], topics: ['t'], terms: ['x'], model: 'm', createdAt: 1,
      entities: [{ name: 'Kubernetes', type: 'technology' }, { name: 'Graceful shutdown', type: 'concept' }],
    };
    expect(normalizeInsight(legacy)).toMatchObject({
      version: 2, gist: 'Gist.', keyPoints: ['A'], tags: ['t'],
      blocks: [{ type: 'list', title: 'Facts and figures', items: ['42 ms'] }],
      entities: [{ name: 'Kubernetes', type: 'technology' }],
    });
  });

  it('renders blocks as Markdown', () => {
    const insight: Insight = {
      docId: 'd', version: 2, kind: 'docs', gist: 'Embed the widget.', keyPoints: ['One SDK per widget.'], note: '', tags: [], entities: [], model: 'm', createdAt: 1,
      blocks: [
        { type: 'steps', title: 'How to implement', items: [{ text: 'Install', code: 'npm i acme', lang: 'bash' }, { text: 'Start', code: '', lang: '' }] },
        { type: 'table', title: 'Options', columns: ['Name', 'Meaning'], rows: [['flowtype', '1 = onramp | 2 = offramp']] },
        { type: 'callout', tone: 'warning', text: 'Re-initialise to reopen.' },
      ],
    };
    const md = insightToMarkdown(insight);
    expect(md).toContain('> Embed the widget.');
    expect(md).toContain('1. Install\n\n   ```bash\n   npm i acme\n   ```\n2. Start');
    expect(md).toContain('| Name | Meaning |\n| --- | --- |\n| flowtype | 1 = onramp \\| 2 = offramp |');
    expect(md).toContain('> **Warning:** Re-initialise to reopen.');
  });
});
