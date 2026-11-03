// What AI has done for a document, derived from the job queue and stored results
// rather than a stored flag, so it can't drift out of sync.
import type { Job, JobType } from '../db/schema';

export type AiTaskState =
  /** Result stored and nothing pending. */
  | 'done'
  | 'running'
  /** Waiting in the queue (includes retry backoff). */
  | 'queued'
  | 'failed'
  /** No model configured for this task, and no result yet. */
  | 'off'
  /** A model is configured but this document was never processed. */
  | 'missing';

export interface AiStatus {
  insights: AiTaskState;
  embed: AiTaskState;
  /** Last error for a failed or retrying task. */
  error?: string;
}

export interface AiStatusInput {
  jobs: Job[];
  hasInsight: boolean;
  hasEmbeddings: boolean;
  activeTypes: JobType[];
}

function taskState(type: JobType, hasResult: boolean, { jobs, activeTypes }: AiStatusInput): AiTaskState {
  const job = jobs.find((j) => j.type === type);
  if (job?.status === 'running') return 'running';
  if (job?.status === 'failed') return 'failed';
  const active = activeTypes.includes(type);
  if (job?.status === 'queued' && active) return 'queued';
  if (hasResult) return 'done';
  return active ? 'missing' : 'off';
}

export function aiStatus(input: AiStatusInput): AiStatus {
  return {
    insights: taskState('insights', input.hasInsight, input),
    embed: taskState('embed', input.hasEmbeddings, input),
    error: input.jobs.find((j) => j.error && j.status !== 'done')?.error,
  };
}

/** The single state to show when there's only room for one badge; summaries take priority. */
export function overallState(status: AiStatus): AiTaskState {
  const order: AiTaskState[] = ['running', 'failed', 'queued'];
  for (const state of order) if (status.insights === state || status.embed === state) return state;
  return status.insights;
}
