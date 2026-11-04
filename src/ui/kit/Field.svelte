<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    label,
    hint,
    error,
    children,
  }: { label: string; hint?: string; error?: string; children: Snippet } = $props();
</script>

<label class="field" class:invalid={!!error}>
  <span class="label">{label}</span>
  {@render children()}
  {#if error}
    <span class="message error">{error}</span>
  {:else if hint}
    <span class="message">{hint}</span>
  {/if}
</label>

<style>
  .field {
    display: grid;
    gap: 6px;
  }
  .label {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-2);
  }
  .message {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .error {
    color: var(--error);
  }
  .invalid :global(.input) {
    box-shadow: 0 0 0 1.5px var(--error);
  }
</style>
