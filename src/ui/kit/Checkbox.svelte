<script lang="ts">
  import Check from '@lucide/svelte/icons/check';

  let { checked = $bindable(false), label }: { checked?: boolean; label: string } = $props();
</script>

<label class="checkbox">
  <input type="checkbox" bind:checked />
  <span class="box">{#if checked}<Check size={12} strokeWidth={3} />{/if}</span>
  <span>{label}</span>
</label>

<style>
  .checkbox {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-md);
    cursor: pointer;
  }
  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .box {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--r-xs);
    border: 1.5px solid var(--border);
    background: var(--bg);
    color: var(--on-primary);
  }
  input:checked + .box {
    background: var(--primary);
    border-color: var(--primary);
  }
  input:focus-visible + .box {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
</style>
