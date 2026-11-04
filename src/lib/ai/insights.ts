import { z } from 'zod';
import { db, normalizeInsight, PAGE_KINDS, type DocumentType, type Insight } from '../db/schema';
import { normalizeTag, tagCounts } from '../library/documents';
import { estimateTokens, splitIntoChunks } from '../text/chunking';
import { gistProblems, refineInsight, type GistProblem, type RefinedInsight } from './insight-quality';
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

export const InsightSchema = z.strictObject({
  kind: z.enum(PAGE_KINDS),
  gist: z.string().describe('One sentence, at most 25 words, stating the main point or what the page lets you do.'),
  keyPoints: z.array(z.string()).describe('2 to 5 points, each at most 25 words, each adding something new.'),
  blocks: z.array(BlockSchema).describe('0 to 4 structured blocks, following the recipe for the page kind.'),
  note: z.string().describe('Empty, or one sentence about something important missing from the saved text.'),
  tags: z.array(z.string()).describe('1 to 3 broad lowercase topic labels.'),
  entities: z
    .array(z.strictObject({ name: z.string(), type: z.enum(ENTITY_TYPES) }))
    .describe('At most 8 specific named things the page is substantially about.'),
});

export type InsightOutput = z.infer<typeof InsightSchema>;

const SYSTEM = `You turn a saved web page into a compact, useful card for the reader's personal library: the gist, the key points, and the structured parts they would actually come back for. Be brief; every word must earn its place.

1. Decide the page kind, then follow its recipe for blocks:
- docs (documentation, API or SDK reference): how to implement it. A "steps" block "How to implement" (setup to first working call, code copied from the page), a "table" of the key parameters or options with their meaning, and a "callout" warning for gotchas.
- tutorial (how-to, walkthrough, or a post explaining how to do something): a "steps" block with the steps in order and their code, plus a "callout" for prerequisites or pitfalls.
- repo (code repository, README): what it's for in the gist; a "code" block with the install command, a "code" block with the quick-start usage, a "list" of main features.
- data (post or report built around numbers): a "table" of the data points, and a "chart" when 2 to 10 values measure the same thing in the same unit; a "list" of findings; a "callout" for caveats about the method.
- research (paper): a "list" with problem, method and limitations; a "table" of results.
- comparison (review, X vs Y): a "table" of options against criteria, then the verdict as a "callout".
- release (release notes, changelog, announcement): a "list" of what's new, a "callout" warning for breaking changes, "steps" to upgrade if given.
- pricing: a "table" of plans with price and what's included.
- discussion (Q&A, forum, issue thread): the working solution as "steps" or "code", plus a "callout" if answers disagree.
- news: a "list" of what happened, who, when, and why it matters.
- opinion (essay, interview, talk): a "list" of the arguments or lessons, and a "quote" of the most memorable line, copied exactly.
- other: whatever blocks help most, or none.

2. Rules:
- gist: one sentence of at most 25 words stating the main point or what the page lets you do. Start with the substance; never describe the page or its author ("The article…", "This documentation covers…", "The authors argue…").
  Bad: "The article argues that backends should handle shutdown signals gracefully."
  Good: "Handle SIGTERM so in-flight requests finish before Kubernetes' grace period ends and SIGKILL arrives."
- keyPoints: 2 to 5 points of at most 25 words. Each adds something not in the gist, another point or a block.
- Blocks: at most 4. Use only numbers, code and quotes that appear in the page, copied exactly; never invent or compute code or values. A chart's values must all appear in the page. Table rows have one cell per column. Leave unused block fields empty ("" or []), and set tone to "none" unless the block is a callout.
- note: empty unless content is missing from the saved text (shown only as an image, truncated, collapsed), e.g. "The code example is an image, so it isn't in the saved copy." Never use the note to judge or correct the page.
- Never mention page details: title, URL, author or byline, publish or update dates, reading time, site navigation.
- tags: 1 to 3 broad, reusable topic labels such as "kubernetes", "career", "payments". Prefer tags the library already uses.
- entities: only specific named people, companies, products, technologies or named projects the page is substantially about. At most 8, each name once. No generic concepts.
- Use only what the page says; add no outside knowledge.
${UNTRUSTED_CONTENT_RULE}`;

const PROBLEM_FEEDBACK: Record<GistProblem, string> = {
  'describes-the-page': 'it describes the page instead of stating its point',
  'too-long': 'it is longer than 25 words',
  empty: 'it is empty',
};

// Pages above this size are summarised in parts, then merged.
const SINGLE_PASS_TOKENS = 12_000;
const PART_TOKENS = 8_000;
const MAX_PARTS = 6;
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
  const request = { system: SYSTEM, schema: toJsonSchema(InsightSchema), effort: 'low' as const };
  const first = await runTask('insights', { ...request, prompt }, docId);
  let draft = refineInsight(InsightSchema.parse(first.json), source, normalizeTag);
  let model = first.model;

  // One repair attempt when the gist breaks a rule; keep the better of the two.
  const problems = gistProblems(draft.gist);
  if (problems.length) {
    const feedback = problems.map((p) => PROBLEM_FEEDBACK[p]).join(' and ');
    const retry = await runTask(
      'insights',
      { ...request, prompt: `${prompt}\n\nYour previous gist was rejected because ${feedback}: ${JSON.stringify(draft.gist)}\nReturn the whole summary again with a corrected gist.` },
      docId,
    );
    const second = refineInsight(InsightSchema.parse(retry.json), source, normalizeTag);
    if (gistProblems(second.gist).length < problems.length) {
      draft = second;
      model = retry.model;
    }
  }
  return { draft, model };
}

export async function generateInsights(docId: string): Promise<void> {
  const doc = await db.documents.get(docId);
  if (!doc) return;

  const prefix = context(doc.type, await existingTags(docId));
  const source = doc.markdown;
  let result: { draft: RefinedInsight; model: string };
  if (estimateTokens(source) <= SINGLE_PASS_TOKENS) {
    result = await analyse(`${prefix}Summarise this page.\n\n${wrapDocument(doc.title, doc.url, source)}`, source, docId);
  } else {
    const parts = splitIntoChunks(source, PART_TOKENS).slice(0, MAX_PARTS);
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
        `Merge them into one summary of the whole page, following the same rules.\n\n<document>\n${JSON.stringify(partials)}\n</document>`,
      source,
      docId,
    );
  }

  const insight: Insight = { docId, version: 2, ...result.draft, model: result.model, createdAt: Date.now() };
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
