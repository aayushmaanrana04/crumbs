import { storage } from '#imports';
import type { ProviderKind } from '../providers/types';

/** Which provider and model each kind of AI work uses. */
export type TaskName = 'insights' | 'answer' | 'embed';

export interface TaskModel {
  provider: ProviderKind | '';
  model: string;
}

export type TaskSettings = Record<TaskName, TaskModel>;

export const TASKS: { name: TaskName; label: string; description: string; needs: 'completion' | 'embeddings' }[] = [
  {
    name: 'insights',
    label: 'Understanding pages',
    description:
      'Summaries, key points, topics and entities for every saved page, including auto-captured ones, and again when Crumbs updates its summary format. Runs in the background, so a fast, inexpensive model works well.',
    needs: 'completion',
  },
  {
    name: 'answer',
    label: 'Ask',
    description: 'Answers questions across your library with citations. Runs only when you ask.',
    needs: 'completion',
  },
  {
    name: 'embed',
    label: 'Search by meaning',
    description: 'Indexes every saved page for meaning-based search. Choosing or changing this model re-indexes your whole library.',
    needs: 'embeddings',
  },
];

const EMPTY: TaskModel = { provider: '', model: '' };

export const taskSettings = storage.defineItem<TaskSettings>('local:tasks', {
  fallback: { insights: EMPTY, answer: EMPTY, embed: EMPTY },
});

export interface UsageLimits {
  /** Maximum background AI calls per day (insights + embeddings). 0 means no limit. */
  dailyBackgroundCalls: number;
}

export const usageLimits = storage.defineItem<UsageLimits>('local:limits', {
  fallback: { dailyBackgroundCalls: 300 },
});

/** Background job types whose task has an enabled provider. Jobs of other types wait silently. */
export function configuredJobTypes(
  tasks: TaskSettings,
  providers: Partial<Record<ProviderKind, { enabled: boolean }>>,
): ('insights' | 'embed')[] {
  return (['insights', 'embed'] as const).filter((name) => {
    const provider = tasks[name].provider;
    return !!provider && !!providers[provider]?.enabled;
  });
}

/** Stable id for an embedding space; vectors are only compared within one. */
export function embeddingSpace(task: TaskModel): string {
  return `${task.provider}:${task.model}`;
}
