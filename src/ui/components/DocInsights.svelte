<script lang="ts">
  import Info from '@lucide/svelte/icons/info';
  import type { Insight } from '@/lib/db/schema';
  import { findRelated, type RelatedDocument } from '@/lib/library/related';
  import InsightBlocks from '@/ui/components/InsightBlocks.svelte';
  import NumberedPoint from '@/ui/kit/NumberedPoint.svelte';
  import RelatedCard from '@/ui/kit/RelatedCard.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import { docHref } from '@/ui/router.svelte';

  // The gist, key points, structured blocks and related pages: shared by the Library preview and the page view.
  let { docId, insight }: { docId: string; insight: Insight } = $props();

  let related = $state<RelatedDocument[]>([]);

  $effect(() => {
    void insight.createdAt;
    findRelated(docId).then((r) => (related = r));
  });
</script>

<section>
  <p class="gist">{insight.gist}</p>
  {#if insight.note}<p class="note"><Info size={13} /> {insight.note}</p>{/if}
</section>

{#if insight.keyPoints.length}
  <section>
    <SectionHeading label="Key points" />
    <ol class="points">
      {#each insight.keyPoints as text, i (i)}<NumberedPoint n={i + 1} {text} />{/each}
    </ol>
  </section>
{/if}

{#each insight.blocks as block, i (i)}
  <section><InsightBlocks {block} /></section>
{/each}

{#if related.length}
  <section>
    <SectionHeading label="Related in your library" />
    <div class="related">
      {#each related as r (r.doc.id)}<RelatedCard title={r.doc.title} why={r.why} href={docHref(r.doc.id)} />{/each}
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
  .note {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 10px 0 0;
    font-size: var(--text-sm);
    color: var(--text-3);
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
