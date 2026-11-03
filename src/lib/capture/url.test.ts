import { describe, expect, it } from 'vitest';
import { canonicalizeUrl, hostnameOf, isCapturableUrl } from './url';

describe('canonicalizeUrl', () => {
  it('ignores protocol, www, hash, trailing slash and tracking params', () => {
    const a = canonicalizeUrl('https://www.Example.com/post/?utm_source=x&b=2&a=1#section');
    const b = canonicalizeUrl('http://example.com/post?a=1&b=2&fbclid=abc');
    expect(a).toBe('example.com/post?a=1&b=2');
    expect(b).toBe(a);
  });

  it('keeps meaningful query params and paths distinct', () => {
    expect(canonicalizeUrl('https://example.com/watch?v=1')).not.toBe(canonicalizeUrl('https://example.com/watch?v=2'));
    expect(canonicalizeUrl('https://example.com/')).toBe('example.com/');
  });

  it('detects capturable URLs and hostnames', () => {
    expect(isCapturableUrl('https://a.com')).toBe(true);
    expect(isCapturableUrl('chrome://settings')).toBe(false);
    expect(isCapturableUrl('not a url')).toBe(false);
    expect(hostnameOf('https://www.docs.rs/x')).toBe('docs.rs');
  });
});
