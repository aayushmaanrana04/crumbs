<script lang="ts">
  import type { Snippet } from 'svelte';
  import Lightbulb from '@lucide/svelte/icons/lightbulb';

  let { children }: { children: Snippet } = $props();
</script>

<aside class="inference">
  <div class="head"><Lightbulb size={13} /> Not from your sources</div>
  <div class="body">{@render children()}</div>
</aside>

<style>
  .inference {
    display: grid;
    gap: 6px;
    padding: 14px 16px;
    border-radius: var(--r-lg);
    background: var(--surface);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-3);
  }
  .body {
    font-size: var(--text-base);
    line-height: 1.6;
    color: var(--text-2);
  }
</style>
