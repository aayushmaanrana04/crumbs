<script lang="ts">
  import { browser } from '#imports';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import Library from '@lucide/svelte/icons/library';
  import { describeOutcome } from '@/lib/capture/describe';
  import { hostnameOf, isCapturableUrl } from '@/lib/capture/url';
  import { pageContext, type PageContext, type PageInfo } from '@/lib/library/page-context';
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
  import RelatedCard from '@/ui/kit/RelatedCard.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';
  import SettingsRow from '@/ui/kit/SettingsRow.svelte';
  import Toggle from '@/ui/kit/Toggle.svelte';
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

  const follow = $derived(settings.value?.follow ?? false);
  const host = $derived(view.state === 'ready' ? hostnameOf(view.page.url) : '');
  const paused = $derived(view.state === 'ready' && !!settings.value && isPaused(view.page.url, settings.value));

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
    <a class="library" href="#/library" aria-label="Open library" title="Open library"><Library size={16} /></a>
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
          Carrel needs access to read this page.
          <div class="center"><Button kind="primary" size="sm" onclick={() => allowSite(view.state === 'unreadable' ? view.url! : '')}>Allow on this site</Button></div>
          Or click the toolbar button while you're on the page.
        {:else}
          Browser pages and blocked sites aren't read or saved.
        {/if}
      </EmptyState>
    {:else}
      {@const { page, context } = view}
      <section class="page">
        <p class="site">{siteLabel(page)}</p>
        <h1 class="title">{page.title || page.url}</h1>
      </section>

      {#if context.saved}
        {#key context.saved.id}<PanelSaved docId={context.saved.id} />{/key}
        <Button full href={docHref(context.saved.id)}>Open full summary</Button>
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

      {#if context.notes.length}
        <section class="group">
          <SectionHeading label="Your notes" />
          {#each context.notes as n (n.doc.id)}<RelatedCard title={n.text} why={n.doc.title} href={docHref(n.doc.id)} />{/each}
        </section>
      {/if}

      <section class="group">
        <SectionHeading label="Quick ask" />
        <form class="composer" onsubmit={submitQuestion}>
          <input bind:value={question} placeholder={page.lead ? 'Ask about this page and your library' : 'Ask your library'} aria-label="Question" />
          <IconButton label="Ask" variant="primary" type="submit" disabled={!question.trim() || asking}><ArrowUp size={15} /></IconButton>
        </form>
        <p class="hint">
          {page.lead ? "Sends this page's text and matching saved passages to your Ask model." : 'Sends matching saved passages to your Ask model.'}
        </p>
        {#if asking}<div class="loading"><Spinner /> Reading your sources…</div>{/if}
        {#if askError}<Banner tone="error" title="Couldn't answer">{askError}</Banner>{/if}
        {#if answer}<AnswerTurn turn={answer} compact />{/if}
      </section>
    {/if}
  </main>

  <footer class="foot">
    <SettingsRow
      title="Follow my browsing"
      detail="Update the panel as you switch tabs. Chrome will ask to let Carrel see tab addresses and titles; they're matched on this device and not saved."
    >
      {#snippet control()}<Toggle label="Follow my browsing" checked={follow} onchange={setFollow} />{/snippet}
    </SettingsRow>
    {#if follow && host}
      <SettingsRow title="Pause on {normalizeSite(host)}">
        {#snippet control()}<Toggle label="Pause on {normalizeSite(host)}" checked={paused} onchange={setPaused} />{/snippet}
      </SettingsRow>
    {/if}
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
  .foot {
    padding: 4px 0;
    border-top: 1px solid var(--border);
  }
  .library {
    display: flex;
    padding: 6px;
    border-radius: var(--r-sm);
    color: var(--text-2);
  }
  .library:hover {
    background: var(--hover);
  }
</style>
