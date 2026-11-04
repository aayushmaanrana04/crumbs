<script lang="ts">
  let { label }: { label: string } = $props();
</script>

<div class="group-label">{label}</div>

<style>
  .group-label {
    padding: 16px 12px 6px;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-3);
  }
</style>
