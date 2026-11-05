<script lang="ts">
  import { browser } from '#imports';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import { liveQuery } from 'dexie';
  import Library from '@lucide/svelte/icons/library';
  import X from '@lucide/svelte/icons/x';
  import { describeOutcome } from '@/lib/capture/describe';
  import { hostnameOf, isCapturableUrl } from '@/lib/capture/url';
  import { findSavedPage, pageContext, type PageContext, type PageInfo } from '@/lib/library/page-context';
  import { rpc } from '@/lib/rpc/client';
  import { ask, type AskTurn } from '@/lib/search/ask';
  import { normalizeSite, siteMatches } from '@/lib/settings/capture';
  import { isPaused, panelSettings } from '@/lib/settings/panel';
  import AnswerTurn from '@/ui/components/AnswerTurn.svelte';
  import PanelSaved from '@/ui/components/PanelSaved.svelte';
  import { siteLabel } from '@/ui/format';
  import Banner from '@/ui/kit/Banner.svelte';
  import Button from '@/ui/kit/Button.svelte';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
  import IconButton from '@/ui/kit/IconButton.svelte';
  import Logo from '@/ui/kit/Logo.svelte';
  import Menu, { type MenuItem } from '@/ui/kit/Menu.svelte';
  import PageCard from '@/ui/kit/PageCard.svelte';
  import RelatedCard from '@/ui/kit/RelatedCard.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';
  import { docHref } from '@/ui/router.svelte';
  import { stored } from '@/ui/storage.svelte';

  type Page = PageInfo & { siteName?: string };
  type View =
    | { state: 'loading' }
    | { state: 'unreadable'; url?: string } // a browser page, a blocked site, or no access yet
    | { state: 'ready'; page: Page; context: PageContext };

  const settings = stored(panelSettings);

  let tabId = $state<number | null>(null);
  /** A tab you switched to while follow mode is off. */
  let switchedTo = $state<number | null>(null);
  let view = $state<View>({ state: 'loading' });
  let saving = $state(false);
  let message = $state('');
  let question = $state('');
  let answer = $state<AskTurn | null>(null);
  let asking = $state(false);
  let askError = $state('');
  let answerEl = $state<HTMLElement>();

  // Bring the answer into view: the composer sits below the scrolling body.
  $effect(() => {
    if (answer || asking) answerEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  const follow = $derived(settings.value?.follow ?? false);
  const host = $derived(view.state === 'ready' ? hostnameOf(view.page.url) : '');
  const paused = $derived(view.state === 'ready' && !!settings.value && isPaused(view.page.url, settings.value));
  /** Offer follow mode once you switch tabs, until you turn it on or say not now. */
  const offerFollow = $derived(switchedTo !== null && !follow && !settings.value?.followPromptDismissed);

  const menu = $derived<MenuItem[]>([
    { label: follow ? 'Stop following my browsing' : 'Follow my browsing', onselect: () => setFollow(!follow) },
    ...(follow && host ? [{ label: `${paused ? 'Resume' : 'Pause'} on ${normalizeSite(host)}`, onselect: () => setPaused(!paused) }] : []),
    { label: 'Settings', onselect: () => void browser.tabs.create({ url: browser.runtime.getURL('/app.html#/settings') }) },
  ]);

  async function show(id: number) {
    tabId = id;
    switchedTo = null;
    view = { state: 'loading' };
    message = '';
    answer = null;
    askError = '';
    let page: Page | null = await rpc('capture.preview', { tabId: id }).catch(() => null);
    if (!page) {
      // No access to the page itself; follow mode can still see its address and title.
      const tab = await browser.tabs.get(id).catch(() => undefined);
      if (!tab?.url || !isCapturableUrl(tab.url)) {
        view = { state: 'unreadable', url: tab?.url };
        return;
      }
      page = { url: tab.url, title: tab.title ?? '' };
    }
    const context = await pageContext(page);
    if (tabId === id) view = { state: 'ready', page, context };
  }

  async function refresh() {
    if (view.state !== 'ready' || tabId === null) return;
    const context = await pageContext(view.page);
    if (view.state === 'ready') view = { ...view, context };
  }

  // Pages saved or deleted elsewhere (the shortcut, the toast, the library) update the panel.
  $effect(() => {
    if (view.state !== 'ready') return;
    const { page } = view;
    const savedId = view.context.saved?.id;
    const subscription = liveQuery(() => findSavedPage(page)).subscribe((doc) => {
      if (doc?.id !== savedId) void refresh();
    });
    return () => subscription.unsubscribe();
  });

  $effect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id !== undefined) void show(tab.id);
    });

    const onActivated = async ({ tabId: id }: { tabId: number }) => {
      if (id === tabId) {
        switchedTo = null;
        return;
      }
      // Follow mode keeps up with the active tab, except on paused sites.
      const tab = follow ? await browser.tabs.get(id).catch(() => undefined) : undefined;
      const pausedHere = !!tab?.url && !!settings.value && isPaused(tab.url, settings.value);
      if (follow && !pausedHere) void show(id);
      else switchedTo = id;
    };
    const onUpdated = (id: number, change: { status?: string }) => {
      if (id === tabId && change.status === 'complete') void show(id);
    };
    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  });

  async function save() {
    if (tabId === null || saving) return;
    saving = true;
    message = '';
    try {
      message = describeOutcome(await rpc('capture.tab', { tabId }));
      await refresh();
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }

  /** Grant access to the current site so the panel can read and save it. */
  async function allowSite(url: string) {
    const origin = new URL(url).origin;
    if (await browser.permissions.request({ origins: [`${origin}/*`] })) {
      if (tabId !== null) await show(tabId);
    }
  }

  async function setFollow(on: boolean) {
    if (on && !(await browser.permissions.request({ permissions: ['tabs'] }).catch(() => false))) return;
    const current = await panelSettings.getValue();
    await panelSettings.setValue({ ...current, follow: on });
    if (on && switchedTo !== null) await show(switchedTo);
  }

  async function dismissFollowPrompt() {
    const current = await panelSettings.getValue();
    await panelSettings.setValue({ ...current, followPromptDismissed: true });
  }

  async function setPaused(on: boolean) {
    const current = await panelSettings.getValue();
    const site = normalizeSite(host);
    const pausedSites = on ? [...new Set([...current.pausedSites, site])] : current.pausedSites.filter((s) => !siteMatches(host, s));
    await panelSettings.setValue({ ...current, pausedSites });
  }

  async function submitQuestion(e: SubmitEvent) {
    e.preventDefault();
    const q = question.trim();
    if (!q || asking || view.state !== 'ready') return;
    asking = true;
    askError = '';
    try {
      const { page } = view;
      // This page is source 1 when the panel can read it; the library supplies the rest.
      const extra = page.lead ? { title: page.title, url: page.url, text: page.lead } : undefined;
      answer = await ask(q, [], undefined, extra);
      question = '';
    } catch (err) {
      askError = err instanceof Error ? err.message : String(err);
    } finally {
      asking = false;
    }
  }

</script>

<div class="panel">
  <header class="head">
    <Logo size={18} wordmark />
    <div class="head-actions">
      <a class="library" href="#/library" aria-label="Open library" title="Open library"><Library size={16} /></a>
      <Menu items={menu} label="Panel options" />
    </div>
  </header>

  <main class="body">
    {#if offerFollow}
      <Banner title="Follow my browsing?" ondismiss={dismissFollowPrompt}>
        Keep this panel in step with the tab you're on. Chrome will ask to let Carrel see tab addresses and titles; they're matched on this device and not saved.
        <span class="banner-actions">
          <Button size="sm" kind="primary" onclick={() => setFollow(true)}>Turn on</Button>
          <Button size="sm" kind="ghost" onclick={dismissFollowPrompt}>Not now</Button>
        </span>
      </Banner>
    {/if}

    {#if view.state === 'loading'}
      <div class="loading"><Spinner /> Reading this page…</div>
    {:else if view.state === 'unreadable'}
      <EmptyState title="Nothing to show for this tab">
        {#if view.url && isCapturableUrl(view.url)}
          Carrel needs access to read this page.
          <div class="center"><Button kind="primary" size="sm" onclick={() => allowSite(view.state === 'unreadable' ? view.url! : '')}>Allow on this site</Button></div>
          Or click the toolbar button while you're on the page.
        {:else}
          Browser pages and blocked sites aren't read or saved.
        {/if}
      </EmptyState>
    {:else}
      {@const { page, context } = view}
      {#snippet switched()}
        {#if switchedTo !== null}
          <p class="switched">
            Showing the tab you opened the panel on.
            <button type="button" class="link" onclick={() => show(switchedTo!)}>Show this tab</button>
          </p>
        {/if}
      {/snippet}

      {#if context.saved}
        {#key context.saved.id}
          <PanelSaved docId={context.saved.id} site={siteLabel(page)} title={page.title || page.url} extra={switched} />
        {/key}
        <Button full href={docHref(context.saved.id)}>Open in library</Button>
      {:else}
        <PageCard site={siteLabel(page)} title={page.title || page.url}>
          <p class="status">{message || 'Not in your library'}</p>
          {@render switched()}
          <div class="row">
            <Button kind="primary" size="sm" disabled={saving} onclick={save}>{saving ? 'Saving…' : 'Save page'}</Button>
            <span class="hint">or <kbd>⌘⇧S</kbd> on any page</span>
          </div>
        </PageCard>
      {/if}

      {#if context.related.length}
        <section class="group">
          <SectionHeading label={context.saved ? 'Related in your library' : "You've seen this before"} />
          <div>
            {#each context.related as r (r.doc.id)}<RelatedCard plain title={r.doc.title} why={r.why} href={docHref(r.doc.id)} />{/each}
          </div>
        </section>
      {/if}

      {#if !context.saved && context.notes.length}
        <section class="group">
          <SectionHeading label="Your notes on these" />
          {#each context.notes as n (n.doc.id)}<RelatedCard title={n.text} why={n.doc.title} href={docHref(n.doc.id)} />{/each}
        </section>
      {/if}

      {#if asking || askError || answer}
        <section class="group" bind:this={answerEl}>
          <SectionHeading label="Answer" />
          {#if asking}<div class="loading"><Spinner /> Reading your sources…</div>{/if}
          {#if askError}<Banner tone="error" title="Couldn't answer">{askError}</Banner>{/if}
          {#if answer}
            <AnswerTurn turn={answer} compact />
            <button type="button" class="link clear" onclick={() => (answer = null)}><X size={12} /> Clear</button>
          {/if}
        </section>
      {/if}
    {/if}
  </main>

  {#if view.state === 'ready'}
    <footer class="foot">
      <form class="composer" onsubmit={submitQuestion}>
        <input bind:value={question} placeholder={view.page.lead ? 'Ask about this page and your library' : 'Ask your library'} aria-label="Question" />
        <IconButton label="Ask" variant="primary" type="submit" disabled={!question.trim() || asking}><ArrowUp size={15} /></IconButton>
      </form>
      {#if question.trim()}
        <p class="hint">
          {view.page.lead ? "Sends this page's text and matching saved passages to your Ask model." : 'Sends matching saved passages to your Ask model.'}
        </p>
      {/if}
    </footer>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 8px 8px 16px;
    border-bottom: 1px solid var(--border);
  }
  .head-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .library {
    display: flex;
    padding: 7px;
    border-radius: var(--r-sm);
    color: var(--text-2);
  }
  .library:hover {
    background: var(--hover);
  }
  .body {
    flex: 1;
    display: grid;
    align-content: start;
    gap: 20px;
    padding: 16px;
    overflow-y: auto;
  }
  .banner-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .loading {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-md);
    color: var(--text-2);
  }
  .center {
    margin: 10px 0;
  }
  .status,
  .switched {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .hint {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  kbd {
    font: inherit;
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .clear {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    justify-self: start;
    color: var(--text-2);
    text-decoration: none;
  }
  .group {
    display: grid;
    gap: 6px;
  }
  .foot {
    display: grid;
    gap: 6px;
    padding: 12px 16px 16px;
    border-top: 1px solid var(--border);
  }
  .composer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 12px;
    border-radius: var(--r-md);
    background: var(--surface);
  }
  .composer input {
    flex: 1;
    min-width: 0;
    border: none;
    background: none;
    font-size: var(--text-md);
  }
  .composer input:focus {
    outline: none;
  }
</style>
