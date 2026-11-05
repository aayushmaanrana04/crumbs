import { z } from 'zod';
import { db, normalizeInsight, PAGE_KINDS, type DocumentType, type Insight } from '../db/schema';
import { normalizeTag, tagCounts } from '../library/documents';
import { estimateTokens, splitIntoChunks } from '../text/chunking';
import { locateQuote } from '../text/locate';
import { refineInsight, type RefinedInsight } from './insight-quality';
import { readableText } from '../text/readable';
import { toJsonSchema } from './json';
import { UNTRUSTED_CONTENT_RULE, wrapDocument } from './prompts';
import { runTask } from './run';

const ENTITY_TYPES = ['person', 'company', 'product', 'technology', 'project'] as const;
const BLOCK_TYPES = ['steps', 'table', 'chart', 'list', 'code', 'quote', 'callout'] as const;

// Blocks are flat (every field present, unused ones empty) so the schema works in strict mode on every provider.
const BlockSchema = z.strictObject({
  type: z.enum(BLOCK_TYPES),
  title: z.string(),
  items: z.array(z.strictObject({ text: z.string(), code: z.string(), lang: z.string() })).describe('steps and list'),
  columns: z.array(z.string()).describe('table'),
  rows: z.array(z.array(z.string())).describe('table; each row has one cell per column'),
  series: z.array(z.strictObject({ label: z.string(), value: z.number() })).describe('chart'),
  unit: z.string().describe('chart'),
  code: z.string().describe('code'),
  lang: z.string().describe('code, and code inside steps'),
  text: z.string().describe('quote and callout'),
  by: z.string().describe('quote'),
  tone: z.enum(['warning', 'info', 'none']).describe('callout'),
});

// Fields are generated in this order: the gist, then the blocks, then key points that cover only what
// the blocks don't. Quotes are just the opening words of a page sentence; the code finds the rest.
const SOURCE = 'The first 6 to 12 words of the page sentence that supports this, copied exactly; "" if none does.';

export const InsightSchema = z.strictObject({
  kind: z.enum(PAGE_KINDS),
  gist: z.string().describe('One sentence, at most 25 words: the main point or what the page lets you do, and why it matters.'),
  gistQuote: z.string().describe(SOURCE),
  blocks: z.array(BlockSchema).describe('0 to 4 structured parts the reader would come back to look up, most important first.'),
  keyPoints: z
    .array(z.strictObject({ text: z.string(), quote: z.string().describe(SOURCE) }))
    .describe('2 to 5 points, at most 25 words each, covering what matters that the gist and blocks do not already show.'),
  note: z.string().describe('Empty, or one sentence about something important missing from the saved text.'),
  tags: z.array(z.string()).describe('1 to 3 lowercase topic tags of one or two words.'),
  entities: z
    .array(z.strictObject({ name: z.string(), type: z.enum(ENTITY_TYPES) }))
    .describe('At most 8 specific named things the page is substantially about.'),
});

export type InsightOutput = z.infer<typeof InsightSchema>;

const SYSTEM = `You turn a saved web page into a compact card for the reader's personal library: enough to recall the page in seconds and to find again what they would come back for. Every word must earn its place.

- kind: what the page is.
- gist: one sentence of at most 25 words with the page's main point, or what it lets you do, and the outcome or why it matters. Start with the substance, never with the page or its author ("The article…", "This guide covers…"). Name the person, product or company when that is what makes the page memorable.
- blocks: the parts worth looking up again, most important first, using only what the page shows:
  steps for a procedure, with its code; table for values compared across items (options, parameters, plans, before/after results, codes); chart for one measure in one unit across 2 to 10 items; code for a command or snippet to copy; list for items that are neither a sequence nor a comparison; quote for the most memorable line, with who said it; callout "warning" for gotchas and must-dos (all in one), callout "info" for the page's own verdict or recommendation.
  Lead with the page's headline results. Copy numbers, code (including its comments) and quotes exactly; never invent, fix or compute them. Table rows have one cell per column. Leave unused fields empty ("" or []) and tone "none" except on callouts.
- keyPoints: 2 to 5 points of at most 25 words that add what the gist and blocks do not show. Never restate a block's item.
- note: empty unless something the reader needs isn't in the saved text, such as code or a chart shown only as an image ([image: …] marks images) or a truncated page. Never use it to judge the page.
- tags: 1 to 3 broad topic tags of one or two words, e.g. "kubernetes", "payments". Reuse a library tag only if it names this page's main topic.
- entities: specific named people, companies, products, technologies or projects the page is substantially about, each once.
- Use only what the page says. Never mention page details: title, URL, byline, dates, reading time, navigation.
${UNTRUSTED_CONTENT_RULE}`;

// Pages above this size are summarised in parts, then merged. Current models read far more, and one
// pass is both cheaper and better than parts, so only very long pages are split.
const SINGLE_PASS_TOKENS = 60_000;
const PART_TOKENS = 40_000;
const MAX_PARTS = 5;
const EXISTING_TAGS_LIMIT = 60;

/** The library's most-used tags, so new pages reuse them instead of inventing near-duplicates. */
async function existingTags(excludeDocId: string): Promise<string[]> {
  const [counts, own] = await Promise.all([tagCounts(), db.documents.get(excludeDocId)]);
  for (const t of own?.tags ?? []) counts.set(t, counts.get(t)! - 1);
  return [...counts]
    .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, EXISTING_TAGS_LIMIT).map(([t]) => t);
}

function context(type: DocumentType, tags: string[]): string {
  const tagLine = tags.length ? `Tags already used in this library: ${tags.join(', ')}.\n` : '';
  return `Page type (from its URL, may be imprecise): ${type}.\n${tagLine}\n`;
}

async function analyse(prompt: string, source: string, docId: string): Promise<{ draft: RefinedInsight; model: string }> {
  const result = await runTask('insights', { system: SYSTEM, schema: toJsonSchema(InsightSchema), effort: 'low', prompt }, docId);
  return { draft: refineInsight(InsightSchema.parse(result.json), source, normalizeTag), model: result.model };
}

export async function generateInsights(docId: string): Promise<void> {
  const doc = await db.documents.get(docId);
  if (!doc) return;

  const prefix = context(doc.type, await existingTags(docId));
  const source = doc.markdown;
  // The model gets the text a reader sees: link targets and image URLs only cost tokens.
  const text = readableText(source);
  let result: { draft: RefinedInsight; model: string };
  if (estimateTokens(text) <= SINGLE_PASS_TOKENS) {
    result = await analyse(`${prefix}Summarise this page.\n\n${wrapDocument(doc.title, doc.url, text)}`, source, docId);
  } else {
    const parts = splitIntoChunks(text, PART_TOKENS).slice(0, MAX_PARTS);
    const partials: RefinedInsight[] = [];
    for (const [i, part] of parts.entries()) {
      const { draft } = await analyse(
        `${prefix}Summarise part ${i + 1} of ${parts.length} of this page.\n\n${wrapDocument(doc.title, doc.url, part)}`,
        source,
        docId,
      );
      partials.push(draft);
    }
    result = await analyse(
      `${prefix}These are summaries of consecutive parts of one page titled ${JSON.stringify(doc.title)}. ` +
        `Merge them into one summary of the whole page, following the same rules. Take quotes unchanged from the parts' gistQuote and keyPointQuotes.\n\n<document>\n${JSON.stringify(partials)}\n</document>`,
      source,
      docId,
    );
  }

  const { gistQuote, keyPointQuotes, ...draft } = result.draft;
  const cite = (quote: string) => (quote ? locateQuote(quote, source) : null);
  const insight: Insight = {
    docId,
    version: 2,
    ...draft,
    citations: { gist: cite(gistQuote), keyPoints: keyPointQuotes.map(cite) },
    model: result.model,
    createdAt: Date.now(),
  };
  await db.transaction('rw', db.insights, db.documents, async () => {
    const previous = await db.insights.get(docId);
    await db.insights.put(insight);
    const current = await db.documents.get(docId);
    if (!current) return;
    // Apply suggested tags only to pages the user hasn't tagged by hand: untagged, or still
    // carrying exactly the tags a previous summary suggested.
    const previousTags = previous ? normalizeInsight(previous).tags.map(normalizeTag) : [];
    const untouched =
      current.tags.length === 0 ||
      (previousTags.length > 0 && current.tags.length === previousTags.length && current.tags.every((t) => previousTags.includes(t)));
    if (untouched) await db.documents.update(docId, { tags: insight.tags });
  });
}

/**
 * Pages whose summary predates the current format. Pages whose re-summarise already failed are left
 * for the user to retry, so a failing page doesn't cost a model call on every service-worker start.
 */
export async function outdatedInsightDocIds(): Promise<string[]> {
  const [outdated, failed] = await Promise.all([
    db.insights.filter((i) => i.version !== 2).primaryKeys(),
    db.jobs.where('status').equals('failed').filter((j) => j.type === 'insights').toArray(),
  ]);
  const skip = new Set(failed.map((j) => j.docId));
  return (outdated as string[]).filter((id) => !skip.has(id));
}
