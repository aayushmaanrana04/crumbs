<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, icon, children }: { title: string; icon?: Snippet; children?: Snippet } = $props();
</script>

<div class="empty">
  {#if icon}<div class="icon">{@render icon()}</div>{/if}
  <strong>{title}</strong>
  {#if children}<div class="body">{@render children()}</div>{/if}
</div>

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 36px 24px;
    border-radius: var(--r-lg);
    background: var(--surface);
    text-align: center;
  }
  .icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
    border-radius: var(--r-md);
    background: var(--bg);
    color: var(--text-2);
  }
  strong {
    font-size: var(--text-base);
    font-weight: 600;
  }
  .body {
    max-width: 300px;
    font-size: var(--text-md);
    color: var(--text-2);
  }
</style>
