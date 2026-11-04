<script lang="ts">
  import type { Snippet } from 'svelte';

  // `cite` sits right after the text (it may render nothing); `children` opens below it (a cited passage).
  let { n, text, cite, children }: { n: number; text: string; cite?: Snippet; children?: Snippet } = $props();
</script>

<li class="point">
  <span class="n">{n}</span>
  <div class="body">
    <span class="text">{text}{#if cite}&nbsp;{@render cite()}{/if}</span>
    {@render children?.()}
  </div>
</li>

<style>
  .point {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    list-style: none;
  }
  .n {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--surface);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-2);
  }
  .body {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 8px;
  }
  .text {
    font-size: var(--text-base);
    line-height: 1.55;
    padding-top: 1px;
  }
</style>
