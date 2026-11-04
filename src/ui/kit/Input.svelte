<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  let { value = $bindable(''), ...rest }: HTMLInputAttributes = $props();
</script>

<input class="input" bind:value {...rest} />

<style>
  .input {
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: var(--r-sm);
    background: var(--surface);
    font-size: var(--text-md);
    transition:
      background var(--dur) var(--ease),
      box-shadow var(--dur) var(--ease);
  }
  .input::placeholder {
    color: var(--text-3);
  }
  .input:focus {
    outline: none;
    background: var(--bg);
    box-shadow: 0 0 0 2px var(--focus);
  }
</style>
