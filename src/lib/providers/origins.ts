// Host permissions each provider needs. Declared as optional in the manifest and
// requested at runtime, so the extension only talks to providers the user enabled.
export const PROVIDER_HOSTS = {
  openai: ['https://api.openai.com/*'],
  openrouter: ['https://openrouter.ai/*'],
  anthropic: ['https://api.anthropic.com/*'],
  gemini: ['https://generativelanguage.googleapis.com/*'],
  // Match patterns ignore ports, so these cover any local Ollama port.
  ollama: ['http://localhost/*', 'http://127.0.0.1/*'],
} as const;

export const PROVIDER_ORIGINS: string[] = Object.values(PROVIDER_HOSTS).flat();
