<script lang="ts">
  import { browser } from '#imports';
  import { PROVIDER_INFO } from '@/lib/providers/catalog';
  import { chromeAi } from '@/lib/providers/chrome-ai';
  import type { ModelInfo, ProviderConfig, ProviderKind } from '@/lib/providers/types';
  import { rpc } from '@/lib/rpc/client';
  import { getProviderConfig, saveProviderConfig } from '@/lib/settings/providers';
  import TryPrompt from './TryPrompt.svelte';

  let { kind }: { kind: ProviderKind } = $props();

  const info = $derived(PROVIDER_INFO[kind]);
  let config = $state<ProviderConfig | null>(null);
  let status = $state<
    { state: 'idle' } | { state: 'testing' } | { state: 'ok'; models: ModelInfo[] } | { state: 'error'; message: string }
  >({ state: 'idle' });

  $effect(() => {
    getProviderConfig(kind).then((c) => (config = c));
  });

  const canTest = $derived(config !== null && (!info.needsKey || config.apiKey.trim() !== ''));

  async function save() {
    if (config) await saveProviderConfig(kind, $state.snapshot(config));
  }

  async function onToggle() {
    if (!config) return;
    if (!config.enabled && info.hostPermissions.length > 0) {
      // Drop host access when a provider is turned off.
      await browser.permissions.remove({ origins: [...info.hostPermissions] });
    }
    status = { state: 'idle' };
    await save();
  }

  async function test() {
    if (!config) return;
    status = { state: 'testing' };
    try {
      // Must run first, while the click still counts as a user gesture.
      if (info.hostPermissions.length > 0) {
        const granted = await browser.permissions.request({ origins: [...info.hostPermissions] });
        if (!granted) throw new Error(`Permission to contact ${info.label} was declined.`);
      }
      config.enabled = true;
      await save();
      // Chrome built-in AI is only exposed to pages; everything else goes through the background.
      const models =
        info.runsIn === 'page'
          ? await chromeAi.listModels($state.snapshot(config))
          : await rpc('providers.listModels', { kind });
      status = { state: 'ok', models };
    } catch (error) {
      status = { state: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }
</script>

<div class="card">
  <div class="header">
    <label class="toggle">
      <input
        type="checkbox"
        checked={config?.enabled ?? false}
        disabled={!config}
        onchange={(e) => {
          if (config) config.enabled = e.currentTarget.checked;
          onToggle();
        }}
      />
      <span class="name">{info.label}</span>
    </label>
    <button class="btn" disabled={!canTest || status.state === 'testing'} onclick={test}>
      {status.state === 'testing' ? 'Testing…' : 'Test connection'}
    </button>
  </div>

  {#if config}
    {#if info.needsKey}
      <label class="field">
        <span>API key</span>
        <input
          class="input"
          type="password"
          autocomplete="off"
          spellcheck="false"
          placeholder="Paste your {info.label} key"
          bind:value={config.apiKey}
          onchange={save}
        />
      </label>
    {/if}
    {#if info.defaultBaseUrl}
      <label class="field">
        <span>Base URL</span>
        <input class="input" type="url" spellcheck="false" bind:value={config.baseUrl} onchange={save} />
      </label>
    {/if}
  {/if}

  {#if status.state === 'ok'}
    <p class="result ok">Connected · {status.models.length} model{status.models.length === 1 ? '' : 's'} available</p>
    {#if info.supportsCompletion}
      <TryPrompt {kind} models={status.models} />
    {/if}
  {:else if status.state === 'error'}
    <p class="result error">{status.message}</p>
  {/if}
</div>

<style>
  .card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: grid;
    gap: var(--space-3);
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    cursor: pointer;
  }
  .toggle input {
    accent-color: var(--color-primary);
  }
  .name {
    font-weight: 600;
  }
  .field {
    display: grid;
    gap: var(--space-1);
    font-size: 13px;
    color: var(--color-text-2);
  }
  .result {
    margin: 0;
    font-size: 13px;
  }
  .ok {
    color: var(--color-success);
  }
  .error {
    color: var(--color-error);
  }
</style>
