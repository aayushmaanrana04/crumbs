<script lang="ts">
  let { title, why, href }: { title: string; why: string; href: string } = $props();
</script>

<a class="related" {href}>
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
  .related:hover {
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
