<script lang="ts">
  import { modelLabel } from '@/lib/library/ai-label';
  import type { AiStatus } from '@/lib/library/ai-status';
  import { rpc } from '@/lib/rpc/client';
  import { formatDate } from '@/ui/format';
  import Spinner from '@/ui/kit/Spinner.svelte';

  let { docId, status, model, at }: { docId: string; status: AiStatus; model?: string; at?: number } = $props();

  const run = () => rpc('jobs.reprocess', { docId });
  const states = $derived([status.insights, status.embed]);
</script>

<div class="ai-status">
  {#if states.includes('running')}
    <Spinner />
    <span>Summarising this page…</span>
  {:else if states.includes('failed')}
    <span class="error-text">
      Couldn't {status.insights === 'failed' ? 'summarise' : 'index for search'}{status.error ? `: ${status.error}` : ''}
    </span>
    <button type="button" onclick={run}>Retry</button>
  {:else if states.includes('queued')}
    <Spinner />
    <span>Waiting to be summarised</span>
  {:else if status.insights === 'done'}
    <span>Summarised{model ? ` by ${modelLabel(model)}` : ''}{at ? ` · ${formatDate(at)}` : ''}</span>
    <button type="button" onclick={run}>Re-run</button>
  {:else if status.insights === 'missing'}
    <span>Not summarised yet</span>
    <button type="button" onclick={run}>Summarise now</button>
  {:else}
    <span>AI summaries are off</span>
    <a href="#/settings">Choose a model</a>
  {/if}
</div>

<style>
  .ai-status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  button,
  a {
    padding: 0;
    border: none;
    background: none;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
</style>
