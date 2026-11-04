<script lang="ts">
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import { db, normalizeInsight, type KnowledgeDocument } from '@/lib/db/schema';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import AiStatus from '@/ui/components/AiStatus.svelte';
  import DocInsights from '@/ui/components/DocInsights.svelte';
  import { formatRelative, readingMinutes, TYPE_LABELS, siteLabel } from '@/ui/format';
  import Button from '@/ui/kit/Button.svelte';
  import HighlightCard from '@/ui/kit/HighlightCard.svelte';
  import Property from '@/ui/kit/Property.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import { live } from '@/ui/live.svelte';
  import { docHref } from '@/ui/router.svelte';

  // Mounted per document (keyed by the parent), so its queries always match `doc`.
  let { doc }: { doc: KnowledgeDocument } = $props();

  const stored = live(() => db.insights.get(doc.id), undefined);
  const insight = { get value() { return stored.value ? normalizeInsight(stored.value) : undefined; } };
  const highlights = live(() => db.highlights.where('docId').equals(doc.id).sortBy('createdAt'), []);
  const ai = aiStatuses();
</script>

<div class="toolbar">
  <span class="site">{siteLabel(doc)}</span>
  <div class="actions">
    <Button onclick={() => (location.hash = docHref(doc.id))}>Open page</Button>
    <Button kind="primary" href={doc.url}>Original <ArrowUpRight /></Button>
  </div>
</div>

<h2 class="title">{doc.title}</h2>
<div class="props">
  <Property label="Saved" value={formatRelative(doc.capturedAt)} />
  <Property label="Read" value="{readingMinutes(doc.markdown)} min" />
  <Property label="Type" value={TYPE_LABELS[doc.type]} />
  {#if doc.tags.length}<Property label="Tags" value={doc.tags.join(', ')} />{/if}
</div>
<div class="status">
  <AiStatus docId={doc.id} status={ai.get(doc.id)} model={insight.value?.model} at={insight.value?.createdAt} />
</div>

{#if insight.value}
  <DocInsights docId={doc.id} insight={insight.value} />
{:else if doc.excerpt}
  <p class="excerpt">{doc.excerpt}</p>
{/if}

{#if highlights.value.length}
  <section class="highlights-section">
    <SectionHeading label="Your highlights" />
    <div class="highlights">
      {#each highlights.value as h (h.id)}<HighlightCard text={h.text} meta={formatRelative(h.createdAt)} />{/each}
    </div>
  </section>
{/if}

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
  }
  .site {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .title {
    max-width: 680px;
    margin: 0 0 14px;
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.7px;
    line-height: 1.2;
  }
  .props {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 28px;
    margin-bottom: 14px;
  }
  .status {
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .excerpt {
    max-width: 680px;
    font-size: var(--text-lg);
    line-height: 1.6;
    color: var(--text-2);
  }
  section,
  :global(.preview section) {
    max-width: 720px;
  }
  .highlights-section {
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }
  .highlights {
    display: grid;
    gap: 8px;
  }
</style>
