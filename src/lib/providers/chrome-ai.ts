import { PROVIDER_INFO } from './catalog';
import { ProviderError, type ProviderAdapter } from './types';

type Availability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

declare global {
  // Chrome built-in AI (Prompt API). Not in the standard DOM typings yet.
  var LanguageModel: { availability(): Promise<Availability> } | undefined;
}

export const chromeAi: ProviderAdapter = {
  info: PROVIDER_INFO['chrome-ai'],
  async listModels() {
    if (!globalThis.LanguageModel) {
      throw new ProviderError("This version of Chrome doesn't expose built-in AI.");
    }
    const availability = await globalThis.LanguageModel.availability();
    if (availability === 'unavailable') {
      throw new ProviderError("Built-in AI isn't supported on this device.");
    }
    const note = availability === 'available' ? undefined : `Gemini Nano (${availability})`;
    return [{ id: 'gemini-nano', name: note }];
  },
};
