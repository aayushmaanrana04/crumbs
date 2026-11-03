<script lang="ts">
  import { tick } from 'svelte';
  import { cleanMarkdown } from '@/lib/capture/clean';
  import { db, type EntityType } from '@/lib/db/schema';
  import { deleteDocument, updateDocument } from '@/lib/library/documents';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import AiStatusLine from '@/ui/components/AiStatusLine.svelte';
  import Markdown from '@/ui/components/Markdown.svelte';
  import TagEditor from '@/ui/components/TagEditor.svelte';
  import { findPassage } from '@/ui/find-text';
  import { formatDate, TYPE_LABELS } from '@/ui/format';
  import { live } from '@/ui/live.svelte';

  let { docId, passage }: { docId: string; passage?: { start: number; end: number } } = $props();

  const doc = live(() => db.documents.get(docId), undefined);
  const insight = live(() => db.insights.get(docId), undefined);
  const highlights = live(() => db.highlights.where('docId').equals(docId).sortBy('createdAt'), []);
  const ai = aiStatuses();
  const status = $derived(ai.get(docId));

  let tab = $state<'overview' | 'text'>('overview');
  let showAllFacts = $state(false);
  let notesDraft = $state<string | null>(null);
  let notesSaved = $state(false);
  let reader = $state<HTMLElement>();

  // Older saves may still carry site menus; passages are located by text, so cleaning here is safe.
  const readerText = $derived(doc.value ? cleanMarkdown(doc.value.markdown, doc.value.title) : '');
  const cited = $derived(doc.value && passage ? doc.value.markdown.slice(passage.start, passage.end) : '');
  const readingMinutes = $derived(
    doc.value ? Math.max(1, Math.round(doc.value.markdown.split(/\s+/).length / 230)) : 0,
  );

  const ENTITY_GROUPS: { type: EntityType; label: string }[] = [
    { type: 'person', label: 'People' },
    { type: 'company', label: 'Companies' },
    { type: 'product', label: 'Products' },
    { type: 'technology', label: 'Technologies' },
    { type: 'project', label: 'Projects' },
    { type: 'concept', label: 'Concepts' },
  ];
  const entityGroups = $derived(
    ENTITY_GROUPS.map((g) => ({ ...g, names: (insight.value?.entities ?? []).filter((e) => e.type === g.type).map((e) => e.name) })).filter(
      (g) => g.names.length > 0,
    ),
  );

  const FACT_PREVIEW = 5;
  const facts = $derived(insight.value?.facts ?? []);

  async function saveNotes() {
    if (notesDraft === null || notesDraft === doc.value?.userNotes) return;
    await updateDocument(docId, { userNotes: notesDraft });
    notesSaved = true;
    setTimeout(() => (notesSaved = false), 1500);
  }

  async function remove() {
    if (!doc.value || !confirm(`Delete “${doc.value.title}” from your library?`)) return;
    await deleteDocument(docId);
    location.hash = '#/library';
  }

  /** Switch to the full text and highlight the cited passage there. */
  async function showInText() {
    tab = 'text';
    await tick();
    const range = reader && findPassage(reader, cited);
    if (!range) return;
    CSS.highlights.set('cited', new Highlight(range));
    const target = range.startContainer.parentElement;
    const scroll = () => target?.scrollIntoView({ block: 'center' });
    scroll();
    // Images loading near the passage shift the layout; settle on the passage again.
    for (const delay of [300, 1000]) setTimeout(scroll, delay);
  }

  $effect(() => () => CSS.highlights.delete('cited'));
</script>

{#if doc.value}
  {@const d = doc.value}
  <a href="#/library" class="back small">← Library</a>

  <header class="head">
    <div class="title-row">
      <h1>{d.title}</h1>
      <div class="actions">
        <a class="btn" href={d.url} target="_blank" rel="noopener noreferrer">Open original ↗</a>
        <button class="btn ghost-danger" onclick={remove}>Delete</button>
      </div>
    </div>
    <div class="meta small muted">
      <span>{d.siteName || new URL(d.url).hostname}</span>
      <span>{TYPE_LABELS[d.type]}</span>
      {#if d.author}<span>{d.author}</span>{/if}
      {#if d.publishedAt}<span>Published {formatDate(d.publishedAt)}</span>{/if}
      <span>Saved {formatDate(d.capturedAt)}{d.source === 'auto' ? ' (auto)' : ''}</span>
      <span>{readingMinutes} min read</span>
    </div>
    <AiStatusLine {docId} {status} model={insight.value?.model} at={insight.value?.createdAt} />
  </header>

  <div class="layout">
    <div class="main">
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'overview'} onclick={() => (tab = 'overview')}>Overview</button>
        <button role="tab" aria-selected={tab === 'text'} onclick={() => (tab = 'text')}>Full text</button>
      </div>

      {#if tab === 'overview'}
        {#if cited}
          <section class="cited panel">
            <div class="cited-head">
              <h2 class="section-title">Cited passage</h2>
              <button class="link-button small" onclick={showInText}>Show in full text</button>
            </div>
            <Markdown source={cited} />
          </section>
        {/if}

        {#if insight.value}
          {@const i = insight.value}
          <p class="tldr">{i.tldr}</p>

          {#if i.takeaways.length}
            <section>
              <h2 class="section-title">Key takeaways</h2>
              <ol class="takeaways">{#each i.takeaways as t, n (n)}<li>{t}</li>{/each}</ol>
            </section>
          {/if}

          {#if facts.length}
            <section>
              <h2 class="section-title">Facts and figures</h2>
              <ul class="facts">
                {#each showAllFacts ? facts : facts.slice(0, FACT_PREVIEW) as f, n (n)}<li>{f}</li>{/each}
              </ul>
              {#if facts.length > FACT_PREVIEW}
                <button class="link-button small" onclick={() => (showAllFacts = !showAllFacts)}>
                  {showAllFacts ? 'Show fewer' : `Show all ${facts.length}`}
                </button>
              {/if}
            </section>
          {/if}
        {:else}
          <div class="empty panel">
            {#if d.excerpt}<p class="excerpt">{d.excerpt}</p>{/if}
            <p class="muted small">The AI summary will appear here once this page has been processed.</p>
            <button class="link-button small" onclick={() => (tab = 'text')}>Read the full text</button>
          </div>
        {/if}
      {:else}
        <article class="reader" bind:this={reader}>
          <Markdown source={readerText} />
        </article>
      {/if}
    </div>

    <aside class="rail">
      <section>
        <h2 class="rail-title">Tags</h2>
        <TagEditor tags={d.tags} onchange={(tags) => updateDocument(docId, { tags })} />
      </section>

      {#if entityGroups.length}
        <section>
          <h2 class="rail-title">Mentioned</h2>
          {#each entityGroups as group (group.type)}
            <div class="entity-group">
              <div class="entity-label small muted">{group.label}</div>
              <div class="chips">{#each group.names as name (name)}<span class="chip">{name}</span>{/each}</div>
            </div>
          {/each}
        </section>
      {/if}

      {#if highlights.value.length}
        <section>
          <h2 class="rail-title">Highlights</h2>
          {#each highlights.value as h (h.id)}<blockquote>{h.text}</blockquote>{/each}
        </section>
      {/if}

      <section>
        <h2 class="rail-title">
          Notes {#if notesSaved}<span class="saved small">Saved</span>{/if}
        </h2>
        <textarea
          class="input"
          rows="4"
          placeholder="Add your notes…"
          value={notesDraft ?? d.userNotes}
          oninput={(e) => (notesDraft = e.currentTarget.value)}
          onblur={saveNotes}
        ></textarea>
      </section>
    </aside>
  </div>
{:else}
  <p class="muted">This document isn't in your library.</p>
  <a href="#/library">Back to library</a>
{/if}

<style>
  .back {
    text-decoration: none;
    display: inline-block;
    margin-bottom: var(--space-4);
  }
  .head {
    display: grid;
    gap: var(--space-2);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-5);
  }
  .title-row {
    display: flex;
    gap: var(--space-4);
    align-items: flex-start;
    justify-content: space-between;
  }
  h1 {
    margin: 0;
    font-size: 24px;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
  .actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }
  .actions .btn {
    text-decoration: none;
    font-size: 13px;
    white-space: nowrap;
  }
  .ghost-danger {
    border-color: transparent;
    color: var(--color-error);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1) var(--space-3);
  }
  .meta span + span::before {
    content: '·';
    margin-right: var(--space-3);
    color: var(--color-text-3);
  }

  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: var(--space-8);
    align-items: start;
  }
  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .tabs {
    display: flex;
    gap: var(--space-1);
    border-bottom: 1px solid var(--color-border);
    margin-bottom: var(--space-5);
  }
  .tabs button {
    border: none;
    background: none;
    padding: var(--space-2) var(--space-3);
    font-weight: 500;
    color: var(--color-text-2);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    cursor: pointer;
  }
  .tabs button[aria-selected='true'] {
    color: var(--color-text);
    border-bottom-color: var(--color-primary);
  }

  section {
    margin-bottom: var(--space-6);
  }
  .tldr {
    font-size: 17px;
    line-height: 1.6;
    margin: 0 0 var(--space-6);
  }
  .takeaways,
  .facts {
    margin: var(--space-2) 0 var(--space-2);
    padding-left: var(--space-5);
    display: grid;
    gap: var(--space-2);
    line-height: 1.55;
  }
  .takeaways li::marker {
    color: var(--color-primary);
    font-weight: 600;
  }
  .cited {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }
  .cited :global(img) {
    max-height: 160px;
    width: auto;
    border-radius: var(--radius-sm);
  }
  .cited-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .empty p {
    margin: 0 0 var(--space-2);
  }
  .excerpt {
    font-size: 15px;
  }

  .reader {
    max-width: 68ch;
    font-size: 16px;
  }
  .reader :global(.markdown) {
    line-height: 1.75;
  }
  .reader :global(h2),
  .reader :global(h3) {
    margin-top: 1.8em;
    line-height: 1.3;
  }
  .reader :global(img) {
    display: block;
    max-height: 480px;
    width: auto;
    margin: var(--space-4) auto;
    border-radius: var(--radius-md);
  }

  .rail {
    position: sticky;
    top: var(--space-6);
    display: grid;
    gap: var(--space-1);
  }
  .rail section {
    margin-bottom: var(--space-5);
  }
  .rail-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-2);
    margin: 0 0 var(--space-2);
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
  }
  .saved {
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;
    color: var(--color-success);
  }
  .entity-group {
    margin-bottom: var(--space-3);
  }
  .entity-label {
    margin-bottom: var(--space-1);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }
  blockquote {
    margin: 0 0 var(--space-2);
    padding-left: var(--space-3);
    border-left: 3px solid var(--color-accent);
    font-size: 13px;
  }
  textarea {
    resize: vertical;
    font-size: 13px;
  }
</style>
