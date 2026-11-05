// Summary eval: runs the real summary pipeline (prompt, schema, checks) on a library export, through
// Haiku via the local Claude CLI, and records each summary with the size of what was sent and returned.
// Skipped unless CARREL_EVAL_IN is set:
//   CARREL_EVAL_IN=library.json CARREL_EVAL_OUT=out.json npx vitest run tools/eval
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, it, vi } from 'vitest';
import type { CompletionRequest } from '../../src/lib/providers/types';

interface Call {
  docId?: string;
  inputChars: number;
  outputChars: number;
  ms: number;
  raw: unknown;
}
const calls: Call[] = [];

function claude(request: CompletionRequest): Promise<{ json: unknown; text: string }> {
  const args = ['-p', '--output-format', 'json', '--model', 'haiku', '--tools', '', '--strict-mcp-config', '--setting-sources', '', '--no-session-persistence'];
  if (request.system) args.push('--system-prompt', request.system);
  if (request.schema) args.push('--json-schema', JSON.stringify(request.schema));
  return new Promise((resolve, reject) => {
    const child = spawn('claude', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('close', () => {
      try {
        const parsed = JSON.parse(out);
        if (parsed.is_error) return reject(new Error(parsed.result));
        resolve({ json: parsed.structured_output, text: parsed.result ?? '' });
      } catch (e) {
        reject(e);
      }
    });
    child.stdin.end(request.prompt);
  });
}

vi.mock('../../src/lib/ai/run', () => ({
  async runTask(_task: string, request: CompletionRequest, docId?: string) {
    const started = Date.now();
    const { json, text } = await claude(request);
    calls.push({
      docId,
      inputChars: (request.system ?? '').length + request.prompt.length + JSON.stringify(request.schema ?? {}).length,
      outputChars: JSON.stringify(json ?? text).length,
      ms: Date.now() - started,
      raw: json,
    });
    return { text, json, model: 'claude-haiku-5-5', durationMs: Date.now() - started, usage: {} };
  },
}));

const input = process.env.CARREL_EVAL_IN;

describe.skipIf(!input)('summary eval', () => {
  it('summarises every page', { timeout: 30 * 60_000 }, async () => {
    const { db } = await import('../../src/lib/db/schema');
    const { generateInsights } = await import('../../src/lib/ai/insights');
    // A Carrel backup ("documents") or a raw dump ("docs").
    const file = JSON.parse(readFileSync(input!, 'utf8')) as { docs?: { id: string; title: string }[]; documents?: { id: string; title: string }[] };
    const library = { docs: file.documents ?? file.docs ?? [] };
    await db.documents.bulkPut(library.docs as never);

    const only = process.env.CARREL_EVAL_ONLY;
    const ids = library.docs.filter((d) => !only || d.title.includes(only)).map((d) => d.id);
    let next = 0;
    // A few at a time, like the extension's queue.
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (next < ids.length) {
          const id = ids[next++]!;
          await generateInsights(id).catch((e) => console.error(id, e));
        }
      }),
    );

    const results = ids.map((id) => ({ docId: id, insight: null as unknown, calls: calls.filter((c) => c.docId === id) }));
    for (const r of results) r.insight = await db.insights.get(r.docId);
    writeFileSync(process.env.CARREL_EVAL_OUT ?? 'eval-out.json', JSON.stringify(results, null, 1));
  });
});
