# Crumbs privacy policy

_Effective 5 November 2026_

Crumbs is a browser extension that saves the pages you read and summarises them with an AI
provider you choose. It has no servers and no accounts, and the developer never receives your
data. This policy explains what Crumbs stores, what leaves your device, and when.

## What Crumbs stores, and where

Everything Crumbs keeps is stored in your browser on your device:

- **Pages you save:** their text, title, address and the date you saved them.
- **What you add:** highlights, notes, tags and projects.
- **What Crumbs makes from your pages:** summaries, and search data (including embeddings, if you turn on meaning-based search).
- **Your settings and the API keys you enter.** Keys are kept in the extension's local storage on this device.
- **A local log of AI requests:** the time, task, provider and model of each request, how many tokens it used, and whether it worked. This drives the daily usage limit and the activity list in Settings.

None of this is synced or backed up anywhere unless you export it yourself.

## What leaves your device

Crumbs only sends data to the **AI provider you choose** (for example OpenAI, Anthropic, Google
Gemini or OpenRouter), using **your own API key**, and only for these tasks:

- **Summaries:** when a page is saved and summaries are on, its text, title and address are sent to your summary model.
- **Ask:** your question and the most relevant passages from your saved pages are sent to your Ask model. When you ask from the side panel, the opening text of the page you're on is included too.
- **Meaning-based search** (optional): the text of saved pages, and your search queries, are sent to your embedding model.

The provider handles that data under its own privacy policy and terms. When you use OpenRouter,
Crumbs asks it to use only model providers that don't keep or train on your data.

If you choose a provider that runs on your own computer (Ollama), nothing leaves your device for
these tasks.

Crumbs doesn't contact a provider until you set it up in Settings, and you can turn each task off
there. You can also cap the number of background AI requests per day.

**Images in saved pages** are not copied into Crumbs. When you open a saved page in Crumbs, its
images load from the website that hosts them, as they would on the original page.

## What Crumbs reads without saving

- **Side panel:** when you open it, Crumbs reads the current page on your device to show related pages from your library. Nothing is sent or stored unless you save the page or ask about it.
- **Follow my browsing** (off by default): Chrome asks your permission before this turns on. As you switch tabs, Crumbs reads the address and title of the tab you're on and matches them against your library on your device. They are not stored or sent anywhere.
- **Auto-capture** (off by default, turned on site by site): on sites you choose, Crumbs saves a page once you've had it open for a while and scrolled through it.

## What Crumbs never does

- It never sends your data to the developer, or to anyone other than the AI provider you chose.
- It has no analytics, tracking, advertising or crash reporting.
- It never sells or shares your data, or uses it for anything other than the features described here.
- It never reads pages in incognito windows, and doesn't save browser pages (such as `chrome://`) or sites you've blocked.

## Permissions

Crumbs asks for site access only when it needs it:

- **The current page:** access is granted when you save it.
- **AI provider sites:** when you set up that provider.
- **Individual sites:** when you turn on auto-capture or let the side panel read them.

## Your control over your data

- **Export:** Settings → Data → Export gives you a full copy of your library.
- **Delete:** delete a single page from its page view, or use Settings → Data → Delete everything to remove all saved pages, summaries, highlights and notes.
- **Remove Crumbs:** uninstalling removes all of its data from your browser.

Data already sent to an AI provider is covered by that provider's own retention policy.

## Children

Crumbs is not directed at children under 13.

## Changes

If this policy changes, the new version will be posted at this address with a new effective date,
and the change will be noted in the release notes.

## Contact

Questions about privacy: [aayushmaanrana04@gmail.com](mailto:aayushmaanrana04@gmail.com)
