<script lang="ts">
  import Inbox from '@lucide/svelte/icons/inbox';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import Search from '@lucide/svelte/icons/search';
  import SettingsIcon from '@lucide/svelte/icons/settings';
  import Waypoints from '@lucide/svelte/icons/waypoints';
  import { db } from '@/lib/db/schema';
  import GroupLabel from '@/ui/kit/GroupLabel.svelte';
  import NavItem from '@/ui/kit/NavItem.svelte';
  import { live } from '@/ui/live.svelte';
  import { router } from '@/ui/router.svelte';
  import AskView from '@/ui/views/AskView.svelte';
  import DocumentView from '@/ui/views/DocumentView.svelte';
  import Library from '@/ui/views/Library.svelte';
  import Research from '@/ui/views/Research.svelte';
  import SearchView from '@/ui/views/SearchView.svelte';
  import Settings from '@/ui/views/Settings.svelte';

  const TOP_TAGS = 5;

  const library = live(async () => {
    const docs = await db.documents.toArray();
    const counts = new Map<string, number>();
    for (const d of docs) for (const t of d.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    // Only tags shared by several pages are useful as quick filters.
    const tags = [...counts]
      .filter(([, n]) => n >= 2)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_TAGS);
    return { count: docs.length, tags };
  }, { count: 0, tags: [] as [string, number][] });

  let storageUsed = $state('');
  $effect(() => {
    void library.value.count;
    navigator.storage?.estimate().then(({ usage = 0 }) => {
      storageUsed = usage > 1e6 ? `${(usage / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(usage / 1e3))} KB`;
    });
  });

  function parsePassage(value: string | null) {
    const match = value?.match(/^(\d+)-(\d+)$/);
    return match ? { start: Number(match[1]), end: Number(match[2]) } : undefined;
  }

  function onkeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      location.hash = '#/search';
    }
  }

  const activeTag = $derived(router.route === 'library' ? router.query.get('tag') : null);
</script>

<svelte:window {onkeydown} />

<div class="shell">
  <nav class="sidebar" aria-label="Main">
    <div class="workspace">
      <span class="monogram" aria-hidden="true">S</span>
      <span class="name">Summaryse</span>
    </div>

    <NavItem
      href="#/library"
      label="Library"
      count={library.value.count || undefined}
      active={(router.route === 'library' && !activeTag) || router.route === 'doc'}
    >
      {#snippet icon()}<Inbox />{/snippet}
    </NavItem>
    <NavItem href="#/search" label="Search" active={router.route === 'search'}>
      {#snippet icon()}<Search />{/snippet}
    </NavItem>
    <NavItem href="#/ask" label="Ask" active={router.route === 'ask'}>
      {#snippet icon()}<MessageCircle />{/snippet}
    </NavItem>
    <NavItem href="#/research" label="Research" active={router.route === 'research'}>
      {#snippet icon()}<Waypoints />{/snippet}
    </NavItem>

    {#if library.value.tags.length}
      <GroupLabel label="Tags" />
      {#each library.value.tags as [tag, count] (tag)}
        <NavItem href="#/library?tag={encodeURIComponent(tag)}" label={tag} {count} active={activeTag === tag}>
          {#snippet icon()}<span class="tag-mark" aria-hidden="true"></span>{/snippet}
        </NavItem>
      {/each}
    {/if}

    <div class="spacer"></div>

    <div class="storage">
      <span class="storage-title">Stored on this device</span>
      <span class="storage-detail">
        {library.value.count} page{library.value.count === 1 ? '' : 's'}{storageUsed ? ` · ${storageUsed}` : ''}
      </span>
    </div>
    <NavItem href="#/settings" label="Settings" active={router.route === 'settings'}>
      {#snippet icon()}<SettingsIcon />{/snippet}
    </NavItem>
  </nav>

  <main class="panel">
    {#if router.route === 'library'}
      <Library tag={activeTag} />
    {:else if router.route === 'doc'}
      <!-- Re-mount per document and per cited passage, so a citation link always lands on the passage. -->
      {#key `${router.param}?${router.query}`}
        <DocumentView docId={router.param} passage={parsePassage(router.query.get('p'))} />
      {/key}
    {:else if router.route === 'search'}
      <SearchView />
    {:else if router.route === 'research'}
      <Research />
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
    grid-template-columns: 228px minmax(0, 1fr);
    gap: 10px;
    height: 100vh;
    padding: 10px;
  }
  .sidebar {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    padding: 6px 0 0;
    overflow-y: auto;
  }
  .workspace {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px 18px;
  }
  .monogram {
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 7px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: 13px;
    font-weight: 700;
  }
  .name {
    font-size: var(--text-base);
    font-weight: 600;
  }
  .tag-mark {
    width: 16px;
    display: inline-flex;
    justify-content: center;
  }
  .tag-mark::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-3);
  }
  .spacer {
    flex: 1;
  }
  .storage {
    display: grid;
    gap: 1px;
    padding: 12px 10px;
    font-size: var(--text-sm);
  }
  .storage-title {
    font-weight: 500;
    color: var(--text-2);
  }
  .storage-detail {
    color: var(--text-3);
  }
  .panel {
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    border-radius: var(--r-lg);
    background: var(--bg);
    box-shadow: var(--shadow-panel);
  }
</style>
