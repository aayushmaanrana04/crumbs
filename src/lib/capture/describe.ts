import type { SaveOutcome } from './save';

const TOAST_TEXT: Record<SaveOutcome['status'], string> = {
  saved: 'Saved to Crumbs',
  updated: 'Updated in Crumbs',
  unchanged: 'Already in Crumbs',
  duplicate: 'Already saved',
};

export function describeOutcome(outcome: SaveOutcome): string {
  const base = TOAST_TEXT[outcome.status];
  return outcome.highlightAdded ? `${base} · highlight added` : base;
}
