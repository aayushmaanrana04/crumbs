// Projects: user-made groups of pages around a goal, with notes and open questions.
import { db, normalizeInsight, type KnowledgeDocument, type Project, type ProjectQuestion } from '../db/schema';

export async function createProject(name: string, description = ''): Promise<Project> {
  const now = Date.now();
  const project: Project = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled project',
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
    notes: '',
    questions: [],
    dismissed: [],
  };
  await db.projects.add(project);
  return project;
}

export async function updateProject(
  id: string,
  changes: Partial<Pick<Project, 'name' | 'description' | 'notes' | 'questions'>>,
): Promise<void> {
  await db.projects.update(id, { ...changes, updatedAt: Date.now() });
}

/** Delete a project; its pages stay in the library. */
export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', db.projects, db.documents, async () => {
    await db.projects.delete(id);
    await db.documents
      .where('projectIds')
      .equals(id)
      .modify((d: KnowledgeDocument) => {
        d.projectIds = d.projectIds.filter((p) => p !== id);
      });
  });
}

export async function setDocumentInProject(docId: string, projectId: string, inProject: boolean): Promise<void> {
  await db.transaction('rw', db.projects, db.documents, async () => {
    const doc = await db.documents.get(docId);
    if (!doc) return;
    const has = doc.projectIds.includes(projectId);
    if (has === inProject) return;
    await db.documents.update(docId, {
      projectIds: inProject ? [...doc.projectIds, projectId] : doc.projectIds.filter((p) => p !== projectId),
    });
    await db.projects.update(projectId, { updatedAt: Date.now() });
  });
}

export async function dismissSuggestion(projectId: string, docId: string): Promise<void> {
  const project = await db.projects.get(projectId);
  if (project && !project.dismissed.includes(docId)) {
    await db.projects.update(projectId, { dismissed: [...project.dismissed, docId] });
  }
}

export function newQuestion(text: string): ProjectQuestion {
  return { id: crypto.randomUUID(), text: text.trim(), done: false, createdAt: Date.now() };
}

export async function projectDocIds(projectId: string): Promise<string[]> {
  return (await db.documents.where('projectIds').equals(projectId).primaryKeys()) as string[];
}

const key = (s: string) => s.trim().toLowerCase();

/** Names mentioned across a project's pages, most widely shared first. */
export async function projectEntities(projectId: string, limit = 12): Promise<string[]> {
  const ids = await projectDocIds(projectId);
  const insights = (await db.insights.bulkGet(ids)).filter((i) => !!i).map((i) => normalizeInsight(i!));
  const counts = new Map<string, { name: string; n: number }>();
  for (const insight of insights) {
    for (const name of new Set(insight.entities.map((e) => e.name))) {
      const entry = counts.get(key(name)) ?? { name, n: 0 };
      entry.n++;
      counts.set(key(name), entry);
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, limit).map((e) => e.name);
}

export interface ProjectSuggestion {
  project: Project;
  doc: KnowledgeDocument;
  why: string;
  score: number;
}

interface Profile {
  entities: Map<string, string>;
  tags: Set<string>;
}

/** Names and tags per page, for pages already loaded; only their summaries are read. */
async function profiles(docs: KnowledgeDocument[]): Promise<Map<string, Profile>> {
  const insights = await db.insights.bulkGet(docs.map((d) => d.id));
  return new Map(
    docs.map((doc, i) => {
      const insight = insights[i] ? normalizeInsight(insights[i]!) : undefined;
      return [doc.id, { entities: new Map((insight?.entities ?? []).map((e) => [key(e.name), e.name])), tags: new Set(doc.tags) }];
    }),
  );
}

// A suggestion needs a real signal: two shared names, or a shared name plus a shared tag, etc.
const MIN_SCORE = 3;

/**
 * Score how well a page fits a project from what it shares with the project's pages
 * (named entities count double; tags once) and whether it mentions the project's name.
 */
function scoreFit(candidate: Profile, members: Profile[], doc: KnowledgeDocument, project: Project) {
  const sharedEntities = new Map<string, number>();
  const sharedTags = new Map<string, number>();
  for (const m of members) {
    for (const [k, name] of candidate.entities) if (m.entities.has(k)) sharedEntities.set(name, (sharedEntities.get(name) ?? 0) + 1);
    for (const t of candidate.tags) if (m.tags.has(t)) sharedTags.set(t, (sharedTags.get(t) ?? 0) + 1);
  }
  const nameWords = key(`${project.name} ${project.description}`).split(/\W+/).filter((w) => w.length > 3);
  const text = key(`${doc.title} ${doc.excerpt}`);
  const nameHits = nameWords.filter((w) => text.includes(w)).length;
  const score = sharedEntities.size * 2 + sharedTags.size + Math.min(nameHits, 2);
  const topEntities = [...sharedEntities].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const pages = Math.max(0, ...sharedEntities.values(), ...sharedTags.values());
  const why = topEntities.length
    ? `Mentions ${topEntities.slice(0, 2).join(' and ')}, like ${pages} page${pages === 1 ? '' : 's'} here`
    : sharedTags.size
      ? `Shares tag${sharedTags.size > 1 ? 's' : ''} ${[...sharedTags.keys()].slice(0, 2).join(', ')} with this project`
      : `Matches the project's description`;
  return { score, why };
}

/** Pages not in the project that fit it, best first. Never adds anything. */
export async function suggestDocsForProject(projectId: string, limit = 3): Promise<ProjectSuggestion[]> {
  const project = await db.projects.get(projectId);
  if (!project) return [];
  const all = await db.documents.toArray();
  const inProject = all.filter((d) => d.projectIds.includes(projectId));
  if (inProject.length === 0) return [];
  const candidates = all.filter((d) => !d.projectIds.includes(projectId) && !project.dismissed.includes(d.id));
  const prof = await profiles(all);
  const members = inProject.map((d) => prof.get(d.id)!);
  return candidates
    .map((doc) => ({ project, doc, ...scoreFit(prof.get(doc.id)!, members, doc, project) }))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Projects a page fits but isn't in yet, best first. */
export async function suggestProjectsForDoc(docId: string, limit = 2): Promise<ProjectSuggestion[]> {
  const doc = await db.documents.get(docId);
  if (!doc) return [];
  const projects = (await db.projects.toArray()).filter((p) => !doc.projectIds.includes(p.id) && !p.dismissed.includes(docId));
  if (projects.length === 0) return [];
  // One read for every candidate project's pages, then group in memory.
  const memberDocs = await db.documents.where('projectIds').anyOf(projects.map((p) => p.id)).distinct().toArray();
  const prof = await profiles([doc, ...memberDocs]);
  const out: ProjectSuggestion[] = [];
  for (const project of projects) {
    const members = memberDocs.filter((d) => d.projectIds.includes(project.id)).map((d) => prof.get(d.id)!);
    if (members.length === 0) continue;
    const fit = scoreFit(prof.get(docId)!, members, doc, project);
    if (fit.score >= MIN_SCORE) out.push({ project, doc, ...fit });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
