<script lang="ts">
  // Placeholder lines while content loads.
</script>


<div class="skeleton" aria-hidden="true">
  <span class="line long"></span>
  <span class="line short"></span>
</div>

<style>
  .skeleton {
    display: grid;
    gap: 8px;
    padding: 12px;
  }
  .line {
    height: 9px;
    border-radius: 5px;
    background: var(--surface);
    animation: pulse 1.4s ease-in-out infinite;
  }
  .long {
    width: 70%;
  }
  .short {
    width: 40%;
  }
  @keyframes pulse {
    50% {
      opacity: 0.5;
    }
  }
</style>
