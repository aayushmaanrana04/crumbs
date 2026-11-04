<script lang="ts">
  let {
    title,
    summary,
    site,
    status,
    statusTone = 'normal',
    selected = false,
    onselect,
  }: {
    title: string;
    summary?: string;
    site: string;
    status?: string;
    statusTone?: 'normal' | 'error';
    selected?: boolean;
    onselect?: () => void;
  } = $props();
</script>

<button type="button" class="row" class:selected aria-current={selected ? 'true' : undefined} onclick={onselect}>
  <span class="title">{title}</span>
  {#if summary}<span class="summary">{summary}</span>{/if}
  <span class="meta">
    <span>{site}</span>
    {#if status}<span aria-hidden="true">·</span><span class:error={statusTone === 'error'}>{status}</span>{/if}
  </span>
</button>

<style>
  .row {
    display: grid;
    gap: 2px;
    width: 100%;
    padding: 9px 12px;
    border: none;
    border-radius: var(--r-md);
    background: transparent;
    text-align: left;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    transition: background var(--dur) var(--ease);
  }
  .row:hover:not(.selected) {
    background: var(--hover);
  }
  .selected {
    background: var(--surface);
  }
  .title {
    font-size: var(--text-md);
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .summary {
    font-size: var(--text-sm);
    line-height: 1.45;
    color: var(--text-2);
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .meta {
    display: flex;
    gap: 6px;
    min-width: 0;
    font-size: var(--text-sm);
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
  }
  .meta span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .error {
    color: var(--error);
  }
</style>
