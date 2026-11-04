import { browser } from '#imports';
import { PROVIDER_INFO } from './catalog';
import { ProviderError, type CompletionResult, type ProviderAdapter } from './types';

// Development only. Talks to tools/claude-bridge, which runs prompts through the
// Claude Code CLI on this machine using the developer's own login. Using a
// Claude subscription to power a shipped product isn't permitted, so this
// adapter is excluded from production builds.

// Pre-rename host name, kept so installed dev bridges keep working.
const HOST = 'com.summaryse.claude_bridge';

type BridgeReply<T> = { ok: true; data: T } | { ok: false; error: string };

async function callBridge<T>(message: Record<string, unknown>): Promise<T> {
  let reply: BridgeReply<T>;
  try {
    reply = (await browser.runtime.sendNativeMessage(HOST, message)) as BridgeReply<T>;
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    if (text.includes('not found')) {
      throw new ProviderError('The Claude dev bridge isn\'t installed. Run "npm run bridge:install", then reload the extension.');
    }
    if (text.includes('forbidden')) {
      throw new ProviderError('The dev bridge doesn\'t allow this extension ID. Re-run "npm run bridge:install".');
    }
    throw new ProviderError(`Dev bridge error: ${text}`);
  }
  if (!reply.ok) throw new ProviderError(reply.error);
  return reply.data;
}

export const claudeLocal: ProviderAdapter = {
  info: PROVIDER_INFO['claude-local'],
  async listModels() {
    const { version } = await callBridge<{ version: string }>({ type: 'version' });
    // The CLI resolves these aliases to the current model of each tier.
    return ['haiku', 'sonnet', 'opus'].map((id) => ({ id, name: `${id} via ${version}` }));
  },
  complete(_config, request) {
    return callBridge<CompletionResult>({ type: 'complete', ...request });
  },
};
