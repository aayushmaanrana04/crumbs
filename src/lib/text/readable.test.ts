import { describe, expect, it } from 'vitest';
import { readableText } from './readable';

describe('readableText', () => {
  it('keeps link text, drops URLs, and marks images', () => {
    expect(readableText('See [the docs](https://x.dev/a?b=1) and ![Latency chart](https://x.dev/c.png) or ![](https://x.dev/d.png).')).toBe(
      'See the docs and [image: Latency chart] or [image].',
    );
  });

  it('leaves code and plain text alone', () => {
    expect(readableText('Run `npm i` then call start().')).toBe('Run `npm i` then call start().');
  });
});
