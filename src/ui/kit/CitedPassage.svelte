<script lang="ts">
  import type { Snippet } from 'svelte';

  // The page's own words behind a summary point. Pass `onshow` to jump within the page, or `href` to open it.
  let { children, onshow, href }: { children: Snippet; onshow?: () => void; href?: string } = $props();
</script>

<div class="passage">
  <div class="quote">{@render children()}</div>
  <div class="foot">
    <span class="meta">From the page</span>
    {#if onshow}
      <button type="button" class="link" onclick={onshow}>Show in full text</button>
    {:else if href}
      <a class="link" {href}>Show in full text</a>
    {/if}
  </div>
</div>

<style>
  .passage {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    background: var(--surface);
  }
  .quote {
    font-size: var(--text-md);
    line-height: 1.55;
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .meta {
    font-size: var(--text-xs);
    color: var(--text-3);
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    font-size: var(--text-md);
    font-weight: 500;
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
</style>
