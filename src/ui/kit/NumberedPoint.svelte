<script lang="ts">
  let { n, text }: { n: number; text: string } = $props();
</script>

<li class="point">
  <span class="n">{n}</span>
  <span class="text">{text}</span>
</li>

<style>
  .point {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    list-style: none;
  }
  .n {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--surface);
    font-size: var(--text-xs);
    font-weight: 600;
    color: var(--text-2);
  }
  .text {
    font-size: var(--text-base);
    line-height: 1.55;
    padding-top: 1px;
  }
</style>
