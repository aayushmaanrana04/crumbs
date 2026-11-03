import { browser } from '#imports';
import type { RpcArgs, RpcMethod, RpcRequest, RpcResponse, RpcResult } from './protocol';

export class RpcError extends Error {
  override name = 'RpcError';
}

/** Call a background handler. Rejects with the handler's error message. */
export async function rpc<M extends RpcMethod>(
  method: M,
  ...[args]: RpcArgs<M> extends Record<string, never> ? [] : [RpcArgs<M>]
): Promise<RpcResult<M>> {
  const request: RpcRequest<M> = { rpc: method, args: (args ?? {}) as RpcArgs<M> };
  const response = (await browser.runtime.sendMessage(request)) as RpcResponse<RpcResult<M>> | undefined;
  if (!response) throw new RpcError(`No handler responded to ${method}.`);
  if (!response.ok) throw new RpcError(response.error);
  return response.data;
}
