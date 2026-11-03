// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { cleanMarkdown } from './clean';
import { detectType, extractPage } from './extract';

const paragraphs = Array.from(
  { length: 8 },
  (_, i) => `<p>Paragraph ${i}: Playwright drives Chromium through the DevTools protocol, and accessibility trees give agents a compact view of the page.</p>`,
).join('');

function page(body: string, head = '') {
  document.documentElement.innerHTML = `<head><title>Fallback title</title>${head}</head><body>${body}</body>`;
  return document;
}

describe('extractPage', () => {
  it('extracts the article as markdown with metadata', () => {
    const doc = page(
      `<nav>Menu</nav><article><h1>Browser agents</h1>${paragraphs}<pre><code>npx playwright test</code></pre></article><footer>Footer</footer>`,
      `<meta property="og:site_name" content="Agent Blog"><meta name="author" content="Ada"><meta property="article:published_time" content="2026-05-01T10:00:00Z"><link rel="canonical" href="https://agents.dev/posts/browser">`,
    );
    const result = extractPage(doc, 'https://agents.dev/posts/browser?utm_source=x', '  a selection ');
    expect(result.title).toBe('Fallback title');
    expect(result.siteName).toBe('Agent Blog');
    expect(result.author).toBe('Ada');
    expect(result.publishedAt).toBe(Date.parse('2026-05-01T10:00:00Z'));
    expect(result.declaredCanonicalUrl).toBe('https://agents.dev/posts/browser');
    expect(result.markdown).toContain('Paragraph 3');
    expect(result.markdown).toContain('```');
    expect(result.markdown).not.toContain('Footer');
    expect(result.selection).toBe('a selection');
    expect(result.type).toBe('article');
  });

  it('drops a site menu that Readability keeps inside <main>', () => {
    const menu = `<ul class="menu">${Array.from({ length: 20 }, (_, i) => `<li><a href="/c/${i}">Category ${i}</a></li>`).join('')}</ul>`;
    const doc = page(`<main><div class="mega-menu-wrap">${menu}</div><article><h1>Fallback title</h1>${paragraphs}</article></main>`);
    const result = extractPage(doc, 'https://blog.dev/post');
    expect(result.markdown).not.toContain('Category 3');
    expect(result.markdown.startsWith('Paragraph 0')).toBe(true);
  });

  it('cleans link-heavy junk before the title heading, but keeps real prose', () => {
    const junk = Array.from({ length: 15 }, (_, i) => `-   [](#mm-${i})[Section ${i}](https://x.dev/${i})`).join('\n');
    const md = `${junk}\n\n[![](logo.png)](https://x.dev)\n\n# My Post\n\nThe body starts here.`;
    expect(cleanMarkdown(md, 'My Post')).toBe('The body starts here.');
    expect(cleanMarkdown('Text\n\n[![](avatar.png)](https://x.dev/author)', 'Other')).toContain('[![](avatar.png)](https://x.dev/author)');

    const intro = `${'Real introductory prose sentence with several words. '.repeat(10)}\n\n# My Post\n\nBody.`;
    expect(cleanMarkdown(intro, 'My Post')).toContain('Real introductory prose');
  });

  it('detects document types from the URL', () => {
    expect(detectType('https://github.com/microsoft/playwright')).toBe('repo');
    expect(detectType('https://github.com/microsoft/playwright/issues/1')).toBe('article');
    expect(detectType('https://docs.python.org/3/library')).toBe('docs');
    expect(detectType('https://www.youtube.com/watch?v=abc')).toBe('video');
  });
});
