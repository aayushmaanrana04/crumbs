<script lang="ts">
  import X from '@lucide/svelte/icons/x';

  let { label, onremove }: { label: string; onremove?: () => void } = $props();
</script>

<span class="tag">
  {label}
  {#if onremove}
    <button type="button" aria-label="Remove tag {label}" onclick={onremove}><X size={12} /></button>
  {/if}
</span>

<style>
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px 3px 10px;
    border-radius: var(--r-xs);
    background: var(--surface);
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  button {
    display: inline-flex;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-3);
    cursor: pointer;
  }
  button:hover {
    color: var(--text);
  }
</style>
