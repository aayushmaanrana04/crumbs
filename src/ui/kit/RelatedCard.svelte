<script lang="ts">
  // `plain` drops the tile, for short lists in the side panel.
  let { title, why, href, plain = false }: { title: string; why: string; href: string; plain?: boolean } = $props();
</script>

<a class="related" class:plain {href}>
  <span class="title">{title}</span>
  <span class="why">{why}</span>
</a>

<style>
  .related {
    display: grid;
    gap: 3px;
    padding: 13px 16px;
    border-radius: var(--r-lg);
    background: var(--surface);
    text-decoration: none;
    color: inherit;
    transition: background var(--dur) var(--ease);
  }
  .related.plain {
    padding: 8px 10px;
    margin: 0 -10px;
    border-radius: var(--r-sm);
    background: none;
  }
  .related:hover,
  .related.plain:hover {
    background: var(--hover);
  }
  .title {
    font-size: var(--text-md);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .why {
    font-size: var(--text-sm);
    color: var(--text-2);
  }
</style>
