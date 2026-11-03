// Markdown tidying shared by extraction (on save) and the reader (for pages saved before it existed).

const comparable = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Words outside link and image syntax, to tell prose from menus. */
function proseWordCount(markdown: string): number {
  const stripped = markdown.replace(/!?\[[^\]]*\]\([^)]*\)/g, ' ').replace(/[#>*_`|-]/g, ' ');
  return stripped.split(/\s+/).filter((w) => /\p{L}{2,}/u.test(w)).length;
}

/**
 * Tidy converted Markdown: drop empty anchor links, and drop link-heavy junk
 * (menus, logos) before the article's own title heading, plus the heading itself,
 * since the title is shown separately.
 */
export function cleanMarkdown(markdown: string, title: string): string {
  // Empty anchor links like [](#menu-1), but not images (![](…)).
  let lines = markdown.replace(/(?<!!)\[\]\([^)]*\)/g, '').split('\n');
  const titleKey = comparable(title);
  const headingIndex = lines.findIndex((line) => {
    const match = line.match(/^#{1,3}\s+(.*)$/);
    return !!match && !!titleKey && comparable(match[1]!) === titleKey;
  });
  if (headingIndex >= 0) {
    const before = lines.slice(0, headingIndex).join('\n');
    if (proseWordCount(before) < 40) lines = lines.slice(headingIndex + 1);
  }
  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
