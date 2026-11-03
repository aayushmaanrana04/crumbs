// Content fingerprints: SHA-256 for exact duplicates, simhash for near duplicates.

export function normalizeForHash(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

const FNV_OFFSET = 0xcbf29ce484222325n;
const FNV_PRIME = 0x100000001b3n;
const MASK_64 = (1n << 64n) - 1n;

function fnv1a64(text: string): bigint {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash;
}

/** 64-bit simhash over word 3-shingles, as 16 hex chars. */
export function simhash(normalizedText: string): string {
  const words = normalizedText.split(' ').filter(Boolean);
  const weights = new Array<number>(64).fill(0);
  const shingles = words.length < 3 ? [words.join(' ')] : words.slice(2).map((_, i) => words.slice(i, i + 3).join(' '));

  for (const shingle of shingles) {
    const hash = fnv1a64(shingle);
    for (let bit = 0; bit < 64; bit++) {
      weights[bit]! += (hash >> BigInt(bit)) & 1n ? 1 : -1;
    }
  }

  let result = 0n;
  for (let bit = 0; bit < 64; bit++) {
    if (weights[bit]! > 0) result |= 1n << BigInt(bit);
  }
  return result.toString(16).padStart(16, '0');
}

export function hammingDistance(a: string, b: string): number {
  let x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let count = 0;
  while (x) {
    x &= x - 1n;
    count++;
  }
  return count;
}

/** Pages within this many differing bits are treated as the same content. */
export const NEAR_DUPLICATE_BITS = 3;
