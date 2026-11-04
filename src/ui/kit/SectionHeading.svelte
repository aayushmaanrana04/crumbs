<script lang="ts">
  let { label, model }: { label: string; model?: string } = $props();
</script>

<div class="heading">
  <h2>{label}</h2>
  {#if model}<span class="model">{model}</span>{/if}
</div>

<style>
  .heading {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
  }
  h2 {
    margin: 0;
    font-size: var(--text-md);
    font-weight: 600;
  }
  .model {
    padding: 1px 8px;
    border-radius: var(--r-full);
    border: 1px solid var(--border);
    font-size: var(--text-xs);
    color: var(--text-3);
  }
</style>
