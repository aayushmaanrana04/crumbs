import { describe, expect, it } from 'vitest';
import { isAutoCaptureSite, isBlocked, isSensitiveSite, isSensitiveUrl, normalizeSite } from './capture';

describe('capture rules', () => {
  const settings = { blockedSites: ['example.com'], autoCaptureSites: ['developer.mozilla.org'] };

  it('normalises site input', () => {
    expect(normalizeSite(' https://www.Example.com/path ')).toBe('example.com');
    expect(normalizeSite('docs.rs')).toBe('docs.rs');
  });

  it('matches sites and subdomains', () => {
    expect(isBlocked('https://blog.example.com/x', settings)).toBe(true);
    expect(isBlocked('https://notexample.com/x', settings)).toBe(false);
    expect(isAutoCaptureSite('https://developer.mozilla.org/en-US/docs/Web', settings)).toBe(true);
  });

  it('flags sensitive sites and pages', () => {
    expect(isSensitiveSite('mail.google.com')).toBe(true);
    expect(isSensitiveSite('chase-bank.com')).toBe(true);
    expect(isSensitiveSite('developer.mozilla.org')).toBe(false);
    expect(isSensitiveUrl('https://github.com/login')).toBe(true);
    expect(isSensitiveUrl('https://github.com/anthropics')).toBe(false);
  });
});
