import { z } from 'zod';
import { db, type Insight } from '../db/schema';
import { normalizeTag } from '../library/documents';
import { estimateTokens, splitIntoChunks } from '../text/chunking';
import { toJsonSchema } from './json';
import { UNTRUSTED_CONTENT_RULE, wrapDocument } from './prompts';
import { runTask } from './run';

const ENTITY_TYPES = ['concept', 'technology', 'person', 'company', 'product', 'project'] as const;

export const InsightSchema = z.strictObject({
  tldr: z.string().describe('Two or three sentences capturing the core point.'),
  takeaways: z.array(z.string()).describe('3-7 key takeaways, each one sentence.'),
  facts: z
    .array(z.string())
    .describe('Concrete facts, figures, numbers and dates from the body text. Exclude page details such as the title, URL, author and publish date. Empty if none.'),
  topics: z.array(z.string()).describe('2-6 short topic labels, lowercase, e.g. "browser automation".'),
  entities: z
    .array(z.strictObject({ name: z.string(), type: z.enum(ENTITY_TYPES) }))
    .describe('Named people, companies, products, technologies, projects and key concepts mentioned.'),
  terms: z.array(z.string()).describe('Important terminology the text defines or relies on.'),
});

export type InsightOutput = z.infer<typeof InsightSchema>;

const SYSTEM = `You analyse saved web pages for a personal knowledge library. Extract only what the text supports; do not add outside knowledge. ${UNTRUSTED_CONTENT_RULE}`;

// Pages above this size are summarised in parts, then merged.
const SINGLE_PASS_TOKENS = 12_000;
const PART_TOKENS = 8_000;
const MAX_PARTS = 6;

async function analyse(prompt: string, docId: string): Promise<{ output: InsightOutput; model: string }> {
  const result = await runTask(
    'insights',
    { system: SYSTEM, prompt, schema: toJsonSchema(InsightSchema), effort: 'low' },
    docId,
  );
  return { output: InsightSchema.parse(result.json), model: result.model };
}

export async function generateInsights(docId: string): Promise<void> {
  const doc = await db.documents.get(docId);
  if (!doc) return;

  let result: { output: InsightOutput; model: string };
  if (estimateTokens(doc.markdown) <= SINGLE_PASS_TOKENS) {
    result = await analyse(`Analyse this page.\n\n${wrapDocument(doc.title, doc.url, doc.markdown)}`, docId);
  } else {
    const parts = splitIntoChunks(doc.markdown, PART_TOKENS).slice(0, MAX_PARTS);
    const partials: InsightOutput[] = [];
    for (const [i, part] of parts.entries()) {
      const { output } = await analyse(
        `Analyse part ${i + 1} of ${parts.length} of this page.\n\n${wrapDocument(doc.title, doc.url, part)}`,
        docId,
      );
      partials.push(output);
    }
    result = await analyse(
      `These are analyses of consecutive parts of one page titled ${JSON.stringify(doc.title)}. ` +
        `Merge them into one analysis of the whole page, removing duplicates.\n\n<document>\n${JSON.stringify(partials)}\n</document>`,
      docId,
    );
  }

  const insight: Insight = { docId, ...result.output, model: result.model, createdAt: Date.now() };
  await db.transaction('rw', db.insights, db.documents, async () => {
    await db.insights.put(insight);
    const current = await db.documents.get(docId);
    // Auto-tag only untagged documents, so tags the user edited are never overwritten.
    if (current && current.tags.length === 0) {
      const tags = [...new Set(insight.topics.map(normalizeTag).filter(Boolean))];
      await db.documents.update(docId, { tags });
    }
  });
}
