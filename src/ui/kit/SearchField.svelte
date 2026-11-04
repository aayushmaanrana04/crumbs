<script lang="ts">
  import Search from '@lucide/svelte/icons/search';
  import Kbd from './Kbd.svelte';

  let {
    value = $bindable(''),
    placeholder = 'Search',
    shortcut,
    autofocus = false,
    onsubmit,
    input = $bindable(),
  }: {
    value?: string;
    placeholder?: string;
    shortcut?: string;
    autofocus?: boolean;
    onsubmit?: () => void;
    input?: HTMLInputElement;
  } = $props();
</script>

<form
  class="search"
  role="search"
  onsubmit={(e) => {
    e.preventDefault();
    onsubmit?.();
  }}
>
  <Search size={15} />
  <!-- svelte-ignore a11y_autofocus -->
  <input type="search" {placeholder} {autofocus} aria-label={placeholder} bind:value bind:this={input} />
  {#if shortcut && !value}<Kbd keys={shortcut} />{/if}
</form>

<style>
  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: var(--r-md);
    background: var(--surface);
    color: var(--text-3);
    transition:
      background var(--dur) var(--ease),
      box-shadow var(--dur) var(--ease);
  }
  .search:focus-within {
    background: var(--bg);
    box-shadow: 0 0 0 2px var(--focus);
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 9px 0;
    border: none;
    background: none;
    font-size: var(--text-md);
    color: var(--text);
  }
  input::placeholder {
    color: var(--text-3);
  }
  input:focus {
    outline: none;
  }
  input::-webkit-search-cancel-button {
    display: none;
  }
</style>
