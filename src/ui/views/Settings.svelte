<script lang="ts">
  import { PROVIDER_KINDS } from '@/lib/providers/catalog';
  import ActivitySection from '@/ui/components/ActivitySection.svelte';
  import CaptureSection from '@/ui/components/CaptureSection.svelte';
  import DataSection from '@/ui/components/DataSection.svelte';
  import ModelsSection from '@/ui/components/ModelsSection.svelte';
  import ProviderRow from '@/ui/components/ProviderRow.svelte';
  import SettingsGroup from '@/ui/kit/SettingsGroup.svelte';
</script>

<div class="settings">
  <div class="column">
    <h1 class="page-title">Settings</h1>
    <SettingsGroup
      title="AI providers"
      description="Bring your own API key. Keys stay in this browser and are only sent to the provider they belong to."
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
  .column {
    display: grid;
    gap: 32px;
    max-width: 680px;
    margin: 0 auto;
  }
</style>
