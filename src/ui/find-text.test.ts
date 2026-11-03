// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { findPassage } from './find-text';

describe('findPassage', () => {
  it('locates a Markdown passage across rendered elements', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<p>Intro text here.</p><p>The <a href="#">simplification project</a> was about cutting through   that complexity.</p><p>It took a year and a half of steady work.</p><p>Outro.</p>';
    const range = findPassage(root, 'The [simplification project](https://x) was about cutting through that complexity.\n\nIt took a year and a half of steady work.');
    expect(range?.toString().replace(/\s+/g, ' ')).toBe(
      'The simplification project was about cutting through that complexity.It took a year and a half of steady work.',
    );
    // A short passage whose opening words span the paragraph break.
    expect(findPassage(root, 'cutting through that complexity.\n\nIt took a year')).not.toBeNull();
  });

  it('returns null when the passage is not present', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Nothing relevant here at all.</p>';
    expect(findPassage(root, 'Completely different words that never appear')).toBeNull();
  });
});
