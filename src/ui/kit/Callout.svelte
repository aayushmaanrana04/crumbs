<script lang="ts">
  import type { Snippet } from 'svelte';
  import Info from '@lucide/svelte/icons/info';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';

  let { tone = 'info', children }: { tone?: 'info' | 'warning'; children: Snippet } = $props();
</script>

<div class="callout {tone}">
  {#if tone === 'warning'}<TriangleAlert size={15} />{:else}<Info size={15} />{/if}
  <div class="text">{@render children()}</div>
</div>

<style>
  .callout {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 14px;
    border-radius: var(--r-md);
    background: var(--surface);
    font-size: var(--text-base);
    line-height: 1.55;
  }
  .callout :global(svg) {
    flex-shrink: 0;
    margin-top: 3px;
    color: var(--text-2);
  }
  .warning :global(svg) {
    color: var(--error);
  }
  .text {
    flex: 1;
  }
</style>
