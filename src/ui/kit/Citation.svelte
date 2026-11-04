<script lang="ts">
  let { n, active = false, onclick }: { n: number; active?: boolean; onclick?: () => void } = $props();
</script>

<button type="button" class="cite" class:active aria-label="Source {n}" {onclick}>{n}</button>

<style>
  .cite {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: var(--surface);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    vertical-align: 2px;
  }
  .cite:hover,
  .active {
    background: var(--primary);
    color: var(--on-primary);
  }
</style>
