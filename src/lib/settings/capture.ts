import { storage } from '#imports';
import { hostnameOf } from '../capture/url';

export interface CaptureSettings {
  /** Never save pages from these sites, manually or automatically. */
  blockedSites: string[];
  /** Save pages from these sites automatically once you've read them. */
  autoCaptureSites: string[];
}

export const captureSettings = storage.defineItem<CaptureSettings>('local:capture', {
  fallback: { blockedSites: [], autoCaptureSites: [] },
});

// Sites that can't be auto-captured: mail, banking, health, identity and admin consoles.
const SENSITIVE_PATTERNS: RegExp[] = [
  /(^|\.)mail\./,
  /^(gmail|outlook|proton|icloud|yahoo)\./,
  /(^|\.)(accounts|login|signin|auth|id|sso)\./,
  /bank/,
  /(^|\.)(paypal|stripe|wise|revolut|venmo|coinbase|binance)\./,
  /(^|\.)(health|patient|mychart|clinic)/,
  /(^|\.)(console\.aws|portal\.azure|console\.cloud\.google)\./,
  /(^|\.)(1password|lastpass|bitwarden|dashlane)\./,
];

const SENSITIVE_PATH = /\/(login|signin|sign-in|logout|auth|oauth|checkout|account|billing|password)(\/|$)/i;

/** Normalise user input like "https://www.Example.com/path" to "example.com". */
export function normalizeSite(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';
  return hostnameOf(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
}

export function siteMatches(hostname: string, site: string): boolean {
  return hostname === site || hostname.endsWith(`.${site}`);
}

export function isSensitiveSite(site: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(site));
}

export function isSensitiveUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return isSensitiveSite(hostnameOf(url)) || SENSITIVE_PATH.test(pathname);
  } catch {
    return true;
  }
}

export function isBlocked(url: string, settings: CaptureSettings): boolean {
  const host = hostnameOf(url);
  return settings.blockedSites.some((site) => siteMatches(host, site));
}

export function isAutoCaptureSite(url: string, settings: CaptureSettings): boolean {
  const host = hostnameOf(url);
  return settings.autoCaptureSites.some((site) => siteMatches(host, site));
}

/** Match patterns for a site and its subdomains. */
export function sitePatterns(site: string): string[] {
  return [`*://${site}/*`, `*://*.${site}/*`];
}
