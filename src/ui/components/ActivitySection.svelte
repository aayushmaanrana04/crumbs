<script lang="ts">
  import { db } from '@/lib/db/schema';
  import { PROVIDER_INFO } from '@/lib/providers/catalog';
  import type { ProviderKind } from '@/lib/providers/types';
  import { TASKS, usageLimits } from '@/lib/settings/tasks';
  import { formatDateTime } from '@/ui/format';
  import { live } from '@/ui/live.svelte';
  import { stored } from '@/ui/storage.svelte';
  import Input from '@/ui/kit/Input.svelte';
  import SettingsGroup from '@/ui/kit/SettingsGroup.svelte';
  import SettingsRow from '@/ui/kit/SettingsRow.svelte';

  const recent = live(() => db.usage.orderBy('at').reverse().limit(50).toArray(), []);
  const today = live(async () => {
    const start = new Date().setHours(0, 0, 0, 0);
    const rows = await db.usage.where('at').aboveOrEqual(start).toArray();
    return {
      calls: rows.length,
      input: rows.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0),
      output: rows.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0),
    };
  }, { calls: 0, input: 0, output: 0 });
  const limits = stored(usageLimits);

  const TASK_LABELS: Record<string, string> = Object.fromEntries(TASKS.map((t) => [t.name, t.label]));
  const label = (provider: string) => PROVIDER_INFO[provider as ProviderKind]?.label ?? provider;
</script>

<SettingsGroup title="AI activity" description="Every summary, search-indexing and Ask call that sent content to an AI provider.">
  <SettingsRow
    title="Today"
    detail="{today.value.calls} call{today.value.calls === 1 ? '' : 's'} · {today.value.input.toLocaleString()} tokens in · {today.value.output.toLocaleString()} out"
  />
  {#if limits.value}
    <SettingsRow title="Daily limit for background work" detail="Summaries and search indexing pause after this many calls. 0 means no limit.">
      {#snippet control()}
        <span class="limit">
          <Input
            type="number"
            min="0"
            value={String(limits.value!.dailyBackgroundCalls)}
            onchange={(e) => usageLimits.setValue({ dailyBackgroundCalls: Math.max(0, Number(e.currentTarget.value) || 0) })}
          />
        </span>
      {/snippet}
    </SettingsRow>
  {/if}
  <SettingsRow title="Recent calls">
    {#if recent.value.length}
      <table>
        <thead><tr><th>When</th><th>Task</th><th>Provider</th><th>Model</th><th>Tokens</th></tr></thead>
        <tbody>
          {#each recent.value as row (row.id)}
            <tr>
              <td>{formatDateTime(row.at)}</td>
              <td>{TASK_LABELS[row.task] ?? row.task}</td>
              <td>{label(row.provider)}</td>
              <td class="model">{row.model}</td>
              <td>{#if !row.ok}<span class="error-text" title={row.error}>Failed</span>{:else}{row.inputTokens != null ? `${row.inputTokens} / ${row.outputTokens ?? 0}` : '—'}{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <span class="faint small">No AI calls yet.</span>
    {/if}
  </SettingsRow>
</SettingsGroup>

<style>
  .limit {
    display: block;
    width: 90px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-sm);
  }
  th {
    padding: 0 8px 6px 0;
    text-align: left;
    font-weight: 500;
    color: var(--text-3);
  }
  td {
    padding: 6px 8px 6px 0;
    border-top: 1px solid var(--border);
    color: var(--text-2);
  }
  .model {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
