<script lang="ts">
  import { tick } from 'svelte';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
  import Copy from '@lucide/svelte/icons/copy';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { cleanMarkdown } from '@/lib/capture/clean';
  import { db, normalizeInsight, type EntityType } from '@/lib/db/schema';
  import { deleteDocument, updateDocument } from '@/lib/library/documents';
  import { insightToMarkdown } from '@/lib/library/insight-markdown';
  import { rpc } from '@/lib/rpc/client';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import AiStatus from '@/ui/components/AiStatus.svelte';
  import DocInsights from '@/ui/components/DocInsights.svelte';
  import DocProjects from '@/ui/components/DocProjects.svelte';
  import Markdown from '@/ui/components/Markdown.svelte';
  import TagEditor from '@/ui/components/TagEditor.svelte';
  import { findPassage } from '@/ui/find-text';
  import { formatDate, formatRelative, readingMinutes, TYPE_LABELS } from '@/ui/format';
  import Button from '@/ui/kit/Button.svelte';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
  import HighlightCard from '@/ui/kit/HighlightCard.svelte';
  import Menu from '@/ui/kit/Menu.svelte';
  import Property from '@/ui/kit/Property.svelte';
  import Segmented from '@/ui/kit/Segmented.svelte';
  import TextArea from '@/ui/kit/TextArea.svelte';
  import { live } from '@/ui/live.svelte';

  let { docId, passage }: { docId: string; passage?: { start: number; end: number } } = $props();

  const doc = live(() => db.documents.get(docId), undefined);
  const stored = live(() => db.insights.get(docId), undefined);
  const insight = { get value() { return stored.value ? normalizeInsight(stored.value) : undefined; } };
  const highlights = live(() => db.highlights.where('docId').equals(docId).sortBy('createdAt'), []);
  const ai = aiStatuses();
  const status = $derived(ai.get(docId));

  let tab = $state<'overview' | 'text'>('overview');
  let notesDraft = $state<string | null>(null);
  let notesSaved = $state(false);
  let copied = $state(false);
  let reader = $state<HTMLElement>();

  // Opening the full page marks it read (drives the Library's Unread filter).
  $effect(() => {
    // Written directly so it doesn't bump updatedAt (which invalidates the search index).
    void db.documents.update(docId, { readAt: Date.now() });
  });

  // Older saves may still carry site menus; passages are located by text, so cleaning here is safe.
  const readerText = $derived(doc.value ? cleanMarkdown(doc.value.markdown, doc.value.title) : '');
  const cited = $derived(doc.value && passage ? doc.value.markdown.slice(passage.start, passage.end) : '');

  const ENTITY_GROUPS: { type: EntityType; label: string }[] = [
    { type: 'person', label: 'People' },
    { type: 'company', label: 'Companies' },
    { type: 'product', label: 'Products' },
    { type: 'technology', label: 'Technologies' },
    { type: 'project', label: 'Projects' },
    { type: 'concept', label: 'Concepts' },
  ];
  const entityGroups = $derived(
    ENTITY_GROUPS.map((g) => ({
      ...g,
      names: (insight.value?.entities ?? []).filter((e) => e.type === g.type).map((e) => e.name),
    })).filter((g) => g.names.length > 0),
  );

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

  async function copyMarkdown() {
    if (!doc.value) return;
    const summary = insight.value ? `${insightToMarkdown(insight.value)}\n\n---\n\n` : '';
    await navigator.clipboard.writeText(`# ${doc.value.title}\n\n${doc.value.url}\n\n${summary}${readerText}`);
    copied = true;
    setTimeout(() => (copied = false), 1500);
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

<div class="page">
  {#if doc.value}
    {@const d = doc.value}
    <div class="toolbar">
      <a class="back" href="#/library"><ArrowLeft size={15} /> Library</a>
      <div class="actions">
        {#if copied}<span class="faint small">Copied</span>{/if}
        <Button kind="primary" href={d.url}>Open original <ArrowUpRight /></Button>
        <Menu
          items={[
            { label: 'Re-run AI', icon: RotateCcw, onselect: () => rpc('jobs.reprocess', { docId }) },
            { label: 'Copy as Markdown', icon: Copy, onselect: copyMarkdown },
            { label: 'Delete', icon: Trash2, danger: true, onselect: remove },
          ]}
        />
      </div>
    </div>

    <div class="layout">
      <article class="main">
        <header class="head">
          <span class="site">{d.siteName || new URL(d.url).hostname}</span>
          <h1>{d.title}</h1>
          <div class="props">
            <Property label="Saved" value="{formatRelative(d.capturedAt)}{d.source === 'auto' ? ' (auto)' : ''}" />
            <Property label="Read" value="{readingMinutes(d.markdown)} min" />
            <Property label="Type" value={TYPE_LABELS[d.type]} />
            {#if d.author}<Property label="Author" value={d.author} />{/if}
            {#if d.publishedAt}<Property label="Published" value={formatDate(d.publishedAt)} />{/if}
          </div>
          <AiStatus {docId} {status} model={insight.value?.model} at={insight.value?.createdAt} />
        </header>

        <div class="tabs">
          <Segmented
            label="View"
            options={[
              { value: 'overview', label: 'Overview' },
              { value: 'text', label: 'Full text' },
            ]}
            bind:value={tab}
          />
        </div>

        {#if tab === 'overview'}
          {#if cited}
            <section class="cited">
              <div class="cited-head">
                <span class="section-label">Cited passage</span>
                <Button size="sm" onclick={showInText}>Show in full text</Button>
              </div>
              <Markdown source={cited} size="compact" />
            </section>
          {/if}

          {#if insight.value}
            <DocInsights {docId} insight={insight.value} />
          {:else}
            <EmptyState title="No summary yet">
              {#if d.excerpt}{d.excerpt}{:else}The summary appears here once this page has been processed.{/if}
            </EmptyState>
          {/if}
        {:else}
          <div class="reader" bind:this={reader}>
            <Markdown source={readerText} />
          </div>
        {/if}
      </article>

      <aside class="rail">
        <section>
          <h2 class="rail-title">Projects</h2>
          <DocProjects {docId} />
        </section>

        <section>
          <h2 class="rail-title">Tags</h2>
          <TagEditor tags={d.tags} onchange={(tags) => updateDocument(docId, { tags })} />
        </section>

        {#if entityGroups.length}
          <section>
            <h2 class="rail-title">Mentioned</h2>
            {#each entityGroups as group (group.type)}
              <div class="entities">
                <span class="faint small">{group.label}</span>
                <span class="names">{group.names.join(', ')}</span>
              </div>
            {/each}
          </section>
        {/if}

        {#if highlights.value.length}
          <section>
            <h2 class="rail-title">Highlights</h2>
            <div class="stack">
              {#each highlights.value as h (h.id)}<HighlightCard text={h.text} meta={formatRelative(h.createdAt)} />{/each}
            </div>
          </section>
        {/if}

        <section>
          <h2 class="rail-title">Notes {#if notesSaved}<span class="saved">Saved</span>{/if}</h2>
          <TextArea
            rows={4}
            placeholder="Add your notes…"
            value={notesDraft ?? d.userNotes}
            oninput={(e) => (notesDraft = e.currentTarget.value)}
            onblur={saveNotes}
          />
        </section>
      </aside>
    </div>
  {:else}
    <div class="missing">
      <EmptyState title="This page isn't in your library">
        <a href="#/library">Back to the library</a>
      </EmptyState>
    </div>
  {/if}
</div>

<style>
  .page {
    height: 100%;
    overflow-y: auto;
    padding: 18px 44px 48px;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px 6px 6px;
    border-radius: var(--r-sm);
    font-size: var(--text-md);
    color: var(--text-2);
    text-decoration: none;
  }
  .back:hover {
    background: var(--hover);
    color: var(--text);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 720px) 260px;
    justify-content: space-between;
    gap: 56px;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .head {
    display: grid;
    gap: 14px;
    padding-bottom: 20px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border);
  }
  .site {
    font-size: var(--text-sm);
    color: var(--text-3);
    margin-bottom: -8px;
  }
  h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.8px;
    line-height: 1.2;
  }
  .props {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 28px;
  }
  .tabs {
    margin-bottom: 28px;
  }
  .cited {
    display: grid;
    gap: 10px;
    margin-bottom: 28px;
    padding: 16px 18px;
    border-radius: var(--r-lg);
    background: var(--surface);
  }
  .cited-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .cited :global(img) {
    max-height: 160px;
  }
  .reader {
    max-width: 68ch;
  }
  .rail {
    position: sticky;
    top: 0;
    display: grid;
    gap: 28px;
  }
  .rail-title {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0 0 10px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }
  .saved {
    font-weight: 500;
    color: var(--text-3);
  }
  .entities {
    display: grid;
    gap: 2px;
    margin-bottom: 10px;
  }
  .names {
    font-size: var(--text-md);
    line-height: 1.5;
  }
  .stack {
    display: grid;
    gap: 8px;
  }
  .missing {
    max-width: 420px;
    margin: 80px auto;
  }
</style>
