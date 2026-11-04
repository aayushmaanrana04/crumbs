import { storage } from '#imports';
import { hostnameOf } from '../capture/url';
import { siteMatches } from './capture';

export interface PanelSettings {
  /** Update the side panel (and toolbar badge) as you switch tabs. Needs the optional "tabs" permission. */
  follow: boolean;
  /** Sites where follow mode is paused. */
  pausedSites: string[];
}

export const panelSettings = storage.defineItem<PanelSettings>('local:panel', {
  fallback: { follow: false, pausedSites: [] },
});

/** Follow mode is paused on this page's site. */
export function isPaused(url: string, settings: PanelSettings): boolean {
  const host = hostnameOf(url);
  return !!host && settings.pausedSites.some((s) => siteMatches(host, s));
}
