<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import FolderPlus from '@lucide/svelte/icons/folder-plus';
  import Plus from '@lucide/svelte/icons/plus';

  let {
    projects,
    selected,
    ontoggle,
    oncreate,
    label = 'Add to project',
  }: {
    projects: { id: string; name: string }[];
    selected: string[];
    ontoggle: (id: string, on: boolean) => void;
    oncreate: (name: string) => void;
    label?: string;
  } = $props();

  let open = $state(false);
  let creating = $state(false);
  let draft = $state('');
  let root = $state<HTMLElement>();

  $effect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !root?.contains(e.target as Node)) {
        open = false;
        creating = false;
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  });

  function create() {
    const name = draft.trim();
    if (!name) return;
    oncreate(name);
    draft = '';
    creating = false;
  }
</script>

<div class="picker-root" bind:this={root}>
  <button type="button" class="trigger" aria-haspopup="menu" aria-expanded={open} onclick={() => (open = !open)}>
    <FolderPlus size={13} /> {label}
  </button>
  {#if open}
    <div class="menu" role="menu">
      <div class="title">Add to project</div>
      {#each projects as p (p.id)}
        {@const on = selected.includes(p.id)}
        <button type="button" role="menuitemcheckbox" aria-checked={on} class="option" onclick={() => ontoggle(p.id, !on)}>
          <span class="box" class:on>{#if on}<Check size={11} strokeWidth={3} />{/if}</span>
          <span class="label">{p.name}</span>
        </button>
      {/each}
      {#if projects.length}<div class="divider"></div>{/if}
      {#if creating}
        <form class="new" onsubmit={(e) => (e.preventDefault(), create())}>
          <!-- svelte-ignore a11y_autofocus -->
          <input autofocus placeholder="Project name" aria-label="Project name" bind:value={draft} />
        </form>
      {:else}
        <button type="button" class="option" onclick={() => (creating = true)}><Plus size={14} /> <span class="label muted">New project…</span></button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .picker-root {
    position: relative;
    display: inline-block;
  }
  .trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px 4px 8px;
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    background: none;
    font-size: var(--text-sm);
    color: var(--text-2);
    cursor: pointer;
  }
  .trigger:hover {
    background: var(--hover);
    color: var(--text);
  }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    width: 260px;
    display: grid;
    gap: 2px;
    padding: 6px;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--bg);
    box-shadow: var(--shadow-pop);
  }
  .title {
    padding: 6px 8px 4px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }
  .option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 8px;
    border: none;
    border-radius: 7px;
    background: none;
    text-align: left;
    font-size: var(--text-md);
    cursor: pointer;
  }
  .option:hover {
    background: var(--hover);
  }
  .label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .box {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    border: 1.5px solid var(--text-3);
    color: var(--on-primary);
  }
  .box.on {
    border-color: var(--primary);
    background: var(--primary);
  }
  .divider {
    height: 1px;
    margin: 4px 0;
    background: var(--border);
  }
  .new {
    padding: 4px;
  }
  .new input {
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-radius: var(--r-xs);
    background: var(--bg);
    box-shadow: 0 0 0 2px var(--focus);
    font-size: var(--text-md);
  }
  .new input:focus {
    outline: none;
  }
</style>
