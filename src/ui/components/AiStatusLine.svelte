<script lang="ts">
  import type { AiStatus } from '@/lib/library/ai-status';
  import { rpc } from '@/lib/rpc/client';
  import { formatDateTime } from '@/ui/format';

  let { docId, status, model, at }: { docId: string; status: AiStatus; model?: string; at?: number } = $props();

  const busy = $derived([status.insights, status.embed].some((s) => s === 'running' || s === 'queued'));
  const run = () => rpc('jobs.reprocess', { docId });
</script>

<div class="line small" class:attention={status.insights === 'failed' || status.embed === 'failed'}>
  {#if status.insights === 'running' || status.embed === 'running'}
    <span class="spinner" aria-hidden="true"></span>
    <span>AI is processing this page…</span>
  {:else if status.insights === 'failed' || status.embed === 'failed'}
    <span class="error-text">
      AI {status.insights === 'failed' ? 'summary' : 'search indexing'} failed{status.error ? `: ${status.error}` : ''}
    </span>
    <button class="link-button" onclick={run}>Retry</button>
  {:else if status.insights === 'queued' || status.embed === 'queued'}
    <span>Queued for AI processing</span>
  {:else if status.insights === 'done'}
    <span class="done">✦ Summarised{model ? ` by ${model}` : ''}{at ? ` · ${formatDateTime(at)}` : ''}</span>
    <button class="link-button" disabled={busy} onclick={run}>Re-run</button>
  {:else if status.insights === 'missing'}
    <span>Not processed by AI yet</span>
    <button class="link-button" onclick={run}>Run AI now</button>
  {:else}
    <span>AI summaries are off</span>
    <a href="#/settings">Choose a model</a>
  {/if}

  {#if status.embed === 'off' && status.insights !== 'off'}
    <span class="sep">·</span>
    <span>Search by meaning off</span>
    <a href="#/settings">Set up</a>
  {/if}
</div>

<style>
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--color-text-2);
  }
  .done {
    color: var(--color-primary);
    font-weight: 500;
  }
  .sep {
    color: var(--color-text-3);
  }
  .spinner {
    width: 10px;
    height: 10px;
    border: 1.5px solid var(--color-primary);
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
