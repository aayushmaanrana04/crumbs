# Pre-release checklist

For the first Chrome Web Store release of Crumbs. Anything marked **blocker** must be done before
submitting. Items marked **you** need your accounts, real API keys or a decision.

## 1. Build and package

- [x] Version set to `1.0.0` in `package.json` and the lockfile.
- [ ] **blocker, you** Tag the release commit (`git tag v1.0.0`) once the blockers below are cleared.
- [x] `npm ci`, `npm run check`, `npm test` and `npm run build` pass on a clean clone.
- [x] `npm run zip` produces `.output/crumbs-1.0.0-chrome.zip` (438 kB).
- [x] The production manifest has no dev-only parts: no `key`, no `nativeMessaging`, and no Claude dev bridge.
- [x] No remote code: no `eval` or `new Function`, and no scripts loaded from elsewhere.
- [x] No source maps or debug logging in the production bundle.
- [ ] **you** Commit or discard the pending change to `design/summaryse.pen` (made by pen.dev, not by code changes).

## 2. Store listing and policy

All copy for the dashboard is in [`store/listing.md`](store/listing.md).

- [x] Privacy policy: [`PRIVACY.md`](PRIVACY.md), to be linked as https://github.com/aayushmaanrana04/crumbs/blob/main/PRIVACY.md once pushed.
- [x] Contact email: `aayushmaanrana04@gmail.com` in PRIVACY.md and the listing.
- [ ] **blocker, you** Enter the privacy practices answers in the dashboard. Single purpose, permission justifications, remote code, data use and the three certifications are written out in `store/listing.md`.
- [x] Listing text: a 120-character summary, the description, the category and support contacts.
- [x] Listing assets in `store/`:
  - Four 1280×800 screenshots: library, summary with a citation, side panel beside a page, settings.
  - The 440×280 promo tile.
- [ ] **you** Replace or approve the screenshot content. The screenshots show real public articles, and screenshot 3 includes the Uber blog's header image.
- [x] Name: renamed from Carrel to Crumbs, because [Carrel — Notion Web Clipper](https://chromewebstore.google.com/detail/carrel-—-notion-web-clipp/oabnehggdbfebcgfnkilhmocccpknghg) is already in the Chrome Web Store. No extension or read-later app called Crumbs turned up.
- [ ] **you** Run a USPTO trademark search for "Crumbs" in software (class 9 and 42).
- [ ] **you** Choose a license. `package.json` says ISC, and the public repo has no LICENSE file.

## 3. AI providers and models

- [x] Every recommended OpenRouter model ID exists in the live `/models` and `/embeddings/models` lists, and the chat models support structured output.
- [x] Anthropic used directly now defaults to Claude Haiku 5.5 for summaries (it was Opus 5.5), with Sonnet 5.5 and Haiku 5.5 recommended for Ask. The fallback beta header matches the API docs.
- [x] OpenAI and Gemini have no preset model; the user picks one from the provider's list.
- [x] Model names read well for OpenRouter models ("Haiku 5.5", not "anthropic/claude-haiku-5.5").
- [x] Error messages for 401/403, 402 and 429 are specific. Other errors show the provider's own message.
- [x] Daily cap on background calls: 300 by default, shown in the library, the panel and Settings.
- [ ] **blocker, you** Test OpenRouter sign-in with the store-assigned extension ID (upload as unlisted or to trusted testers first). Test the paste-a-code fallback too.
- [ ] **you** Test each provider end to end with a real key: Test, a summary, Ask, and embeddings where supported.
- [ ] **you** Run the summary eval on a fresh set of pages (`CRUMBS_EVAL_IN=… npx vitest run tools/eval`).

## 4. Functional pass

Checked in a test browser during this release work:

- [x] Saving from the side panel and from the background, the toast and its View button, duplicates, and pages that declare a canonical URL.
- [x] Side panel: unsaved and saved states, the full summary, live updates, related pages, the follow prompt and "Not now", and the ⋯ menu.
- [x] Light and dark, and side panel widths 320 and 600px. Fixed: wide tables pushed the panel past its edge.
- [x] No unlabelled buttons or fields in the panel, library or settings. Fixed: the daily limit field.

Covered by tests:

- [x] Export and import, importing a backup from before the rename, and "Delete everything".
- [x] Upgrading a version 1 database to the current one without losing pages or projects.

Still to do by hand in a fresh profile with the release zip:

- [ ] **you** First install: the settings page and intro, and no AI calls before a model is chosen.
- [ ] **you** ⌘⇧S and the context menu (page and highlight) on a real site.
- [ ] **you** PDFs, `chrome://` pages, the Web Store, incognito and blocked sites show clear messages.
- [ ] **you** Auto-capture on one site, then off.
- [ ] **you** Library keyboard navigation, projects, and retrying a failed summary.
- [ ] **you** Ask with and without embeddings.

## 5. Performance

- [x] 1,000 pages (8,000 passages): building the search index takes 0.85s on first use, then searches take 30–215ms and side panel matching about 17ms.
- [x] Pages above 60k tokens are summarised in three parts and merged, and the citation still finds text at the end of the page (test added).
- [ ] **you** Storage use with embeddings on, for a real library.

## 6. Housekeeping

- [x] Deleted the local copies of your library used for the audit, and the test browser profiles.
- [x] README describes the summaries and side panel as they are now, and links the privacy policy.
- [x] [`CHANGELOG.md`](CHANGELOG.md) for 1.0.0.
- [ ] **you** Decide whether `PLAN.md` and `DESIGN_SYSTEM.md` stay in the public repo.
- [ ] **you** Publish to trusted testers or as unlisted first, then go public after a few days without issues.
