import { overallState, type AiStatus, type AiTaskState } from './ai-status';

/** Short status for list rows, in words (the design system never uses coloured dots). */
const ROW_LABEL: Record<AiTaskState, string> = {
  done: 'Summarised',
  running: 'Summarising…',
  queued: 'Waiting',
  failed: "Couldn't summarise",
  off: 'Not summarised',
  missing: 'Not summarised',
};

export function rowStatus(status: AiStatus): { label: string; tone: 'normal' | 'error' } {
  const state = overallState(status);
  return { label: ROW_LABEL[state], tone: state === 'failed' ? 'error' : 'normal' };
}

/** Friendly model name, e.g. "claude-haiku-5-5" → "Haiku 5.5". Unknown ids pass through. */
export function modelLabel(model: string | undefined): string | undefined {
  if (!model) return undefined;
  const claude = model.match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?$/);
  if (claude) return `${claude[1]![0]!.toUpperCase()}${claude[1]!.slice(1)} ${claude[2]}${claude[3] ? `.${claude[3]}` : ''}`;
  return model.replace(/^models\//, '');
}
