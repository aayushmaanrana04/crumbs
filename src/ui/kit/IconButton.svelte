<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = HTMLButtonAttributes & {
    label: string;
    variant?: 'plain' | 'filled' | 'primary';
    children: Snippet;
  };

  let { label, variant = 'plain', children, ...rest }: Props = $props();
</script>

<button type="button" class="icon-btn {variant}" aria-label={label} title={label} {...rest}>
  {@render children()}
</button>

<style>
  .icon-btn {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: var(--r-sm);
    background: transparent;
    color: var(--text-2);
    cursor: pointer;
    transition: background var(--dur) var(--ease);
  }
  .icon-btn:hover:not(:disabled) {
    background: var(--hover);
    color: var(--text);
  }
  .filled {
    width: 30px;
    height: 30px;
    border-radius: 9px;
    background: var(--surface);
    color: var(--text);
  }
  .primary {
    width: 30px;
    height: 30px;
    background: var(--primary);
    color: var(--on-primary);
  }
  .primary:hover:not(:disabled) {
    background: var(--primary);
    color: var(--on-primary);
    opacity: 0.88;
  }
  .icon-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .icon-btn :global(svg) {
    width: 16px;
    height: 16px;
  }
</style>
