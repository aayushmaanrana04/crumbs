import { describe, expect, it } from 'vitest';
import { hammingDistance, NEAR_DUPLICATE_BITS, normalizeForHash, sha256Hex, simhash } from './hash';

const article = Array.from({ length: 60 }, (_, i) => `Sentence ${i} explains how browser agents read the DOM tree.`).join(' ');

describe('content fingerprints', () => {
  it('hashes normalised text identically regardless of punctuation and case', async () => {
    expect(await sha256Hex(normalizeForHash('Hello, World!'))).toBe(await sha256Hex(normalizeForHash('hello world')));
  });

  it('treats a lightly edited copy as a near duplicate', () => {
    const edited = article.replace('Sentence 10', 'Line 10');
    expect(hammingDistance(simhash(normalizeForHash(article)), simhash(normalizeForHash(edited)))).toBeLessThanOrEqual(
      NEAR_DUPLICATE_BITS,
    );
  });

  it('keeps unrelated text apart', () => {
    const other = Array.from({ length: 60 }, (_, i) => `Recipe step ${i}: whisk eggs with sugar and butter slowly.`).join(' ');
    expect(hammingDistance(simhash(normalizeForHash(article)), simhash(normalizeForHash(other)))).toBeGreaterThan(
      NEAR_DUPLICATE_BITS,
    );
  });
});
