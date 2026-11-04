import { defineConfig } from 'wxt';
import { DEV_EXTENSION_ID, DEV_EXTENSION_KEY } from './src/lib/dev-extension-key';
import { PROVIDER_ORIGINS } from './src/lib/providers/origins';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: ({ mode }) => {
    const dev = mode === 'development';
    return {
      name: 'Carrel',
      description: 'Your personal knowledge, built while you browse.',
      // nativeMessaging is only for the Claude dev bridge and never ships.
      permissions: [
        'storage',
        'unlimitedStorage',
        // Saving uses one-time access to the current tab (activeTab), not access to every site.
        'activeTab',
        'scripting',
        'contextMenus',
        'alarms',
        'sidePanel',
        // "Connect OpenRouter": the sign-in window that hands back to the extension.
        'identity',
        ...(dev ? ['nativeMessaging'] : []),
      ],
      // Follow mode only: lets the side panel see the active tab's address and title as you switch tabs.
      optional_permissions: ['tabs'],
      // The toolbar button opens the side panel (set in the background).
      action: { default_title: 'Open Carrel' },
      // Requested at runtime: provider hosts when a provider is tested, and
      // individual sites when the user turns on auto-capture for them.
      optional_host_permissions: [...PROVIDER_ORIGINS, 'https://*/*', 'http://*/*'],
      commands: {
        'save-page': {
          suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
          description: 'Save this page to Carrel',
        },
      },
      // Fixed ID in development so the dev bridge can allow-list it.
      ...(dev ? { key: DEV_EXTENSION_KEY } : {}),
    };
  },
  webExt: {
    // Persistent dev profile: keeps settings between runs and lets Chrome find the dev bridge.
    chromiumProfile: '.chrome-profile',
    keepProfileChanges: true,
    startUrls: [`chrome-extension://${DEV_EXTENSION_ID}/app.html#/settings`],
  },
});
