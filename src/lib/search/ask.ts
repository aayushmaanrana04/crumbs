// Ask: retrieve passages, then have the answer model respond with citations.
import { z } from 'zod';
import { toJsonSchema } from '../ai/json';
import { UNTRUSTED_CONTENT_RULE, wrapSource } from '../ai/prompts';
import { rpc } from '../rpc/client';
import { searchPassages, type PassageHit } from './search';

export const AnswerSchema = z.strictObject({
  segments: z
    .array(
      z.strictObject({
        text: z.string(),
        kind: z.enum(['sourced', 'inference']).describe('"sourced" if the sources state it; "inference" if it is your own reasoning.'),
        sources: z.array(z.number().int()).describe('Ids of the sources that support this segment. Empty for inference.'),
      }),
    )
    .describe('The answer as consecutive segments, in reading order.'),
});

export interface AnswerSegment {
  text: string;
  kind: 'sourced' | 'inference';
  sources: number[];
}

export interface AskTurn {
  question: string;
  segments: AnswerSegment[];
  sources: PassageHit[];
  model: string;
  mode: 'hybrid' | 'keyword';
}

const SYSTEM = [
  'You answer questions using the user\'s personal knowledge library.',
  'Base the answer on the numbered sources. Cite every claim the sources support by their ids.',
  'Mark anything that goes beyond the sources (your own knowledge, reasoning or synthesis) as "inference".',
  'If the sources don\'t answer the question, say so plainly in an inference segment instead of guessing.',
  'Write in plain, concise prose. Use markdown for lists or code only when it helps.',
  UNTRUSTED_CONTENT_RULE,
].join(' ');

const PASSAGES = 8;

/** Drop citations to sources that don't exist; a "sourced" segment with none left becomes inference. */
export function validateSegments(raw: AnswerSegment[], sourceCount: number): AnswerSegment[] {
  return raw
    .filter((s) => s.text.trim())
    .map((segment) => {
      const sources = [...new Set(segment.sources)].filter((n) => n >= 1 && n <= sourceCount);
      const kind = segment.kind === 'sourced' && sources.length > 0 ? 'sourced' : 'inference';
      return { text: segment.text, kind, sources: kind === 'sourced' ? sources : [] };
    });
}

export async function ask(question: string, history: AskTurn[], docIds?: Set<string>): Promise<AskTurn> {
  // Follow-ups like "what about the second one?" retrieve better with the previous question attached.
  const previous = history.at(-1)?.question;
  const retrievalQuery = previous ? `${previous}\n${question}` : question;
  const { hits, mode } = await searchPassages(retrievalQuery, { limit: PASSAGES, docIds });

  const sources = hits.map((hit, i) => wrapSource(i + 1, hit.doc.title, hit.chunk.text)).join('\n\n');
  const conversation = history
    .slice(-3)
    .map((turn) => `Q: ${turn.question}\nA: ${turn.segments.map((s) => s.text).join(' ')}`)
    .join('\n\n');

  const prompt = [
    conversation && `<conversation>\n${conversation}\n</conversation>`,
    hits.length ? `<sources>\n${sources}\n</sources>` : '<sources>\n(no matching passages in the library)\n</sources>',
    `Question: ${question}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const result = await rpc('ai.runTask', {
    task: 'answer',
    request: { system: SYSTEM, prompt, schema: toJsonSchema(AnswerSchema), effort: 'medium' },
  });
  const parsed = AnswerSchema.parse(result.json);
  return { question, segments: validateSegments(parsed.segments, hits.length), sources: hits, model: result.model, mode };
}
