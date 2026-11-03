// Sentence-aware text chunking, used to split documents for embedding and long-document AI calls.

const TOKENS_PER_WORD = 1.4;

/** Rough token estimate (~1.4 tokens per English word). */
export function estimateTokens(text: string): number {
  return Math.ceil(countWords(text) * TOKENS_PER_WORD);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

let segmenter: Intl.Segmenter | undefined;

export function segmentSentences(text: string): string[] {
  segmenter ??= new Intl.Segmenter('en', { granularity: 'sentence' });
  return Array.from(segmenter.segment(text), (s) => s.segment).filter((s) => s.trim().length > 0);
}

/** Greedily pack sentences into chunks; sentences larger than a chunk are split at word boundaries. */
export function packSentencesIntoChunks(sentences: string[], maxTokens: number): string[] {
  const maxWords = Math.max(1, Math.floor(maxTokens / TOKENS_PER_WORD));
  const chunks: string[] = [];
  let parts: string[] = [];
  let partTokens = 0;

  const flush = () => {
    if (parts.length > 0) chunks.push(parts.join(''));
    parts = [];
    partTokens = 0;
  };

  for (const sentence of sentences) {
    const tokens = estimateTokens(sentence);

    if (tokens > maxTokens) {
      flush();
      const words = sentence.split(/\s+/).filter(Boolean);
      for (let i = 0; i < words.length; i += maxWords) {
        chunks.push(words.slice(i, i + maxWords).join(' '));
      }
      continue;
    }

    if (partTokens + tokens > maxTokens) flush();
    parts.push(sentence);
    partTokens += tokens;
  }

  flush();
  return chunks;
}

export function splitIntoChunks(text: string, maxTokensPerChunk = 1500): string[] {
  if (estimateTokens(text) <= maxTokensPerChunk) return [text];
  return packSentencesIntoChunks(segmentSentences(text), maxTokensPerChunk);
}

export interface TextSpan {
  text: string;
  start: number;
  end: number;
}

/**
 * Split text into passages of at most `maxTokens`, keeping character offsets
 * into the original string so citations can point at the exact passage.
 */
export function chunkWithOffsets(text: string, maxTokens = 350): TextSpan[] {
  segmenter ??= new Intl.Segmenter('en', { granularity: 'sentence' });
  const maxWords = Math.max(1, Math.floor(maxTokens / TOKENS_PER_WORD));
  const spans: TextSpan[] = [];
  let start = -1;
  let end = 0;
  let tokens = 0;

  const flush = () => {
    if (start >= 0) {
      const slice = text.slice(start, end);
      if (slice.trim()) spans.push({ text: slice, start, end });
    }
    start = -1;
    tokens = 0;
  };

  for (const { segment, index } of segmenter.segment(text)) {
    if (!segment.trim()) continue;
    const segmentTokens = estimateTokens(segment);

    if (segmentTokens > maxTokens) {
      flush();
      const words = [...segment.matchAll(/\S+/g)];
      for (let i = 0; i < words.length; i += maxWords) {
        const first = words[i]!;
        const last = words[Math.min(i + maxWords, words.length) - 1]!;
        const wordStart = index + first.index;
        const wordEnd = index + last.index + last[0].length;
        spans.push({ text: text.slice(wordStart, wordEnd), start: wordStart, end: wordEnd });
      }
      continue;
    }

    if (tokens + segmentTokens > maxTokens) flush();
    if (start < 0) start = index;
    end = index + segment.length;
    tokens += segmentTokens;
  }

  flush();
  return spans;
}
