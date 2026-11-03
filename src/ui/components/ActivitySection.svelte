<script lang="ts">
  import { db } from '@/lib/db/schema';
  import { PROVIDER_INFO } from '@/lib/providers/catalog';
  import type { ProviderKind } from '@/lib/providers/types';
  import { usageLimits } from '@/lib/settings/tasks';
  import { formatDateTime } from '@/ui/format';
  import { live } from '@/ui/live.svelte';
  import { stored } from '@/ui/storage.svelte';

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

  const label = (provider: string) => PROVIDER_INFO[provider as ProviderKind]?.label ?? provider;
</script>

<section>
  <h2 class="section-title">AI activity</h2>
  <p class="muted small intro">
    Every call that sent content to an AI provider. Today: {today.value.calls} calls, {today.value.input.toLocaleString()} tokens in,
    {today.value.output.toLocaleString()} out.
  </p>
  {#if limits.value}
    <label class="limit small">
      Daily limit for background processing
      <input
        class="input"
        type="number"
        min="0"
        value={limits.value.dailyBackgroundCalls}
        onchange={(e) => usageLimits.setValue({ dailyBackgroundCalls: Math.max(0, Number(e.currentTarget.value) || 0) })}
      />
      <span class="muted">calls (0 = no limit)</span>
    </label>
  {/if}
  {#if recent.value.length}
    <table>
      <thead><tr><th>When</th><th>Task</th><th>Provider</th><th>Model</th><th>Tokens</th><th></th></tr></thead>
      <tbody>
        {#each recent.value as row (row.id)}
          <tr>
            <td>{formatDateTime(row.at)}</td>
            <td>{row.task}</td>
            <td>{label(row.provider)}</td>
            <td class="model">{row.model}</td>
            <td>{row.inputTokens != null ? `${row.inputTokens} / ${row.outputTokens ?? 0}` : '—'}</td>
            <td>{#if !row.ok}<span class="error-text" title={row.error}>failed</span>{/if}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="muted small">No AI calls yet.</p>
  {/if}
</section>

<style>
  .intro {
    margin: 0 0 var(--space-3);
  }
  .limit {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .limit .input {
    width: 90px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  th {
    text-align: left;
    color: var(--color-text-2);
    font-weight: 500;
  }
  th,
  td {
    padding: 4px 8px 4px 0;
    border-bottom: 1px solid var(--color-border);
  }
  .model {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
