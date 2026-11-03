<script lang="ts">
  let { title, description }: { title: string; description: string } = $props();
</script>

<h1>{title}</h1>
<p class="empty">{description} Not available yet.</p>

<style>
  h1 {
    font-size: 22px;
    margin: 0 0 var(--space-2);
  }
  .empty {
    color: var(--color-text-2);
  }
</style>
