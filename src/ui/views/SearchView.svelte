<script lang="ts">
  import { isSemanticSearchConfigured, searchPassages, type SearchResult } from '@/lib/search/search';
  import Passage from '@/ui/components/Passage.svelte';
  import { formatDate } from '@/ui/format';
  import { docHref } from '@/ui/router.svelte';

  let query = $state('');
  let result = $state<SearchResult | null>(null);
  let searching = $state(false);
  let error = $state('');
  const semantic = isSemanticSearchConfigured();

  async function run(event: SubmitEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    searching = true;
    error = '';
    try {
      result = await searchPassages(query, { limit: 25 });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      searching = false;
    }
  }
</script>

<h1 class="page-title">Search</h1>

<form class="bar" onsubmit={run}>
  <input class="input" type="search" placeholder="e.g. where did I read about DOM segmentation?" bind:value={query} />
  <button class="btn btn-primary" disabled={searching}>{searching ? 'Searching…' : 'Search'}</button>
</form>

{#await semantic then enabled}
  {#if !enabled}
    <p class="muted small">
      Keyword search only. Choose a model for “Search by meaning” in <a href="#/settings">Settings</a> to also find passages
      by meaning.
    </p>
  {/if}
{/await}

{#if error}<p class="error-text">{error}</p>{/if}

{#if result}
  {#if result.semanticError}
    <p class="error-text small">Meaning-based search failed, showing keyword results: {result.semanticError}</p>
  {/if}
  <p class="muted small">
    {result.hits.length} passage{result.hits.length === 1 ? '' : 's'} · {result.mode === 'hybrid' ? 'keyword + meaning' : 'keyword'}
  </p>
  <ul class="results">
    {#each result.hits as hit (hit.chunk.id)}
      <li class="panel">
        <div class="top">
          <a class="title" href={docHref(hit.doc.id, { start: hit.chunk.charStart, end: hit.chunk.charEnd })}>{hit.doc.title}</a>
          <span class="relevance" title="Relevance {Math.round(hit.relevance * 100)}%">
            <span style:width="{Math.round(hit.relevance * 100)}%"></span>
          </span>
        </div>
        <Passage text={hit.chunk.text} terms={hit.terms} />
        <div class="muted small">
          <a href={hit.doc.url} target="_blank" rel="noopener noreferrer">{hit.doc.siteName}</a> · saved {formatDate(hit.doc.capturedAt)}
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .bar {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }
  .results {
    list-style: none;
    padding: 0;
    margin: var(--space-3) 0 0;
    display: grid;
    gap: var(--space-2);
  }
  .results li {
    display: grid;
    gap: var(--space-2);
  }
  .top {
    display: flex;
    gap: var(--space-3);
    align-items: center;
    justify-content: space-between;
  }
  .title {
    font-weight: 600;
    text-decoration: none;
  }
  .relevance {
    width: 60px;
    height: 4px;
    border-radius: var(--radius-pill);
    background: var(--color-border);
    flex-shrink: 0;
    overflow: hidden;
  }
  .relevance span {
    display: block;
    height: 100%;
    background: var(--color-primary);
  }
</style>
