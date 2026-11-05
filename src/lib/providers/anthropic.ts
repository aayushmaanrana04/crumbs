import Anthropic from '@anthropic-ai/sdk';
import { PROVIDER_INFO } from './catalog';
import { parseJsonLoose } from '../ai/json';
import { ProviderError, type ModelInfo, type ProviderAdapter, type ProviderConfig } from './types';

// Models that accept server-side refusal fallbacks (`fallbacks: "default"`).
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);

function client(config: ProviderConfig): Anthropic {
  // BYOK: the key belongs to the user and only ever goes to Anthropic.
  return new Anthropic({ apiKey: config.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 });
}

function toProviderError(error: unknown): unknown {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return new ProviderError('Anthropic rejected the API key.');
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ProviderError('Anthropic is rate limiting requests. Try again shortly.');
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new ProviderError("Couldn't reach Anthropic.");
  }
  if (error instanceof Anthropic.APIError) {
    return new ProviderError(`Anthropic returned HTTP ${error.status}: ${error.message}`);
  }
  return error;
}

export const anthropic: ProviderAdapter = {
  info: PROVIDER_INFO.anthropic,
  async listModels(config) {
    const models: ModelInfo[] = [];
    try {
      for await (const model of client(config).models.list()) {
        models.push({ id: model.id, name: model.display_name });
      }
    } catch (error) {
      throw toProviderError(error);
    }
    return models;
  },

  async complete(config, request) {
    const model = request.model || anthropic.info.defaultModel;
    const started = Date.now();
    let response;
    try {
      response = await client(config).beta.messages.create({
        model,
        max_tokens: 16000,
        ...(request.system ? { system: request.system } : {}),
        messages: [{ role: 'user', content: request.prompt }],
        output_config: {
          ...(request.effort ? { effort: request.effort } : {}),
          ...(request.schema ? { format: { type: 'json_schema' as const, schema: request.schema } } : {}),
        },
        ...(FALLBACK_MODELS.has(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
      });
    } catch (error) {
      throw toProviderError(error);
    }
    if (response.stop_reason === 'refusal') {
      throw new ProviderError('Claude declined this request.');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new ProviderError('Claude stopped early: the response hit its length limit.');
    }
    const text = response.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    return {
      text,
      json: request.schema ? parseJsonLoose(text) : undefined,
      model: response.model,
      durationMs: Date.now() - started,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  },
};
