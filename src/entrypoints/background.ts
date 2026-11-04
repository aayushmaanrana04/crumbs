import { browser, defineBackground } from '#imports';
import {
  activeJobTypes,
  drainQueue,
  recoverInterruptedJobs,
  retryFailedJobs,
  updateBadge,
} from '@/lib/ai/queue';
import { outdatedInsightDocIds } from '@/lib/ai/insights';
import { embedTexts, runTask } from '@/lib/ai/run';
import { captureTab, describeOutcome, showToast, syncAutoCaptureScripts } from '@/lib/capture/tab';
import { db, getLibraryStats } from '@/lib/db/schema';
import { enqueueJobs } from '@/lib/library/jobs';
import { PROVIDER_INFO } from '@/lib/providers/catalog';
import { BACKGROUND_ADAPTERS } from '@/lib/providers/registry';
import type { ProviderKind } from '@/lib/providers/types';
import { serveRpc } from '@/lib/rpc/server';
import { captureSettings } from '@/lib/settings/capture';
import { getProviderConfig, providerSettings } from '@/lib/settings/providers';
import { embeddingSpace, taskSettings } from '@/lib/settings/tasks';

function backgroundAdapter(kind: ProviderKind) {
  const adapter = BACKGROUND_ADAPTERS[kind];
  if (!adapter) throw new Error(`${PROVIDER_INFO[kind].label} isn't available from the background.`);
  return adapter;
}

/** Save a tab from a user action (menu, shortcut, popup) and confirm in the page. */
async function saveFromUserAction(tabId: number, selection?: string) {
  try {
    const outcome = await captureTab(tabId, 'manual', selection);
    await showToast(tabId, describeOutcome(outcome));
    void drainQueue();
    return outcome;
  } catch (error) {
    await showToast(tabId, error instanceof Error ? error.message : String(error), true);
    throw error;
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    await browser.contextMenus.removeAll();
    browser.contextMenus.create({ id: 'save-page', title: 'Save page to Summaryse', contexts: ['page'] });
    browser.contextMenus.create({ id: 'save-selection', title: 'Save highlight to Summaryse', contexts: ['selection'] });
    if (reason === 'install') {
      await browser.tabs.create({ url: browser.runtime.getURL('/app.html#/settings') });
    }
    await syncAutoCaptureScripts();
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (tab?.id === undefined) return;
    const selection = info.menuItemId === 'save-selection' ? info.selectionText : undefined;
    saveFromUserAction(tab.id, selection).catch(() => undefined);
  });

  browser.commands.onCommand.addListener((command, tab) => {
    if (command === 'save-page' && tab?.id !== undefined) saveFromUserAction(tab.id).catch(() => undefined);
  });

  // Background processing: resume after restarts and re-check every minute.
  browser.alarms.create('jobs', { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'jobs') void drainQueue();
  });
  void recoverInterruptedJobs()
    .then(async () => {
      // Summaries from an older format are regenerated in the background (jobs wait if no model is set).
      for (const docId of await outdatedInsightDocIds()) await enqueueJobs(docId, ['insights']);
    })
    .then(drainQueue);

  providerSettings.watch(() => void updateBadge().then(drainQueue));
  taskSettings.watch(async (next, previous) => {
    if (previous && embeddingSpace(next.embed) !== embeddingSpace(previous.embed) && next.embed.provider) {
      // New embedding model: every document needs vectors in the new space.
      for (const docId of await db.documents.toCollection().primaryKeys()) await enqueueJobs(docId, ['embed']);
    }
    await updateBadge();
    void drainQueue();
  });
  captureSettings.watch(() => void syncAutoCaptureScripts());
  browser.permissions.onRemoved.addListener(() => void syncAutoCaptureScripts());

  serveRpc({
    async 'providers.listModels'({ kind }) {
      return backgroundAdapter(kind).listModels(await getProviderConfig(kind));
    },
    async 'ai.complete'({ kind, request }) {
      const adapter = backgroundAdapter(kind);
      if (!adapter.complete) throw new Error(`${adapter.info.label} can't run prompts.`);
      return adapter.complete(await getProviderConfig(kind), request);
    },
    async 'ai.runTask'({ task, request }) {
      return runTask(task, request);
    },
    async 'ai.embedQuery'({ text }) {
      const { space, vectors } = await embedTexts([text]);
      return { space, vector: vectors[0]! };
    },
    async 'capture.activeTab'() {
      const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab?.id === undefined) throw new Error('No active tab.');
      return saveFromUserAction(tab.id);
    },
    async 'capture.tab'({ tabId }) {
      return saveFromUserAction(tabId);
    },
    async 'capture.auto'(_args, sender) {
      if (sender.tab?.id === undefined) return null;
      const outcome = await captureTab(sender.tab.id, 'auto');
      if (outcome.status === 'saved') await showToast(sender.tab.id, 'Saved automatically to Summaryse');
      void drainQueue();
      return outcome;
    },
    async 'jobs.run'() {
      void drainQueue();
    },
    async 'jobs.retryFailed'() {
      const count = await retryFailedJobs();
      void drainQueue();
      return count;
    },
    async 'jobs.reprocess'({ docId }) {
      await enqueueJobs(docId, ['insights', 'embed']);
      await updateBadge();
      void drainQueue();
    },
    async 'library.stats'() {
      return getLibraryStats(await activeJobTypes());
    },
  });
});
