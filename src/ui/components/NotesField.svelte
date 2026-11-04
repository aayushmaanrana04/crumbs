<script lang="ts">
  import TextArea from '@/ui/kit/TextArea.svelte';

  // A titled notes box that saves when you leave it and briefly confirms with "Saved".
  let {
    label,
    value,
    placeholder,
    rows = 4,
    onsave,
  }: { label: string; value: string; placeholder: string; rows?: number; onsave: (text: string) => Promise<void> } = $props();

  let draft = $state<string | null>(null);
  let saved = $state(false);

  async function save() {
    if (draft === null || draft === value) return;
    await onsave(draft);
    saved = true;
    setTimeout(() => (saved = false), 1500);
  }
</script>

<section>
  <h2 class="title">{label} {#if saved}<span class="saved">Saved</span>{/if}</h2>
  <TextArea {rows} {placeholder} value={draft ?? value} oninput={(e) => (draft = e.currentTarget.value)} onblur={save} />
</section>

<style>
  .title {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin: 0 0 8px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }
  .saved {
    font-weight: 500;
    color: var(--text-3);
  }
</style>
