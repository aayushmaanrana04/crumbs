<script lang="ts">
  import Quote from '@lucide/svelte/icons/quote';

  // Numbered for Ask's sources; without `n` it's the quote mark a summary uses to show where a point comes from.
  let { n, active = false, onclick }: { n?: number; active?: boolean; onclick?: () => void } = $props();
</script>

<button
  type="button"
  class="cite"
  class:active
  aria-label={n === undefined ? 'Show where this comes from' : `Source ${n}`}
  aria-expanded={n === undefined ? active : undefined}
  {onclick}
>
  {#if n === undefined}<Quote size={10} strokeWidth={2.5} />{:else}{n}{/if}
</button>

<style>
  .cite {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--surface);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    vertical-align: 2px;
  }
  .cite:hover,
  .active {
    background: var(--primary);
    color: var(--on-primary);
  }
</style>
