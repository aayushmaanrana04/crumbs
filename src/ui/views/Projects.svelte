<script lang="ts">
  import FolderPlus from '@lucide/svelte/icons/folder-plus';
  import { db, type Project } from '@/lib/db/schema';
  import { createProject, projectEntities } from '@/lib/library/projects';
  import { formatRelative } from '@/ui/format';
  import Button from '@/ui/kit/Button.svelte';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
  import Input from '@/ui/kit/Input.svelte';
  import { live } from '@/ui/live.svelte';

  interface Row {
    project: Project;
    pages: number;
    open: number;
    names: string[];
  }

  const rows = live(async (): Promise<Row[]> => {
    const projects = await db.projects.orderBy('updatedAt').reverse().toArray();
    return Promise.all(
      projects.map(async (project) => ({
        project,
        pages: await db.documents.where('projectIds').equals(project.id).count(),
        open: project.questions.filter((q) => !q.done).length,
        names: await projectEntities(project.id, 4),
      })),
    );
  }, []);

  let creating = $state(false);
  let name = $state('');
  let description = $state('');

  async function create(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const p = await createProject(name, description);
    location.hash = `#/project/${p.id}`;
  }

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<div class="projects-page">
  <header>
    <div>
      <h1 class="page-title">Projects</h1>
      <p class="muted">Group pages around something you're working on.</p>
    </div>
    {#if !creating}<Button kind="primary" onclick={() => (creating = true)}>New project</Button>{/if}
  </header>

  {#if creating}
    <form class="create" onsubmit={create}>
      <Input placeholder="Project name, e.g. Browser automation agent" bind:value={name} autofocus />
      <Input placeholder="What is it for? (optional, helps suggest pages)" bind:value={description} />
      <div class="row">
        <Button kind="primary" type="submit" disabled={!name.trim()}>Create</Button>
        <Button kind="ghost" onclick={() => (creating = false)}>Cancel</Button>
      </div>
    </form>
  {/if}

  {#if rows.value.length === 0 && !creating}
    <EmptyState title="No projects yet">
      {#snippet icon()}<FolderPlus size={18} />{/snippet}
      Create a project to collect pages, notes and open questions for something you're researching.
    </EmptyState>
  {/if}

  <div class="grid">
    {#each rows.value as r (r.project.id)}
      <a class="card" href="#/project/{r.project.id}">
        <span class="name">{r.project.name}</span>
        {#if r.project.description}<span class="desc">{r.project.description}</span>{/if}
        <span class="stats">
          {plural(r.pages, 'page')} · {r.open ? plural(r.open, 'open question') : 'no open questions'}
        </span>
        {#if r.names.length}<span class="faint small">{r.names.join(', ')}</span>{/if}
        <span class="faint small">Updated {formatRelative(r.project.updatedAt).toLowerCase()}</span>
      </a>
    {/each}
  </div>
</div>

<style>
  .projects-page {
    height: 100%;
    overflow-y: auto;
    display: grid;
    align-content: start;
    gap: 20px;
    padding: 28px 44px 48px;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  header p {
    margin: 4px 0 0;
  }
  .create {
    display: grid;
    gap: 8px;
    max-width: 520px;
    padding: 16px;
    border-radius: var(--r-lg);
    background: var(--surface);
  }
  .create :global(.input) {
    background: var(--bg);
  }
  .row {
    display: flex;
    gap: 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }
  .card {
    display: grid;
    align-content: start;
    gap: 8px;
    padding: 20px;
    border-radius: var(--r-lg);
    background: var(--surface);
    color: inherit;
    text-decoration: none;
    transition: background var(--dur) var(--ease);
  }
  .card:hover {
    background: var(--hover);
  }
  .name {
    font-size: var(--text-lg);
    font-weight: 600;
    letter-spacing: -0.2px;
  }
  .desc {
    font-size: var(--text-md);
    line-height: 1.5;
    color: var(--text-2);
  }
  .stats {
    font-size: var(--text-sm);
    font-weight: 500;
  }
</style>
