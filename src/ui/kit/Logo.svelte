<script lang="ts">
  // The Crumbs mark (design/summaryse.pen, "Brand / Crumbs mark"): a bookmark with a c cut out of it.
  // Uses the current text colour; the c shows whatever is behind it. Pass `wordmark` for the lockup.
  let { size = 20, wordmark = false }: { size?: number; wordmark?: boolean } = $props();
</script>

<span class="logo" style:--size="{size}px">
  <svg viewBox="0 0 69.81 86.61" height={size} width={(size * 69.81) / 86.61} fill="currentColor" aria-hidden="true">
    <path
      fill-rule="evenodd"
      d="M60.1825 0l-50.6625 0c-5.25 0-9.45 4.165-9.45 9.555l-0.07 71.18999c0 4.27 4.235 6.87752 8.015 5.42501l26.915-11.0775 26.94999 11.0775c3.79751 1.53999 7.9275-1.155 7.92751-5.425l-0.05251-71.19c0-5.3375-4.28749-9.555-9.57249-9.555z m-25.165 53.41c3.78 0 7.2275-1.96 9.03-4.6725 0.71751-1.085 2.0475-1.68 3.3775-1.68l4.2875 0c2.9575 0 4.7075 2.73 3.64 5.2675-3.3425 7.6475-11.2 12.6175-20.0725 12.61751-13.4225 0-23.4325-10.465-23.4325-23.62501 0-13.72 10.55251-24.465 23.5375-24.465 10.185 0 17.64 5.25 20.0725 12.635 0.9275 2.87-1.05 5.16249-3.7975 5.1625l-4.06 0c-1.365 0-2.695-0.5775-3.4125-1.6275-1.89-2.6775-5.075-4.305-8.8025-4.305-6.5275 0-11.305 5.4075-11.305 12.88 0 6.965 5.00501 11.8125 10.9375 11.8125z"
    />
  </svg>
  {#if wordmark}<span class="wordmark">crumbs</span>{:else}<span class="sr-only">Crumbs</span>{/if}
</span>

<style>
  .logo {
    display: inline-flex;
    align-items: center;
    gap: calc(var(--size) * 0.4);
    color: var(--text);
  }
  svg {
    flex-shrink: 0;
  }
  .wordmark {
    font-size: calc(var(--size) * 0.95);
    font-weight: 600;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
