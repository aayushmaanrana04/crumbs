<script lang="ts">
  import type { Snippet } from 'svelte';

  // The page the side panel is about: site, title, then its status and actions.
  let { site, title, children }: { site: string; title: string; children?: Snippet } = $props();
</script>

<section class="card">
  <p class="site">{site}</p>
  <h1 class="title">{title}</h1>
  {#if children}<div class="extra">{@render children()}</div>{/if}
</section>

<style>
  .card {
    display: grid;
    gap: 4px;
    padding: 16px;
    border-radius: var(--r-lg);
    background: var(--surface);
  }
  .site {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.2px;
    line-height: 1.35;
  }
  .extra {
    display: grid;
    gap: 12px;
    margin-top: 4px;
  }
</style>
