<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Copy from '@lucide/svelte/icons/copy';

  let { code, lang = '' }: { code: string; lang?: string } = $props();
  let copied = $state(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    copied = true;
    setTimeout(() => (copied = false), 1200);
  }
</script>

<div class="code">
  <div class="bar">
    <span>{lang}</span>
    <button type="button" aria-label="Copy code" onclick={copy}>
      {#if copied}<Check size={13} /> Copied{:else}<Copy size={13} /> Copy{/if}
    </button>
  </div>
  <pre><code>{code}</code></pre>
</div>

<style>
  .code {
    border-radius: var(--r-md);
    background: var(--surface);
    overflow: hidden;
  }
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px 0 14px;
    font-size: var(--text-xs);
    color: var(--text-3);
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border: none;
    border-radius: var(--r-xs);
    background: none;
    font-size: var(--text-xs);
    color: var(--text-2);
    cursor: pointer;
  }
  button:hover {
    background: var(--hover);
    color: var(--text);
  }
  pre {
    margin: 0;
    padding: 6px 14px 12px;
    overflow-x: auto;
    font-size: 12.5px;
    line-height: 1.55;
  }
  code {
    font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  }
</style>
