<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    href,
    label,
    count,
    active = false,
    icon,
  }: { href: string; label: string; count?: number | string; active?: boolean; icon?: Snippet } = $props();
</script>

<a class="nav-item" class:active {href} aria-current={active ? 'page' : undefined}>
  {#if icon}{@render icon()}{/if}
  <span class="label">{label}</span>
  {#if count !== undefined && count !== ''}<span class="count">{count}</span>{/if}
</a>

<style>
  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: var(--r-sm);
    color: var(--text-2);
    text-decoration: none;
    font-size: var(--text-md);
    font-weight: 500;
    transition: background var(--dur) var(--ease);
  }
  .nav-item:hover:not(.active) {
    background: var(--hover);
    color: var(--text);
  }
  .active {
    background: var(--bg);
    color: var(--text);
    font-weight: 600;
    box-shadow: var(--shadow-chip);
  }
  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .count {
    font-size: var(--text-sm);
    font-weight: 400;
    color: var(--text-3);
  }
  .nav-item :global(svg) {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
</style>
