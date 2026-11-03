/** Words of a Markdown passage as they'd appear once rendered (no link/emphasis syntax). */
function passageWords(markdown: string): string[] {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|]/g, ' ')
    .replace(/^\s*(\d+\.|-)\s+/gm, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

const ANCHOR_WORDS = 8;

/**
 * Find a passage inside rendered content and return a Range over it, anchored on
 * its first and last few words. Falls back to just the opening words if the end
 * can't be matched. Whitespace differences between Markdown and HTML are ignored.
 */
export function findPassage(root: HTMLElement, markdown: string): Range | null {
  const words = passageWords(markdown);
  if (words.length < 3) return null;

  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);

  // Flatten text with a map from each normalised character back to its node/offset.
  let flat = '';
  const map: { node: Text; offset: number }[] = [];
  for (const node of nodes) {
    const text = node.data;
    // Separate adjacent nodes (e.g. two paragraphs) so their words don't run together.
    if (flat && !flat.endsWith(' ') && text && !/^\s/.test(text)) {
      flat += ' ';
      map.push({ node, offset: 0 });
    }
    for (let i = 0; i < text.length; i++) {
      const isSpace = /\s/.test(text[i]!);
      if (isSpace && (flat.endsWith(' ') || flat === '')) continue;
      flat += isSpace ? ' ' : text[i];
      map.push({ node, offset: i });
    }
  }

  const head = words.slice(0, ANCHOR_WORDS).join(' ');
  const start = flat.indexOf(head);
  if (start < 0) return null;
  const tail = words.slice(-ANCHOR_WORDS).join(' ');
  const tailAt = words.length > ANCHOR_WORDS ? flat.indexOf(tail, start) : -1;
  const end = tailAt >= 0 ? tailAt + tail.length : start + head.length;
  const from = map[start]!;
  const to = map[end - 1]!;
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset + 1);
  return range;
}
