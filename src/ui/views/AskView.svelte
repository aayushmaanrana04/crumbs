<script lang="ts">
  import { db } from '@/lib/db/schema';
  import { ask, type AskTurn } from '@/lib/search/ask';
  import Markdown from '@/ui/components/Markdown.svelte';
  import Passage from '@/ui/components/Passage.svelte';
  import { live } from '@/ui/live.svelte';
  import { docHref } from '@/ui/router.svelte';

  const tags = live(async () => [...new Set((await db.documents.toArray()).flatMap((d) => d.tags))].sort(), []);

  let question = $state('');
  let scopeTag = $state('');
  let turns = $state<AskTurn[]>([]);
  let asking = $state(false);
  let error = $state('');
  let openSource = $state<string | null>(null);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const q = question.trim();
    if (!q || asking) return;
    asking = true;
    error = '';
    try {
      const docIds = scopeTag
        ? new Set(await db.documents.where('tags').equals(scopeTag).primaryKeys())
        : undefined;
      turns = [...turns, await ask(q, turns, docIds)];
      question = '';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      asking = false;
    }
  }
</script>

<div class="header">
  <h1 class="page-title">Ask</h1>
  {#if turns.length}<button class="link-button" onclick={() => (turns = [])}>New conversation</button>{/if}
</div>

{#each turns as turn, t (t)}
  <article class="turn">
    <p class="question">{turn.question}</p>
    <div class="answer">
      {#each turn.segments as segment, s (s)}
        <div class="segment {segment.kind}">
          {#if segment.kind === 'inference'}<span class="label small">Inference</span>{/if}
          <Markdown source={segment.text} />
          {#each segment.sources as n (n)}
            <button
              class="cite"
              aria-label="Show source {n}"
              onclick={() => (openSource = openSource === `${t}:${n}` ? null : `${t}:${n}`)}>{n}</button
            >
          {/each}
        </div>
      {/each}
    </div>

    {#if turn.sources.length}
      <details class="sources" open={openSource?.startsWith(`${t}:`)}>
        <summary class="muted small">{turn.sources.length} sources · {turn.mode === 'hybrid' ? 'keyword + meaning' : 'keyword'} · {turn.model}</summary>
        <ol>
          {#each turn.sources as hit, i (hit.chunk.id)}
            <li class:active={openSource === `${t}:${i + 1}`}>
              <a href={docHref(hit.doc.id, { start: hit.chunk.charStart, end: hit.chunk.charEnd })}>{hit.doc.title}</a>
              <Passage text={hit.chunk.text} terms={hit.terms} maxChars={300} />
            </li>
          {/each}
        </ol>
      </details>
    {:else}
      <p class="muted small">No passages in your library matched this question.</p>
    {/if}
  </article>
{/each}

<form class="composer" onsubmit={submit}>
  <textarea
    class="input"
    rows="2"
    placeholder={turns.length ? 'Ask a follow-up' : 'e.g. What have I learned about browser automation agents?'}
    bind:value={question}
    onkeydown={(e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
      }
    }}
  ></textarea>
  <div class="row">
    <select class="input" bind:value={scopeTag} aria-label="Scope">
      <option value="">Whole library</option>
      {#each tags.value as tag (tag)}<option value={tag}>Tag: {tag}</option>{/each}
    </select>
    <button class="btn btn-primary" disabled={asking || !question.trim()}>{asking ? 'Thinking…' : 'Ask'}</button>
  </div>
  {#if error}<p class="error-text small">{error}</p>{/if}
</form>

<style>
  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }
  .turn {
    margin-bottom: var(--space-6);
  }
  .question {
    font-weight: 600;
    font-size: 15px;
    margin: 0 0 var(--space-3);
  }
  .answer {
    display: grid;
    gap: var(--space-2);
  }
  .segment {
    position: relative;
  }
  .segment :global(.markdown) {
    display: inline;
  }
  .segment :global(.markdown > p:first-child) {
    display: inline;
  }
  .inference {
    border-left: 3px dashed var(--color-border);
    padding-left: var(--space-3);
    color: var(--color-text-2);
  }
  .label {
    display: block;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 10px;
    color: var(--color-text-3);
  }
  .cite {
    border: none;
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    color: var(--color-primary);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 0 5px;
    margin-left: 2px;
    cursor: pointer;
    vertical-align: super;
  }
  .sources {
    margin-top: var(--space-3);
  }
  .sources ol {
    padding-left: var(--space-5);
    display: grid;
    gap: var(--space-2);
  }
  .sources li.active {
    background: var(--color-surface);
    border-radius: var(--radius-sm);
  }
  .composer {
    position: sticky;
    bottom: 0;
    background: var(--color-bg);
    padding: var(--space-3) 0;
    display: grid;
    gap: var(--space-2);
  }
  textarea {
    resize: vertical;
  }
  .row {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }
</style>
