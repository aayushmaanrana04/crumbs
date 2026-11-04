<script lang="ts">
  import Folder from '@lucide/svelte/icons/folder';
  import X from '@lucide/svelte/icons/x';

  let { name, href, onremove }: { name: string; href?: string; onremove?: () => void } = $props();
</script>

<span class="chip">
  <a {href} class="name"><Folder size={13} /> {name}</a>
  {#if onremove}
    <button type="button" aria-label="Remove from {name}" onclick={onremove}><X size={12} /></button>
  {/if}
</span>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    max-width: 100%;
    padding: 3px 6px 3px 8px;
    border-radius: var(--r-sm);
    background: var(--surface);
  }
  .name {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text);
    text-decoration: none;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .name :global(svg) {
    flex-shrink: 0;
    color: var(--text-2);
  }
  button {
    display: inline-flex;
    padding: 2px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-3);
    cursor: pointer;
  }
  button:hover {
    background: var(--hover);
    color: var(--text);
  }
</style>
