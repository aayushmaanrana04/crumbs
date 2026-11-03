// Background only: resolves a task to its configured provider, runs it, and logs the call.
import { db } from '../db/schema';
import { PROVIDER_INFO } from '../providers/catalog';
import { BACKGROUND_ADAPTERS } from '../providers/registry';
import type { CompletionRequest, CompletionResult } from '../providers/types';
import { getProviderConfig } from '../settings/providers';
import { embeddingSpace, taskSettings, type TaskName } from '../settings/tasks';

export class TaskNotConfiguredError extends Error {
  override name = 'TaskNotConfiguredError';
}

async function resolve(task: TaskName) {
  const settings = (await taskSettings.getValue())[task];
  if (!settings.provider) throw new TaskNotConfiguredError(`Choose a model for "${task}" in Settings.`);
  const adapter = BACKGROUND_ADAPTERS[settings.provider];
  if (!adapter) throw new TaskNotConfiguredError(`${PROVIDER_INFO[settings.provider].label} isn't available here.`);
  const config = await getProviderConfig(settings.provider);
  if (!config.enabled) throw new TaskNotConfiguredError(`${adapter.info.label} is turned off in Settings.`);
  return { settings, adapter, config };
}

export async function isTaskConfigured(task: TaskName): Promise<boolean> {
  try {
    await resolve(task);
    return true;
  } catch {
    return false;
  }
}

async function logUsage(entry: Omit<Parameters<typeof db.usage.add>[0], 'at'>) {
  await db.usage.add({ at: Date.now(), ...entry }).catch((error) => console.warn('[usage] log failed', error));
}

export async function runTask(task: TaskName, request: CompletionRequest, docId?: string): Promise<CompletionResult> {
  const { settings, adapter, config } = await resolve(task);
  if (!adapter.complete) throw new TaskNotConfiguredError(`${adapter.info.label} can't run prompts.`);
  const model = settings.model || adapter.info.defaultModel;
  try {
    const result = await adapter.complete(config, { ...request, model });
    await logUsage({ provider: settings.provider, model: result.model, task, docId, ok: true, ...result.usage });
    return result;
  } catch (error) {
    await logUsage({ provider: settings.provider, model, task, docId, ok: false, error: String(error) });
    throw error;
  }
}

export async function embedTexts(texts: string[], docId?: string): Promise<{ space: string; vectors: number[][] }> {
  const { settings, adapter, config } = await resolve('embed');
  if (!adapter.embed) throw new TaskNotConfiguredError(`${adapter.info.label} doesn't provide embeddings.`);
  try {
    const vectors = await adapter.embed(config, settings.model, texts);
    await logUsage({ provider: settings.provider, model: settings.model, task: 'embed', docId, ok: true });
    return { space: embeddingSpace(settings), vectors };
  } catch (error) {
    await logUsage({ provider: settings.provider, model: settings.model, task: 'embed', docId, ok: false, error: String(error) });
    throw error;
  }
}
