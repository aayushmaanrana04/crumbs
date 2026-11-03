// Background-only: imports every network adapter, including the Anthropic SDK.
import { anthropic } from './anthropic';
import { claudeLocal } from './claude-local';
import { gemini } from './gemini';
import { ollama, openai, openrouter } from './openai-compatible';
import type { ProviderAdapter, ProviderKind } from './types';

export const BACKGROUND_ADAPTERS: Partial<Record<ProviderKind, ProviderAdapter>> = {
  openai,
  anthropic,
  gemini,
  openrouter,
  ollama,
  // Tree-shaken out of production builds.
  ...(import.meta.env.MODE === 'development' ? { 'claude-local': claudeLocal } : {}),
};
