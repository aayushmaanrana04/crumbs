import type { TaskName } from '../settings/tasks';
import type { ModelInfo, ProviderKind } from './types';

export interface Recommendation {
  id: string;
  note: string;
}

/**
 * Models shown first in each task's list, for providers with long model lists. The first is chosen
 * when a task switches to that provider. Shown only while the provider still lists them.
 */
export const RECOMMENDED_MODELS: Partial<Record<ProviderKind, Partial<Record<TaskName, Recommendation[]>>>> = {
  openrouter: {
    insights: [
      { id: 'anthropic/claude-haiku-5.5', note: 'fast and inexpensive' },
      { id: 'deepseek/deepseek-v4.1-flash', note: 'cheapest' },
    ],
    answer: [
      { id: 'anthropic/claude-sonnet-5.5', note: 'best answers' },
      { id: 'anthropic/claude-haiku-5.5', note: 'faster and cheaper' },
      { id: 'openai/gpt-5.6-terra', note: 'OpenAI' },
    ],
    embed: [
      { id: 'openai/text-embedding-3-small', note: 'inexpensive' },
      { id: 'google/gemini-embedding-2', note: 'more accurate' },
    ],
  },
};

export function recommendedFor(kind: ProviderKind, task: TaskName): Recommendation[] {
  return RECOMMENDED_MODELS[kind]?.[task] ?? [];
}

/** The first recommendation the provider actually offers. */
export function pickRecommended(kind: ProviderKind, task: TaskName, available: ModelInfo[]): string | undefined {
  const ids = new Set(available.map((m) => m.id));
  return recommendedFor(kind, task).find((r) => ids.has(r.id))?.id;
}
