import { parseJsonLoose } from '../ai/json';
import { PROVIDER_INFO } from './catalog';
import {
  errorFromResponse,
  providerFetch,
  ProviderError,
  type CompletionRequest,
  type CompletionResult,
  type ModelInfo,
  type ProviderAdapter,
  type ProviderConfig,
} from './types';

function baseUrl(config: ProviderConfig): string {
  return config.baseUrl.replace(/\/+$/, '');
}

function authHeaders(config: ProviderConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
  };
}

async function chatComplete(label: string, config: ProviderConfig, request: CompletionRequest): Promise<CompletionResult> {
  if (!request.model) throw new ProviderError(`Pick a ${label} model in Settings.`);
  const started = Date.now();
  const messages = [
    ...(request.system ? [{ role: 'system', content: request.system }] : []),
    { role: 'user', content: request.prompt },
  ];
  const body: Record<string, unknown> = { model: request.model, messages };
  if (request.schema) {
    body.response_format = { type: 'json_schema', json_schema: { name: 'output', schema: request.schema, strict: true } };
  }

  const res = await providerFetch(label, `${baseUrl(config)}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorFromResponse(res, label);
  const json = (await res.json()) as {
    model?: string;
    choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const choice = json.choices?.[0];
  if (choice?.message?.refusal) throw new ProviderError(`${label} declined: ${choice.message.refusal}`);
  const text = choice?.message?.content ?? '';
  if (choice?.finish_reason === 'length') throw new ProviderError(`${label} stopped early: the response hit its length limit.`);
  return {
    text,
    json: request.schema ? parseJsonLoose(text) : undefined,
    model: json.model ?? request.model,
    durationMs: Date.now() - started,
    usage: { inputTokens: json.usage?.prompt_tokens, outputTokens: json.usage?.completion_tokens },
  };
}

async function embedTexts(label: string, config: ProviderConfig, model: string, texts: string[]): Promise<number[][]> {
  if (!model) throw new ProviderError(`Pick a ${label} embedding model in Settings.`);
  const res = await providerFetch(label, `${baseUrl(config)}/embeddings`, {
    method: 'POST',
    headers: authHeaders(config),
    body: JSON.stringify({ model, input: texts }),
  });
  if (!res.ok) throw await errorFromResponse(res, label);
  const json = (await res.json()) as { data?: { index: number; embedding: number[] }[] };
  if (!json.data || json.data.length !== texts.length) throw new ProviderError(`${label} returned the wrong number of embeddings.`);
  return [...json.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function listOpenAIModels(label: string, config: ProviderConfig): Promise<ModelInfo[]> {
  const res = await providerFetch(label, `${baseUrl(config)}/models`, { headers: authHeaders(config) });
  if (!res.ok) throw await errorFromResponse(res, label);
  const json = (await res.json()) as { data?: { id: string }[] };
  if (!Array.isArray(json.data)) throw new ProviderError(`${label} returned an unexpected model list.`);
  return json.data.map((m) => ({ id: m.id }));
}

export const openai: ProviderAdapter = {
  info: PROVIDER_INFO.openai,
  listModels: (config) => listOpenAIModels('OpenAI', config),
  complete: (config, request) => chatComplete('OpenAI', config, request),
  embed: (config, model, texts) => embedTexts('OpenAI', config, model, texts),
};

export const openrouter: ProviderAdapter = {
  info: PROVIDER_INFO.openrouter,
  async listModels(config) {
    // OpenRouter's model list is public, so verify the key separately.
    const res = await providerFetch('OpenRouter', `${baseUrl(config)}/key`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    if (!res.ok) throw await errorFromResponse(res, 'OpenRouter');
    return listOpenAIModels('OpenRouter', config);
  },
  complete: (config, request) => chatComplete('OpenRouter', config, request),
};

export const ollama: ProviderAdapter = {
  info: PROVIDER_INFO.ollama,
  async listModels(config) {
    try {
      return await listOpenAIModels('Ollama', config);
    } catch (error) {
      if (error instanceof ProviderError && error.message.includes('HTTP 403')) {
        throw new ProviderError(
          'Ollama refused the request. Start it with OLLAMA_ORIGINS=chrome-extension://* so extensions can connect.',
        );
      }
      throw error;
    }
  },
  complete: (config, request) => chatComplete('Ollama', config, request),
  embed: (config, model, texts) => embedTexts('Ollama', config, model, texts),
};
