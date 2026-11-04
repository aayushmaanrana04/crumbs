<script lang="ts">
  import { db, normalizeInsight } from '@/lib/db/schema';
  import { updateDocument } from '@/lib/library/documents';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import AiStatus from '@/ui/components/AiStatus.svelte';
  import DocProjects from '@/ui/components/DocProjects.svelte';
  import NotesField from '@/ui/components/NotesField.svelte';
  import NumberedPoint from '@/ui/kit/NumberedPoint.svelte';
  import HighlightCard from '@/ui/kit/HighlightCard.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import { live } from '@/ui/live.svelte';

  // The side panel for a page that's already in the library: status, gist, key points, projects, highlights, notes.
  let { docId }: { docId: string } = $props();

  const doc = live(() => db.documents.get(docId), undefined);
  const stored = live(() => db.insights.get(docId), undefined);
  const highlights = live(() => db.highlights.where('docId').equals(docId).sortBy('createdAt'), []);
  const ai = aiStatuses();
  const insight = $derived(stored.value ? normalizeInsight(stored.value) : undefined);
</script>

<div class="saved">
  <AiStatus {docId} status={ai.get(docId)} model={insight?.model} at={insight?.createdAt} />

  {#if insight}
    <p class="gist">{insight.gist}</p>
    {#if insight.keyPoints.length}
      <section>
        <SectionHeading label="Key points" />
        <ol class="points">
          {#each insight.keyPoints.slice(0, 3) as text, i (i)}<NumberedPoint n={i + 1} {text} />{/each}
        </ol>
      </section>
    {/if}
  {/if}

  <section>
    <SectionHeading label="Projects" />
    <DocProjects {docId} />
  </section>

  {#if highlights.value.length}
    <section>
      <SectionHeading label="Highlights" />
      <div class="stack">
        {#each highlights.value as h (h.id)}<HighlightCard text={h.text} meta={h.note || undefined} />{/each}
      </div>
    </section>
  {/if}

  {#if doc.value}
    <NotesField label="Your notes" rows={3} placeholder="Add a note…" value={doc.value.userNotes} onsave={(text) => updateDocument(docId, { userNotes: text })} />
  {/if}
</div>

<style>
  .saved {
    display: grid;
    gap: 20px;
  }
  .gist {
    margin: 0;
    font-size: var(--text-lg);
    font-weight: 500;
    line-height: 1.5;
  }
  section {
    display: grid;
    gap: 8px;
  }
  .points {
    display: grid;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .stack {
    display: grid;
    gap: 8px;
  }
</style>
