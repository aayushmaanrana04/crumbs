# Chrome Web Store listing

Copy for the store dashboard. Keep the data-use answers in step with [PRIVACY.md](../PRIVACY.md).

## Store listing tab

**Name:** Crumbs

**Summary** (132 characters max; this is 120):

> Save pages you read. Get cited summaries from the AI you choose, then search and ask across everything, in your browser.

**Category:** Productivity → Workflow & Planning

**Language:** English

**Description:**

> Crumbs saves the pages you read and turns them into a library you can search and ask questions of.
>
> Save any page with ⌘⇧S (Ctrl+Shift+S), the right-click menu or the side panel. Crumbs keeps a clean copy of the text and summarises it with the AI provider you choose:
>
> • A one-line gist and key points, each linked to the sentence on the page it comes from, so you can check it.
> • Steps, tables and code kept exactly as the page has them.
> • Tags added for you, and pages you've read before shown when they're related.
>
> Search your library by keyword, or by meaning with an embedding model. Ask a question and get an answer with sources from your own pages. Group pages into projects with notes and open questions.
>
> The side panel shows a page's summary while you read it, and what else you've saved on the subject.
>
> Private by design
> • Everything is stored in your browser. There is no Crumbs account or server.
> • Pages go only to the AI provider you pick, using your own key or your OpenRouter account. With Ollama, nothing leaves your computer.
> • No analytics or tracking. Export or delete everything at any time.
>
> Works with OpenRouter (sign in, no key to copy), OpenAI, Anthropic, Google Gemini and Ollama. You pay your provider directly; summaries with the default model cost a fraction of a cent per page.

**Support:** aayushmaanrana04@gmail.com, or https://github.com/aayushmaanrana04/crumbs/issues

**Graphics** (in this folder):

| Asset | File |
| --- | --- |
| Icon, 128×128 | `public/icon/128.png` |
| Small promo tile, 440×280 | `promo-tile-440x280.png` |
| Screenshot 1: library | `1-library.png` |
| Screenshot 2: summary with a citation open | `2-summary-citation.png` |
| Screenshot 3: side panel beside a page | `3-side-panel.png` |
| Screenshot 4: settings, AI providers | `4-settings.png` |

The screenshots show real public articles (Uber, Sunny Dubey, Aravindh's blog, BentoML). Screenshot 3
shows the Uber blog page, including its header image. Swap in pages you're comfortable showing before
publishing.

## Privacy practices tab

**Single purpose:**

> Save web pages the user reads, and summarise, search and answer questions about them with an AI provider the user chooses.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| `storage` | Settings and the user's AI provider keys. |
| `unlimitedStorage` | The user's saved pages and summaries live in IndexedDB and can exceed the default quota. |
| `activeTab` | Read the current page when the user saves it (toolbar, shortcut or menu). |
| `scripting` | Inject the script that extracts the page's readable text when the user saves it, and show the save confirmation in the page. |
| `contextMenus` | "Save page to Crumbs" and "Save highlight to Crumbs" in the right-click menu. |
| `alarms` | Resume queued summaries after the browser restarts. |
| `sidePanel` | The side panel showing the current page's summary and related pages. |
| `identity` | "Connect OpenRouter": the OAuth sign-in window that returns the user's key to the extension. |
| `tabs` (optional) | Only for the opt-in "Follow my browsing" mode: read the active tab's address and title to update the side panel. Matched locally, never stored or sent. |
| Host permissions (optional) | Requested at runtime, one origin at a time: the AI provider's API when the user sets it up, and individual websites when the user turns on auto-capture for that site or lets the side panel read it. Never requested in bulk. |

**Remote code:** No, I am not using remote code. All code is bundled in the package.

**Data usage**, tick:

- **Website content**: page text is sent to the user's chosen AI provider to summarise it and answer questions.
- **Web history**: page addresses and titles are included with page text sent to the AI provider.
- **Authentication information**: the user's API key is sent to the provider it belongs to.

Leave everything else unticked. Then certify all three:

- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://github.com/aayushmaanrana04/crumbs/blob/main/PRIVACY.md
