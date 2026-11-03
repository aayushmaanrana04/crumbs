<script lang="ts">
  import { db, type DocumentType } from '@/lib/db/schema';
  import { overallState } from '@/lib/library/ai-status';
  import { rpc } from '@/lib/rpc/client';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import { groupByDocument, searchPassages, type PassageHit } from '@/lib/search/search';
  import Passage from '@/ui/components/Passage.svelte';
  import AiBadge from '@/ui/components/AiBadge.svelte';
  import { formatDate, TYPE_LABELS } from '@/ui/format';
  import { live } from '@/ui/live.svelte';
  import { docHref } from '@/ui/router.svelte';

  const documents = live(() => db.documents.orderBy('capturedAt').reverse().toArray(), []);
  const insights = live(async () => new Map((await db.insights.toArray()).map((i) => [i.docId, i])), new Map());
  const ai = aiStatuses();
  const jobCounts = $derived.by(() => {
    const states = documents.value.map((d) => overallState(ai.get(d.id)));
    return {
      pending: states.filter((s) => s === 'running' || s === 'queued').length,
      failed: states.filter((s) => s === 'failed').length,
    };
  });

  let query = $state('');
  let typeFilter = $state<DocumentType | ''>('');
  let siteFilter = $state('');
  let tagFilter = $state('');
  let hits = $state<Map<string, PassageHit> | null>(null);

  const sites = $derived([...new Set(documents.value.map((d) => d.siteName).filter(Boolean))].sort() as string[]);
  const tags = $derived([...new Set(documents.value.flatMap((d) => d.tags))].sort());
  const types = $derived([...new Set(documents.value.map((d) => d.type))]);

  // Keyword search over passages, debounced; results keep library order otherwise.
  $effect(() => {
    const q = query.trim();
    if (!q) {
      hits = null;
      return;
    }
    const timer = setTimeout(async () => {
      const { hits: found } = await searchPassages(q, { semantic: false, limit: 200 });
      hits = new Map(groupByDocument(found).map((h) => [h.doc.id, h]));
    }, 200);
    return () => clearTimeout(timer);
  });

  const visible = $derived.by(() => {
    let list = documents.value.filter(
      (d) =>
        (!typeFilter || d.type === typeFilter) &&
        (!siteFilter || d.siteName === siteFilter) &&
        (!tagFilter || d.tags.includes(tagFilter)),
    );
    if (hits) {
      const order = [...hits.keys()];
      list = list.filter((d) => hits!.has(d.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    return list;
  });

  let retrying = $state(false);
  async function retryFailed() {
    retrying = true;
    await rpc('jobs.retryFailed').finally(() => (retrying = false));
  }
</script>

<div class="header">
  <h1 class="page-title">Library</h1>
  <span class="muted small">
    {documents.value.length} saved
    {#if jobCounts.pending}· {jobCounts.pending} being processed by AI{/if}
    {#if jobCounts.failed}
      · <span class="error-text">{jobCounts.failed} failed</span>
      <button class="link-button" disabled={retrying} onclick={retryFailed}>Retry</button>
    {/if}
  </span>
</div>

{#if !ai.aiReady && documents.value.length > 0}
  <p class="muted small notice">
    Summaries and tags appear once you choose a model for “Understanding pages” in <a href="#/settings">Settings</a>.
  </p>
{/if}

{#if documents.value.length === 0}
  <div class="panel empty">
    <p><strong>Your library is empty.</strong></p>
    <p class="muted">
      Save a page with the toolbar button, <kbd>⌘/Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>, or right-click → “Save page to
      Summaryse”. Select text first to save it as a highlight.
    </p>
  </div>
{:else}
  <div class="toolbar">
    <input class="input search" type="search" placeholder="Search your library" bind:value={query} />
    <select class="input" bind:value={typeFilter} aria-label="Type">
      <option value="">All types</option>
      {#each types as type (type)}<option value={type}>{TYPE_LABELS[type]}</option>{/each}
    </select>
    <select class="input" bind:value={siteFilter} aria-label="Site">
      <option value="">All sites</option>
      {#each sites as site (site)}<option value={site}>{site}</option>{/each}
    </select>
    {#if tags.length}
      <select class="input" bind:value={tagFilter} aria-label="Tag">
        <option value="">All tags</option>
        {#each tags as tag (tag)}<option value={tag}>{tag}</option>{/each}
      </select>
    {/if}
  </div>

  {#if visible.length === 0}
    <p class="muted">Nothing matches.</p>
  {/if}

  <ul class="list">
    {#each visible as doc (doc.id)}
      {@const hit = hits?.get(doc.id)}
      {@const insight = insights.value.get(doc.id)}
      <li>
        <a class="item" href={docHref(doc.id)}>
          <div class="title-row">
            <span class="title">{doc.title}</span>
            <AiBadge status={ai.get(doc.id)} />
          </div>
          <div class="meta muted small">
            {doc.siteName} · {TYPE_LABELS[doc.type]} · {formatDate(doc.capturedAt)}{doc.source === 'auto' ? ' · auto-saved' : ''}
          </div>
          {#if hit}
            <Passage text={hit.chunk.text} terms={hit.terms} maxChars={240} />
          {:else if insight?.tldr || doc.excerpt}
            <p class="summary">{insight?.tldr || doc.excerpt}</p>
          {/if}
          {#if doc.tags.length}
            <div class="tags">{#each doc.tags as tag (tag)}<span class="chip">{tag}</span>{/each}</div>
          {/if}
        </a>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .header {
    display: flex;
    align-items: baseline;
    gap: var(--space-3);
  }
  .notice {
    margin: 0 0 var(--space-3);
  }
  .empty p {
    margin: 0 0 var(--space-2);
  }
  kbd {
    font: inherit;
    font-size: 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0 4px;
  }
  .toolbar {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }
  .search {
    flex: 1;
    min-width: 220px;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .item {
    display: grid;
    gap: var(--space-1);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    color: inherit;
    text-decoration: none;
    transition: border-color 150ms var(--ease);
  }
  .item:hover {
    border-color: var(--color-primary);
  }
  .title-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }
  .title {
    font-weight: 600;
    flex: 1;
  }
  .summary {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-2);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tags {
    display: flex;
    gap: var(--space-1);
    flex-wrap: wrap;
  }
</style>
