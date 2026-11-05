// Verification of model output against the page. Only objective checks live here: numbers, code
// and quotes must appear in the page, and lists are capped. What to say, and not repeating it, is
// the prompt's job (see insights.ts). Covered by insight-quality.test.ts.
import type { InsightBlock, PageKind } from '../db/schema';
import { locateQuote } from '../text/locate';

export const MAX_KEY_POINTS = 5;
export const MAX_BLOCKS = 4;
export const MAX_ITEMS = 8;
export const MAX_ROWS = 10;
export const MAX_COLUMNS = 5;
export const MAX_SERIES = 10;
export const MAX_ENTITIES = 8;
export const MAX_TAGS = 3;

type EntityDraft = { name: string; type: 'person' | 'company' | 'product' | 'technology' | 'project' };

/** Flat block as the model returns it (strict JSON schemas need every field); unused fields are empty. */
export interface RawBlock {
  type: InsightBlock['type'];
  title: string;
  items: { text: string; code: string; lang: string }[];
  columns: string[];
  rows: string[][];
  series: { label: string; value: number }[];
  unit: string;
  code: string;
  lang: string;
  text: string;
  by: string;
  tone: 'warning' | 'info' | 'none';
}

export interface RawInsight {
  kind: PageKind;
  gist: string;
  gistQuote: string;
  keyPoints: { text: string; quote: string }[];
  blocks: RawBlock[];
  note: string;
  tags: string[];
  entities: EntityDraft[];
}

export interface RefinedInsight {
  kind: PageKind;
  gist: string;
  keyPoints: string[];
  /** Supporting quotes that were found in the page, '' otherwise. One per key point. */
  gistQuote: string;
  keyPointQuotes: string[];
  blocks: InsightBlock[];
  note: string;
  tags: string[];
  entities: EntityDraft[];
}

// --- Verification against the page ---------------------------------------------------------

/** Every number in the page, without thousands separators. */
function numbersIn(text: string): number[] {
  return (text.match(/-?\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ''))).filter(Number.isFinite);
}

function makeNumberCheck(source: string) {
  const known = numbersIn(source);
  return (value: number) => known.some((n) => Math.abs(n - value) <= Math.max(Math.abs(value) * 0.005, 0.05));
}

/** A table cell's numbers must all appear in the page. Cells without numbers pass. */
function cellVerified(cell: string, hasNumber: (n: number) => boolean): boolean {
  return numbersIn(cell).every(hasNumber);
}

const normalizeLine = (line: string) => line.trim().replace(/\s+/g, ' ');

/** Code must be copied from the page: every non-blank line appears there, ignoring indentation and spacing. */
export function codeFromPage(code: string, source: string): boolean {
  const lines = code.split('\n').map(normalizeLine).filter(Boolean);
  if (lines.length === 0) return false;
  const page = new Set(source.split('\n').map(normalizeLine));
  const flat = source.replace(/\s+/g, ' ');
  return lines.every((line) => page.has(line) || flat.includes(line));
}

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

function quoteFromPage(quote: string, source: string): boolean {
  const q = squash(quote);
  return q.length >= 12 && squash(source).includes(q.slice(0, Math.min(q.length, 80)));
}

// --- Blocks -------------------------------------------------------------------------------

function refineBlock(raw: RawBlock, source: string, hasNumber: (n: number) => boolean): InsightBlock | null {
  const title = raw.title.trim();
  switch (raw.type) {
    case 'steps': {
      const items = raw.items
        .map((i) => ({
          text: i.text.trim(),
          code: i.code.trim() && codeFromPage(i.code, source) ? i.code.trim() : '',
          lang: i.code.trim() ? i.lang.trim() : '',
        }))
        .filter((i) => i.text)
        .slice(0, MAX_ITEMS);
      return items.length >= 2 ? { type: 'steps', title, items } : null;
    }
    case 'table': {
      const columns = raw.columns.map((c) => c.trim()).slice(0, MAX_COLUMNS);
      const rows = raw.rows
        .map((r) => r.slice(0, columns.length).map((c) => c.trim()))
        .filter((r) => r.length === columns.length && r.some(Boolean) && r.every((c) => cellVerified(c, hasNumber)))
        .slice(0, MAX_ROWS);
      return columns.length >= 2 && rows.length >= 1 ? { type: 'table', title, columns, rows } : null;
    }
    case 'chart': {
      const series = raw.series
        .filter((p) => p.label.trim() && Number.isFinite(p.value) && hasNumber(p.value))
        .map((p) => ({ label: p.label.trim(), value: p.value }))
        .slice(0, MAX_SERIES);
      return series.length >= 2 ? { type: 'chart', title, unit: raw.unit.trim(), series } : null;
    }
    case 'list': {
      const items = raw.items.map((i) => i.text.trim()).filter(Boolean).slice(0, MAX_ITEMS);
      return items.length ? { type: 'list', title, items } : null;
    }
    case 'code': {
      const code = raw.code.trim();
      return code && codeFromPage(code, source) ? { type: 'code', title, lang: raw.lang.trim(), code } : null;
    }
    case 'quote': {
      const text = raw.text.trim().replace(/^["“]|["”]$/g, '');
      return quoteFromPage(text, source) ? { type: 'quote', text, by: raw.by.trim() } : null;
    }
    case 'callout': {
      const text = raw.text.trim();
      if (!text) return null;
      return { type: 'callout', tone: raw.tone === 'warning' ? 'warning' : 'info', text };
    }
  }
}

const entityKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Tidy and verify a model draft against the page's text. */
export function refineInsight(raw: RawInsight, source: string, normalizeTag: (t: string) => string): RefinedInsight {
  const gist = raw.gist.trim();
  const found = (quote: string) => (locateQuote(quote, source) ? quote.trim() : '');
  const points = raw.keyPoints.filter((p) => p.text.trim()).slice(0, MAX_KEY_POINTS);
  const keyPoints = points.map((p) => p.text.trim());
  const keyPointQuotes = points.map((p) => found(p.quote));

  const hasNumber = makeNumberCheck(source);
  const blocks = raw.blocks
    .map((b) => refineBlock(b, source, hasNumber))
    .filter((b): b is InsightBlock => b !== null)
    .slice(0, MAX_BLOCKS);

  const seen = new Set<string>();
  const entities = raw.entities.filter((e) => {
    const key = entityKey(e.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const note = raw.note.trim();
  return {
    kind: raw.kind,
    gist,
    keyPoints,
    gistQuote: found(raw.gistQuote),
    keyPointQuotes,
    blocks,
    note,
    tags: [...new Set(raw.tags.map(normalizeTag).filter(Boolean))].slice(0, MAX_TAGS),
    entities: entities.slice(0, MAX_ENTITIES),
  };
}
