// Markdown rendering of a summary, for the Markdown export and "Copy as Markdown".
import type { Insight, InsightBlock } from '../db/schema';

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

function block(b: InsightBlock): string {
  const heading = 'title' in b && b.title ? `### ${b.title}\n\n` : '';
  switch (b.type) {
    case 'steps':
      return heading + b.items.map((i, n) => `${n + 1}. ${i.text}${i.code ? `\n\n   \`\`\`${i.lang}\n${i.code.replace(/^/gm, '   ')}\n   \`\`\`` : ''}`).join('\n');
    case 'table':
      return `${heading}| ${b.columns.map(cell).join(' | ')} |\n| ${b.columns.map(() => '---').join(' | ')} |\n${b.rows.map((r) => `| ${r.map(cell).join(' | ')} |`).join('\n')}`;
    case 'chart':
      return heading + b.series.map((p) => `- ${p.label}: ${p.value}${b.unit ? ` ${b.unit}` : ''}`).join('\n');
    case 'list':
      return heading + b.items.map((i) => `- ${i}`).join('\n');
    case 'code':
      return `${heading}\`\`\`${b.lang}\n${b.code}\n\`\`\``;
    case 'quote':
      return `> ${b.text}${b.by ? `\n>\n> — ${b.by}` : ''}`;
    case 'callout':
      return `> **${b.tone === 'warning' ? 'Warning' : 'Note'}:** ${b.text}`;
  }
}

export function insightToMarkdown(insight: Insight): string {
  return [
    `> ${insight.gist}`,
    insight.note ? `_${insight.note}_` : '',
    insight.keyPoints.length ? `## Key points\n\n${insight.keyPoints.map((p) => `- ${p}`).join('\n')}` : '',
    ...insight.blocks.map(block),
  ]
    .filter(Boolean)
    .join('\n\n');
}
