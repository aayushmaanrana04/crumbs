import { describe, expect, it } from 'vitest';
import { cosineSimilarity, highlightTerms, reciprocalRankFusion } from './rank';

describe('ranking', () => {
  it('rewards items ranked well in several lists', () => {
    const scores = reciprocalRankFusion([['a', 'b', 'c'], ['b', 'a', 'd']]);
    const order = [...scores].sort((x, y) => y[1] - x[1]).map(([id]) => id);
    expect(order.slice(0, 2).sort()).toEqual(['a', 'b']);
    expect(scores.get('d')).toBeLessThan(scores.get('a')!);
  });

  it('computes cosine similarity', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('splits text into highlighted parts without HTML', () => {
    expect(highlightTerms('Use Playwright <b> today', ['playwright'])).toEqual([
      { text: 'Use ', match: false },
      { text: 'Playwright', match: true },
      { text: ' <b> today', match: false },
    ]);
  });
});
