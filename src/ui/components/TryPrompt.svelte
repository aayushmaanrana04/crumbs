<script lang="ts">
  import { untrack } from 'svelte';
  import type { CompletionResult, ModelInfo, ProviderKind } from '@/lib/providers/types';
  import { rpc } from '@/lib/rpc/client';

  let { kind, models }: { kind: ProviderKind; models: ModelInfo[] } = $props();

  let model = $state(untrack(() => models[0]?.id ?? ''));
  let prompt = $state('');
  let running = $state(false);
  let result = $state<CompletionResult | null>(null);
  let error = $state('');

  async function send() {
    running = true;
    error = '';
    result = null;
    try {
      result = await rpc('ai.complete', { kind, request: { prompt, model } });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      running = false;
    }
  }
</script>

<div class="try">
  <div class="row">
    <span class="label">Try a prompt</span>
    <select class="input model" bind:value={model}>
      {#each models as m (m.id)}
        <option value={m.id}>{m.id}</option>
      {/each}
    </select>
  </div>
  <textarea class="input" rows="3" placeholder="Summarise the idea of local-first software in two sentences." bind:value={prompt}
  ></textarea>
  <div class="row">
    <button class="btn btn-primary" disabled={running || !prompt.trim()} onclick={send}>
      {running ? 'Running…' : 'Send'}
    </button>
    {#if result}
      <span class="meta">{result.model}{result.durationMs ? ` · ${(result.durationMs / 1000).toFixed(1)}s` : ''}</span>
    {/if}
  </div>
  {#if result}
    <pre class="output">{result.text}</pre>
  {:else if error}
    <p class="error">{error}</p>
  {/if}
</div>

<style>
  .try {
    display: grid;
    gap: var(--space-2);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-3);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .label {
    font-weight: 500;
    flex: 1;
  }
  .model {
    width: auto;
  }
  textarea {
    resize: vertical;
  }
  .meta {
    font-size: 12px;
    color: var(--color-text-2);
  }
  .output {
    margin: 0;
    white-space: pre-wrap;
    font-family: inherit;
    background: var(--color-surface);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
  }
  .error {
    margin: 0;
    color: var(--color-error);
    font-size: 13px;
  }
</style>
