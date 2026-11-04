<script lang="ts">
  let { text, meta }: { text: string; meta?: string } = $props();
</script>

<figure class="highlight">
  <blockquote>“{text}”</blockquote>
  {#if meta}<figcaption>{meta}</figcaption>{/if}
</figure>

<style>
  .highlight {
    margin: 0;
    display: grid;
    gap: 6px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    background: var(--surface);
  }
  blockquote {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.5;
  }
  figcaption {
    font-size: var(--text-xs);
    color: var(--text-3);
  }
</style>
