// Find where a quoted sentence sits in a page's Markdown, so a summary can cite it.
// Matching ignores case, spacing, punctuation and Markdown syntax: only letters and digits count.

export interface Span {
  start: number;
  end: number;
}

/** Shortest quote worth citing, in letters and digits. Shorter ones match too easily. */
const MIN_LENGTH = 16;
/** When the whole quote isn't found (the model reworded part of it), match its opening and closing. */
const ANCHOR = 40;
const CLOSING = '.!?…)]"”’*_`';

/** Letters and digits of `text`, lowercased, with each one's index in the original. */
function squash(text: string): { chars: string; index: number[] } {
  let chars = '';
  const index: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (!/[\p{L}\p{N}]/u.test(c)) continue;
    const lower = c.toLowerCase();
    chars += lower;
    for (let k = 0; k < lower.length; k++) index.push(i);
  }
  return { chars, index };
}

/** The span of `quote` in `source`, or null if it isn't there. */
export function locateQuote(quote: string, source: string): Span | null {
  const q = squash(quote).chars;
  if (q.length < MIN_LENGTH) return null;
  const s = squash(source);
  const span = (from: number, to: number): Span => {
    let end = s.index[to - 1]! + 1;
    // Take the sentence's closing punctuation and Markdown markers too, so the passage reads whole.
    while (end < source.length && CLOSING.includes(source[end]!)) end++;
    return { start: s.index[from]!, end };
  };

  const at = s.chars.indexOf(q);
  if (at >= 0) return span(at, at + q.length);
  if (q.length < ANCHOR * 2) return null;

  // Opening and closing words match, close together: the model changed a word in the middle.
  const head = q.slice(0, ANCHOR);
  const tail = q.slice(-ANCHOR);
  for (let from = s.chars.indexOf(head); from >= 0; from = s.chars.indexOf(head, from + 1)) {
    const to = s.chars.indexOf(tail, from + head.length);
    if (to >= 0 && to + ANCHOR - from <= q.length * 1.3) return span(from, to + ANCHOR);
  }
  return null;
}
