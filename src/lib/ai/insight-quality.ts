// Deterministic clean-up and verification of model output. Keeps summaries short and
// non-repetitive, and drops numbers, code and quotes that can't be found in the page,
// so structured blocks are as trustworthy as plain text. Covered by insight-quality.test.ts.
import type { InsightBlock, PageKind } from '../db/schema';

export const GIST_MAX_WORDS = 25;
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
  keyPoints: string[];
  blocks: RawBlock[];
  note: string;
  tags: string[];
  entities: EntityDraft[];
}

export interface RefinedInsight {
  kind: PageKind;
  gist: string;
  keyPoints: string[];
  blocks: InsightBlock[];
  note: string;
  tags: string[];
  entities: EntityDraft[];
}

// --- Gist rules ---------------------------------------------------------------------------

const PAGE_NOUN = '(?:article|post|page|blog|piece|essay|documentation|docs|guide|tutorial|interview|paper|readme|video|author|writer)s?';
const REPORTING_VERB = '(?:argues|explains|describes|covers|discusses|shows|profiles|says|outlines|presents|introduces|documents|walks|is|was)';

/** "The article…", "An interview-style post…". */
const DETERMINER_OPENER = new RegExp(`^(?:a|an|the|this|these)\\s+(?:[\\w'’-]+\\s+){0,3}${PAGE_NOUN}\\b`, 'i');
/** "Onramp's Android SDK documentation covers…". */
const NOUN_VERB_OPENER = new RegExp(`^(?:[\\w'’-]+\\s+){0,4}${PAGE_NOUN}\\s+${REPORTING_VERB}\\b`, 'i');
/** "Harness engineers argue…", "The authors show…". */
const AUTHOR_OPENER =
  /^(?:[\w'’-]+\s+){0,3}(?:engineers|team|authors?|researchers|writers?|editors|company)\s+(?:argue|argues|explain|explains|say|says|describe|describes|show|shows|claim|claims|report|reports)\b/i;

/** Page details the summary must not repeat (dates, bylines, freshness). */
const PAGE_DETAIL =
  /\b(?:(?:is|was)\s+(?:dated|published|written|posted)|written by|published (?:on|by)|last updated|updated \d|reading time|min(?:ute)?s? read|the page was|the post is dated)\b/i;

export type GistProblem = 'describes-the-page' | 'too-long' | 'empty';

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function gistProblems(gist: string): GistProblem[] {
  const g = gist.trim();
  const problems: GistProblem[] = [];
  if (!g) problems.push('empty');
  if (DETERMINER_OPENER.test(g) || NOUN_VERB_OPENER.test(g) || AUTHOR_OPENER.test(g)) problems.push('describes-the-page');
  if (wordCount(g) > GIST_MAX_WORDS + 5) problems.push('too-long');
  return problems;
}

// --- Repetition ---------------------------------------------------------------------------

const STOP = new Set(
  'the a an and or of to in on for with by is are was were be as at from that this it its their his her than into about after before can not no so such per you your'.split(' '),
);

function contentWords(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[\p{L}\p{N}%$.]+/gu)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? []);
}

/** Share of the shorter text's content words that also appear in the other (0–1). */
export function overlap(a: string, b: string): number {
  const A = contentWords(a);
  const B = contentWords(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size);
}

const REPEAT = 0.6;
const repeats = (text: string, earlier: string[]) => earlier.some((e) => overlap(text, e) >= REPEAT);

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

const CODE_TOKEN = /[A-Za-z_][\w.$:/-]{2,}/g;

/** Code must come from the page: most of its identifiers appear in the page text. */
export function codeFromPage(code: string, source: string): boolean {
  const tokens = [...new Set(code.match(CODE_TOKEN) ?? [])];
  if (tokens.length === 0) return false;
  const found = tokens.filter((t) => source.includes(t)).length;
  return found / tokens.length >= 0.7;
}

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

function quoteFromPage(quote: string, source: string): boolean {
  const q = squash(quote);
  return q.length >= 12 && squash(source).includes(q.slice(0, Math.min(q.length, 80)));
}

// --- Blocks -------------------------------------------------------------------------------

function refineBlock(raw: RawBlock, source: string, used: string[], hasNumber: (n: number) => boolean): InsightBlock | null {
  const title = raw.title.trim();
  switch (raw.type) {
    case 'steps': {
      const items = raw.items
        .map((i) => ({
          text: i.text.trim(),
          code: i.code.trim() && codeFromPage(i.code, source) ? i.code.trim() : '',
          lang: i.code.trim() ? i.lang.trim() : '',
        }))
        .filter((i) => i.text && !PAGE_DETAIL.test(i.text))
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
      const items: string[] = [];
      for (const i of raw.items) {
        const text = i.text.trim();
        if (!text || PAGE_DETAIL.test(text) || repeats(text, [...used, ...items])) continue;
        items.push(text);
        if (items.length === MAX_ITEMS) break;
      }
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
      // Callouts are short, so a lower bar catches restated key points.
      if (!text || PAGE_DETAIL.test(text) || used.some((e) => overlap(text, e) >= 0.45)) return null;
      return { type: 'callout', tone: raw.tone === 'warning' ? 'warning' : 'info', text };
    }
  }
}

const entityKey = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Tidy and verify a model draft against the page's text. */
export function refineInsight(raw: RawInsight, source: string, normalizeTag: (t: string) => string): RefinedInsight {
  const gist = raw.gist.trim();
  const keyPoints: string[] = [];
  for (const p of raw.keyPoints) {
    const text = p.trim();
    if (!text || PAGE_DETAIL.test(text) || repeats(text, [gist, ...keyPoints])) continue;
    keyPoints.push(text);
    if (keyPoints.length === MAX_KEY_POINTS) break;
  }

  const hasNumber = makeNumberCheck(source);
  const used = [gist, ...keyPoints];
  const blocks: InsightBlock[] = [];
  for (const b of raw.blocks) {
    const block = refineBlock(b, source, used, hasNumber);
    if (!block) continue;
    blocks.push(block);
    if (block.type === 'list') used.push(...block.items);
    if (blocks.length === MAX_BLOCKS) break;
  }

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
    blocks,
    note: note && !PAGE_DETAIL.test(note) ? note : '',
    tags: [...new Set(raw.tags.map(normalizeTag).filter(Boolean))].slice(0, MAX_TAGS),
    entities: entities.slice(0, MAX_ENTITIES),
  };
}
