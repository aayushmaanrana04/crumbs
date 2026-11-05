# Plan: Crumbs (formerly Summaryse, then Carrel) → Personal Knowledge OS

Source: the Personal Knowledge OS product design doc (PDD). This plan maps the PDD onto the
current repo, lists what gets removed, and splits the work into shippable phases.

## 1. Starting point (before Phase 0)

| Area | Current state | Fate |
|---|---|---|
| AI | WebLLM in an offscreen document (`pages/offscreen.js`, `webllm-*.js`, `web-llm.js`, `debug-models.html`, `@mlc-ai/web-llm`) | **Delete** |
| Messaging | `background.js` relays LOAD_MODEL / SUMMARIZE / TOKEN between tab ↔ offscreen | Rewrite as a typed RPC layer |
| UI | Svelte 4 in-page modal (`Widget.svelte` + 12 cards) showing chunked summaries | Delete; rebuild what's needed in Svelte 5. Keep design tokens |
| Text utils | `src/utils.js`, `chunking-worker.js`: sentence segmentation, token estimate, chunk packing | **Keep**: ported to `src/lib/text/chunking.ts` for embedding/RAG chunking |
| Extraction | `getVisiblePageText()` raw DOM walk | Replace with Readability-based extraction |
| Onboarding | `Onboarding.svelte`, all about the model download | Rewrite for provider setup + capture rules |
| Repo hygiene | `node_modules/` (72 files) and built bundles (`content-bundle.js`, `webllm-bundle.js`) are tracked even though they're gitignored | Untrack them |
| Docs | `ARCHITECTURE.md`, `FIXES_APPLIED.md`, `QUICK_START.txt`, `SETUP.md`, `PROJECT_STRUCTURE.txt`, `input.md` describe WebLLM | Delete or rewrite. Keep `DESIGN_SYSTEM.md` |

## 2. Target architecture

```
 Web page                      Extension (one origin, shared IndexedDB)
┌───────────────┐   extract   ┌──────────────────────────────────────────────┐
│ content script│ ──────────▶ │ service worker                               │
│ - Readability │             │  - capture intake, dedup, exclusions         │
│ - selection / │ ◀────────── │  - job queue (IDB-persisted, chrome.alarms)  │
│   highlights  │  toasts     │  - AI router → providers                     │
│ - save toast  │             │  - resurfacing matcher (on tab change)       │
└───────────────┘             └──────────────┬───────────────────────────────┘
                                             │ RPC
              ┌──────────────────────────────┼──────────────────────────┐
              ▼                              ▼                          ▼
     side panel (contextual)        app.html (full tab)        native-messaging host
     - "you've seen this before"    Library │ Search │          (phase 6, MCP bridge
     - quick save / quick ask       Research │ Ask │ Settings   for external AI clients)
```

### Storage (local-first)
IndexedDB via Dexie, plus the `unlimitedStorage` permission. Tables:

- `documents`: url, canonicalUrl, title, author, siteName, publishedAt, capturedAt, type (article/docs/repo/pdf/video/selection), markdown, contentHash, simhash, status, userNotes, tags[], projectIds[]
- `chunks`: docId, ordinal, text, charStart/charEnd (provenance anchors)
- `embeddings`: chunkId, model, dim, vector (Float32Array). The model id is stored so a model switch triggers re-embedding instead of mixing vector spaces.
- `insights`: docId, tldr, takeaways[], facts[], topics[], model, cost
- `entities`, `entityAliases`, `mentions` (entity ↔ chunk + quoted span), `relations` (src, dst, type, evidence chunkId + quote)
- `projects`, `highlights`, `jobs`, `usage` (tokens/cost per call)

Settings and API keys live in `chrome.storage.local`, not IndexedDB.

Full-text index: MiniSearch, rebuilt from IDB and persisted as a snapshot.
Vector search: brute-force cosine over Float32 arrays. That's fine up to roughly 50–100k chunks; move to HNSW later if needed.

### AI layer (no local LLMs)
- A `Provider` interface: `chat({messages, schema?, stream?})`, `embed(texts)`, `estimateCost()`.
- Adapters: an **OpenAI-compatible** adapter covers OpenAI, OpenRouter and Ollama. Native adapters for **Anthropic** and **Gemini**. **Chrome built-in AI** (Summarizer/Prompt API) is an optional free tier for summaries when available.
- **Task routing**: per-task model config: `classify/extract`, `summarize`, `embed`, `answer`. Cheap models by default; only `answer` defaults to a strong model.
- **Embeddings** need a provider that offers them (OpenAI, Gemini, Ollama, OpenRouter). Anthropic has no embeddings endpoint, so an Anthropic-only user needs a second provider for search. See open questions.
- **Cost controls**: pre-call estimate from token counts, monthly/daily caps, a per-document "skip AI" option, and a usage dashboard.
- **Wallet** (OpenCredits or similar): sits behind the same `Provider` interface as one more adapter. Needs a spike on their API before committing.
- **Keys**: stored in `chrome.storage.local` (never `sync`), with optional passphrase encryption through WebCrypto. Every outbound call is logged so the user can see exactly what left the machine.

### Where the AI comes from (decided)
- **Shippable:** the user's own API keys (OpenAI, Anthropic, Gemini, OpenRouter), local Ollama, Chrome built-in AI (Gemini Nano), and later the OpenCredits wallet.
- **Development only:** the Claude dev bridge (`tools/claude-bridge`), which runs prompts through the developer's local Claude Code. It's excluded from production builds.
- **Not allowed without approval:** powering product features with a user's Claude subscription ("Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products", from the Agent SDK docs). The same caution applies to Gemini CLI logins until Google's terms are checked.
- **Allowed:** the user's own Claude Code (or any MCP client) connecting *to us* over MCP to read their library. That's Phase 6.

### Safety: prompt injection
Captured pages are untrusted input to every LLM call: insights, graph extraction, Ask, and MCP.
- Wrap source text in delimiters with a fixed system instruction.
- Validate structured outputs against JSON schemas.
- Graph relations are kept only if their evidence quote appears verbatim in the chunk. This also enforces the PDD's "grounded, not invented" rule.
- Ask never executes actions. It only reads and cites.

## 3. Phases

Each phase ends with a usable extension.

### Phase 0: Teardown & foundation ✅ done

Decisions taken: WXT + Svelte 5 + TypeScript. Provider metadata (`catalog.ts`) is split from adapters so pages don't bundle SDKs. `alarms` is deferred to Phase 2, when the job queue needs it.

1. Delete WebLLM: the offscreen document, `webllm-*.js`, `web-llm.js`, `debug-models.html`, the dependency, and the chunk/summary widget cards. Remove the `offscreen` permission.
2. Untrack `node_modules/` and the committed bundles. Delete the stale docs.
3. Toolchain: move to **WXT** (Vite-based MV3 framework with HMR and first-class side panel/popup/options entries) and **Svelte 5**. Alternative: keep `build.mjs` and add entries by hand.
4. Typed RPC between content ↔ SW ↔ pages, replacing the ad-hoc `MESSAGE_TYPES`.
5. Dexie schema plus migrations, and a settings store.
6. Provider settings UI (BYOK). Add a "Test connection" button for each provider.

**Done when:** the extension builds, has no WebLLM code, and a provider key can be added and tested.

### Claude dev bridge ✅ done
Native-messaging bridge to the local Claude Code CLI for testing (`tools/claude-bridge`). No tools, no MCP servers and no settings files per call; fixed dev extension ID; dev builds only. Adds the general `complete()` provider method that later phases use.

### Phase 1: Capture + Library (MVP core) ✅ done

As built: saving uses `activeTab` (one-time access from a click, shortcut or menu) instead of access to all sites; auto-capture requests access per site and registers its script at runtime. Duplicates of the same URL update in place.

- One-click save: the toolbar action, `Cmd/Ctrl+Shift+S`, and the context menu all save the page. Saving a selection creates a highlight.
- Extraction: `@mozilla/readability` + Turndown → markdown, plus metadata (OG/JSON-LD/meta tags) and URL canonicalisation.
- Dedup: canonical URL match, then contentHash, then simhash near-dup ("already saved, update?").
- Capture rules: domain allow/deny lists, a built-in sensitive denylist (banking, mail, health, auth pages), never in incognito, plus a per-site pause.
- Auto-capture (opt-in per domain): save after reading-time/scroll heuristics.
- Library page: list/grid, filters (type, domain, tag, date), document view with markdown and source link, editable notes and tags, MiniSearch full-text search.
- Export/import: JSON (lossless) and a Markdown folder zip (Obsidian-friendly).

**Done when:** browsing builds a searchable library with zero AI configured.

### Phase 2: Background AI understanding ✅ done

As built: jobs for tasks without a configured model wait silently (they don't show as pending). The daily limit counts background calls. Auto-tags are applied only to untagged documents.

- Job queue persisted in IDB that resumes after the SW restarts. Concurrency and rate limits per provider.
- `complete()` for every provider (OpenAI-compatible, Anthropic, Gemini, Chrome AI), with structured output, plus per-task model settings and usage logging.
- One structured-output call per document → `insights` (TLDR, takeaways, facts/figures, topics, entities, terms). Long documents use map-reduce over chunks (`src/lib/text/chunking.ts`).
- Auto-tagging from topics. Users can override tags.
- An unobtrusive processing indicator (badge + side panel status). Cost estimate before bulk backfill.

### Phase 3: Semantic search + Ask ✅ done

As built: embeddings come from a provider (OpenAI, Gemini, Ollama); without one, search and Ask fall back to keyword retrieval. Scope is whole library or a tag (projects arrive in Phase 4).

- Chunking with char-offset anchors, then embeddings (embedding job type).
- Hybrid search: BM25 (MiniSearch) + vector, fused with reciprocal rank fusion. Results show the document, the matching passage with highlight, a relevance indicator, and the source link.
- **Ask**: retrieve → answer with inline citations `[n]` → each citation opens the exact passage. Sourced statements and model inference are visually separated (the prompt asks for tagged output, which is validated). Context can be scoped to selected documents, a project, or a tag. Follow-ups reuse thread retrieval.

### Phase 4: Side panel resurfacing + Projects
- On tab change (non-excluded domains only), match page title, metadata and lead text against FTS and entities locally first. Embedding the page is opt-in because it costs money and sends data out. A badge count shows matches; the side panel lists related documents, highlights and notes.
- Controls: off / badge-only / auto-open, per domain.
- Projects: create, auto-suggest association (embedding similarity to the project description and its documents), manual add/remove, a project page with docs, entities, notes/decisions and open questions. Ask can be scoped to a project.

### Phase 5: Knowledge graph
- Entity/relation extraction in the Phase 2 call (or a follow-up job), each with an evidence quote. Entity resolution uses normalised name, aliases, then embedding similarity, with user merge/split.
- Research view: graph (sigma.js or cytoscape) filtered by type, topic or project. Clicking a node shows its mentions → source passages. A "Bridges" view lists documents connected only through shared entities (the discovery feature).

### Phase 6: Universal AI integration + Wallet
- MCP: a small companion package (`npx …`) that registers a Chrome **native messaging host** and exposes a stdio MCP server with tools `search`, `get_document`, `list_projects` and `ask_context`, served from the extension's IDB. This works with Claude Desktop/Code and other local MCP clients. It's the Pencil model: the user's AI calls us, and we never use their AI login. Brand it as "works with Claude Code", never as Claude Code.
- Hosted ChatGPT/Claude connectors need a remote MCP endpoint, which conflicts with local-first. Deferred until optional sync exists.
- OpenCredits wallet adapter (after the spike).

### Phase 7: Format coverage & polish
- GitHub repos (README + metadata via the API), PDFs (pdf.js on the fetched URL; content scripts can't read Chrome's PDF viewer), YouTube (transcripts), docs-site heuristics.
- Backup/restore, onboarding rewrite, performance pass on large libraries.

## 4. Permissions
- **Now (Phase 0):** `storage`, `unlimitedStorage`, and per-provider optional host permissions that are requested when a provider is tested and removed when it's turned off.
- **Later:** `contextMenus`, `scripting`, `activeTab` and an `<all_urls>` content script (Phase 1 capture), `alarms` (Phase 2 job queue), `sidePanel` (Phase 4).

## 5. Key risks
- **MV3 service worker lifetime**: long jobs must checkpoint to IDB and resume through `chrome.alarms`.
- **Embedding lock-in**: switching embedding models means re-embedding everything. Show the cost and do it in the background.
- **Cost surprises**: the bulk backfill and resurfacing paths must be gated by estimates and caps.
- **Prompt injection** from captured pages (see §2).
- **Scope**: the PDD is large. Phases 0–3 are the real product; 4–7 are differentiation.

## 6. Open questions
1. ~~Toolchain~~: decided, WXT + Svelte 5 + TypeScript.
2. Embeddings: always via a provider, or allow one tiny local embedding model (~25 MB, no LLM) so search works offline and for free?
3. ~~Product name~~: decided, Crumbs (Carrel was already taken in the Chrome Web Store).
4. OpenCredits: is there API documentation or a contact? It blocks the wallet adapter only.
5. MVP cut: ship Phases 0–3 as v1?
