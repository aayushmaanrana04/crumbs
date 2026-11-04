import { storage } from '#imports';

export interface PanelSettings {
  /** Update the side panel (and toolbar badge) as you switch tabs. Needs the optional "tabs" permission. */
  follow: boolean;
  /** Sites where follow mode is paused. */
  pausedSites: string[];
}

export const panelSettings = storage.defineItem<PanelSettings>('local:panel', {
  fallback: { follow: false, pausedSites: [] },
});
