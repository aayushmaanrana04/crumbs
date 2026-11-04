import { db } from '../db/schema';
import { usageLimits } from '../settings/tasks';

// The daily cap on background AI calls (summaries and search indexing). Ask isn't counted: it runs
// only when the user asks. Shared by the queue, which stops at the cap, and the UI, which says so.
const BACKGROUND_TASKS = ['insights', 'embed'];

export interface DailyUsage {
  used: number;
  /** 0 means no limit. */
  limit: number;
  reached: boolean;
}

export async function backgroundUsageToday(): Promise<DailyUsage> {
  const { dailyBackgroundCalls: limit } = await usageLimits.getValue();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const used = await db.usage
    .where('at')
    .aboveOrEqual(startOfDay)
    .filter((u) => BACKGROUND_TASKS.includes(u.task))
    .count();
  return { used, limit, reached: !!limit && used >= limit };
}
