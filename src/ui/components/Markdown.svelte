<script lang="ts">
  import { renderMarkdown } from '@/ui/markdown';

  let { source, size = 'reading' }: { source: string; size?: 'reading' | 'compact' } = $props();
  const html = $derived(renderMarkdown(source));
</script>

<!-- Sanitised by DOMPurify in renderMarkdown. -->
<div class="markdown {size}">{@html html}</div>

<style>
  .markdown {
    overflow-wrap: anywhere;
  }
  .reading {
    font-size: var(--text-lg);
    line-height: 1.7;
  }
  .compact {
    font-size: var(--text-base);
    line-height: 1.6;
  }
  .markdown > :global(:first-child) {
    margin-top: 0;
  }
  .markdown > :global(:last-child) {
    margin-bottom: 0;
  }
  .markdown :global(h1),
  .markdown :global(h2),
  .markdown :global(h3) {
    margin: 1.8em 0 0.6em;
    line-height: 1.3;
    letter-spacing: -0.2px;
  }
  .markdown :global(h2) {
    font-size: 1.25em;
  }
  .markdown :global(h3) {
    font-size: 1.1em;
  }
  .markdown :global(a) {
    text-decoration: underline;
    text-decoration-color: var(--text-3);
    text-underline-offset: 2px;
  }
  .markdown :global(img) {
    display: block;
    max-width: 100%;
    max-height: 480px;
    width: auto;
    margin: 1.4em auto;
    border-radius: var(--r-md);
  }
  .markdown :global(pre) {
    padding: 14px 16px;
    border-radius: var(--r-md);
    background: var(--surface);
    overflow-x: auto;
    font-size: 0.85em;
  }
  .markdown :global(code) {
    font-size: 0.9em;
  }
  .markdown :global(:not(pre) > code) {
    padding: 1px 5px;
    border-radius: var(--r-xs);
    background: var(--surface);
  }
  .markdown :global(blockquote) {
    margin: 1.2em 0;
    padding: 2px 0 2px 16px;
    border-left: 3px solid var(--hover);
    color: var(--text-2);
  }
  .markdown :global(table) {
    border-collapse: collapse;
    font-size: 0.9em;
  }
  .markdown :global(td),
  .markdown :global(th) {
    padding: 6px 10px;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }
  .markdown :global(hr) {
    border: none;
    height: 1px;
    background: var(--border);
  }
</style>
