<script lang="ts">
  import type { Snippet } from 'svelte';

  let { title, description, children }: { title?: string; description?: string; children: Snippet } = $props();
</script>

<section class="group">
  {#if title}
    <header>
      <h2>{title}</h2>
      {#if description}<p>{description}</p>{/if}
    </header>
  {/if}
  <div class="rows">{@render children()}</div>
</section>

<style>
  .group {
    display: grid;
    gap: 10px;
  }
  header h2 {
    margin: 0;
    font-size: var(--text-base);
    font-weight: 600;
  }
  header p {
    margin: 2px 0 0;
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .rows {
    display: grid;
    padding: 4px 0;
    border-radius: var(--r-lg);
    background: var(--bg);
  }
  .rows > :global(* + *) {
    border-top: 1px solid var(--border);
  }
</style>
