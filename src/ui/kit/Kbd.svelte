<script lang="ts">
  let { keys }: { keys: string } = $props();
</script>

<kbd>{keys}</kbd>

<style>
  kbd {
    display: inline-block;
    padding: 1px 6px;
    border-radius: var(--r-xs);
    border: 1px solid var(--border);
    background: var(--surface);
    font: inherit;
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--text-2);
    line-height: 1.5;
  }
</style>
