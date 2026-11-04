<script lang="ts">
  import { browser } from '#imports';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import ExternalLink from '@lucide/svelte/icons/external-link';
  import Library from '@lucide/svelte/icons/library';
  import { describeOutcome } from '@/lib/capture/describe';
  import type { PagePreview } from '@/lib/capture/tab';
  import { hostnameOf, isCapturableUrl } from '@/lib/capture/url';
  import { pageContext, type PageContext } from '@/lib/library/page-context';
  import { modelLabel } from '@/lib/library/ai-label';
  import { rpc } from '@/lib/rpc/client';
  import { ask, type AskTurn } from '@/lib/search/ask';
  import { normalizeSite, siteMatches } from '@/lib/settings/capture';
  import { panelSettings } from '@/lib/settings/panel';
  import Markdown from '@/ui/components/Markdown.svelte';
  import PanelSaved from '@/ui/components/PanelSaved.svelte';
  import Banner from '@/ui/kit/Banner.svelte';
  import Button from '@/ui/kit/Button.svelte';
  import Citation from '@/ui/kit/Citation.svelte';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
  import IconButton from '@/ui/kit/IconButton.svelte';
  import Inference from '@/ui/kit/Inference.svelte';
  import RelatedCard from '@/ui/kit/RelatedCard.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import SourceCard from '@/ui/kit/SourceCard.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';
  import Toggle from '@/ui/kit/Toggle.svelte';
  import { docHref } from '@/ui/router.svelte';
  import { stored } from '@/ui/storage.svelte';

  type Page = { url: string; title: string; siteName?: string; lead?: string };
  type View =
    | { state: 'loading' }
    | { state: 'unreadable'; url?: string } // a browser page, a blocked site, or no access yet
    | { state: 'ready'; page: Page; context: PageContext };

  const settings = stored(panelSettings);
  const APP_URL = browser.runtime.getURL('/app.html');

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

  const follow = $derived(settings.value?.follow ?? false);
  const host = $derived(view.state === 'ready' ? hostnameOf(view.page.url) : '');
  const paused = $derived(!!host && (settings.value?.pausedSites ?? []).some((s) => siteMatches(host, s)));

  async function show(id: number) {
    tabId = id;
    switchedTo = null;
    view = { state: 'loading' };
    message = '';
    answer = null;
    askError = '';
    const preview: PagePreview | null = await rpc('capture.preview', { tabId: id }).catch(() => null);
    let page: Page | null = preview;
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
      const pausedHere = !!tab?.url && (settings.value?.pausedSites ?? []).some((s) => siteMatches(hostnameOf(tab.url!), s));
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

  let toggles = $state(0);

  async function setFollow(on: boolean) {
    if (on && !(await browser.permissions.request({ permissions: ['tabs'] }).catch(() => false))) {
      toggles++;
      return;
    }
    const current = await panelSettings.getValue();
    await panelSettings.setValue({ ...current, follow: on });
    if (on && switchedTo !== null) await show(switchedTo);
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

  /** Library links ("#/doc/…") open in the full app, not inside the narrow panel. */
  function openLinksInApp(e: MouseEvent) {
    const a = (e.target as HTMLElement).closest('a');
    const href = a?.getAttribute('href');
    if (!href?.startsWith('#/')) return;
    e.preventDefault();
    void browser.tabs.create({ url: `${APP_URL}${href}` });
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="panel" onclick={openLinksInApp}>
  <header class="head">
    <span class="brand">Summaryse</span>
    <IconButton label="Open library" onclick={() => browser.tabs.create({ url: `${APP_URL}#/library` })}><Library size={16} /></IconButton>
  </header>

  {#if switchedTo !== null}
    <div class="switched">
      <Banner title="You switched tabs">
        {follow ? 'Follow is paused on this site.' : "Turn on follow to keep the panel in step with the tab you're on."}
        {#snippet action()}
          <div class="banner-actions">
            {#if !follow}<Button size="sm" kind="primary" onclick={() => setFollow(true)}>Turn on</Button>{/if}
            <Button size="sm" kind="ghost" onclick={() => show(switchedTo!)}>Show this tab</Button>
          </div>
        {/snippet}
      </Banner>
    </div>
  {/if}

  <main class="body">
    {#if view.state === 'loading'}
      <div class="loading"><Spinner /> Reading this page…</div>
    {:else if view.state === 'unreadable'}
      <EmptyState title="Nothing to show for this tab">
        {#if view.url && isCapturableUrl(view.url)}
          Summaryse needs access to read this page.
          <div class="center"><Button kind="primary" size="sm" onclick={() => allowSite(view.state === 'unreadable' ? view.url! : '')}>Allow on this site</Button></div>
          Or click the toolbar button while you're on the page.
        {:else}
          Browser pages and blocked sites aren't read or saved.
        {/if}
      </EmptyState>
    {:else}
      {@const { page, context } = view}
      <section class="page">
        <p class="site">{page.siteName || hostnameOf(page.url)}</p>
        <h1 class="title">{page.title || page.url}</h1>
      </section>

      {#if context.saved}
        {#key context.saved.id}<PanelSaved docId={context.saved.id} />{/key}
        <Button full onclick={() => browser.tabs.create({ url: `${APP_URL}${docHref(context.saved!.id)}` })}>
          <ExternalLink size={14} /> Open full summary
        </Button>
      {:else}
        <div class="save">
          <Button kind="primary" full disabled={saving} onclick={save}>{saving ? 'Saving…' : 'Save page'}</Button>
          <p class="hint">{message || 'Or press ⌘⇧S on any page.'}</p>
        </div>
      {/if}

      {#if context.related.length}
        <section class="group">
          <SectionHeading label={context.saved ? 'Related in your library' : "You've seen this before"} />
          {#each context.related as r (r.doc.id)}<RelatedCard title={r.doc.title} why={r.why} href={docHref(r.doc.id)} />{/each}
        </section>
      {:else if !context.saved}
        <EmptyState title="Nothing related yet">Pages you save that share names, tags or words with this one will show up here.</EmptyState>
      {/if}

      {#if context.notes.filter((n) => n.doc.id !== context.saved?.id).length}
        <section class="group">
          <SectionHeading label="Your notes" />
          {#each context.notes.filter((n) => n.doc.id !== context.saved?.id) as n (n.doc.id)}
            <a class="note" href={docHref(n.doc.id)}><span>{n.text}</span><span class="note-from">{n.doc.title}</span></a>
          {/each}
        </section>
      {/if}

      <section class="group">
        <SectionHeading label="Quick ask" />
        <form class="composer" onsubmit={submitQuestion}>
          <input bind:value={question} placeholder={page.lead ? 'Ask about this page and your library' : 'Ask your library'} aria-label="Question" />
          <IconButton label="Ask" variant="primary" type="submit" disabled={!question.trim() || asking}><ArrowUp size={15} /></IconButton>
        </form>
        {#if asking}<div class="loading"><Spinner /> Reading your sources…</div>{/if}
        {#if askError}<Banner tone="error" title="Couldn't answer">{askError}</Banner>{/if}
        {#if answer}
          <div class="answer">
            {#each answer.segments as segment, s (s)}
              {#if segment.kind === 'inference'}
                <Inference><Markdown source={segment.text} size="compact" /></Inference>
              {:else}
                <div>
                  <Markdown source={segment.text} size="compact" />
                  {#each segment.sources as n (n)}<Citation {n} />{/each}
                </div>
              {/if}
            {/each}
            {#each answer.sources as hit, i (hit.chunk.id)}
              <SourceCard
                n={i + 1}
                title={hit.doc.id ? hit.doc.title : `${hit.doc.title} (this page)`}
                site={hit.doc.siteName || hostnameOf(hit.doc.url)}
                href={hit.doc.id ? docHref(hit.doc.id, { start: hit.chunk.charStart, end: hit.chunk.charEnd }) : hit.doc.url}
              />
            {/each}
            <p class="hint">{modelLabel(answer.model)}</p>
          </div>
        {/if}
      </section>
    {/if}
  </main>

  <footer class="foot">
    <!-- Re-keyed after each change so a declined permission prompt flips the switch back. -->
    {#key toggles}
      <div class="foot-row">
        <span>Follow my browsing<small>Update the panel as you switch tabs</small></span>
        <Toggle label="Follow my browsing" checked={follow} onchange={setFollow} />
      </div>
      {#if follow && host}
        <div class="foot-row">
          <span>Pause on {normalizeSite(host)}</span>
          <Toggle label="Pause on {normalizeSite(host)}" checked={paused} onchange={setPaused} />
        </div>
      {/if}
    {/key}
  </footer>
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
    padding: 10px 12px 10px 16px;
    border-bottom: 1px solid var(--border);
  }
  .brand {
    font-weight: 600;
    letter-spacing: -0.2px;
  }
  .switched {
    padding: 12px 12px 0;
  }
  .banner-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .body {
    flex: 1;
    display: grid;
    align-content: start;
    gap: 20px;
    padding: 16px;
    overflow-y: auto;
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
  .page {
    display: grid;
    gap: 4px;
  }
  .site {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .title {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.3px;
    line-height: 1.3;
  }
  .save {
    display: grid;
    gap: 6px;
  }
  .hint {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .group {
    display: grid;
    gap: 6px;
  }
  .note {
    display: grid;
    gap: 2px;
    padding: 10px 12px;
    border-radius: var(--r-md);
    background: var(--surface);
    font-size: var(--text-md);
    color: inherit;
    text-decoration: none;
  }
  .note:hover {
    background: var(--hover);
  }
  .note-from {
    font-size: var(--text-sm);
    color: var(--text-3);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .composer {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 12px;
    border-radius: var(--r-sm);
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
  .answer {
    display: grid;
    gap: 10px;
  }
  .foot {
    display: grid;
    gap: 10px;
    padding: 12px 16px;
    border-top: 1px solid var(--border);
  }
  .foot-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: var(--text-md);
  }
  .foot-row span {
    display: grid;
    gap: 1px;
  }
  .foot-row small {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
</style>
