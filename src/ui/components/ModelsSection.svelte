<script lang="ts">
  import { PROVIDER_INFO, PROVIDER_KINDS } from '@/lib/providers/catalog';
  import type { ModelInfo, ProviderKind } from '@/lib/providers/types';
  import { rpc } from '@/lib/rpc/client';
  import { providerSettings } from '@/lib/settings/providers';
  import { TASKS, taskSettings, type TaskModel, type TaskName } from '@/lib/settings/tasks';
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

<section>
  <h2 class="section-title">Models</h2>
  <p class="muted small intro">Choose which provider and model handles each kind of work. Only enabled providers appear here.</p>
  {#if tasks.value}
    <div class="tasks">
      {#each TASKS as task (task.name)}
        {@const setting = tasks.value[task.name]}
        {@const options = candidates(task.needs)}
        <div class="panel task">
          <div>
            <div class="name">{task.label}</div>
            <div class="muted small">{task.description}</div>
          </div>
          {#if options.length === 0}
            <p class="muted small">
              {task.needs === 'embeddings'
                ? 'Enable OpenAI, Gemini or Ollama above to search by meaning.'
                : 'Enable and test a provider above first.'}
            </p>
          {:else}
            <div class="pickers">
              <select
                class="input"
                aria-label="{task.label} provider"
                value={setting.provider}
                onchange={(e) => update(task.name, { provider: e.currentTarget.value as ProviderKind | '' })}
              >
                <option value="">Off</option>
                {#each options as kind (kind)}<option value={kind}>{PROVIDER_INFO[kind].label}</option>{/each}
              </select>
              {#if setting.provider}
                {@const list = models[setting.provider]}
                {#if typeof list === 'string'}
                  <span class="error-text small">{list}</span>
                {:else}
                  {@const choices = modelOptions(setting.provider, task.needs)}
                  {#if choices.length}
                    <select
                      class="input"
                      aria-label="{task.label} model"
                      value={setting.model}
                      onchange={(e) => update(task.name, { model: e.currentTarget.value })}
                    >
                      <option value="" disabled>Choose a model</option>
                      {#each choices as m (m.id)}<option value={m.id}>{m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id}</option>{/each}
                    </select>
                  {:else}
                    <input
                      class="input"
                      placeholder="Model id"
                      value={setting.model}
                      onchange={(e) => update(task.name, { model: e.currentTarget.value.trim() })}
                    />
                  {/if}
                {/if}
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .intro {
    margin: 0 0 var(--space-3);
  }
  .tasks {
    display: grid;
    gap: var(--space-3);
  }
  .task {
    display: grid;
    gap: var(--space-3);
  }
  .name {
    font-weight: 600;
  }
  .pickers {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    align-items: center;
  }
  .task p {
    margin: 0;
  }
</style>
