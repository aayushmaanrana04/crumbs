import type { SaveOutcome } from '../capture/save';
import type { LibraryStats } from '../db/schema';
import type { CompletionRequest, CompletionResult, ModelInfo, ProviderKind } from '../providers/types';
import type { TaskName } from '../settings/tasks';

/** Every request the background handles: method name → argument and result types. */
export interface RpcMethods {
  'providers.listModels': { args: { kind: ProviderKind }; result: ModelInfo[] };
  'ai.complete': { args: { kind: ProviderKind; request: CompletionRequest }; result: CompletionResult };
  'ai.runTask': { args: { task: Exclude<TaskName, 'embed'>; request: CompletionRequest }; result: CompletionResult };
  'ai.embedQuery': { args: { text: string }; result: { space: string; vector: number[] } };
  'capture.activeTab': { args: Record<string, never>; result: SaveOutcome };
  'capture.tab': { args: { tabId: number }; result: SaveOutcome };
  /** Sent by the auto-capture content script once the user has read the page. */
  'capture.auto': { args: Record<string, never>; result: SaveOutcome | null };
  'jobs.run': { args: Record<string, never>; result: void };
  'jobs.retryFailed': { args: Record<string, never>; result: number };
  'jobs.reprocess': { args: { docId: string }; result: void };
  'library.stats': { args: Record<string, never>; result: LibraryStats };
}

export type RpcMethod = keyof RpcMethods;
export type RpcArgs<M extends RpcMethod> = RpcMethods[M]['args'];
export type RpcResult<M extends RpcMethod> = RpcMethods[M]['result'];

/** Methods a content script (running inside a web page) may call. Everything else is extension pages only. */
export const CONTENT_SCRIPT_METHODS: ReadonlySet<RpcMethod> = new Set(['capture.auto']);

export interface RpcRequest<M extends RpcMethod = RpcMethod> {
  rpc: M;
  args: RpcArgs<M>;
}

export type RpcResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export function isRpcRequest(message: unknown): message is RpcRequest {
  return typeof message === 'object' && message !== null && typeof (message as RpcRequest).rpc === 'string';
}
