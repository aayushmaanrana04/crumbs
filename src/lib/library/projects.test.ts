import { beforeEach, describe, expect, it } from 'vitest';
import { db, type KnowledgeDocument, type StoredInsight } from '../db/schema';
import {
  createProject,
  deleteProject,
  dismissSuggestion,
  projectDocIds,
  projectEntities,
  setDocumentInProject,
  suggestDocsForProject,
  suggestProjectsForDoc,
} from './projects';

const doc = (id: string, over: Partial<KnowledgeDocument> = {}): KnowledgeDocument => ({
  id, url: `https://x.dev/${id}`, canonicalUrl: `x.dev/${id}`, title: id, capturedAt: 1, updatedAt: 1, type: 'article',
  markdown: '', contentHash: id, simhash: '0', excerpt: '', source: 'manual', userNotes: '', tags: [], projectIds: [], ...over,
});
const insight = (docId: string, names: string[]): StoredInsight => ({
  docId, version: 2, kind: 'other', gist: '', keyPoints: [], blocks: [], note: '', tags: [], model: 'm', createdAt: 1,
  entities: names.map((name) => ({ name, type: 'technology' as const })),
});

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});

describe('projects', () => {
  it('adds and removes pages, and deleting a project keeps its pages', async () => {
    const p = await createProject('  Browser Automation Agent ', 'Agents on the web');
    await db.documents.bulkAdd([doc('a'), doc('b')]);
    await setDocumentInProject('a', p.id, true);
    await setDocumentInProject('a', p.id, true);
    expect(await projectDocIds(p.id)).toEqual(['a']);
    await setDocumentInProject('a', p.id, false);
    expect(await projectDocIds(p.id)).toEqual([]);
    await setDocumentInProject('b', p.id, true);
    await deleteProject(p.id);
    expect(await db.projects.count()).toBe(0);
    expect((await db.documents.get('b'))?.projectIds).toEqual([]);
    expect(p.name).toBe('Browser Automation Agent');
  });

  it('lists names shared across a project, most common first', async () => {
    const p = await createProject('Agents');
    await db.documents.bulkAdd([doc('a', { projectIds: [p.id] }), doc('b', { projectIds: [p.id] })]);
    await db.insights.bulkAdd([insight('a', ['Playwright', 'Chromium']), insight('b', ['playwright', 'LangGraph'])]);
    expect(await projectEntities(p.id)).toEqual(['Playwright', 'Chromium', 'LangGraph']);
  });

  it('suggests fitting pages with a reason, never weak matches, and respects dismissals', async () => {
    const p = await createProject('Browser Automation Agent');
    await db.documents.bulkAdd([
      doc('m1', { projectIds: [p.id], tags: ['agents'] }),
      doc('m2', { projectIds: [p.id], tags: ['agents'] }),
      doc('fit', { tags: ['agents'] }),
      doc('weak', { tags: ['agents'] }),
      doc('unrelated', { tags: ['cooking'] }),
    ]);
    await db.insights.bulkAdd([
      insight('m1', ['Playwright', 'Accessibility tree']),
      insight('m2', ['Playwright']),
      insight('fit', ['Playwright', 'Accessibility tree']),
      insight('weak', ['React']),
      insight('unrelated', ['Sourdough']),
    ]);
    const s = await suggestDocsForProject(p.id);
    expect(s.map((x) => x.doc.id)).toEqual(['fit']);
    expect(s[0]!.why).toBe('Mentions Playwright and Accessibility tree, like 2 pages here');

    expect((await suggestProjectsForDoc('fit')).map((x) => x.project.id)).toEqual([p.id]);
    await dismissSuggestion(p.id, 'fit');
    expect(await suggestDocsForProject(p.id)).toEqual([]);
    expect(await suggestProjectsForDoc('fit')).toEqual([]);
  });
});
