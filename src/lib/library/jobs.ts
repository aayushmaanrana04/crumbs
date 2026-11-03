import { db, type JobType } from '../db/schema';

/** Queue background jobs for a document, skipping ones already pending. */
export async function enqueueJobs(docId: string, types: JobType[]): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.jobs, async () => {
    const existing = await db.jobs.where('docId').equals(docId).toArray();
    for (const type of types) {
      const pending = existing.find((j) => j.type === type && (j.status === 'queued' || j.status === 'running'));
      if (pending) continue;
      // Drop stale finished/failed jobs of the same type so retries start fresh.
      await db.jobs.bulkDelete(existing.filter((j) => j.type === type).map((j) => j.id));
      await db.jobs.add({ id: crypto.randomUUID(), type, docId, status: 'queued', attempts: 0, runAfter: now, createdAt: now });
    }
  });
}
