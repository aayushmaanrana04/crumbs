<script lang="ts">
  import BookmarkPlus from '@lucide/svelte/icons/bookmark-plus';
  import X from '@lucide/svelte/icons/x';
  import { db, normalizeInsight } from '@/lib/db/schema';
  import { rowStatus } from '@/lib/library/ai-label';
  import { overallState } from '@/lib/library/ai-status';
  import { rpc } from '@/lib/rpc/client';
  import { groupByDocument, searchPassages, type PassageHit } from '@/lib/search/search';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import DocPreview from '@/ui/components/DocPreview.svelte';
  import Passage from '@/ui/components/Passage.svelte';
  import { dayGroup, siteLabel } from '@/ui/format';
  import Banner from '@/ui/kit/Banner.svelte';
  import Button from '@/ui/kit/Button.svelte';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
  import GroupLabel from '@/ui/kit/GroupLabel.svelte';
  import Kbd from '@/ui/kit/Kbd.svelte';
  import ListRow from '@/ui/kit/ListRow.svelte';
  import SearchField from '@/ui/kit/SearchField.svelte';
  import Segmented from '@/ui/kit/Segmented.svelte';
  import { live } from '@/ui/live.svelte';
  import { docHref } from '@/ui/router.svelte';

  let { tag }: { tag: string | null } = $props();

  type Filter = 'all' | 'unread' | 'highlights';
  const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    { value: 'highlights', label: 'Highlights' },
  ];

  const documents = live(() => db.documents.orderBy('capturedAt').reverse().toArray(), []);
  const highlighted = live(async () => {
    const counts = new Map<string, number>();
    for (const h of await db.highlights.toArray()) counts.set(h.docId, (counts.get(h.docId) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
  const gists = live(async () => new Map((await db.insights.toArray()).map((i) => [i.docId, normalizeInsight(i).gist])), new Map<string, string>());
  const ai = aiStatuses();

  let filter = $state<Filter>('all');
  let query = $state('');
  let hits = $state<Map<string, PassageHit> | null>(null);
  let selectedId = $state<string | null>(null);
  let searchInput = $state<HTMLInputElement>();
  let retrying = $state(false);

  // Keyword search over passages, debounced.
  $effect(() => {
    const q = query.trim();
    if (!q) {
      hits = null;
      return;
    }
    const timer = setTimeout(async () => {
      const { hits: found } = await searchPassages(q, { semantic: false, limit: 200 });
      hits = new Map(groupByDocument(found).map((h) => [h.doc.id, h]));
    }, 180);
    return () => clearTimeout(timer);
  });

  const visible = $derived.by(() => {
    let list = documents.value.filter(
      (d) =>
        (!tag || d.tags.includes(tag)) &&
        (filter !== 'unread' || !d.readAt) &&
        (filter !== 'highlights' || highlighted.value.has(d.id)),
    );
    if (hits) {
      const order = [...hits.keys()];
      list = list.filter((d) => hits!.has(d.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    }
    return list;
  });

  // Date groups only make sense in date order, not for ranked search results.
  const groups = $derived.by(() => {
    if (hits) return [{ label: `${visible.length} result${visible.length === 1 ? '' : 's'}`, docs: visible }];
    const out: { label: string; docs: typeof visible }[] = [];
    for (const d of visible) {
      const label = dayGroup(d.capturedAt);
      if (out.at(-1)?.label !== label) out.push({ label, docs: [] });
      out.at(-1)!.docs.push(d);
    }
    return out;
  });

  const selected = $derived(visible.find((d) => d.id === selectedId) ?? visible[0]);

  const counts = $derived.by(() => {
    const states = documents.value.map((d) => overallState(ai.get(d.id)));
    return { failed: states.filter((s) => s === 'failed').length };
  });

  function move(delta: number) {
    const i = visible.findIndex((d) => d.id === selected?.id);
    const next = visible[Math.min(visible.length - 1, Math.max(0, i + delta))];
    if (!next) return;
    selectedId = next.id;
    document.getElementById(`row-${next.id}`)?.scrollIntoView({ block: 'nearest' });
  }

  function onkeydown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = (e.target as HTMLElement).closest('input, textarea, select');
    if (e.key === '/' && !typing) {
      e.preventDefault();
      searchInput?.focus();
    } else if (!typing && (e.key === 'ArrowDown' || e.key === 'j')) {
      e.preventDefault();
      move(1);
    } else if (!typing && (e.key === 'ArrowUp' || e.key === 'k')) {
      e.preventDefault();
      move(-1);
    } else if (!typing && e.key === 'Enter' && selected) {
      location.hash = docHref(selected.id);
    }
  }

  async function retryFailed() {
    retrying = true;
    await rpc('jobs.retryFailed').finally(() => (retrying = false));
  }
</script>

<svelte:window {onkeydown} />

<div class="library">
  <div class="list-pane">
    <header class="list-head">
      <div class="title-row">
        <h1 class="page-title">{tag ? tag : 'Library'}</h1>
        {#if tag}
          <a class="clear" href="#/library" aria-label="Show all pages"><X size={14} /> All pages</a>
        {/if}
      </div>
      <SearchField bind:value={query} bind:input={searchInput} placeholder="Search your library" shortcut="/" />
      <Segmented options={FILTERS} bind:value={filter} label="Filter" />
    </header>

    {#if !ai.aiReady && documents.value.length > 0}
      <div class="notice">
        <Banner title="Summaries are off">
          Choose a model so saved pages get summarised.
          {#snippet action()}<Button size="sm" onclick={() => (location.hash = '#/settings')}>Settings</Button>{/snippet}
        </Banner>
      </div>
    {:else if counts.failed}
      <div class="notice">
        <Banner tone="error" title="{counts.failed} page{counts.failed === 1 ? '' : 's'} couldn't be summarised">
          Open a page to see why, or try again.
          {#snippet action()}<Button size="sm" disabled={retrying} onclick={retryFailed}>Retry</Button>{/snippet}
        </Banner>
      </div>
    {/if}

    <div class="rows">
      {#if documents.value.length === 0}
        <div class="empty">
          <EmptyState title="Your library is empty">
            {#snippet icon()}<BookmarkPlus size={18} />{/snippet}
            Save any page with <Kbd keys="⌘⇧S" /> or the toolbar button. It will be summarised and searchable here.
          </EmptyState>
        </div>
      {:else if visible.length === 0}
        <p class="nothing">Nothing matches.</p>
      {/if}

      {#each groups as group (group.label)}
        <GroupLabel label={group.label} />
        {#each group.docs as doc (doc.id)}
          {@const status = rowStatus(ai.get(doc.id))}
          <div id="row-{doc.id}">
            <ListRow
              title={doc.title}
              summary={hits?.get(doc.id) ? undefined : gists.value.get(doc.id)}
              site={siteLabel(doc)}
              status={status.label}
              statusTone={status.tone}
              selected={doc.id === selected?.id}
              onselect={() => (selectedId = doc.id)}
            />
            {#if hits?.get(doc.id)}
              {@const hit = hits.get(doc.id)!}
              <div class="hit"><Passage text={hit.chunk.text} terms={hit.terms} maxChars={160} /></div>
            {/if}
          </div>
        {/each}
      {/each}
    </div>
  </div>

  <section class="preview" aria-label="Preview">
    {#if selected}
      {#key selected.id}<DocPreview doc={selected} />{/key}
    {:else if documents.value.length > 0}
      <p class="nothing">Select a page to preview it.</p>
    {/if}
  </section>
</div>

<style>
  .library {
    display: grid;
    grid-template-columns: 400px minmax(0, 1fr);
    height: 100%;
  }
  .list-pane {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--border);
  }
  .list-head {
    display: grid;
    gap: 12px;
    padding: 20px 20px 8px;
  }
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 30px;
  }
  .clear {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: var(--r-sm);
    font-size: var(--text-sm);
    color: var(--text-2);
    text-decoration: none;
  }
  .clear:hover {
    background: var(--hover);
  }
  .notice {
    padding: 4px 12px;
  }
  .rows {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    padding: 0 10px 12px;
  }
  .hit {
    padding: 0 12px 8px;
  }
  .empty {
    padding: 12px 2px;
  }
  .nothing {
    padding: 16px 12px;
    color: var(--text-3);
  }
  .preview {
    min-height: 0;
    overflow-y: auto;
    padding: 24px 44px 40px;
  }
</style>
