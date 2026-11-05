<script lang="ts">
  import type { Snippet } from 'svelte';
  import { db, normalizeInsight } from '@/lib/db/schema';
  import { updateDocument } from '@/lib/library/documents';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import AiStatus from '@/ui/components/AiStatus.svelte';
  import DocInsights from '@/ui/components/DocInsights.svelte';
  import DocProjects from '@/ui/components/DocProjects.svelte';
  import NotesField from '@/ui/components/NotesField.svelte';
  import HighlightCard from '@/ui/kit/HighlightCard.svelte';
  import PageCard from '@/ui/kit/PageCard.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import SkeletonRow from '@/ui/kit/SkeletonRow.svelte';
  import { live } from '@/ui/live.svelte';

  // The side panel for a page that's already in the library: its card with the summary's status,
  // the whole summary, then projects, highlights and notes.
  let { docId, site, title, extra }: { docId: string; site: string; title: string; extra?: Snippet } = $props();

  const doc = live(() => db.documents.get(docId), undefined);
  const stored = live(() => db.insights.get(docId), undefined);
  const highlights = live(() => db.highlights.where('docId').equals(docId).sortBy('createdAt'), []);
  const ai = aiStatuses();
  const insight = $derived(stored.value ? normalizeInsight(stored.value) : undefined);
  const status = $derived(ai.get(docId));
  const pending = $derived([status.insights, status.embed].some((s) => s === 'queued' || s === 'running'));
</script>

<PageCard {site} {title}>
  <AiStatus {docId} {status} model={insight?.model} at={insight?.createdAt} />
  {@render extra?.()}
</PageCard>

{#if insight}
  <div class="summary"><DocInsights {docId} {insight} markdown={doc.value?.markdown} showRelated={false} /></div>
{:else if pending}
  <div class="skeleton"><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>
{/if}

<section>
  <SectionHeading label="Projects" />
  <DocProjects {docId} />
</section>

{#if highlights.value.length}
  <section>
    <SectionHeading label="Your highlights" />
    <div class="stack">
      {#each highlights.value as h (h.id)}<HighlightCard text={h.text} meta={h.note || undefined} />{/each}
    </div>
  </section>
{/if}

{#if doc.value}
  <NotesField label="Your notes" rows={2} placeholder="Add a note…" value={doc.value.userNotes} onsave={(text) => updateDocument(docId, { userNotes: text })} />
{/if}

<style>
  .summary {
    display: grid;
  }
  .skeleton {
    display: grid;
    margin: 0 -12px;
  }
  section {
    display: grid;
    gap: 8px;
  }
  .stack {
    display: grid;
    gap: 8px;
  }
</style>
