<script lang="ts">
  import { renderMarkdown } from '@/ui/markdown';

  let { source }: { source: string } = $props();
  const html = $derived(renderMarkdown(source));
</script>

<!-- Sanitised by DOMPurify in renderMarkdown. -->
<div class="markdown">{@html html}</div>

<style>
  .markdown {
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
  .markdown :global(img) {
    max-width: 100%;
    height: auto;
  }
  .markdown :global(pre) {
    background: var(--color-surface);
    padding: var(--space-3);
    border-radius: var(--radius-sm);
    overflow-x: auto;
  }
  .markdown :global(code) {
    font-size: 0.92em;
  }
  .markdown :global(table) {
    border-collapse: collapse;
  }
  .markdown :global(td),
  .markdown :global(th) {
    border: 1px solid var(--color-border);
    padding: 4px 8px;
  }
  .markdown :global(blockquote) {
    border-left: 3px solid var(--color-border);
    margin-left: 0;
    padding-left: var(--space-3);
    color: var(--color-text-2);
  }
</style>
