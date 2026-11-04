<script lang="ts">
  let { size = 12 }: { size?: number } = $props();
</script>

<span class="spinner" style:width="{size}px" style:height="{size}px" aria-hidden="true"></span>

<style>
  .spinner {
    display: inline-block;
    flex-shrink: 0;
    border-radius: 50%;
    border: 2px solid var(--hover);
    border-top-color: var(--text-2);
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
