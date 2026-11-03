import { browser, type Browser } from '#imports';
import { CONTENT_SCRIPT_METHODS, isRpcRequest, type RpcMethods, type RpcResponse } from './protocol';

export type RpcSender = Browser.runtime.MessageSender;

type Handlers = {
  [M in keyof RpcMethods]: (args: RpcMethods[M]['args'], sender: RpcSender) => Promise<RpcMethods[M]['result']>;
};

const EXTENSION_ORIGIN = new URL(browser.runtime.getURL('/')).origin;

// Extension pages (popup, app tab) have our origin; content scripts report the web page's URL.
function fromExtensionPage(sender: RpcSender): boolean {
  return !!sender.url && new URL(sender.url).origin === EXTENSION_ORIGIN;
}

/** Register background handlers. Web pages can't reach these; content scripts get an allow-list. */
export function serveRpc(handlers: Handlers): void {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!isRpcRequest(message) || sender.id !== browser.runtime.id) return false;

    const reply = (response: RpcResponse<unknown>) => sendResponse(response);
    const allowed = fromExtensionPage(sender) || (!!sender.tab && CONTENT_SCRIPT_METHODS.has(message.rpc));
    const handler = handlers[message.rpc] as ((args: unknown, sender: RpcSender) => Promise<unknown>) | undefined;
    if (!allowed || !handler) {
      reply({ ok: false, error: `Method ${message.rpc} is not available here.` });
      return false;
    }

    handler(message.args, sender).then(
      (data) => reply({ ok: true, data }),
      (error: unknown) => {
        console.error(`[rpc] ${message.rpc} failed`, error);
        reply({ ok: false, error: error instanceof Error ? error.message : String(error) });
      },
    );
    return true; // keep the channel open for the async response
  });
}
