import { db, type KnowledgeDocument } from '../db/schema';
import { chunkWithOffsets } from '../text/chunking';

/** Replace a document's passages (and drop embeddings computed for the old ones). */
export async function rebuildChunks(doc: Pick<KnowledgeDocument, 'id' | 'markdown'>): Promise<void> {
  const spans = chunkWithOffsets(doc.markdown);
  await db.transaction('rw', db.chunks, db.embeddings, async () => {
    await db.chunks.where('docId').equals(doc.id).delete();
    await db.embeddings.where('docId').equals(doc.id).delete();
    await db.chunks.bulkAdd(
      spans.map((span, ordinal) => ({
        id: `${doc.id}:${ordinal}`,
        docId: doc.id,
        ordinal,
        text: span.text,
        charStart: span.start,
        charEnd: span.end,
      })),
    );
  });
}

export async function deleteDocument(docId: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.documents, db.chunks, db.embeddings, db.insights, db.highlights, db.jobs, db.mentions, db.relations],
    async () => {
      await db.documents.delete(docId);
      await db.insights.delete(docId);
      for (const table of [db.chunks, db.embeddings, db.highlights, db.jobs, db.mentions, db.relations]) {
        await table.where('docId').equals(docId).delete();
      }
    },
  );
}

export async function updateDocument(
  docId: string,
  changes: Partial<Pick<KnowledgeDocument, 'title' | 'userNotes' | 'tags'>>,
): Promise<void> {
  await db.documents.update(docId, { ...changes, updatedAt: Date.now() });
}

export function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40);
}
