<script lang="ts">
  import { highlightTerms } from '@/lib/search/rank';

  let { text, terms = [], maxChars = 420 }: { text: string; terms?: string[]; maxChars?: number } = $props();

  // Centre the excerpt on the first match so the relevant part is visible.
  const excerpt = $derived.by(() => {
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean.length <= maxChars) return clean;
    const lower = clean.toLowerCase();
    const first = Math.min(...terms.map((t) => lower.indexOf(t.toLowerCase())).filter((i) => i >= 0), Infinity);
    const start = Number.isFinite(first) ? Math.max(0, first - maxChars / 3) : 0;
    return `${start > 0 ? '…' : ''}${clean.slice(start, start + maxChars)}…`;
  });
  const parts = $derived(highlightTerms(excerpt, terms));
</script>

<p class="passage">
  {#each parts as part, i (i)}{#if part.match}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
</p>

<style>
  .passage {
    margin: 0;
    color: var(--text-2);
    font-size: var(--text-md);
    line-height: 1.55;
  }
  mark {
    background: var(--highlight);
    color: var(--text);
    border-radius: 3px;
  }
</style>
