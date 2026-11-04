<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import { normalizeTag } from '@/lib/library/documents';
  import Tag from '@/ui/kit/Tag.svelte';

  let { tags, onchange }: { tags: string[]; onchange: (tags: string[]) => void } = $props();
  let adding = $state(false);
  let draft = $state('');

  function commit() {
    const tag = normalizeTag(draft);
    draft = '';
    adding = false;
    if (tag && !tags.includes(tag)) onchange([...tags, tag]);
  }
</script>

<div class="tags">
  {#each tags as tag (tag)}
    <Tag label={tag} onremove={() => onchange(tags.filter((t) => t !== tag))} />
  {/each}
  {#if adding}
    <!-- svelte-ignore a11y_autofocus -->
    <input
      autofocus
      placeholder="tag"
      aria-label="New tag"
      bind:value={draft}
      onkeydown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') {
          draft = '';
          adding = false;
        }
      }}
      onblur={commit}
    />
  {:else}
    <button type="button" class="add" onclick={() => (adding = true)}><Plus size={12} /> Tag</button>
  {/if}
</div>

<style>
  .tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .add {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border: none;
    border-radius: var(--r-xs);
    background: none;
    font-size: var(--text-sm);
    color: var(--text-3);
    cursor: pointer;
  }
  .add:hover {
    background: var(--hover);
    color: var(--text);
  }
  input {
    width: 100px;
    padding: 3px 8px;
    border: none;
    border-radius: var(--r-xs);
    background: var(--bg);
    box-shadow: 0 0 0 2px var(--focus);
    font-size: var(--text-sm);
  }
  input:focus {
    outline: none;
  }
</style>
