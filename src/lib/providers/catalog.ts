import { PROVIDER_HOSTS } from './origins';
import type { ProviderConfig, ProviderInfo, ProviderKind } from './types';

// Provider metadata only. Implementations live in the adapter files so pages
// don't bundle SDKs they never call.
export const PROVIDER_INFO: Record<ProviderKind, ProviderInfo> = {
  openai: {
    kind: 'openai',
    label: 'OpenAI',
    needsKey: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
    runsIn: 'background',
    hostPermissions: PROVIDER_HOSTS.openai,
    supportsCompletion: true,
    supportsEmbeddings: true,
    defaultModel: '',
  },
  anthropic: {
    kind: 'anthropic',
    label: 'Anthropic',
    needsKey: true,
    defaultBaseUrl: '',
    runsIn: 'background',
    hostPermissions: PROVIDER_HOSTS.anthropic,
    supportsCompletion: true,
    supportsEmbeddings: false,
    defaultModel: 'claude-opus-5-5',
  },
  gemini: {
    kind: 'gemini',
    label: 'Google Gemini',
    needsKey: true,
    defaultBaseUrl: '',
    runsIn: 'background',
    hostPermissions: PROVIDER_HOSTS.gemini,
    supportsCompletion: true,
    supportsEmbeddings: true,
    defaultModel: '',
  },
  openrouter: {
    kind: 'openrouter',
    label: 'OpenRouter',
    needsKey: true,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    runsIn: 'background',
    hostPermissions: PROVIDER_HOSTS.openrouter,
    supportsCompletion: true,
    supportsEmbeddings: false,
    defaultModel: '',
  },
  ollama: {
    kind: 'ollama',
    label: 'Ollama',
    needsKey: false,
    defaultBaseUrl: 'http://localhost:11434/v1',
    runsIn: 'background',
    hostPermissions: PROVIDER_HOSTS.ollama,
    supportsCompletion: true,
    supportsEmbeddings: true,
    defaultModel: '',
  },
  'chrome-ai': {
    kind: 'chrome-ai',
    label: 'Chrome built-in AI',
    needsKey: false,
    defaultBaseUrl: '',
    runsIn: 'page',
    hostPermissions: [],
    supportsCompletion: false,
    supportsEmbeddings: false,
    defaultModel: '',
  },
  'claude-local': {
    kind: 'claude-local',
    label: 'Local Claude (dev only)',
    needsKey: false,
    defaultBaseUrl: '',
    runsIn: 'background',
    hostPermissions: [],
    supportsCompletion: true,
    supportsEmbeddings: false,
    defaultModel: 'haiku',
    devOnly: true,
  },
};

const IS_DEV = import.meta.env.MODE === 'development';

export const PROVIDER_KINDS = (Object.keys(PROVIDER_INFO) as ProviderKind[]).filter(
  (kind) => IS_DEV || !PROVIDER_INFO[kind].devOnly,
);

export function defaultProviderConfig(kind: ProviderKind): ProviderConfig {
  return { enabled: false, apiKey: '', baseUrl: PROVIDER_INFO[kind].defaultBaseUrl };
}
