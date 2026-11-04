<script lang="ts">
  import { PROVIDER_INFO, PROVIDER_KINDS } from '@/lib/providers/catalog';
  import type { ModelInfo, ProviderKind } from '@/lib/providers/types';
  import { rpc } from '@/lib/rpc/client';
  import { providerSettings } from '@/lib/settings/providers';
  import { TASKS, taskSettings, type TaskModel, type TaskName } from '@/lib/settings/tasks';
  import Input from '@/ui/kit/Input.svelte';
  import Select from '@/ui/kit/Select.svelte';
  import SettingsGroup from '@/ui/kit/SettingsGroup.svelte';
  import SettingsRow from '@/ui/kit/SettingsRow.svelte';
  import { stored } from '@/ui/storage.svelte';

  const providers = stored(providerSettings);
  const tasks = stored(taskSettings);
  let models = $state<Partial<Record<ProviderKind, ModelInfo[] | string>>>({});

  function candidates(needs: 'completion' | 'embeddings'): ProviderKind[] {
    return PROVIDER_KINDS.filter((kind) => {
      const info = PROVIDER_INFO[kind];
      return providers.value?.[kind]?.enabled && (needs === 'completion' ? info.supportsCompletion : info.supportsEmbeddings);
    });
  }

  async function loadModels(kind: ProviderKind) {
    if (models[kind]) return;
    models[kind] = [];
    try {
      models[kind] = await rpc('providers.listModels', { kind });
    } catch (e) {
      models[kind] = e instanceof Error ? e.message : String(e);
    }
  }

  $effect(() => {
    for (const task of TASKS) {
      const provider = tasks.value?.[task.name].provider;
      if (provider) loadModels(provider);
    }
  });

  async function update(name: TaskName, change: Partial<TaskModel>) {
    const current = await taskSettings.getValue();
    const next = { ...current[name], ...change };
    if (change.provider !== undefined) next.model = change.provider ? PROVIDER_INFO[change.provider].defaultModel : '';
    await taskSettings.setValue({ ...current, [name]: next });
  }

  function modelOptions(kind: ProviderKind, needs: 'completion' | 'embeddings'): ModelInfo[] {
    const list = models[kind];
    if (!Array.isArray(list)) return [];
    const isEmbedding = (m: ModelInfo) => /embed/i.test(m.id);
    return needs === 'embeddings' ? list.filter(isEmbedding) : list.filter((m) => !isEmbedding(m));
  }
</script>

<SettingsGroup title="Models" description="Which provider and model handles each kind of work. Only enabled providers appear.">
  {#if tasks.value}
    {#each TASKS as task (task.name)}
      {@const setting = tasks.value[task.name]}
      {@const options = candidates(task.needs)}
      {@const list = setting.provider ? models[setting.provider] : undefined}
      {@const choices = setting.provider ? modelOptions(setting.provider, task.needs) : []}
      <SettingsRow title={task.label} detail={task.description}>
        {#snippet control()}
          {#if options.length === 0}
            <span class="faint small">{task.needs === 'embeddings' ? 'Needs OpenAI, Gemini or Ollama' : 'Enable a provider first'}</span>
          {:else}
            <Select
              aria-label="{task.label} provider"
              value={setting.provider}
              onchange={(e) => update(task.name, { provider: e.currentTarget.value as ProviderKind | '' })}
            >
              <option value="">Off</option>
              {#each options as kind (kind)}<option value={kind}>{PROVIDER_INFO[kind].label}</option>{/each}
            </Select>
          {/if}
        {/snippet}
        {#if setting.provider && options.length}
          {#if typeof list === 'string'}
            <span class="error-text small">{list}</span>
          {:else if choices.length}
            <Select aria-label="{task.label} model" value={setting.model} onchange={(e) => update(task.name, { model: e.currentTarget.value })}>
              <option value="" disabled>Choose a model</option>
              {#each choices as m (m.id)}<option value={m.id}>{m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id}</option>{/each}
            </Select>
          {:else}
            <Input placeholder="Model id" value={setting.model} onchange={(e) => update(task.name, { model: e.currentTarget.value.trim() })} />
          {/if}
        {/if}
      </SettingsRow>
    {/each}
  {/if}
</SettingsGroup>
