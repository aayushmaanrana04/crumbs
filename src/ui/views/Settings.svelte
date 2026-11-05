<script lang="ts">
  import { PROVIDER_KINDS } from '@/lib/providers/catalog';
  import ActivitySection from '@/ui/components/ActivitySection.svelte';
  import CaptureSection from '@/ui/components/CaptureSection.svelte';
  import DataSection from '@/ui/components/DataSection.svelte';
  import ModelsSection from '@/ui/components/ModelsSection.svelte';
  import ProviderRow from '@/ui/components/ProviderRow.svelte';
  import { db } from '@/lib/db/schema';
  import SettingsGroup from '@/ui/kit/SettingsGroup.svelte';
  import { live } from '@/ui/live.svelte';

  const pages = live(() => db.documents.count(), 1);
</script>

<div class="settings">
  <div class="column">
    <h1 class="page-title">Settings</h1>
    {#if pages.value === 0}
      <!-- First run: install opens this page. -->
      <p class="intro">
        Crumbs saves the pages you choose into this browser, and uses an AI provider you connect to summarise them and answer
        your questions. Connect one below to start.
      </p>
    {/if}
    <SettingsGroup
      title="AI providers"
      description="Pages you save or ask about are sent to the provider you choose, to summarise and answer. Keys stay in this browser; there is no Crumbs server."
    >
      {#each PROVIDER_KINDS as kind (kind)}<ProviderRow {kind} />{/each}
    </SettingsGroup>
    <ModelsSection />
    <CaptureSection />
    <DataSection />
    <ActivitySection />
  </div>
</div>

<style>
  .settings {
    height: 100%;
    overflow-y: auto;
    padding: 24px 28px 56px;
    background: var(--canvas);
  }
  .intro {
    margin: -16px 0 0;
    font-size: var(--text-base);
    line-height: 1.55;
    color: var(--text-2);
  }
  .column {
    display: grid;
    gap: 32px;
    max-width: 680px;
    margin: 0 auto;
  }
</style>
