<script lang="ts">
  import { overallState, type AiStatus, type AiTaskState } from '@/lib/library/ai-status';

  let { status }: { status: AiStatus } = $props();

  const LABEL: Record<AiTaskState, string> = {
    done: 'AI summary',
    running: 'AI processing',
    queued: 'Queued for AI',
    failed: 'AI failed',
    off: 'No AI',
    missing: 'Not processed',
  };
  const DETAIL: Record<AiTaskState, string> = {
    done: 'done',
    running: 'processing now',
    queued: 'queued',
    failed: 'failed',
    off: 'off (no model chosen)',
    missing: 'not processed yet',
  };

  const state = $derived(overallState(status));
  const title = $derived(
    `Summary: ${DETAIL[status.insights]} · Search by meaning: ${DETAIL[status.embed]}${status.error ? `\nLast error: ${status.error}` : ''}`,
  );
</script>

<span class="chip ai {state}" {title}>
  {#if state === 'running'}<span class="spinner" aria-hidden="true"></span>{:else if state === 'done'}<span aria-hidden="true">✦</span>{/if}
  {LABEL[state]}
</span>

<style>
  .ai {
    white-space: nowrap;
  }
  .done {
    color: var(--color-primary);
    border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
    background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  }
  .running,
  .queued {
    color: var(--color-primary);
  }
  .failed {
    color: var(--color-error);
    border-color: color-mix(in srgb, var(--color-error) 35%, transparent);
  }
  .off,
  .missing {
    color: var(--color-text-3);
  }
  .spinner {
    width: 9px;
    height: 9px;
    border: 1.5px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
  }
</style>
