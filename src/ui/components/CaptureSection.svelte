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

<section>
  <h2 class="section-title">Capture</h2>
  <p class="muted small intro">
    Pages are only saved when you ask, or on sites you turn auto-capture on for. Incognito windows are never saved.
  </p>
  {#if settings.value}
    <div class="panel group">
      <div class="name">Auto-capture</div>
      <div class="muted small">On these sites, pages are saved automatically once you've spent time reading them.</div>
      <ul>
        {#each settings.value.autoCaptureSites as site (site)}
          <li><span>{site}</span><button class="link-button" onclick={() => removeAuto(site)}>Remove</button></li>
        {/each}
      </ul>
      <form class="add" onsubmit={(e) => (e.preventDefault(), addAuto())}>
        <input class="input" placeholder="e.g. developer.mozilla.org" bind:value={autoDraft} />
        <button class="btn">Add site</button>
      </form>
      {#if error}<p class="error-text small">{error}</p>{/if}
    </div>

    <div class="panel group">
      <div class="name">Never save</div>
      <div class="muted small">Pages from these sites are never saved, even when you click save.</div>
      <ul>
        {#each settings.value.blockedSites as site (site)}
          <li>
            <span>{site}</span>
            <button class="link-button" onclick={() => save({ blockedSites: settings.value!.blockedSites.filter((s) => s !== site) })}>
              Remove
            </button>
          </li>
        {/each}
      </ul>
      <form class="add" onsubmit={(e) => (e.preventDefault(), addBlocked())}>
        <input class="input" placeholder="e.g. example.com" bind:value={blockDraft} />
        <button class="btn">Block site</button>
      </form>
    </div>
  {/if}
</section>

<style>
  .intro {
    margin: 0 0 var(--space-3);
  }
  .group {
    display: grid;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }
  .name {
    font-weight: 600;
  }
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: var(--space-1);
  }
  li {
    display: flex;
    justify-content: space-between;
  }
  .add {
    display: flex;
    gap: var(--space-2);
  }
  p {
    margin: 0;
  }
</style>
