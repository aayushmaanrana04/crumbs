# Claude dev bridge

**Development only. Never ship this.** It lets the development build of the extension run prompts through the Claude Code CLI on your machine, on your own Claude login. Using a Claude subscription to power a product for other users isn't permitted, so the bridge, the `nativeMessaging` permission and the "Local Claude (dev only)" provider are all excluded from production builds.

## How it works

```
extension (dev build) ──sendNativeMessage──▶ host.mjs ──▶ claude -p --output-format json --tools "" …
```

- Chrome starts `host.mjs` on demand through native messaging.
- Each request runs `claude -p` in an empty temp directory, with no tools, no MCP servers and no settings files. Prompts contain text from web pages, so Claude can only answer; it can't act on your machine.
- The dev build has a fixed extension ID (`src/lib/dev-extension-key.ts`), and only that ID may call the bridge.

## Setup

```bash
npm run bridge:install     # registers the bridge with Chrome/Chromium (macOS, Linux)
npm run dev                # or: npm run build:dev and load .output/chrome-mv3-dev
```

Then open Settings, click **Test connection** on "Local Claude (dev only)" and try a prompt.

`npm run bridge:uninstall` removes the registration.

## Protocol

Requests and replies are JSON. Replies are `{ id, ok: true, data }` or `{ id, ok: false, error }`.

| Request | Reply data |
|---|---|
| `{ type: "version" }` | `{ version }` |
| `{ type: "complete", prompt, system?, schema?, model? }` | `{ text, json?, model, durationMs }` |

`model` accepts the CLI's aliases (`haiku`, `sonnet`, `opus`); the default is `haiku`.
