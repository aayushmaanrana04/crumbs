import { describe, expect, it } from 'vitest';
import { chunkWithOffsets, estimateTokens, packSentencesIntoChunks, splitIntoChunks } from './chunking';

describe('chunking', () => {
  it('returns short text as a single chunk', () => {
    expect(splitIntoChunks('One sentence. Two sentences.')).toEqual(['One sentence. Two sentences.']);
  });

  it('keeps every chunk within the token budget', () => {
    const text = Array.from({ length: 200 }, (_, i) => `Sentence number ${i} has a few words.`).join(' ');
    const chunks = splitIntoChunks(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(estimateTokens(chunk)).toBeLessThanOrEqual(50);
    expect(chunks.join('').replace(/\s+/g, '')).toBe(text.replace(/\s+/g, ''));
  });

  it('word-splits a sentence larger than the budget', () => {
    const long = Array.from({ length: 100 }, () => 'word').join(' ');
    const chunks = packSentencesIntoChunks([long], 14);
    for (const chunk of chunks) expect(estimateTokens(chunk)).toBeLessThanOrEqual(14);
    expect(chunks.join(' ').split(' ')).toHaveLength(100);
  });
});

describe('chunkWithOffsets', () => {
  it('returns spans whose offsets slice back to their text', () => {
    const text = Array.from({ length: 120 }, (_, i) => `Passage sentence ${i} has some words in it.`).join(' ');
    const spans = chunkWithOffsets(text, 60);
    expect(spans.length).toBeGreaterThan(1);
    for (const span of spans) {
      expect(text.slice(span.start, span.end)).toBe(span.text);
      expect(estimateTokens(span.text)).toBeLessThanOrEqual(60);
    }
    expect(spans[0]!.start).toBe(0);
    for (let i = 1; i < spans.length; i++) expect(spans[i]!.start).toBeGreaterThanOrEqual(spans[i - 1]!.end);
  });

  it('splits an oversized sentence with valid offsets', () => {
    const text = `Intro. ${Array.from({ length: 200 }, (_, i) => `w${i}`).join(' ')}`;
    for (const span of chunkWithOffsets(text, 30)) expect(text.slice(span.start, span.end)).toBe(span.text);
  });
});
