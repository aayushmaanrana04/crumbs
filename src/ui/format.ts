import { hostnameOf } from '@/lib/capture/url';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const monthFormat = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export const formatDate = (time: number) => dateFormat.format(time);
export const formatDateTime = (time: number) => timeFormat.format(time);

const DAY = 86_400_000;
const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);

/** "Today", "2 days ago", "3 weeks ago", then a date. */
export function formatRelative(time: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY);
  if (days < 1) return 'Today';
  if (days < 7) return relative.format(-days, 'day');
  if (days < 30) return relative.format(-Math.floor(days / 7), 'week');
  return formatDate(time);
}

/** List section a saved page belongs to. */
export function dayGroup(time: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now) - startOfDay(time)) / DAY);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 7) return 'Earlier this week';
  if (days < 30) return 'Earlier this month';
  return monthFormat.format(time);
}

export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(markdown.split(/\s+/).length / 230));
}

export const TYPE_LABELS = {
  article: 'Article',
  docs: 'Docs',
  repo: 'Repository',
  pdf: 'PDF',
  video: 'Video',
  selection: 'Highlight',
  other: 'Page',
} as const;

/** The site a saved page came from: its name, or its hostname. */
export const siteLabel = (page: { siteName?: string; url: string }) => page.siteName || hostnameOf(page.url);
