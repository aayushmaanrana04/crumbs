// "Related in your library": documents that share entities or tags, with the reason.
import { db, type KnowledgeDocument } from '../db/schema';

export interface RelatedDocument {
  doc: KnowledgeDocument;
  why: string;
}

const key = (s: string) => s.trim().toLowerCase();

export async function findRelated(docId: string, limit = 4): Promise<RelatedDocument[]> {
  const [doc, insight] = await Promise.all([db.documents.get(docId), db.insights.get(docId)]);
  if (!doc) return [];
  const myEntities = new Map((insight?.entities ?? []).map((e) => [key(e.name), e.name]));
  const myTags = new Set(doc.tags);
  if (myEntities.size === 0 && myTags.size === 0) return [];

  const [docs, insights] = await Promise.all([db.documents.toArray(), db.insights.toArray()]);
  const entitiesByDoc = new Map(insights.map((i) => [i.docId, i.entities.map((e) => key(e.name))]));

  const scored: (RelatedDocument & { score: number })[] = [];
  for (const other of docs) {
    if (other.id === docId) continue;
    const shared = [...new Set(entitiesByDoc.get(other.id) ?? [])].filter((e) => myEntities.has(e)).map((e) => myEntities.get(e)!);
    const sharedTags = other.tags.filter((t) => myTags.has(t));
    const score = shared.length * 2 + sharedTags.length;
    if (score === 0) continue;
    const why = shared.length
      ? `Both mention ${shared.slice(0, 2).join(' and ')}`
      : `Shared tag${sharedTags.length > 1 ? 's' : ''}: ${sharedTags.slice(0, 2).join(', ')}`;
    scored.push({ doc: other, why, score });
  }
  return scored.sort((a, b) => b.score - a.score || b.doc.capturedAt - a.doc.capturedAt).slice(0, limit);
}
