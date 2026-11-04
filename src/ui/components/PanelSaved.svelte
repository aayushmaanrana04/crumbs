<script lang="ts">
  import { db, normalizeInsight } from '@/lib/db/schema';
  import { updateDocument } from '@/lib/library/documents';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import AiStatus from '@/ui/components/AiStatus.svelte';
  import DocProjects from '@/ui/components/DocProjects.svelte';
  import NumberedPoint from '@/ui/kit/NumberedPoint.svelte';
  import HighlightCard from '@/ui/kit/HighlightCard.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import TextArea from '@/ui/kit/TextArea.svelte';
  import { live } from '@/ui/live.svelte';

  // The side panel for a page that's already in the library: status, gist, key points, projects, highlights, notes.
  let { docId }: { docId: string } = $props();

  const doc = live(() => db.documents.get(docId), undefined);
  const stored = live(() => db.insights.get(docId), undefined);
  const highlights = live(() => db.highlights.where('docId').equals(docId).sortBy('createdAt'), []);
  const ai = aiStatuses();
  const insight = $derived(stored.value ? normalizeInsight(stored.value) : undefined);

  let notesDraft = $state<string | null>(null);
  let notesSaved = $state(false);

  async function saveNotes() {
    if (notesDraft === null || notesDraft === doc.value?.userNotes) return;
    await updateDocument(docId, { userNotes: notesDraft });
    notesSaved = true;
    setTimeout(() => (notesSaved = false), 1500);
  }
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
    <section>
      <h2 class="label">Your notes {#if notesSaved}<span class="faint">Saved</span>{/if}</h2>
      <TextArea
        rows={3}
        placeholder="Add a note…"
        value={notesDraft ?? doc.value.userNotes}
        oninput={(e) => (notesDraft = e.currentTarget.value)}
        onblur={saveNotes}
      />
    </section>
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
  .label {
    display: flex;
    gap: 8px;
    margin: 0;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }
  .faint {
    font-weight: 500;
    color: var(--text-3);
  }
</style>
