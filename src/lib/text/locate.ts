// Find where a quoted sentence sits in a page's Markdown, so a summary can cite it.
// Matching ignores case, spacing, punctuation and Markdown syntax (link targets and images
// included): only the letters and digits a reader sees count. The model may quote just the
// opening words, or a phrase from the middle; the span always covers the whole sentence.

export interface Span {
  start: number;
  end: number;
}

/** Shortest quote worth citing, in letters and digits. Shorter ones match too easily. */
const MIN_LENGTH = 16;
/** When the whole quote isn't found (the model reworded part of it), match its opening and closing. */
const ANCHOR = 40;
/** How far a span may be extended to reach the end of its sentence. */
const MAX_SENTENCE = 400;
const CLOSING = ')]"”’*_`';

/** The start of the sentence containing `from`: just after the previous full stop, or the start of the line. */
function sentenceStart(source: string, from: number): number {
  for (let i = from - 1; i >= 0 && from - i < MAX_SENTENCE; i--) {
    const c = source[i]!;
    if (c === '\n') return i + 1;
    if ('.!?…'.includes(c) && /\s/.test(source[i + 1] ?? '')) return i + 2;
  }
  return from < MAX_SENTENCE ? 0 : from;
}

/** Link targets and images: Markdown a reader doesn't see as text. */
const HIDDEN = /!\[[^\]]*\]\([^)]*\)|\]\([^)]*\)/g;

/** The end of the sentence containing `from`: just after its full stop (not one inside "99.9"), or the end of the line. */
function sentenceEnd(source: string, from: number): number {
  for (let i = from; i < source.length && i - from < MAX_SENTENCE; i++) {
    const c = source[i]!;
    if (c === '\n') return i;
    if ('.!?…'.includes(c) && (i + 1 === source.length || /\s/.test(source[i + 1]!))) {
      let end = i + 1;
      while (end < source.length && CLOSING.includes(source[end]!)) end++;
      return end;
    }
  }
  return source.length - from < MAX_SENTENCE ? source.length : from;
}

/** Letters and digits of `text`, lowercased, with each one's index in the original. */
function squash(text: string): { chars: string; index: number[] } {
  let chars = '';
  const index: number[] = [];
  const hidden = [...text.matchAll(HIDDEN)].map((m) => [m.index! + (m[0].startsWith('!') ? 0 : 1), m.index! + m[0].length]);
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    while (h < hidden.length && i >= hidden[h]![1]!) h++;
    if (h < hidden.length && i >= hidden[h]![0]!) continue;
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
  const span = (from: number, to: number): Span => ({
    start: sentenceStart(source, s.index[from]!),
    end: sentenceEnd(source, s.index[to - 1]! + 1),
  });

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
