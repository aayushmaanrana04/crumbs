<script lang="ts">
  import Button from './Button.svelte';

  let {
    title,
    why,
    href,
    onadd,
    ondismiss,
  }: { title: string; why: string; href?: string; onadd: () => void; ondismiss: () => void } = $props();
</script>

<div class="suggestion">
  <div class="text">
    {#if href}<a class="title" {href}>{title}</a>{:else}<span class="title">{title}</span>{/if}
    <span class="why">{why}</span>
  </div>
  <div class="actions">
    <Button kind="primary" size="sm" onclick={onadd}>Add</Button>
    <Button kind="ghost" size="sm" onclick={ondismiss}>Not now</Button>
  </div>
</div>

<style>
  .suggestion {
    display: grid;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--r-md);
    background: var(--surface);
  }
  .text {
    display: grid;
    gap: 2px;
  }
  .title {
    font-size: var(--text-md);
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
  }
  a.title:hover {
    text-decoration: underline;
  }
  .why {
    font-size: var(--text-sm);
    color: var(--text-2);
  }
  .actions {
    display: flex;
    gap: 6px;
  }
</style>
