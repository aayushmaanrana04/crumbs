export type ProviderKind = 'openai' | 'openrouter' | 'anthropic' | 'gemini' | 'ollama' | 'chrome-ai' | 'claude-local';

export interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  baseUrl: string;
}

export interface ModelInfo {
  id: string;
  name?: string;
}

/** Static description of a provider; safe to import anywhere. */
export interface ProviderInfo {
  kind: ProviderKind;
  label: string;
  needsKey: boolean;
  /** Prefilled base URL; empty when the provider has a fixed endpoint. */
  defaultBaseUrl: string;
  /** Where calls run. Chrome built-in AI is only exposed to pages, not the service worker. */
  runsIn: 'background' | 'page';
  hostPermissions: readonly string[];
  /** Can run prompts from the background (Chrome built-in AI only works in pages). */
  supportsCompletion: boolean;
  supportsEmbeddings: boolean;
  /** Suggested model for new task settings; empty means the user must pick one. */
  defaultModel: string;
  /** Only offered in development builds. */
  devOnly?: boolean;
}

export interface CompletionRequest {
  prompt: string;
  system?: string;
  /** JSON Schema; when set, the result's `json` holds the validated object. */
  schema?: Record<string, unknown>;
  model?: string;
  /** Reasoning effort hint; providers without an equivalent ignore it. */
  effort?: 'low' | 'medium' | 'high';
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface CompletionResult {
  text: string;
  json?: unknown;
  model: string;
  durationMs?: number;
  usage?: TokenUsage;
}

export interface ProviderAdapter {
  info: ProviderInfo;
  listModels(config: ProviderConfig): Promise<ModelInfo[]>;
  complete?(config: ProviderConfig, request: CompletionRequest): Promise<CompletionResult>;
  embed?(config: ProviderConfig, model: string, texts: string[]): Promise<number[][]>;
}

/** An error whose message is safe and useful to show the user. */
export class ProviderError extends Error {
  override name = 'ProviderError';
}

export async function errorFromResponse(res: Response, label: string): Promise<ProviderError> {
  if (res.status === 401 || res.status === 403) {
    return new ProviderError(`${label} rejected the API key (HTTP ${res.status}).`);
  }
  if (res.status === 429) {
    return new ProviderError(`${label} is rate limiting requests. Try again shortly.`);
  }
  const detail = await readErrorDetail(res);
  return new ProviderError(`${label} returned HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
}

/** Pull `error.message` out of a JSON error body (OpenAI, Gemini and Ollama all use it). */
async function readErrorDetail(res: Response): Promise<string> {
  const body = await res.text().catch(() => '');
  try {
    const message = (JSON.parse(body) as { error?: { message?: unknown } }).error?.message;
    if (typeof message === 'string') return message;
  } catch {
    // Not JSON; fall through to the raw text.
  }
  return body.slice(0, 200);
}

/** fetch() that turns network failures into a readable ProviderError. */
export async function providerFetch(label: string, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ProviderError(`Couldn't reach ${label} at ${new URL(url).origin}.`);
  }
}
