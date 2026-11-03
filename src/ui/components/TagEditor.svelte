<script lang="ts">
  import { normalizeTag } from '@/lib/library/documents';

  let { tags, onchange }: { tags: string[]; onchange: (tags: string[]) => void } = $props();
  let draft = $state('');

  function add() {
    const tag = normalizeTag(draft);
    draft = '';
    if (tag && !tags.includes(tag)) onchange([...tags, tag]);
  }
</script>

<div class="tags">
  {#each tags as tag (tag)}
    <span class="chip">
      {tag}
      <button class="remove" aria-label="Remove tag {tag}" onclick={() => onchange(tags.filter((t) => t !== tag))}>×</button>
    </span>
  {/each}
  <input
    class="add"
    placeholder="Add tag"
    bind:value={draft}
    onkeydown={(e) => {
      if (e.key === 'Enter') add();
    }}
    onblur={add}
  />
</div>

<style>
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    align-items: center;
  }
  .remove {
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    font-size: 13px;
    line-height: 1;
  }
  .add {
    border: none;
    background: none;
    font-size: 12px;
    width: 90px;
    padding: 2px 4px;
  }
  .add:focus-visible {
    outline: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
  }
</style>
