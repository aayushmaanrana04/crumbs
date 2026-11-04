<script lang="ts">
  // Horizontal bars, monochrome: values are read from the labels, the bar only gives proportion.
  let { series, unit = '' }: { series: { label: string; value: number }[]; unit?: string } = $props();

  const max = $derived(Math.max(...series.map((s) => Math.abs(s.value)), 0) || 1);
  const format = (v: number) => `${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}${unit && unit !== '%' ? ` ${unit}` : unit}`;
</script>

<div class="chart" role="img" aria-label={series.map((s) => `${s.label}: ${format(s.value)}`).join(', ')}>
  {#each series as s, i (i)}
    <div class="row">
      <span class="label" title={s.label}>{s.label}</span>
      <span class="track"><span class="bar" style:width="{(Math.abs(s.value) / max) * 100}%"></span></span>
      <span class="value">{format(s.value)}</span>
    </div>
  {/each}
</div>

<style>
  .chart {
    display: grid;
    gap: 8px;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(80px, 180px) 1fr auto;
    align-items: center;
    gap: 12px;
    font-size: var(--text-md);
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-2);
  }
  .track {
    height: 10px;
    border-radius: var(--r-full);
    background: var(--surface);
    overflow: hidden;
  }
  .bar {
    display: block;
    height: 100%;
    border-radius: var(--r-full);
    background: var(--primary);
    min-width: 4px;
  }
  .value {
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
</style>
