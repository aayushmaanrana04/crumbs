<script lang="ts" generics="T extends string">
  let {
    options,
    value = $bindable(),
    label,
  }: { options: { value: T; label: string }[]; value: T; label: string } = $props();
</script>

<div class="segmented" role="radiogroup" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === option.value}
      class:active={value === option.value}
      onclick={() => (value = option.value)}>{option.label}</button
    >
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border-radius: 11px;
    background: var(--surface);
  }
  button {
    padding: 4px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-2);
    cursor: pointer;
    transition: background var(--dur) var(--ease);
  }
  button:hover:not(.active) {
    color: var(--text);
  }
  .active {
    background: var(--bg);
    color: var(--text);
    box-shadow: var(--shadow-chip);
  }
</style>
