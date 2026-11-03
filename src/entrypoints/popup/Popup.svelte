<script lang="ts">
  import { browser } from '#imports';
  import type { SaveOutcome } from '@/lib/capture/save';
  import { describeOutcome } from '@/lib/capture/describe';
  import { rpc } from '@/lib/rpc/client';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import AiBadge from '@/ui/components/AiBadge.svelte';

  let saving = $state(false);
  let outcome = $state<SaveOutcome | null>(null);
  let error = $state('');
  const stats = rpc('library.stats');
  const ai = aiStatuses();

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
  <div class="brand">Summaryse</div>
  <button class="btn btn-primary" disabled={saving} onclick={save}>{saving ? 'Saving…' : 'Save this page'}</button>
  {#if outcome}
    <p class="result">
      {describeOutcome(outcome)} ·
      <button class="link-button" onclick={() => open(`#/doc/${encodeURIComponent(outcome!.docId)}`)}>Open</button>
    </p>
    <div class="ai-row">
      <AiBadge status={ai.get(outcome.docId)} />
      {#if !ai.aiReady}
        <button class="link-button small" onclick={() => open('#/settings')}>Set up AI</button>
      {/if}
    </div>
  {:else if error}
    <p class="result error-text">{error}</p>
  {/if}
  <div class="row">
    <button class="btn" onclick={() => open('#/library')}>Library</button>
    <button class="btn" onclick={() => open('#/ask')}>Ask</button>
    <button class="btn" onclick={() => open('#/settings')}>Settings</button>
  </div>
  {#await stats then s}
    <p class="muted small">{s.documents} saved{s.pendingJobs ? ` · ${s.pendingJobs} processing` : ''}</p>
  {/await}
</div>

<style>
  .popup {
    width: 280px;
    padding: var(--space-4);
    display: grid;
    gap: var(--space-2);
  }
  .brand {
    font-weight: 600;
    font-size: 16px;
    margin-bottom: var(--space-1);
  }
  .row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-2);
  }
  p {
    margin: 0;
  }
  .result {
    font-size: 13px;
  }
  .ai-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
</style>
