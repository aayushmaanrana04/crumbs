# Carrel

<img src="public/icon/128.png" width="64" alt="Carrel">

A local-first personal knowledge OS, built as a Chrome extension. It captures what you read, organises it with AI, and makes it searchable and askable. Everything is stored in your browser.

See [PLAN.md](PLAN.md) for the product plan and roadmap.

## Status

Phases 0–4 are done:

- **Save pages** from the side panel, `⌘/Ctrl+Shift+S`, or right-click. Selected text is saved as a highlight. Duplicates are detected.
- **Auto-capture** on sites you opt into, after you've actually read the page. Sensitive sites can't be auto-captured; blocked sites are never saved.
- **Library** with filters, keyword search, a reading view, tags and notes. Export as JSON or a Markdown zip, and import backups.
- **AI understanding** in the background: summary, key takeaways, facts, topics, entities and auto-tags for each page. Retries, a daily limit and an activity log of every AI call.
- **Search** by keyword and, with an embedding model, by meaning, showing the matching passage.
- **Ask** questions across your library, with citations to the exact passage, and the AI's own inferences marked separately.
- **Providers**: sign in with OpenRouter (usage is paid from your OpenRouter credit), or use your own key for OpenAI, Anthropic, Google Gemini, OpenRouter and Ollama, plus Chrome built-in AI. Each task (understanding, Ask, search) can use a different model.

- **Side panel** opened from the toolbar: whether you've saved the page, what you've read that relates to it, quick save, notes and Ask. Optional follow mode keeps it in step with your tabs.
- **Projects** group pages around a goal, with notes, open questions and suggested pages. Ask can be scoped to a project.

- **Design:** the "Soft neutral" design system, with light and dark modes following the system. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) and `design/summaryse.pen`.

The knowledge graph and the MCP integration are next; see the plan.

## Development

Requires Node 20+.

```bash
npm install
npm run dev      # launches Chrome with the extension loaded and hot reload
npm run build    # production build in .output/chrome-mv3
npm run build:dev  # development build in .output/chrome-mv3-dev
npm run check    # type-check TypeScript and Svelte
npm test         # unit tests
```

To load a production build manually: open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select `.output/chrome-mv3`.

### Using your local Claude Code while developing

Development builds include a "Local Claude (dev only)" provider that runs prompts through the Claude Code CLI on your machine. Run `npm run bridge:install` once; see [tools/claude-bridge](tools/claude-bridge/README.md). It's excluded from production builds.

### Ollama

Ollama rejects requests from extensions by default. Start it with:

```bash
OLLAMA_ORIGINS='chrome-extension://*' ollama serve
```

## Layout

```
src/
  entrypoints/      background service worker, app page, popup (WXT entrypoints)
  lib/
    db/             Dexie schema and queries
    providers/      AI provider catalog (metadata) and adapters
    rpc/            typed messaging between pages and the background
    settings/       chrome.storage-backed settings
    text/           chunking utilities
  ui/kit/           design-system components (mirrors design/summaryse.pen)
  ui/               feature components, views and router
  assets/           design tokens (see DESIGN_SYSTEM.md)
```

## Privacy

- Knowledge is stored locally in IndexedDB. There's no account and no server.
- API keys live in `chrome.storage.local` on this device and are only sent to the provider they belong to.
- The extension asks for host access to a provider only when you test or enable it, and gives it up when you turn that provider off.
