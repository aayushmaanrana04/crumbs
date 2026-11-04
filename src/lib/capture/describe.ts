import type { SaveOutcome } from './save';

const TOAST_TEXT: Record<SaveOutcome['status'], string> = {
  saved: 'Saved to Carrel',
  updated: 'Updated in Carrel',
  unchanged: 'Already in Carrel',
  duplicate: 'Already saved',
};

export function describeOutcome(outcome: SaveOutcome): string {
  const base = TOAST_TEXT[outcome.status];
  return outcome.highlightAdded ? `${base} · highlight added` : base;
}
