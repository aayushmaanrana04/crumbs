<script lang="ts">
  import { browser } from '#imports';
  import { PROVIDER_INFO } from '@/lib/providers/catalog';
  import { chromeAi } from '@/lib/providers/chrome-ai';
  import type { ModelInfo, ProviderConfig, ProviderKind } from '@/lib/providers/types';
  import { rpc } from '@/lib/rpc/client';
  import { getProviderConfig, saveProviderConfig } from '@/lib/settings/providers';
  import Button from '@/ui/kit/Button.svelte';
  import Field from '@/ui/kit/Field.svelte';
  import Input from '@/ui/kit/Input.svelte';
  import SettingsRow from '@/ui/kit/SettingsRow.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';
  import Toggle from '@/ui/kit/Toggle.svelte';
  import TryPrompt from './TryPrompt.svelte';

  let { kind }: { kind: ProviderKind } = $props();

  const info = $derived(PROVIDER_INFO[kind]);
  let config = $state<ProviderConfig | null>(null);
  let expanded = $state(false);
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
        : config?.enabled
          ? 'On'
          : info.devOnly
            ? 'Development builds only'
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
  {#snippet control()}
    {#if !open}<Button size="sm" onclick={() => (expanded = true)}>Set up</Button>{/if}
    <Toggle label="Use {info.label}" checked={config?.enabled ?? false} disabled={!config} onchange={setEnabled} />
  {/snippet}

  {#if open && config}
    {#if info.needsKey}
      <Field label="API key" hint="Stored only in this browser and sent only to {info.label}.">
        <Input type="password" autocomplete="off" spellcheck="false" placeholder="Paste your {info.label} key" bind:value={config.apiKey} onchange={save} />
      </Field>
    {/if}
    {#if info.defaultBaseUrl}
      <Field label="Base URL">
        <Input type="url" spellcheck="false" bind:value={config.baseUrl} onchange={save} />
      </Field>
    {/if}
    <div class="test">
      <Button size="sm" disabled={!canTest || status.state === 'testing'} onclick={test}>
        {#if status.state === 'testing'}<Spinner size={10} />{/if} Test connection
      </Button>
      {#if status.state === 'error'}<span class="error-text small">{status.message}</span>{/if}
    </div>
    {#if status.state === 'ok' && info.supportsCompletion}
      <TryPrompt {kind} models={status.models} />
    {/if}
  {/if}
</SettingsRow>

<style>
  .test {
    display: flex;
    align-items: center;
    gap: 12px;
  }
</style>
