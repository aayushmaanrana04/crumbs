const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export const formatDate = (time: number) => dateFormat.format(time);
export const formatDateTime = (time: number) => timeFormat.format(time);

export const TYPE_LABELS = {
  article: 'Article',
  docs: 'Docs',
  repo: 'Repository',
  pdf: 'PDF',
  video: 'Video',
  selection: 'Highlight',
  other: 'Page',
} as const;
