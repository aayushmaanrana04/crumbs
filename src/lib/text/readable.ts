// The text of a Markdown page as a reader sees it, for prompts: link targets and image URLs are
// dropped (they cost tokens and say nothing a model can use), and images become a marker so the
// model can tell the reader when something is only shown as a picture.

export function readableText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, (_, alt: string) => (alt.trim() ? `[image: ${alt.trim()}]` : '[image]'))
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}
