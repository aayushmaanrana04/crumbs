import { db } from '../db/schema';
import { embeddingSpace, taskSettings } from '../settings/tasks';
import { embedTexts } from './run';

const BATCH_SIZE = 32;

/** Embed any of the document's passages that have no vector in the current embedding space. */
export async function embedDocument(docId: string): Promise<void> {
  const space = embeddingSpace((await taskSettings.getValue()).embed);
  const chunks = await db.chunks.where('docId').equals(docId).sortBy('ordinal');
  const done = new Set(
    (await db.embeddings.where('docId').equals(docId).filter((e) => e.model === space).toArray()).map((e) => e.chunkId),
  );
  const todo = chunks.filter((c) => !done.has(c.id));

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const { space: usedSpace, vectors } = await embedTexts(batch.map((c) => c.text), docId);
    await db.embeddings.bulkPut(
      batch.map((chunk, j) => ({ chunkId: chunk.id, docId, model: usedSpace, vector: new Float32Array(vectors[j]!) })),
    );
  }
}
