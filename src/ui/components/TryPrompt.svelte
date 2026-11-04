<script lang="ts">
  import { untrack } from 'svelte';
  import type { CompletionResult, ModelInfo, ProviderKind } from '@/lib/providers/types';
  import { rpc } from '@/lib/rpc/client';
  import Button from '@/ui/kit/Button.svelte';
  import Select from '@/ui/kit/Select.svelte';
  import TextArea from '@/ui/kit/TextArea.svelte';

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
  <TextArea rows={2} placeholder="Try a prompt, e.g. ‘Explain local-first software in two sentences.’" bind:value={prompt} />
  <div class="bar">
    <Select bind:value={model} aria-label="Model">
      {#each models as m (m.id)}<option value={m.id}>{m.name ?? m.id}</option>{/each}
    </Select>
    <Button size="sm" kind="primary" disabled={running || !prompt.trim()} onclick={send}>{running ? 'Running…' : 'Send'}</Button>
    {#if result}<span class="faint small">{result.model}{result.durationMs ? ` · ${(result.durationMs / 1000).toFixed(1)}s` : ''}</span>{/if}
  </div>
  {#if result}
    <p class="output">{result.text}</p>
  {:else if error}
    <p class="error-text small">{error}</p>
  {/if}
</div>

<style>
  .try {
    display: grid;
    gap: 8px;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .output {
    margin: 0;
    padding: 12px 14px;
    border-radius: var(--r-md);
    background: var(--surface);
    white-space: pre-wrap;
    font-size: var(--text-md);
    line-height: 1.55;
  }
  p {
    margin: 0;
  }
</style>
