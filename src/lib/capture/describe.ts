import type { SaveOutcome } from './save';

const TOAST_TEXT: Record<SaveOutcome['status'], string> = {
  saved: 'Saved to Summaryse',
  updated: 'Updated in Summaryse',
  unchanged: 'Already in Summaryse',
  duplicate: 'Already saved',
};

export function describeOutcome(outcome: SaveOutcome): string {
  const base = TOAST_TEXT[outcome.status];
  return outcome.highlightAdded ? `${base} · highlight added` : base;
}
