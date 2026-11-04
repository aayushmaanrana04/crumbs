// "Connect OpenRouter": OAuth with PKCE, so the user signs in on OpenRouter and Carrel gets a key
// that bills their OpenRouter credit. No client secret and no server: the code is exchanged here.
// https://openrouter.ai/docs/guides/overview/auth/oauth

const AUTH_URL = 'https://openrouter.ai/auth';
const KEYS_URL = 'https://openrouter.ai/api/v1/auth/keys';
/** Where the user manages the key, including a credit limit. */
export const OPENROUTER_KEYS_PAGE = 'https://openrouter.ai/settings/keys';

export interface Pkce {
  verifier: string;
  challenge: string;
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** A fresh verifier and its S256 challenge. */
export async function createPkce(): Promise<Pkce> {
  const verifier = randomToken();
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64url(new Uint8Array(digest)) };
}

/** The consent page. Without a callback, OpenRouter shows a code for the user to paste instead. */
export function authorizeUrl(options: { challenge: string; callback?: string; state?: string }): string {
  const url = new URL(AUTH_URL);
  if (options.callback) url.searchParams.set('callback_url', options.callback);
  url.searchParams.set('code_challenge', options.challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  if (options.state) url.searchParams.set('state', options.state);
  url.searchParams.set('key_label', 'Carrel');
  return url.toString();
}

/** The code from the callback, after checking it answers our request. */
export function codeFromCallback(redirect: string, state: string): string {
  const params = new URL(redirect).searchParams;
  if (params.get('state') !== state) throw new Error("OpenRouter's reply didn't match this sign-in. Try again.");
  const code = params.get('code');
  if (!code) throw new Error('OpenRouter sign-in was cancelled.');
  return code;
}

/** Trade the one-time code for the user's key. */
export async function exchangeCode(code: string, verifier: string, fetcher: typeof fetch = fetch): Promise<string> {
  const res = await fetcher(KEYS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim(), code_verifier: verifier, code_challenge_method: 'S256' }),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 400 || res.status === 403
        ? 'That code was already used or has expired. Start again from OpenRouter.'
        : `OpenRouter couldn't create a key (HTTP ${res.status}).`,
    );
  }
  const { key } = (await res.json()) as { key?: string };
  if (!key) throw new Error('OpenRouter returned no key.');
  return key;
}
