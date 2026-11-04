<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import { db, normalizeInsight, type KnowledgeDocument, type ProjectQuestion } from '@/lib/db/schema';
  import { rowStatus } from '@/lib/library/ai-label';
  import {
    deleteProject,
    dismissSuggestion,
    newQuestion,
    projectEntities,
    setDocumentInProject,
    suggestDocsForProject,
    updateProject,
    type ProjectSuggestion,
  } from '@/lib/library/projects';
  import { aiStatuses } from '@/ui/ai-status.svelte';
  import { formatRelative, siteLabel } from '@/ui/format';
  import Button from '@/ui/kit/Button.svelte';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
  import ListRow from '@/ui/kit/ListRow.svelte';
  import Menu from '@/ui/kit/Menu.svelte';
  import Property from '@/ui/kit/Property.svelte';
  import QuestionItem from '@/ui/kit/QuestionItem.svelte';
  import SearchField from '@/ui/kit/SearchField.svelte';
  import Suggestion from '@/ui/kit/Suggestion.svelte';
  import NotesField from '@/ui/components/NotesField.svelte';
  import { live } from '@/ui/live.svelte';
  import { docHref } from '@/ui/router.svelte';

  let { projectId }: { projectId: string } = $props();

  const project = live(() => db.projects.get(projectId), undefined);
  const pages = live(async () => {
    const docs = await db.documents.where('projectIds').equals(projectId).toArray();
    const insights = await db.insights.bulkGet(docs.map((d) => d.id));
    return docs
      .map((doc, i) => ({ doc, gist: insights[i] ? normalizeInsight(insights[i]!).gist : '' }))
      .sort((a, b) => b.doc.capturedAt - a.doc.capturedAt);
  }, []);
  const ai = aiStatuses();

  const names = live(() => projectEntities(projectId), [] as string[]);
  const suggestions = live(() => suggestDocsForProject(projectId), [] as ProjectSuggestion[]);

  let questionDraft = $state('');
  let adding = $state(false);
  let addQuery = $state('');

  // Saved pages not in this project, filtered by the search text. Only looked up while "Add pages" is open.
  let candidates = $state<KnowledgeDocument[]>([]);
  $effect(() => {
    if (!adding) return;
    const q = addQuery.trim().toLowerCase();
    void pages.value.length;
    db.documents
      .orderBy('capturedAt')
      .reverse()
      .filter((d) => !d.projectIds.includes(projectId) && (!q || d.title.toLowerCase().includes(q)))
      .limit(8)
      .toArray()
      .then((docs) => (candidates = docs));
  });

  async function setQuestions(fn: (qs: ProjectQuestion[]) => ProjectQuestion[]) {
    if (project.value) await updateProject(projectId, { questions: fn(project.value.questions) });
  }

  async function addQuestion(e: SubmitEvent) {
    e.preventDefault();
    if (!questionDraft.trim()) return;
    await setQuestions((qs) => [...qs, newQuestion(questionDraft)]);
    questionDraft = '';
  }

  async function remove() {
    if (!project.value || !confirm(`Delete the project “${project.value.name}”? Its pages stay in your library.`)) return;
    await deleteProject(projectId);
    location.hash = '#/projects';
  }

  const openCount = $derived(project.value?.questions.filter((q) => !q.done).length ?? 0);
</script>

<div class="project-page">
  {#if project.value}
    {@const p = project.value}
    <a class="back" href="#/projects"><ArrowLeft size={15} /> Projects</a>

    <header>
      <div class="title-row">
        <input
          class="title"
          aria-label="Project name"
          value={p.name}
          onchange={(e) => updateProject(projectId, { name: e.currentTarget.value.trim() || p.name })}
        />
        <div class="actions">
          <Button onclick={() => (location.hash = `#/ask?project=${projectId}`)}>Ask this project</Button>
          <Menu items={[{ label: 'Delete project', icon: Trash2, danger: true, onselect: remove }]} />
        </div>
      </div>
      <input
        class="description"
        aria-label="Project description"
        placeholder="What is this project for? (helps suggest pages)"
        value={p.description}
        onchange={(e) => updateProject(projectId, { description: e.currentTarget.value })}
      />
      <div class="props">
        <Property label="Pages" value={String(pages.value.length)} />
        <Property label="Open questions" value={String(openCount)} />
        <Property label="Updated" value={formatRelative(p.updatedAt)} />
      </div>
    </header>

    <div class="layout">
      <section class="main">
        {#each suggestions.value as s (s.doc.id)}
          <Suggestion
            title="Suggested: {s.doc.title}"
            why={s.why}
            href={docHref(s.doc.id)}
            onadd={() => setDocumentInProject(s.doc.id, projectId, true)}
            ondismiss={() => dismissSuggestion(projectId, s.doc.id)}
          />
        {/each}

        <div class="pages-head">
          <h2 class="section-label">Pages</h2>
          <Button kind="ghost" size="sm" onclick={() => (adding = !adding)}><Plus /> Add pages</Button>
        </div>

        {#if adding}
          <div class="add">
            <SearchField bind:value={addQuery} placeholder="Find a saved page" autofocus />
            {#each candidates as d (d.id)}
              <button type="button" class="candidate" onclick={() => setDocumentInProject(d.id, projectId, true)}>
                <Plus size={14} /> <span>{d.title}</span>
              </button>
            {:else}
              <p class="faint small">No other saved pages match.</p>
            {/each}
          </div>
        {/if}

        {#if pages.value.length === 0}
          <EmptyState title="No pages yet">
            Add pages from here, from a page's “Add to project” button, or from the side panel while you browse.
          </EmptyState>
        {/if}
        <div class="rows">
          {#each pages.value as { doc, gist } (doc.id)}
            {@const status = rowStatus(ai.get(doc.id))}
            <div class="row">
              <ListRow
                title={doc.title}
                summary={gist}
                site={siteLabel(doc)}
                status={status.label}
                statusTone={status.tone}
                onselect={() => (location.hash = docHref(doc.id))}
              />
              <button type="button" class="remove" aria-label="Remove {doc.title} from project" onclick={() => setDocumentInProject(doc.id, projectId, false)}>Remove</button>
            </div>
          {/each}
        </div>
      </section>

      <aside class="rail">
        <section>
          <h2 class="rail-title">Open questions</h2>
          {#each p.questions as q (q.id)}
            <QuestionItem
              text={q.text}
              done={q.done}
              ontoggle={() => setQuestions((qs) => qs.map((x) => (x.id === q.id ? { ...x, done: !x.done } : x)))}
              onremove={() => setQuestions((qs) => qs.filter((x) => x.id !== q.id))}
            />
          {/each}
          <form class="add-question" onsubmit={addQuestion}>
            <Plus size={13} />
            <input placeholder="Add a question" aria-label="New question" bind:value={questionDraft} />
          </form>
        </section>

        <NotesField label="Notes & decisions" rows={6} placeholder="What have you decided? What's next?" value={p.notes} onsave={(text) => updateProject(projectId, { notes: text })} />

        {#if names.value.length}
          <section>
            <h2 class="rail-title">Mentioned across this project</h2>
            <p class="names">{names.value.join(' · ')}</p>
          </section>
        {/if}
      </aside>
    </div>
  {:else}
    <div class="missing">
      <EmptyState title="This project doesn't exist">
        <a href="#/projects">Back to projects</a>
      </EmptyState>
    </div>
  {/if}
</div>

<style>
  .project-page {
    height: 100%;
    overflow-y: auto;
    padding: 18px 44px 48px;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 18px;
    padding: 6px 10px 6px 6px;
    border-radius: var(--r-sm);
    font-size: var(--text-md);
    color: var(--text-2);
    text-decoration: none;
  }
  .back:hover {
    background: var(--hover);
  }
  header {
    display: grid;
    gap: 8px;
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .title,
  .description {
    width: 100%;
    padding: 2px 4px;
    margin-left: -4px;
    border: none;
    border-radius: var(--r-xs);
    background: none;
  }
  .title {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.7px;
  }
  .description {
    font-size: var(--text-base);
    color: var(--text-2);
  }
  .title:hover,
  .description:hover {
    background: var(--surface);
  }
  .title:focus,
  .description:focus {
    outline: none;
    background: var(--surface);
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .props {
    display: flex;
    gap: 28px;
    margin-top: 6px;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 48px;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .main {
    display: grid;
    gap: 14px;
  }
  .pages-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 6px;
  }
  .add {
    display: grid;
    gap: 2px;
    padding: 12px;
    border-radius: var(--r-lg);
    background: var(--surface);
  }
  .add :global(.search) {
    background: var(--bg);
    margin-bottom: 6px;
  }
  .candidate {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border: none;
    border-radius: 7px;
    background: none;
    text-align: left;
    font-size: var(--text-md);
    cursor: pointer;
  }
  .candidate:hover {
    background: var(--hover);
  }
  .rows {
    display: grid;
    gap: 4px;
  }
  .row {
    position: relative;
  }
  .remove {
    position: absolute;
    top: 8px;
    right: 10px;
    padding: 3px 8px;
    border: none;
    border-radius: var(--r-xs);
    background: var(--bg);
    font-size: var(--text-sm);
    color: var(--text-2);
    cursor: pointer;
    opacity: 0;
  }
  .row:hover .remove,
  .remove:focus-visible {
    opacity: 1;
  }
  .rail {
    position: sticky;
    top: 0;
    display: grid;
    gap: 28px;
  }
  .rail-title {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin: 0 0 8px;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
  }
  .add-question {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 4px;
    color: var(--text-3);
  }
  .add-question input {
    flex: 1;
    border: none;
    background: none;
    font-size: var(--text-md);
  }
  .add-question input:focus {
    outline: none;
  }
  .names {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
  }
  .missing {
    max-width: 420px;
    margin: 80px auto;
  }
</style>
