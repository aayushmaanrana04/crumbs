<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  let { value = $bindable(''), ...rest }: HTMLTextareaAttributes = $props();
</script>

<textarea class="textarea" bind:value {...rest}></textarea>

<style>
  .textarea {
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: var(--r-md);
    background: var(--surface);
    font-size: var(--text-md);
    line-height: 1.5;
    resize: vertical;
  }
  .textarea::placeholder {
    color: var(--text-3);
  }
  .textarea:focus {
    outline: none;
    background: var(--bg);
    box-shadow: 0 0 0 2px var(--focus);
  }
</style>
