<script lang="ts">
  import { browser } from '#imports';
  import {
    captureSettings,
    isSensitiveSite,
    normalizeSite,
    sitePatterns,
    type CaptureSettings,
  } from '@/lib/settings/capture';
  import { stored } from '@/ui/storage.svelte';
  import X from '@lucide/svelte/icons/x';
  import Button from '@/ui/kit/Button.svelte';
  import Input from '@/ui/kit/Input.svelte';
  import SettingsGroup from '@/ui/kit/SettingsGroup.svelte';
  import SettingsRow from '@/ui/kit/SettingsRow.svelte';

  const settings = stored(captureSettings);
  let blockDraft = $state('');
  let autoDraft = $state('');
  let error = $state('');

  async function save(change: Partial<CaptureSettings>) {
    await captureSettings.setValue({ ...(await captureSettings.getValue()), ...change });
  }

  async function addBlocked() {
    const site = normalizeSite(blockDraft);
    blockDraft = '';
    const current = await captureSettings.getValue();
    if (site && !current.blockedSites.includes(site)) {
      await save({ blockedSites: [...current.blockedSites, site], autoCaptureSites: current.autoCaptureSites.filter((s) => s !== site) });
    }
  }

  async function addAuto() {
    error = '';
    const site = normalizeSite(autoDraft);
    if (!site) return;
    if (isSensitiveSite(site)) {
      error = `${site} looks like a sensitive site (mail, banking, health or login), so it can't be auto-captured.`;
      return;
    }
    // Ask for access to just this site, while the click still counts as a user gesture.
    const granted = await browser.permissions.request({ origins: sitePatterns(site) });
    if (!granted) {
      error = `Access to ${site} was declined.`;
      return;
    }
    autoDraft = '';
    const current = await captureSettings.getValue();
    if (!current.autoCaptureSites.includes(site)) await save({ autoCaptureSites: [...current.autoCaptureSites, site] });
  }

  async function removeAuto(site: string) {
    const current = await captureSettings.getValue();
    await save({ autoCaptureSites: current.autoCaptureSites.filter((s) => s !== site) });
    await browser.permissions.remove({ origins: sitePatterns(site) });
  }
</script>

<SettingsGroup
  title="Capture"
  description="Pages are saved only when you ask, or on sites you turn auto-capture on for. Incognito windows are never saved."
>
  {#if settings.value}
    <SettingsRow title="Auto-capture" detail="Save pages automatically once you've spent time reading them. They're summarised like any page you save.">
      {#if settings.value.autoCaptureSites.length}
        <ul class="sites">
          {#each settings.value.autoCaptureSites as site (site)}
            <li><span>{site}</span><button type="button" aria-label="Remove {site}" onclick={() => removeAuto(site)}><X size={14} /></button></li>
          {/each}
        </ul>
      {/if}
      <form class="add" onsubmit={(e) => (e.preventDefault(), addAuto())}>
        <Input placeholder="e.g. developer.mozilla.org" bind:value={autoDraft} />
        <Button type="submit">Add site</Button>
      </form>
      {#if error}<span class="error-text small">{error}</span>{/if}
    </SettingsRow>
    <SettingsRow title="Never save" detail="Pages from these sites are never saved, even when you click save.">
      {#if settings.value.blockedSites.length}
        <ul class="sites">
          {#each settings.value.blockedSites as site (site)}
            <li>
              <span>{site}</span>
              <button type="button" aria-label="Remove {site}" onclick={() => save({ blockedSites: settings.value!.blockedSites.filter((s) => s !== site) })}><X size={14} /></button>
            </li>
          {/each}
        </ul>
      {/if}
      <form class="add" onsubmit={(e) => (e.preventDefault(), addBlocked())}>
        <Input placeholder="e.g. example.com" bind:value={blockDraft} />
        <Button type="submit">Block site</Button>
      </form>
    </SettingsRow>
  {/if}
</SettingsGroup>

<style>
  .sites {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px 6px 12px;
    border-radius: var(--r-sm);
    background: var(--surface);
    font-size: var(--text-md);
  }
  li button {
    display: inline-flex;
    padding: 4px;
    border: none;
    border-radius: var(--r-xs);
    background: none;
    color: var(--text-3);
    cursor: pointer;
  }
  li button:hover {
    background: var(--hover);
    color: var(--text);
  }
  .add {
    display: flex;
    gap: 8px;
  }
</style>
