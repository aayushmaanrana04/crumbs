<script lang="ts">
  import type { Snippet } from 'svelte';
  import Info from '@lucide/svelte/icons/info';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';

  let {
    title,
    tone = 'info',
    children,
    action,
  }: { title: string; tone?: 'info' | 'error'; children?: Snippet; action?: Snippet } = $props();
</script>

<div class="banner {tone}" role={tone === 'error' ? 'alert' : 'status'}>
  {#if tone === 'error'}<CircleAlert size={16} />{:else}<Info size={16} />{/if}
  <div class="text">
    <strong>{title}</strong>
    {#if children}<span>{@render children()}</span>{/if}
  </div>
  {#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
  .banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text-2);
  }
  .error :global(svg) {
    color: var(--error);
  }
  .banner :global(svg) {
    flex-shrink: 0;
    margin-top: 1px;
  }
  .text {
    flex: 1;
    display: grid;
    gap: 2px;
    font-size: var(--text-sm);
  }
  strong {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--text);
  }
  .action :global(.btn.secondary) {
    background: var(--bg);
  }
</style>
