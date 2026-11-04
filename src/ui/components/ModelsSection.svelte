<script lang="ts">
  import { PROVIDER_INFO, PROVIDER_KINDS } from '@/lib/providers/catalog';
  import { pickRecommended, recommendedFor, type Recommendation } from '@/lib/providers/recommended';
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
    if (change.provider) {
      // Switching provider picks its recommended model for this task, once its list has loaded.
      await loadModels(change.provider);
      const list = models[change.provider];
      change.model =
        (Array.isArray(list) && pickRecommended(change.provider, name, list)) || PROVIDER_INFO[change.provider].defaultModel;
    } else if (change.provider === '') {
      change.model = '';
    }
    const current = await taskSettings.getValue();
    await taskSettings.setValue({ ...current, [name]: { ...current[name], ...change } });
  }

  /** Recommended models first (with why), then the rest of the provider's list for this kind of work. */
  function modelOptions(kind: ProviderKind, task: TaskName, needs: 'completion' | 'embeddings') {
    const list = models[kind];
    if (!Array.isArray(list)) return { recommended: [] as (Recommendation & { label: string })[], rest: [] as ModelInfo[] };
    const isEmbedding = (m: ModelInfo) => /embed/i.test(m.id);
    const fit = needs === 'embeddings' ? list.filter(isEmbedding) : list.filter((m) => !isEmbedding(m));
    const byId = new Map(fit.map((m) => [m.id, m]));
    const recommended = recommendedFor(kind, task)
      .filter((r) => byId.has(r.id))
      .map((r) => ({ ...r, label: byId.get(r.id)!.name ?? r.id }));
    const picked = new Set(recommended.map((r) => r.id));
    return { recommended, rest: fit.filter((m) => !picked.has(m.id)) };
  }

  const modelLabel = (m: ModelInfo) => (m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id);
  const money = (n: number) => `$${n < 10 ? n.toFixed(2) : n.toFixed(0)}`;
  const priceLabel = (m: ModelInfo) => (m.price ? ` · ${money(m.price.input)} in / ${money(m.price.output)} out per 1M tokens` : '');

  /** Tasks where the user chose to pick outside the recommended models. */
  let override = $state<Partial<Record<TaskName, boolean>>>({});
  const OTHER = '__other__';

  /** Back to the short list; a model outside it is replaced by the first recommendation. */
  async function useRecommended(name: TaskName, recommended: { id: string }[], current: string) {
    override[name] = false;
    if (!recommended.some((r) => r.id === current)) await update(name, { model: recommended[0]!.id });
  }
</script>

<SettingsGroup title="Models" description="Which provider and model handles each kind of work. Only enabled providers appear.">
  {#if tasks.value}
    {#each TASKS as task (task.name)}
      {@const setting = tasks.value[task.name]}
      {@const options = candidates(task.needs)}
      {@const list = setting.provider ? models[setting.provider] : undefined}
      {@const choices = setting.provider ? modelOptions(setting.provider, task.name, task.needs) : { recommended: [], rest: [] }}
      <SettingsRow title={task.label} detail={task.description}>
        {#snippet control()}
          {#if options.length === 0}
            <span class="faint small">{task.needs === 'embeddings' ? 'Needs OpenAI, Gemini, OpenRouter or Ollama' : 'Enable a provider first'}</span>
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
          {:else if choices.recommended.length && !override[task.name] && (!setting.model || choices.recommended.some((r) => r.id === setting.model))}
            <!-- A short list of models we've chosen for this work; "Other model…" opens the full list. -->
            <Select
              aria-label="{task.label} model"
              value={setting.model}
              onchange={(e) => {
                const value = e.currentTarget.value;
                if (value === OTHER) override[task.name] = true;
                else update(task.name, { model: value });
              }}
            >
              <option value="" disabled>Choose a model</option>
              {#each choices.recommended as r (r.id)}<option value={r.id}>{r.label} · {r.note}</option>{/each}
              <option value={OTHER}>Other model…</option>
            </Select>
          {:else if choices.recommended.length || choices.rest.length}
            <Select aria-label="{task.label} model" value={setting.model} onchange={(e) => update(task.name, { model: e.currentTarget.value })}>
              <option value="" disabled>Choose a model</option>
              {#if choices.recommended.length}
                <optgroup label="Recommended">
                  {#each choices.recommended as r (r.id)}<option value={r.id}>{r.label} · {r.note}</option>{/each}
                </optgroup>
                <optgroup label="All models">
                  {#each choices.rest as m (m.id)}<option value={m.id}>{modelLabel(m)}{priceLabel(m)}</option>{/each}
                </optgroup>
              {:else}
                {#each choices.rest as m (m.id)}<option value={m.id}>{modelLabel(m)}{priceLabel(m)}</option>{/each}
              {/if}
            </Select>
            {#if choices.recommended.length}
              <p class="override faint small">
                Any model works, but some cost far more for the same summary.
                <button type="button" class="link" onclick={() => useRecommended(task.name, choices.recommended, setting.model)}>
                  Use a recommended model
                </button>
              </p>
            {/if}
          {:else}
            <Input placeholder="Model id" value={setting.model} onchange={(e) => update(task.name, { model: e.currentTarget.value.trim() })} />
          {/if}
        {/if}
      </SettingsRow>
    {/each}
  {/if}
</SettingsGroup>

<style>
  .override {
    margin: 0;
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    font-size: inherit;
    color: var(--text-2);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }
</style>
