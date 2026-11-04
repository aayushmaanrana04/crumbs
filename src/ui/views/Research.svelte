<script lang="ts">
  import Waypoints from '@lucide/svelte/icons/waypoints';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
</script>

<div class="research">
  <h1 class="page-title">Research</h1>
  <EmptyState title="Projects and connections are coming">
    {#snippet icon()}<Waypoints size={18} />{/snippet}
    Group pages into projects and explore how the people, tools and ideas you've saved connect.
  </EmptyState>
</div>

<style>
  .research {
    display: grid;
    gap: 16px;
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 28px;
  }
</style>
