<script lang="ts">
  import { router, type Route } from '@/ui/router.svelte';
  import AskView from '@/ui/views/AskView.svelte';
  import DocumentView from '@/ui/views/DocumentView.svelte';
  import Library from '@/ui/views/Library.svelte';
  import Placeholder from '@/ui/views/Placeholder.svelte';
  import SearchView from '@/ui/views/SearchView.svelte';
  import Settings from '@/ui/views/Settings.svelte';

  function parsePassage(value: string | null) {
    const match = value?.match(/^(\d+)-(\d+)$/);
    return match ? { start: Number(match[1]), end: Number(match[2]) } : undefined;
  }

  const NAV: { route: Route; label: string }[] = [
    { route: 'library', label: 'Library' },
    { route: 'search', label: 'Search' },
    { route: 'research', label: 'Research' },
    { route: 'ask', label: 'Ask' },
  ];
</script>

<div class="shell">
  <nav class="sidebar" aria-label="Main">
    <div class="brand">Summaryse</div>
    {#each NAV as item (item.route)}
      <a
        href="#/{item.route}"
        class="nav-item"
        aria-current={router.route === item.route || (item.route === 'library' && router.route === 'doc') ? 'page' : undefined}
      >
        {item.label}
      </a>
    {/each}
    <a href="#/settings" class="nav-item settings" aria-current={router.route === 'settings' ? 'page' : undefined}>
      Settings
    </a>
  </nav>

  <main class="content" class:wide={router.route === 'doc'}>
    {#if router.route === 'library'}
      <Library />
    {:else if router.route === 'doc'}
      <!-- Re-mount per document and per cited passage, so a citation link always lands on the passage. -->
      {#key `${router.param}?${router.query}`}
        <DocumentView docId={router.param} passage={parsePassage(router.query.get('p'))} />
      {/key}
    {:else if router.route === 'search'}
      <SearchView />
    {:else if router.route === 'research'}
      <Placeholder title="Research" description="Projects, topics and the knowledge graph." />
    {:else if router.route === 'ask'}
      <AskView />
    {:else}
      <Settings />
    {/if}
  </main>
</div>

<style>
  .shell {
    display: grid;
    grid-template-columns: 200px 1fr;
    min-height: 100vh;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding: var(--space-4) var(--space-3);
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    height: 100vh;
  }
  .brand {
    font-weight: 600;
    font-size: 16px;
    padding: var(--space-2) var(--space-3) var(--space-4);
  }
  .nav-item {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    color: var(--color-text-2);
    text-decoration: none;
    font-weight: 500;
  }
  .nav-item:hover {
    color: var(--color-text);
  }
  .nav-item[aria-current='page'] {
    color: var(--color-text);
    background: var(--color-bg);
    box-shadow: var(--shadow-1);
  }
  .settings {
    margin-top: auto;
  }
  .content {
    padding: var(--space-8);
    max-width: 960px;
    min-width: 0;
  }
  .content.wide {
    max-width: 1240px;
  }
</style>
