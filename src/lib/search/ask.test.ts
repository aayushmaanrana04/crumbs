import { describe, expect, it } from 'vitest';
import { toJsonSchema } from '../ai/json';
import { InsightSchema } from '../ai/insights';
import { AnswerSchema, validateSegments } from './ask';

describe('answer validation', () => {
  it('drops citations to missing sources and demotes unsupported claims to inference', () => {
    const segments = validateSegments(
      [
        { text: 'Supported.', kind: 'sourced', sources: [1, 1, 2] },
        { text: 'Bad citation.', kind: 'sourced', sources: [9] },
        { text: 'My view.', kind: 'inference', sources: [1] },
        { text: '  ', kind: 'sourced', sources: [1] },
      ],
      2,
    );
    expect(segments).toEqual([
      { text: 'Supported.', kind: 'sourced', sources: [1, 2] },
      { text: 'Bad citation.', kind: 'inference', sources: [] },
      { text: 'My view.', kind: 'inference', sources: [] },
    ]);
  });

  it('produces strict JSON schemas for structured output', () => {
    for (const schema of [AnswerSchema, InsightSchema]) {
      const json = toJsonSchema(schema) as { additionalProperties?: boolean; required?: string[]; $schema?: string };
      expect(json.$schema).toBeUndefined();
      expect(json.additionalProperties).toBe(false);
      expect(json.required?.length).toBeGreaterThan(0);
    }
  });
});
