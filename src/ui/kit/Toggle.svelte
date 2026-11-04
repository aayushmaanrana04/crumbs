<script lang="ts">
  // Controlled: shows `checked` and asks for the change through `onchange`, so a refused change never shows as applied.
  let {
    checked = false,
    label,
    disabled = false,
    onchange,
  }: { checked?: boolean; label: string; disabled?: boolean; onchange?: (checked: boolean) => void } = $props();
</script>

<button
  type="button"
  role="switch"
  class="toggle"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={() => onchange?.(!checked)}><span class="knob"></span></button
>

<style>
  .toggle {
    width: 36px;
    height: 22px;
    flex-shrink: 0;
    padding: 3px;
    border: none;
    border-radius: var(--r-full);
    background: var(--hover);
    cursor: pointer;
    transition: background var(--dur) var(--ease);
  }
  .toggle[aria-checked='true'] {
    background: var(--primary);
  }
  .knob {
    display: block;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--bg);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    transition: transform var(--dur) var(--ease);
  }
  .toggle[aria-checked='true'] .knob {
    transform: translateX(14px);
  }
  .toggle:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
