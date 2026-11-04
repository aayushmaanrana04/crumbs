<script lang="ts">
  import Citation from './Citation.svelte';

  let {
    n,
    title,
    site,
    href,
    active = false,
  }: { n: number; title: string; site: string; href: string; active?: boolean } = $props();
</script>

<a class="source" class:active {href}>
  <Citation {n} {active} />
  <span class="text">
    <span class="title">{title}</span>
    <span class="site">{site}</span>
  </span>
</a>

<style>
  .source {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 9px 12px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    text-decoration: none;
    color: inherit;
    transition: background var(--dur) var(--ease);
  }
  .source:hover,
  .active {
    background: var(--surface);
    border-color: transparent;
  }
  .text {
    display: grid;
    min-width: 0;
  }
  .title {
    font-size: var(--text-sm);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .site {
    font-size: var(--text-xs);
    color: var(--text-3);
  }
</style>
