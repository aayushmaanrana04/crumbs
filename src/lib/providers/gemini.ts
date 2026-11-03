import { parseJsonLoose } from '../ai/json';
import { PROVIDER_INFO } from './catalog';
import { errorFromResponse, providerFetch, ProviderError, type ProviderAdapter, type ProviderConfig } from './types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

function headers(config: ProviderConfig): Record<string, string> {
  return { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey };
}

export const gemini: ProviderAdapter = {
  info: PROVIDER_INFO.gemini,
  async listModels(config) {
    const res = await providerFetch('Gemini', `${BASE}/models?pageSize=1000`, { headers: headers(config) });
    if (!res.ok) throw await errorFromResponse(res, 'Gemini');
    const json = (await res.json()) as { models?: { name: string; displayName?: string }[] };
    return (json.models ?? []).map((m) => ({ id: m.name.replace(/^models\//, ''), name: m.displayName }));
  },

  async complete(config, request) {
    if (!request.model) throw new ProviderError('Pick a Gemini model in Settings.');
    const started = Date.now();
    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      ...(request.system ? { systemInstruction: { parts: [{ text: request.system }] } } : {}),
      ...(request.schema
        ? { generationConfig: { responseMimeType: 'application/json', responseJsonSchema: request.schema } }
        : {}),
    };
    const res = await providerFetch('Gemini', `${BASE}/models/${encodeURIComponent(request.model)}:generateContent`, {
      method: 'POST',
      headers: headers(config),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await errorFromResponse(res, 'Gemini');
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      promptFeedback?: { blockReason?: string };
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      modelVersion?: string;
    };
    if (json.promptFeedback?.blockReason) throw new ProviderError(`Gemini blocked the request (${json.promptFeedback.blockReason}).`);
    const candidate = json.candidates?.[0];
    if (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
      throw new ProviderError(`Gemini stopped the response (${candidate.finishReason}).`);
    }
    const text = (candidate?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    return {
      text,
      json: request.schema ? parseJsonLoose(text) : undefined,
      model: json.modelVersion ?? request.model,
      durationMs: Date.now() - started,
      usage: { inputTokens: json.usageMetadata?.promptTokenCount, outputTokens: json.usageMetadata?.candidatesTokenCount },
    };
  },

  async embed(config, model, texts) {
    if (!model) throw new ProviderError('Pick a Gemini embedding model in Settings.');
    const res = await providerFetch('Gemini', `${BASE}/models/${encodeURIComponent(model)}:batchEmbedContents`, {
      method: 'POST',
      headers: headers(config),
      body: JSON.stringify({
        requests: texts.map((text) => ({ model: `models/${model}`, content: { parts: [{ text }] } })),
      }),
    });
    if (!res.ok) throw await errorFromResponse(res, 'Gemini');
    const json = (await res.json()) as { embeddings?: { values: number[] }[] };
    if (json.embeddings?.length !== texts.length) throw new ProviderError('Gemini returned the wrong number of embeddings.');
    return json.embeddings.map((e) => e.values);
  },
};
