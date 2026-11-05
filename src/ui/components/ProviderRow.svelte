<script lang="ts">
  import { browser } from '#imports';
  import { PROVIDER_INFO } from '@/lib/providers/catalog';
  import { chromeAi } from '@/lib/providers/chrome-ai';
  import type { ModelInfo, ProviderConfig, ProviderKind } from '@/lib/providers/types';
  import { rpc } from '@/lib/rpc/client';
  import { OPENROUTER_KEYS_PAGE } from '@/lib/providers/openrouter-auth';
  import { pickRecommended } from '@/lib/providers/recommended';
  import { getProviderConfig, providerSettings, saveProviderConfig } from '@/lib/settings/providers';
  import { taskSettings, type TaskName } from '@/lib/settings/tasks';
  import Button from '@/ui/kit/Button.svelte';
  import Field from '@/ui/kit/Field.svelte';
  import Input from '@/ui/kit/Input.svelte';
  import SettingsRow from '@/ui/kit/SettingsRow.svelte';
  import ProviderIcon from '@/ui/kit/ProviderIcon.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';
  import Toggle from '@/ui/kit/Toggle.svelte';
  import OpenRouterConnect from './OpenRouterConnect.svelte';
  import TryPrompt from './TryPrompt.svelte';

  let { kind }: { kind: ProviderKind } = $props();

  const info = $derived(PROVIDER_INFO[kind]);
  let config = $state<ProviderConfig | null>(null);
  let expanded = $state(false);
  /** OpenRouter offers sign-in; this switches to pasting a key. */
  let manual = $state(false);
  let status = $state<
    { state: 'idle' } | { state: 'testing' } | { state: 'ok'; models: ModelInfo[] } | { state: 'error'; message: string }
  >({ state: 'idle' });

  $effect(() => {
    getProviderConfig(kind).then((c) => (config = c));
  });

  const canTest = $derived(config !== null && (!info.needsKey || config.apiKey.trim() !== ''));
  const open = $derived(expanded || !!config?.enabled);
  const detail = $derived(
    status.state === 'ok'
      ? `Connected · ${status.models.length} model${status.models.length === 1 ? '' : 's'}`
      : status.state === 'testing'
        ? 'Testing…'
        : config?.connectedAt
          ? 'Connected to your OpenRouter account'
          : config?.enabled
          ? 'On'
          : info.devOnly
            ? 'Development builds only'
            : !info.supportsCompletion && !info.supportsEmbeddings
              ? 'Not used for summaries or Ask yet'
              : 'Not set up',
  );

  async function save() {
    if (config) await saveProviderConfig(kind, $state.snapshot(config));
  }

  async function setEnabled(enabled: boolean) {
    if (!config) return;
    config.enabled = enabled;
    if (!enabled) {
      expanded = false;
      status = { state: 'idle' };
      // Drop host access when a provider is turned off.
      if (info.hostPermissions.length > 0) await browser.permissions.remove({ origins: [...info.hostPermissions] });
    }
    await save();
  }

  /**
   * A key from "Connect OpenRouter": save it, check it, and pick recommended models for summaries and Ask
   * when they have no model or their provider is off. Search is left alone: choosing a model re-processes the library.
   */
  async function useConnectedKey(key: string) {
    if (!config) return;
    config.apiKey = key;
    config.connectedAt = Date.now();
    manual = false;
    await test();
    if (status.state !== 'ok') return;
    const [tasks, providers] = await Promise.all([taskSettings.getValue(), providerSettings.getValue()]);
    const next = { ...tasks };
    for (const task of ['insights', 'answer'] as TaskName[]) {
      const current = tasks[task].provider;
      const model = pickRecommended('openrouter', task, status.models);
      if (model && (!current || !providers[current]?.enabled)) next[task] = { provider: 'openrouter', model };
    }
    await taskSettings.setValue(next);
  }

  /** Forget the key here; it stays on the user's OpenRouter account until they revoke it there. */
  async function disconnect() {
    if (!config) return;
    config.apiKey = '';
    delete config.connectedAt;
    await setEnabled(false);
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
        info.runsIn === 'page' ? await chromeAi.listModels($state.snapshot(config)) : await rpc('providers.listModels', { kind });
      status = { state: 'ok', models };
    } catch (error) {
      status = { state: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }
</script>

<SettingsRow title={info.label} {detail}>
  {#snippet icon()}<ProviderIcon {kind} />{/snippet}
  {#snippet control()}
    {#if !open}<Button size="sm" onclick={() => (expanded = true)}>Set up</Button>{/if}
    <Toggle label="Use {info.label}" checked={config?.enabled ?? false} disabled={!config} onchange={setEnabled} />
  {/snippet}

  {#if open && config && kind === 'openrouter' && !config.apiKey && !manual}
    <OpenRouterConnect onkey={useConnectedKey} onmanual={() => (manual = true)} />
  {:else if open && config}
    {#if info.needsKey && !config.connectedAt}
      <Field label="API key" hint="Stored only in this browser and sent only to {info.label}.">
        <Input type="password" autocomplete="off" spellcheck="false" placeholder="Paste your {info.label} key" bind:value={config.apiKey} onchange={save} />
      </Field>
    {/if}
    {#if info.defaultBaseUrl && !config.connectedAt}
      <Field label="Base URL">
        <Input type="url" spellcheck="false" bind:value={config.baseUrl} onchange={save} />
      </Field>
    {/if}
    {#if manual && !config.apiKey}
      <button type="button" class="link" onclick={() => (manual = false)}>Sign in with OpenRouter instead</button>
    {/if}
    <div class="test">
      <Button size="sm" disabled={!canTest || status.state === 'testing'} onclick={test}>
        {#if status.state === 'testing'}<Spinner size={10} />{/if} Test connection
      </Button>
      {#if config.connectedAt}
        <Button size="sm" href={OPENROUTER_KEYS_PAGE}>Set a spending limit ↗</Button>
        <Button size="sm" kind="ghost" onclick={disconnect}>Disconnect</Button>
      {/if}
      {#if status.state === 'error'}<span class="error-text small">{status.message}</span>{/if}
    </div>
    {#if config.connectedAt}
      <p class="faint small">Disconnect removes the key from Crumbs. It stays active on OpenRouter until you delete it under Keys.</p>
    {/if}
    {#if status.state === 'ok' && info.supportsCompletion}
      <TryPrompt {kind} models={status.models} />
    {/if}
  {/if}
</SettingsRow>

<style>
  .link {
    justify-self: start;
    padding: 0;
    border: none;
    background: none;
    font-size: var(--text-sm);
    color: var(--text-2);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
  .test {
    display: flex;
    align-items: center;
    gap: 12px;
  }
</style>
