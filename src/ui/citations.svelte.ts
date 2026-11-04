import type { Insight } from '@/lib/db/schema';
import type { Span } from '@/lib/text/locate';

/** 'gist', or the index of a key point. */
export type CiteKey = 'gist' | number;

/**
 * Which summary point has its source passage open (one at a time), and that passage's text.
 * Summaries made before citations, and points whose quote wasn't found, have no passage.
 */
export function citations(insight: () => Insight, markdown: () => string | undefined) {
  let open = $state<CiteKey | null>(null);

  const span = (key: CiteKey): Span | null => {
    const c = insight().citations;
    return (key === 'gist' ? c?.gist : c?.keyPoints[key]) ?? null;
  };

  return {
    /** The cited span, if this point has one and the page text is loaded. */
    span(key: CiteKey): Span | null {
      return markdown() ? span(key) : null;
    },
    text(key: CiteKey): string {
      const s = span(key);
      return s ? (markdown() ?? '').slice(s.start, s.end) : '';
    },
    isOpen: (key: CiteKey) => open === key,
    toggle(key: CiteKey) {
      open = open === key ? null : key;
    },
  };
}
