<script lang="ts">
  import type { Snippet } from 'svelte';

  let { label, value, children }: { label: string; value?: string; children?: Snippet } = $props();
</script>

<div class="property">
  <span class="key">{label}</span>
  <span class="value">{#if children}{@render children()}{:else}{value}{/if}</span>
</div>

<style>
  .property {
    display: grid;
    gap: 2px;
    min-width: 0;
  }
  .key {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .value {
    font-size: var(--text-md);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
