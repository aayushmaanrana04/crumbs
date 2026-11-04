<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = HTMLButtonAttributes & {
    kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'md' | 'sm';
    href?: string;
    full?: boolean;
    children: Snippet;
  };

  let { kind = 'secondary', size = 'md', href, full = false, children, ...rest }: Props = $props();
</script>

{#if href}
  <a class="btn {kind} {size}" class:full {href} target="_blank" rel="noopener noreferrer">{@render children()}</a>
{:else}
  <button type="button" class="btn {kind} {size}" class:full {...rest}>{@render children()}</button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid transparent;
    border-radius: var(--r-sm);
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background var(--dur) var(--ease),
      opacity var(--dur) var(--ease);
  }
  .md {
    padding: 7px 14px;
    font-size: var(--text-md);
  }
  .sm {
    padding: 4px 10px;
    font-size: var(--text-sm);
  }
  .full {
    width: 100%;
  }
  .primary {
    background: var(--primary);
    color: var(--on-primary);
  }
  .primary:hover:not(:disabled) {
    opacity: 0.88;
  }
  .secondary {
    background: var(--surface);
    color: var(--text);
  }
  .ghost {
    background: transparent;
    color: var(--text-2);
  }
  .danger {
    background: transparent;
    color: var(--error);
    border-color: var(--border);
  }
  .secondary:hover:not(:disabled),
  .ghost:hover:not(:disabled),
  .danger:hover:not(:disabled) {
    background: var(--hover);
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn :global(svg) {
    width: 14px;
    height: 14px;
  }
</style>
