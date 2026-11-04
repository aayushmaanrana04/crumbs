<script lang="ts">
  import type { Component } from 'svelte';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import IconButton from './IconButton.svelte';

  export interface MenuItem {
    label: string;
    icon?: Component;
    danger?: boolean;
    disabled?: boolean;
    onselect: () => void;
  }

  let { items, label = 'More actions' }: { items: MenuItem[]; label?: string } = $props();
  let open = $state(false);
  let root = $state<HTMLElement>();

  $effect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root?.contains(e.target as Node)) open = false;
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  });
</script>

<div class="menu-root" bind:this={root}>
  <IconButton {label} aria-haspopup="menu" aria-expanded={open} onclick={() => (open = !open)}><Ellipsis /></IconButton>
  {#if open}
    <div class="menu" role="menu">
      {#each items as item (item.label)}
        <button
          type="button"
          role="menuitem"
          class:danger={item.danger}
          disabled={item.disabled}
          onclick={() => {
            open = false;
            item.onselect();
          }}
        >
          {#if item.icon}<item.icon size={14} />{/if}
          {item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .menu-root {
    position: relative;
  }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    z-index: 20;
    min-width: 200px;
    display: grid;
    gap: 2px;
    padding: 5px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg);
    box-shadow: var(--shadow-pop);
  }
  button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 9px;
    border: none;
    border-radius: 7px;
    background: none;
    font-size: var(--text-md);
    text-align: left;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: var(--hover);
  }
  button :global(svg) {
    color: var(--text-2);
  }
  .danger,
  .danger :global(svg) {
    color: var(--error);
  }
  button:disabled {
    opacity: 0.4;
  }
</style>
