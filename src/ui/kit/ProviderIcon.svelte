<script lang="ts">
  import type { ProviderKind } from '@/lib/providers/types';
  import anthropic from '@/assets/providers/anthropic.svg?raw';
  import chromeAi from '@/assets/providers/chrome-ai.svg?raw';
  import claudeLocal from '@/assets/providers/claude-local.svg?raw';
  import gemini from '@/assets/providers/gemini.svg?raw';
  import ollama from '@/assets/providers/ollama.svg?raw';
  import openai from '@/assets/providers/openai.svg?raw';
  import openrouter from '@/assets/providers/openrouter.svg?raw';

  // The provider's logo in a soft tile, drawn in the text colour (sources in src/assets/providers).
  // The SVGs are bundled files we control, so rendering them as HTML is safe.
  const ICONS: Record<ProviderKind, string> = {
    openai,
    anthropic,
    gemini,
    openrouter,
    ollama,
    'chrome-ai': chromeAi,
    'claude-local': claudeLocal,
  };

  let { kind, size = 32 }: { kind: ProviderKind; size?: number } = $props();
</script>

<span class="tile" style:--size="{size}px" aria-hidden="true">{@html ICONS[kind]}</span>

<style>
  .tile {
    width: var(--size);
    height: var(--size);
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--r-sm);
    background: var(--surface);
    color: var(--text);
  }
  .tile :global(svg) {
    width: calc(var(--size) * 0.5);
    height: calc(var(--size) * 0.5);
  }
</style>
