<script lang="ts">
  import Info from '@lucide/svelte/icons/info';
  import type { Insight } from '@/lib/db/schema';
  import { findRelated, type RelatedDocument } from '@/lib/library/related';
  import type { Span } from '@/lib/text/locate';
  import { citations, type CiteKey } from '@/ui/citations.svelte';
  import InsightBlocks from '@/ui/components/InsightBlocks.svelte';
  import Markdown from '@/ui/components/Markdown.svelte';
  import Citation from '@/ui/kit/Citation.svelte';
  import CitedPassage from '@/ui/kit/CitedPassage.svelte';
  import NumberedPoint from '@/ui/kit/NumberedPoint.svelte';
  import RelatedCard from '@/ui/kit/RelatedCard.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import { live } from '@/ui/live.svelte';
  import { docHref } from '@/ui/router.svelte';

  // The gist, key points, structured blocks and related pages: shared by the Library preview and the page view.
  // The gist and key points cite the page; `onshow` jumps to a passage in place, otherwise it opens the page there.
  let {
    docId,
    insight,
    markdown,
    onshow,
    showRelated = true,
  }: { docId: string; insight: Insight; markdown?: string; onshow?: (passage: string) => void; showRelated?: boolean } = $props();

  const related = live(() => (showRelated ? findRelated(docId) : []), [] as RelatedDocument[]);
  const cites = citations(() => insight, () => markdown);
</script>

{#snippet citeFor(key: CiteKey)}
  {#if cites.span(key)}<Citation active={cites.isOpen(key)} onclick={() => cites.toggle(key)} />{/if}
{/snippet}

{#snippet passage(key: CiteKey, span: Span | null)}
  {#if span && cites.isOpen(key)}
    <CitedPassage onshow={onshow && (() => onshow(cites.text(key)))} href={onshow ? undefined : docHref(docId, span)}>
      <Markdown source={cites.text(key)} size="compact" />
    </CitedPassage>
  {/if}
{/snippet}

<section>
  <p class="gist">{insight.gist}&nbsp;{@render citeFor('gist')}</p>
  {#if cites.isOpen('gist')}<div class="gist-passage">{@render passage('gist', cites.span('gist'))}</div>{/if}
  {#if insight.note}<p class="note"><span class="note-icon"><Info size={13} /></span> {insight.note}</p>{/if}
</section>

{#if insight.keyPoints.length}
  <section>
    <SectionHeading label="Key points" />
    <ol class="points">
      {#each insight.keyPoints as text, i (i)}
        <NumberedPoint n={i + 1} {text}>
          {#snippet cite()}{@render citeFor(i)}{/snippet}
          {@render passage(i, cites.span(i))}
        </NumberedPoint>
      {/each}
    </ol>
  </section>
{/if}

{#each insight.blocks as block, i (i)}
  <section><InsightBlocks {block} /></section>
{/each}

{#if related.value.length}
  <section>
    <SectionHeading label="Related in your library" />
    <div class="related">
      {#each related.value as r (r.doc.id)}<RelatedCard title={r.doc.title} why={r.why} href={docHref(r.doc.id)} />{/each}
    </div>
  </section>
{/if}

<style>
  /* Hairline between sections; the first one sits directly under the header divider. */
  section {
    padding-bottom: 24px;
  }
  section + section {
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }
  .gist {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: -0.2px;
  }
  .gist-passage {
    margin-top: 10px;
  }
  .note {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin: 10px 0 0;
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .note-icon {
    flex-shrink: 0;
    align-self: flex-start;
    margin-top: 2px;
  }
  .points {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
  }
  .related {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 10px;
  }
</style>
