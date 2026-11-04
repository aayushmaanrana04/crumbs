<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import X from '@lucide/svelte/icons/x';

  let {
    text,
    done,
    ontoggle,
    onremove,
  }: { text: string; done: boolean; ontoggle: () => void; onremove: () => void } = $props();
</script>

<div class="question" class:done>
  <button type="button" class="box" role="checkbox" aria-checked={done} aria-label={done ? 'Mark as open' : 'Mark as answered'} onclick={ontoggle}>
    {#if done}<Check size={11} strokeWidth={3} />{/if}
  </button>
  <span class="text">{text}</span>
  <button type="button" class="remove" aria-label="Delete question" onclick={onremove}><X size={12} /></button>
</div>

<style>
  .question {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 6px 4px;
    border-radius: var(--r-xs);
  }
  .box {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
    padding: 0;
    border-radius: 5px;
    border: 1.5px solid var(--text-3);
    background: none;
    color: var(--on-primary);
    cursor: pointer;
  }
  .done .box {
    border-color: var(--primary);
    background: var(--primary);
  }
  .text {
    flex: 1;
    font-size: var(--text-md);
    line-height: 1.45;
  }
  .done .text {
    color: var(--text-3);
    text-decoration: line-through;
  }
  .remove {
    display: inline-flex;
    padding: 2px;
    border: none;
    border-radius: 4px;
    background: none;
    color: var(--text-3);
    cursor: pointer;
    opacity: 0;
  }
  .question:hover .remove,
  .remove:focus-visible {
    opacity: 1;
  }
</style>
