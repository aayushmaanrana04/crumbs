import { describe, expect, it, vi } from 'vitest';
import { authorizeUrl, codeFromCallback, createPkce, exchangeCode } from './openrouter-auth';

describe('OpenRouter sign-in', () => {
  it('derives the S256 challenge from the verifier', async () => {
    const { verifier, challenge } = await createPkce();
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const expected = Buffer.from(digest).toString('base64url');
    expect(challenge).toBe(expected);
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('builds the consent URL, with or without a callback', () => {
    const url = new URL(authorizeUrl({ challenge: 'c', callback: 'https://id.chromiumapp.org/openrouter', state: 's' }));
    expect(url.origin + url.pathname).toBe('https://openrouter.ai/auth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      callback_url: 'https://id.chromiumapp.org/openrouter',
      code_challenge: 'c',
      code_challenge_method: 'S256',
      state: 's',
      key_label: 'Crumbs',
    });
    expect(new URL(authorizeUrl({ challenge: 'c' })).searchParams.has('callback_url')).toBe(false);
  });

  it('only accepts a callback for this sign-in', () => {
    expect(codeFromCallback('https://id.chromiumapp.org/openrouter?code=abc&state=s', 's')).toBe('abc');
    expect(() => codeFromCallback('https://id.chromiumapp.org/openrouter?code=abc&state=other', 's')).toThrow(/didn't match/);
    expect(() => codeFromCallback('https://id.chromiumapp.org/openrouter?state=s', 's')).toThrow(/cancelled/);
  });

  it('exchanges the code with the verifier', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ key: 'sk-or-1' }))) as unknown as typeof fetch;
    expect(await exchangeCode(' abc ', 'v', fetcher)).toBe('sk-or-1');
    const [url, init] = (fetcher as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(url).toBe('https://openrouter.ai/api/v1/auth/keys');
    expect(JSON.parse(init.body)).toEqual({ code: 'abc', code_verifier: 'v', code_challenge_method: 'S256' });
  });

  it('explains a used or expired code', async () => {
    const fetcher = (async () => new Response('{}', { status: 400 })) as unknown as typeof fetch;
    await expect(exchangeCode('abc', 'v', fetcher)).rejects.toThrow(/already used or has expired/);
  });
});
