<script lang="ts">
  import { db } from '@/lib/db/schema';
  import {
    createProject,
    dismissSuggestion,
    setDocumentInProject,
    suggestProjectsForDoc,
    type ProjectSuggestion,
  } from '@/lib/library/projects';
  import ProjectChip from '@/ui/kit/ProjectChip.svelte';
  import ProjectPicker from '@/ui/kit/ProjectPicker.svelte';
  import Suggestion from '@/ui/kit/Suggestion.svelte';
  import { live } from '@/ui/live.svelte';

  // A page's projects: chips to remove, a picker to add, and suggestions to accept or dismiss.
  let { docId }: { docId: string } = $props();

  const data = live(async () => {
    const [doc, projects] = await Promise.all([db.documents.get(docId), db.projects.orderBy('updatedAt').reverse().toArray()]);
    return { selected: doc?.projectIds ?? [], projects };
  }, { selected: [] as string[], projects: [] as { id: string; name: string }[] });

  let suggestions = $state<ProjectSuggestion[]>([]);
  $effect(() => {
    void data.value.selected.length;
    void data.value.projects.length;
    suggestProjectsForDoc(docId).then((s) => (suggestions = s));
  });

  const inProjects = $derived(data.value.projects.filter((p) => data.value.selected.includes(p.id)));
</script>

<div class="projects">
  <div class="chips">
      {#each inProjects as p (p.id)}
      <ProjectChip name={p.name} href="#/project/{p.id}" onremove={() => setDocumentInProject(docId, p.id, false)} />
    {/each}
    <ProjectPicker
        projects={data.value.projects}
        selected={data.value.selected}
        ontoggle={(id, on) => setDocumentInProject(docId, id, on)}
        oncreate={async (name) => {
          const p = await createProject(name);
          await setDocumentInProject(docId, p.id, true);
        }}
      />
  </div>
  {#each suggestions as s (s.project.id)}
    <Suggestion
      title="Add to {s.project.name}?"
      why={s.why}
      onadd={() => setDocumentInProject(docId, s.project.id, true)}
      ondismiss={async () => {
        await dismissSuggestion(s.project.id, docId);
        suggestions = suggestions.filter((x) => x.project.id !== s.project.id);
      }}
    />
  {/each}
</div>

<style>
  .projects {
    display: grid;
    gap: 10px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
</style>
