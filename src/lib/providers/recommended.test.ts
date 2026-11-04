import { describe, expect, it } from 'vitest';
import { pickRecommended } from './recommended';

describe('pickRecommended', () => {
  it('picks the first recommendation the provider offers', () => {
    const offered = [{ id: 'google/gemini-3.8-flash' }, { id: 'deepseek/deepseek-v4.1-flash' }];
    expect(pickRecommended('openrouter', 'insights', offered)).toBe('deepseek/deepseek-v4.1-flash');
  });

  it('picks nothing when none are offered or the provider has no recommendations', () => {
    expect(pickRecommended('openrouter', 'answer', [{ id: 'some/other-model' }])).toBeUndefined();
    expect(pickRecommended('ollama', 'insights', [{ id: 'llama3' }])).toBeUndefined();
  });
});
