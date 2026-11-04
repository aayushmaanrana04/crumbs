<script lang="ts">
  import { modelLabel } from '@/lib/library/ai-label';
  import type { AnswerSegment, AskTurn } from '@/lib/search/ask';
  import Markdown from '@/ui/components/Markdown.svelte';
  import { siteLabel } from '@/ui/format';
  import Citation from '@/ui/kit/Citation.svelte';
  import Inference from '@/ui/kit/Inference.svelte';
  import SourceCard from '@/ui/kit/SourceCard.svelte';
  import { docHref } from '@/ui/router.svelte';

  // One answer with its citations and sources: shared by Ask and the side panel's quick ask.
  let { turn, compact = false }: { turn: AskTurn; compact?: boolean } = $props();

  let active = $state<number | null>(null);

  /** Merge consecutive inference segments so the AI's own reasoning appears as one box. */
  function blocks(segments: AnswerSegment[]): AnswerSegment[] {
    const out: AnswerSegment[] = [];
    for (const s of segments) {
      const last = out.at(-1);
      if (s.kind === 'inference' && last?.kind === 'inference') last.text = `${last.text}\n\n${s.text}`;
      else out.push({ ...s });
    }
    return out;
  }
</script>

<div class="answer" class:compact>
  {#each blocks(turn.segments) as segment, s (s)}
    {#if segment.kind === 'inference'}
      <Inference><Markdown source={segment.text} size="compact" /></Inference>
    {:else}
      <div class="paragraph">
        <Markdown source={segment.text} size="compact" />
        <span class="cites">
          {#each segment.sources as n (n)}
            <Citation {n} active={active === n} onclick={() => (active = active === n ? null : n)} />
          {/each}
        </span>
      </div>
    {/if}
  {/each}

  {#if turn.sources.length}
    <div class="sources">
      {#each turn.sources as hit, i (hit.chunk.id)}
        <!-- A source without a library id is the open page, passed in by the side panel. -->
        <SourceCard
          n={i + 1}
          title={hit.doc.id ? hit.doc.title : `${hit.doc.title} (this page)`}
          site={siteLabel(hit.doc)}
          href={hit.doc.id ? docHref(hit.doc.id, { start: hit.chunk.charStart, end: hit.chunk.charEnd }) : hit.doc.url}
          active={active === i + 1}
        />
      {/each}
    </div>
    <p class="meta">
      {turn.mode === 'hybrid' ? 'Matched by keyword and meaning' : 'Matched by keyword'} · {modelLabel(turn.model)}
    </p>
  {:else}
    <p class="meta">No saved pages matched this question.</p>
  {/if}
</div>

<style>
  .answer {
    display: grid;
    gap: 14px;
  }
  .compact {
    gap: 10px;
  }
  .paragraph {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .paragraph :global(.markdown) {
    flex: 1;
    font-size: 15px;
    line-height: 1.65;
  }
  .compact .paragraph :global(.markdown) {
    font-size: var(--text-md);
    line-height: 1.6;
  }
  .cites {
    display: flex;
    gap: 4px;
    padding-top: 4px;
  }
  .sources {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 8px;
  }
  .meta {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-3);
  }
</style>
