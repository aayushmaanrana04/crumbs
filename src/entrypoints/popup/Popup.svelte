<script lang="ts">
  import { browser } from '#imports';
  import Check from '@lucide/svelte/icons/check';
  import type { SaveOutcome } from '@/lib/capture/save';
  import { describeOutcome } from '@/lib/capture/describe';
  import { rowStatus } from '@/lib/library/ai-label';
  import { rpc } from '@/lib/rpc/client';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import Button from '@/ui/kit/Button.svelte';
  import Kbd from '@/ui/kit/Kbd.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';

  let saving = $state(false);
  let outcome = $state<SaveOutcome | null>(null);
  let error = $state('');
  const stats = rpc('library.stats');
  const ai = aiStatuses();

  const status = $derived(outcome ? ai.get(outcome.docId) : null);
  const busy = $derived(!!status && [status.insights, status.embed].some((s) => s === 'running' || s === 'queued'));

  async function save() {
    saving = true;
    error = '';
    try {
      outcome = await rpc('capture.activeTab');
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      saving = false;
    }
  }

  async function open(hash: string) {
    await browser.tabs.create({ url: browser.runtime.getURL(`/app.html${hash}`) });
    window.close();
  }
</script>

<div class="popup">
  <div class="brand">
    <span class="monogram" aria-hidden="true">S</span>
    <span>Summaryse</span>
  </div>

  {#if outcome}
    <button type="button" class="saved" onclick={() => open(`#/doc/${encodeURIComponent(outcome!.docId)}`)}>
      <span class="head"><Check size={14} /> {describeOutcome(outcome)}</span>
      <span class="title">{outcome.title}</span>
      {#if status}
        <span class="status">
          {#if busy}<Spinner size={10} />{/if}
          {ai.aiReady ? rowStatus(status).label : 'AI summaries are off'}
        </span>
      {/if}
    </button>
  {:else}
    <Button kind="primary" full disabled={saving} onclick={save}>{saving ? 'Saving…' : 'Save this page'}</Button>
    {#if error}<p class="error-text small">{error}</p>{:else}<p class="hint">or press <Kbd keys="⌘⇧S" /> on any page</p>{/if}
  {/if}

  <div class="links">
    <Button size="sm" full onclick={() => open('#/library')}>Library</Button>
    <Button size="sm" full onclick={() => open('#/ask')}>Ask</Button>
    <Button size="sm" full onclick={() => open('#/settings')}>Settings</Button>
  </div>
  {#await stats then s}
    <p class="foot">{s.documents} page{s.documents === 1 ? '' : 's'} saved{s.pendingJobs ? ` · ${s.pendingJobs} being summarised` : ''}</p>
  {/await}
</div>

<style>
  :global(body) {
    background: var(--bg);
  }
  .popup {
    width: 300px;
    display: grid;
    gap: 10px;
    padding: 12px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 2px 4px;
    font-size: var(--text-base);
    font-weight: 600;
  }
  .monogram {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: var(--primary);
    color: var(--on-primary);
    font-size: 11px;
    font-weight: 700;
  }
  .saved {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    border: none;
    border-radius: var(--r-md);
    background: var(--surface);
    text-align: left;
    cursor: pointer;
  }
  .saved:hover {
    background: var(--hover);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
  }
  .title {
    font-size: var(--text-md);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .hint {
    margin: -2px 0 0;
    text-align: center;
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .links {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .foot {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--text-3);
    text-align: center;
  }
  p {
    margin: 0;
  }
</style>
