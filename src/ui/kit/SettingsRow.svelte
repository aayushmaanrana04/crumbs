<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    detail,
    icon,
    control,
    children,
  }: { title: string; detail?: string; icon?: Snippet; control?: Snippet; children?: Snippet } = $props();
</script>

<div class="row">
  <div class="head">
    {@render icon?.()}
    <div class="text">
      <span class="title">{title}</span>
      {#if detail}<span class="detail">{detail}</span>{/if}
    </div>
    {#if control}<div class="control">{@render control()}</div>{/if}
  </div>
  <!-- With an icon, the body lines up with the title, not the icon. -->
  {#if children}<div class="body" class:indented={!!icon}>{@render children()}</div>{/if}
</div>

<style>
  .row {
    padding: 12px 16px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 1px;
  }
  .title {
    font-size: var(--text-md);
    font-weight: 500;
  }
  .detail {
    font-size: var(--text-sm);
    color: var(--text-3);
  }
  .control {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .body {
    display: grid;
    gap: 12px;
    padding-top: 12px;
  }
  .indented {
    padding-left: 44px;
  }
</style>
