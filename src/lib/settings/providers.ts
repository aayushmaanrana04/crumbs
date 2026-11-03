import { storage } from '#imports';
import { defaultProviderConfig, PROVIDER_KINDS } from '../providers/catalog';
import type { ProviderConfig, ProviderKind } from '../providers/types';

export type ProviderSettings = Record<ProviderKind, ProviderConfig>;

// Kept in storage.local (never sync) so API keys stay on this device.
export const providerSettings = storage.defineItem<ProviderSettings>('local:providers', {
  fallback: Object.fromEntries(PROVIDER_KINDS.map((kind) => [kind, defaultProviderConfig(kind)])) as ProviderSettings,
});

export async function getProviderConfig(kind: ProviderKind): Promise<ProviderConfig> {
  const all = await providerSettings.getValue();
  return { ...defaultProviderConfig(kind), ...all[kind] };
}

export async function saveProviderConfig(kind: ProviderKind, config: ProviderConfig): Promise<void> {
  const all = await providerSettings.getValue();
  await providerSettings.setValue({ ...all, [kind]: config });
}
