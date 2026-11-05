<script lang="ts">
  import type { Snippet } from 'svelte';
  import Info from '@lucide/svelte/icons/info';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import X from '@lucide/svelte/icons/x';

  let {
    title,
    tone = 'info',
    children,
    action,
    ondismiss,
  }: { title: string; tone?: 'info' | 'error'; children?: Snippet; action?: Snippet; ondismiss?: () => void } = $props();
</script>

<div class="banner {tone}" role={tone === 'error' ? 'alert' : 'status'}>
  {#if tone === 'error'}<CircleAlert size={16} />{:else}<Info size={16} />{/if}
  <div class="text">
    <strong>{title}</strong>
    {#if children}<span>{@render children()}</span>{/if}
  </div>
  {#if action}<div class="action">{@render action()}</div>{/if}
  {#if ondismiss}<button type="button" class="dismiss" aria-label="Dismiss" onclick={ondismiss}><X size={14} /></button>{/if}
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
  .dismiss {
    display: flex;
    margin: -4px -6px 0 0;
    padding: 4px;
    border: none;
    border-radius: var(--r-sm);
    background: none;
    color: var(--text-3);
    cursor: pointer;
  }
  .dismiss:hover {
    background: var(--hover);
    color: var(--text);
  }
  .action :global(.btn.secondary) {
    background: var(--bg);
  }
</style>
