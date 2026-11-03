// Background job queue. Jobs live in IndexedDB, so work resumes after Chrome
// stops the service worker; an alarm re-checks the queue every minute.
import { browser } from '#imports';
import Dexie from 'dexie';
import { db, type Job, type JobType } from '../db/schema';
import { providerSettings } from '../settings/providers';
import { configuredJobTypes, taskSettings, usageLimits } from '../settings/tasks';
import { embedDocument } from './embeddings';
import { generateInsights } from './insights';
import { isTaskConfigured, TaskNotConfiguredError } from './run';

const CONCURRENCY = 2;
const MAX_ATTEMPTS = 3;
const BACKGROUND_TASKS = ['insights', 'embed'];

const HANDLERS: Record<JobType, (docId: string) => Promise<void>> = {
  insights: generateInsights,
  embed: embedDocument,
};

let draining: Promise<void> | null = null;

/** Run queued jobs until none are runnable. Concurrent calls share one run. */
export function drainQueue(): Promise<void> {
  draining ??= drain().finally(() => {
    draining = null;
  });
  return draining;
}

export async function activeJobTypes(): Promise<JobType[]> {
  return configuredJobTypes(await taskSettings.getValue(), await providerSettings.getValue());
}

async function drain(): Promise<void> {
  try {
    while (!(await overDailyLimit())) {
      const runnable: JobType[] = [];
      for (const type of await activeJobTypes()) {
        if (await isTaskConfigured(type)) runnable.push(type);
      }
      if (runnable.length === 0) break;

      const jobs = await db.jobs
        .where('[status+runAfter]')
        .between(['queued', Dexie.minKey], ['queued', Date.now()], true, true)
        .filter((job) => runnable.includes(job.type))
        .limit(CONCURRENCY)
        .toArray();
      if (jobs.length === 0) break;
      await Promise.all(jobs.map(runJob));
    }
  } finally {
    await updateBadge();
  }
}

async function runJob(job: Job): Promise<void> {
  await db.jobs.update(job.id, { status: 'running' });
  try {
    await HANDLERS[job.type](job.docId);
    await db.jobs.delete(job.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[queue] ${job.type} failed for ${job.docId}:`, message);
    if (error instanceof TaskNotConfiguredError) {
      await db.jobs.update(job.id, { status: 'queued', error: message });
    } else {
      const attempts = job.attempts + 1;
      await db.jobs.update(job.id, {
        attempts,
        error: message,
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
        runAfter: Date.now() + 60_000 * 4 ** (attempts - 1),
      });
    }
  }
}

async function overDailyLimit(): Promise<boolean> {
  const { dailyBackgroundCalls } = await usageLimits.getValue();
  if (!dailyBackgroundCalls) return false;
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const used = await db.usage
    .where('at')
    .aboveOrEqual(startOfDay)
    .filter((u) => BACKGROUND_TASKS.includes(u.task))
    .count();
  return used >= dailyBackgroundCalls;
}

/** Jobs left "running" when the service worker was stopped go back in the queue. */
export async function recoverInterruptedJobs(): Promise<void> {
  await db.jobs.where('status').equals('running').modify({ status: 'queued' });
}

export async function retryFailedJobs(): Promise<number> {
  return db.jobs
    .where('status')
    .equals('failed')
    .modify({ status: 'queued', attempts: 0, runAfter: Date.now(), error: undefined });
}

export async function updateBadge(): Promise<void> {
  const active = await activeJobTypes();
  const pending = await db.jobs
    .where('status')
    .anyOf('queued', 'running')
    .filter((j) => active.includes(j.type))
    .count();
  await browser.action.setBadgeBackgroundColor({ color: '#0ea5a8' });
  await browser.action.setBadgeText({ text: pending > 0 ? String(Math.min(pending, 999)) : '' });
}
