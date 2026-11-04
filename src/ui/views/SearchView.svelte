<script lang="ts">
  import Search from '@lucide/svelte/icons/search';
  import { isSemanticSearchConfigured, searchPassages, type SearchResult } from '@/lib/search/search';
  import Passage from '@/ui/components/Passage.svelte';
  import { formatRelative } from '@/ui/format';
  import Banner from '@/ui/kit/Banner.svelte';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
  import SearchField from '@/ui/kit/SearchField.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';
  import { docHref } from '@/ui/router.svelte';

  let query = $state('');
  let result = $state<SearchResult | null>(null);
  let searching = $state(false);
  let error = $state('');
  let semanticReady = $state(false);

  $effect(() => {
    isSemanticSearchConfigured().then((v) => (semanticReady = v));
  });

  // Keyword results update as you type (free, local). Meaning-based search calls the
  // embedding provider, so it only runs when you press Enter.
  $effect(() => {
    const q = query.trim();
    if (!q) {
      result = null;
      return;
    }
    const timer = setTimeout(() => run(false), 200);
    return () => clearTimeout(timer);
  });

  async function run(semantic: boolean) {
    const q = query.trim();
    if (!q) return;
    searching = true;
    error = '';
    try {
      const r = await searchPassages(q, { limit: 25, semantic });
      if (query.trim() === q) result = r;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      searching = false;
    }
  }

  const strength = (relevance: number) => (relevance > 0.7 ? 'Strong match' : relevance > 0.4 ? 'Match' : 'Weak match');
</script>

<div class="search-page">
  <div class="column">
    <h1 class="page-title">Search</h1>
    <SearchField
      bind:value={query}
      autofocus
      placeholder="Where did I read about DOM segmentation?"
      shortcut={semanticReady ? 'Enter' : undefined}
      onsubmit={() => run(semanticReady)}
    />
    <p class="mode">
      {#if searching}
        <Spinner size={10} /> Searching…
      {:else if result}
        {result.hits.length} passage{result.hits.length === 1 ? '' : 's'} · {result.mode === 'hybrid'
          ? 'by keyword and meaning'
          : 'by keyword'}
        {#if semanticReady && result.mode === 'keyword'}· press Enter to also search by meaning{/if}
      {:else if !semanticReady}
        Searching by keyword. <a href="#/settings">Choose an embedding model</a> to also search by meaning.
      {/if}
    </p>

    {#if error}<Banner tone="error" title="Search failed">{error}</Banner>{/if}
    {#if result?.semanticError}
      <Banner tone="error" title="Meaning-based search failed">Showing keyword results. {result.semanticError}</Banner>
    {/if}

    {#if !query.trim()}
      <EmptyState title="Find anything you've saved">
        {#snippet icon()}<Search size={18} />{/snippet}
        Search passages across every page, highlight and note. Results link to the exact spot.
      </EmptyState>
    {:else if result && result.hits.length === 0 && !searching}
      <p class="none">No passages match “{query.trim()}”.</p>
    {/if}

    {#if result}
      <ol class="results">
        {#each result.hits as hit (hit.chunk.id)}
          <li>
            <a class="result" href={docHref(hit.doc.id, { start: hit.chunk.charStart, end: hit.chunk.charEnd })}>
              <span class="title">{hit.doc.title}</span>
              <Passage text={hit.chunk.text} terms={hit.terms} />
              <span class="meta">
                {hit.doc.siteName || new URL(hit.doc.url).hostname} · saved {formatRelative(hit.doc.capturedAt).toLowerCase()} · {strength(hit.relevance)}
              </span>
            </a>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</div>

<style>
  .search-page {
    height: 100%;
    overflow-y: auto;
    padding: 24px 28px 48px;
  }
  .column {
    display: grid;
    gap: 14px;
    max-width: 720px;
    margin: 0 auto;
  }
  .mode {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: -4px 0 0;
    min-height: 18px;
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .mode a {
    color: var(--text-2);
    text-underline-offset: 2px;
  }
  .none {
    color: var(--text-3);
  }
  .results {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .result {
    display: grid;
    gap: 5px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    text-decoration: none;
    color: inherit;
    transition: background var(--dur) var(--ease);
  }
  .result:hover {
    background: var(--hover);
  }
  .title {
    font-size: var(--text-base);
    font-weight: 500;
  }
  .meta {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
</style>
