<script lang="ts">
  import { PROVIDER_KINDS } from '@/lib/providers/catalog';
  import ActivitySection from '@/ui/components/ActivitySection.svelte';
  import CaptureSection from '@/ui/components/CaptureSection.svelte';
  import DataSection from '@/ui/components/DataSection.svelte';
  import ModelsSection from '@/ui/components/ModelsSection.svelte';
  import ProviderCard from '@/ui/components/ProviderCard.svelte';
</script>

<h1 class="page-title">Settings</h1>

<section>
  <h2 class="section-title">AI providers</h2>
  <p class="muted small intro">
    Bring your own API key. Keys are stored only in this browser and sent only to the provider they belong to.
  </p>
  <div class="cards">
    {#each PROVIDER_KINDS as kind (kind)}
      <ProviderCard {kind} />
    {/each}
  </div>
</section>

<ModelsSection />
<CaptureSection />
<DataSection />
<ActivitySection />

<style>
  .intro {
    margin: 0 0 var(--space-3);
  }
  .cards {
    display: grid;
    gap: var(--space-3);
  }
  :global(.content > section),
  section {
    margin-bottom: var(--space-8);
  }
</style>
