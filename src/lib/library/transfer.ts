// Export and import. JSON is the lossless backup; the Markdown zip is for reading
// your library in other tools (e.g. Obsidian). Passages and embeddings are rebuilt on import.
import { strToU8, zipSync } from 'fflate';
import { z } from 'zod';
import { db, normalizeInsight, type KnowledgeDocument } from '../db/schema';
import { insightToMarkdown } from './insight-markdown';
import { rebuildChunks } from './documents';
import { enqueueJobs } from './jobs';

const EXPORT_VERSION = 1;

export async function exportJson(): Promise<Blob> {
  const [documents, highlights, insights, projects] = await Promise.all([
    db.documents.toArray(),
    db.highlights.toArray(),
    db.insights.toArray(),
    db.projects.toArray(),
  ]);
  const payload = { app: 'crumbs', version: EXPORT_VERSION, exportedAt: new Date().toISOString(), documents, highlights, insights, projects };
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'untitled'
  );
}

function frontmatterValue(value: string): string {
  return JSON.stringify(value);
}

export async function exportMarkdownZip(): Promise<Blob> {
  const [documents, highlights, insights, projects] = await Promise.all([
    db.documents.toArray(),
    db.highlights.toArray(),
    db.insights.toArray(),
    db.projects.toArray(),
  ]);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const insightById = new Map(insights.map((i) => [i.docId, normalizeInsight(i)]));
  const files: Record<string, Uint8Array> = {};
  const used = new Set<string>();

  for (const doc of documents) {
    let name = slugify(doc.title);
    for (let n = 2; used.has(name); n++) name = `${slugify(doc.title)}-${n}`;
    used.add(name);

    const insight = insightById.get(doc.id);
    const docHighlights = highlights.filter((h) => h.docId === doc.id);
    const parts = [
      '---',
      `title: ${frontmatterValue(doc.title)}`,
      `url: ${frontmatterValue(doc.url)}`,
      `saved: ${new Date(doc.capturedAt).toISOString()}`,
      `tags: [${doc.tags.map(frontmatterValue).join(', ')}]`,
      ...(doc.projectIds.length
        ? [`projects: [${doc.projectIds.map((id) => frontmatterValue(projectName.get(id) ?? id)).join(', ')}]`]
        : []),
      '---',
      '',
      `# ${doc.title}`,
      '',
      insight ? `${insightToMarkdown(insight)}\n` : '',
      docHighlights.length ? `## Highlights\n\n${docHighlights.map((h) => `> ${h.text}`).join('\n\n')}\n` : '',
      doc.userNotes ? `## Notes\n\n${doc.userNotes}\n` : '',
      '## Content\n',
      doc.markdown,
    ];
    files[`crumbs/${name}.md`] = strToU8(parts.filter(Boolean).join('\n'));
  }
  return new Blob([zipSync(files) as BlobPart], { type: 'application/zip' });
}

const ImportSchema = z.object({
  // Backups made before the rename say 'summaryse'.
  app: z.enum(['crumbs', 'carrel', 'summaryse']),
  version: z.number().int().max(EXPORT_VERSION),
  documents: z.array(z.looseObject({ id: z.string(), canonicalUrl: z.string(), markdown: z.string() })),
  highlights: z.array(z.looseObject({ id: z.string(), docId: z.string() })).default([]),
  insights: z.array(z.looseObject({ docId: z.string() })).default([]),
  projects: z.array(z.looseObject({ id: z.string() })).default([]),
});

export interface ImportSummary {
  added: number;
  skipped: number;
}

/** Merge an export into the library. Documents already present (same id or URL) are kept as they are. */
export async function importJson(file: File): Promise<ImportSummary> {
  const data = ImportSchema.parse(JSON.parse(await file.text()));
  const added: KnowledgeDocument[] = [];
  let skipped = 0;

  for (const raw of data.documents) {
    const { status: _legacy, ...doc } = raw as unknown as KnowledgeDocument & { status?: unknown };
    const exists = (await db.documents.get(doc.id)) ?? (await db.documents.where('canonicalUrl').equals(doc.canonicalUrl).first());
    if (exists) {
      skipped++;
      continue;
    }
    await db.documents.add({ ...doc, updatedAt: Date.now() });
    added.push(doc);
  }

  const addedIds = new Set(added.map((d) => d.id));
  await db.highlights.bulkPut(data.highlights.filter((h) => addedIds.has(h.docId)) as never[]);
  await db.insights.bulkPut(data.insights.filter((i) => addedIds.has(i.docId)) as never[]);
  await db.projects.bulkPut(data.projects as never[]);

  const withInsights = new Set(data.insights.map((i) => i.docId));
  for (const doc of added) {
    await rebuildChunks(doc);
    await enqueueJobs(doc.id, withInsights.has(doc.id) ? ['embed'] : ['insights', 'embed']);
  }
  return { added: added.length, skipped };
}

export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
