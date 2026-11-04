<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLSelectAttributes } from 'svelte/elements';
  import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';

  let { value = $bindable(), children, ...rest }: HTMLSelectAttributes & { children: Snippet } = $props();
</script>

<span class="select">
  <select bind:value {...rest}>{@render children()}</select>
  <ChevronsUpDown size={14} />
</span>

<style>
  .select {
    position: relative;
    display: inline-flex;
    align-items: center;
    max-width: 100%;
  }
  select {
    appearance: none;
    max-width: 100%;
    padding: 7px 30px 7px 12px;
    border: none;
    border-radius: var(--r-sm);
    background: var(--surface);
    font-size: var(--text-md);
    font-weight: 500;
    cursor: pointer;
    text-overflow: ellipsis;
  }
  select:hover {
    background: var(--hover);
  }
  .select :global(svg) {
    position: absolute;
    right: 10px;
    pointer-events: none;
    color: var(--text-3);
  }
</style>
