import { describe, expect, it } from 'vitest';
import { modelLabel, rowStatus } from './ai-label';

describe('ai labels', () => {
  it('describes status in words', () => {
    expect(rowStatus({ insights: 'done', embed: 'done' })).toEqual({ label: 'Summarised', tone: 'normal' });
    expect(rowStatus({ insights: 'failed', embed: 'off' })).toEqual({ label: "Couldn't summarise", tone: 'error' });
    expect(rowStatus({ insights: 'done', embed: 'running' }).label).toBe('Summarising…');
  });

  it('shortens model ids', () => {
    expect(modelLabel('claude-haiku-5-5')).toBe('Haiku 5.5');
    expect(modelLabel('claude-opus-5')).toBe('Opus 5');
    expect(modelLabel('gpt-x-mini')).toBe('gpt-x-mini');
    expect(modelLabel('anthropic/claude-haiku-5.5')).toBe('Haiku 5.5');
    expect(modelLabel('deepseek/deepseek-v4.1-flash')).toBe('deepseek-v4.1-flash');
    expect(modelLabel('models/gemini-x')).toBe('gemini-x');
    expect(modelLabel(undefined)).toBeUndefined();
  });
});
