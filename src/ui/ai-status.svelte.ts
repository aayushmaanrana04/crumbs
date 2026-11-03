import { db, type Job } from '@/lib/db/schema';
import { aiStatus, type AiStatus } from '@/lib/library/ai-status';
import { providerSettings } from '@/lib/settings/providers';
import { configuredJobTypes, embeddingSpace, taskSettings } from '@/lib/settings/tasks';
import { live } from './live.svelte';
import { stored } from './storage.svelte';

/** Live AI status for every document, updating as jobs run. */
export function aiStatuses(): { get(docId: string): AiStatus; readonly aiReady: boolean } {
  const tasks = stored(taskSettings);
  const providers = stored(providerSettings);
  const jobs = live(() => db.jobs.toArray(), [] as Job[]);
  const withInsight = live(async () => new Set(await db.insights.toCollection().primaryKeys()), new Set<string>());
  // Keys only ([chunkId, model]); vectors aren't loaded. Chunk ids are `${docId}:${ordinal}`.
  const embedded = live(async () => {
    const keys = (await db.embeddings.toCollection().primaryKeys()) as [string, string][];
    return keys.map(([chunkId, model]) => ({ docId: chunkId.slice(0, chunkId.lastIndexOf(':')), model }));
  }, []);

  const activeTypes = $derived(tasks.value && providers.value ? configuredJobTypes(tasks.value, providers.value) : []);
  const space = $derived(tasks.value ? embeddingSpace(tasks.value.embed) : '');
  const jobsByDoc = $derived.by(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs.value) map.set(job.docId, [...(map.get(job.docId) ?? []), job]);
    return map;
  });
  const embeddedDocs = $derived(new Set(embedded.value.filter((e) => e.model === space).map((e) => e.docId)));

  return {
    get(docId: string) {
      return aiStatus({
        jobs: jobsByDoc.get(docId) ?? [],
        hasInsight: withInsight.value.has(docId),
        hasEmbeddings: embeddedDocs.has(docId),
        activeTypes,
      });
    },
    get aiReady() {
      return activeTypes.includes('insights');
    },
  };
}
