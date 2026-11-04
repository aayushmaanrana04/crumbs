<script lang="ts">
  import { tick } from 'svelte';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import MessageCircle from '@lucide/svelte/icons/message-circle';
  import { db } from '@/lib/db/schema';
  import { projectPageCounts, tagCounts } from '@/lib/library/documents';
  import { projectDocIds } from '@/lib/library/projects';
  import { ask, type AskTurn } from '@/lib/search/ask';
  import AnswerTurn from '@/ui/components/AnswerTurn.svelte';
  import Banner from '@/ui/kit/Banner.svelte';
  import Button from '@/ui/kit/Button.svelte';
  import EmptyState from '@/ui/kit/EmptyState.svelte';
  import IconButton from '@/ui/kit/IconButton.svelte';
  import Select from '@/ui/kit/Select.svelte';
  import Spinner from '@/ui/kit/Spinner.svelte';
  import { live } from '@/ui/live.svelte';
  import { router } from '@/ui/router.svelte';

  const tags = live(async () => [...(await tagCounts())].sort((a, b) => a[0].localeCompare(b[0])), [] as [string, number][]);
  const total = live(() => db.documents.count(), 0);
  const projects = live(async () => {
    const [list, counts] = await Promise.all([db.projects.orderBy('name').toArray(), projectPageCounts()]);
    return list.map((p) => ({ id: p.id, name: p.name, count: counts.get(p.id) ?? 0 }));
  }, [] as { id: string; name: string; count: number }[]);

  let question = $state('');
  // "" = whole library, "tag:<name>" or "project:<id>". "Ask this project" links in with ?project=<id>.
  let scope = $state(router.query.get('project') ? `project:${router.query.get('project')}` : '');
  let turns = $state<AskTurn[]>([]);
  let pending = $state<string | null>(null);
  let error = $state('');
  let thread = $state<HTMLElement>();
  let input = $state<HTMLTextAreaElement>();

  const scopeLabel = (tag: string, count: number) => `${tag} · ${count} page${count === 1 ? '' : 's'}`;

  async function submit() {
    const q = question.trim();
    if (!q || pending) return;
    pending = q;
    question = '';
    error = '';
    await scrollToEnd();
    try {
      const [kind, value] = scope.split(/:(.*)/s);
      const docIds =
        kind === 'tag'
          ? new Set(await db.documents.where('tags').equals(value!).primaryKeys())
          : kind === 'project'
            ? new Set(await projectDocIds(value!))
            : undefined;
      turns = [...turns, await ask(q, turns, docIds)];
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      question = q;
    } finally {
      pending = null;
      await scrollToEnd();
      input?.focus();
    }
  }

  async function scrollToEnd() {
    await tick();
    thread?.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' });
  }
</script>

<div class="ask">
  <header class="top">
    <h1 class="page-title">Ask</h1>
    <div class="controls">
      {#if turns.length}<Button kind="ghost" size="sm" onclick={() => (turns = [])}>New conversation</Button>{/if}
      <Select bind:value={scope} aria-label="Scope">
        <option value="">Whole library · {total.value} pages</option>
        {#if projects.value.length}
          <optgroup label="Projects">
            {#each projects.value as p (p.id)}<option value="project:{p.id}">{scopeLabel(p.name, p.count)}</option>{/each}
          </optgroup>
        {/if}
        {#if tags.value.length}
          <optgroup label="Tags">
            {#each tags.value as [tag, count] (tag)}<option value="tag:{tag}">{scopeLabel(tag, count)}</option>{/each}
          </optgroup>
        {/if}
      </Select>
    </div>
  </header>

  <div class="thread" bind:this={thread}>
    <div class="column">
      {#if turns.length === 0 && !pending}
        <EmptyState title="Ask your library">
          {#snippet icon()}<MessageCircle size={18} />{/snippet}
          Answers come from pages you've saved, with numbered sources. Try “What have I read about browser automation?”
        </EmptyState>
      {/if}

      {#each turns as turn, t (t)}
        <div class="question"><p>{turn.question}</p></div>
        <AnswerTurn {turn} />
      {/each}

      {#if pending}
        <div class="question"><p>{pending}</p></div>
        <div class="thinking"><Spinner /> Reading your sources…</div>
      {/if}
    </div>
  </div>

  <div class="composer-wrap">
    <div class="column">
      {#if error}
        <div class="error"><Banner tone="error" title="Couldn't answer">{error}</Banner></div>
      {/if}
      <form
        class="composer"
        onsubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <textarea
          bind:this={input}
          bind:value={question}
          rows="1"
          placeholder={turns.length ? 'Ask a follow-up…' : 'Ask anything about what you have saved…'}
          aria-label="Question"
          onkeydown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        ></textarea>
        <IconButton label="Ask" variant="primary" type="submit" disabled={!question.trim() || !!pending}><ArrowUp /></IconButton>
      </form>
    </div>
  </div>
</div>

<style>
  .ask {
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 20px 28px 12px;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }
  .thread {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 8px 28px 24px;
  }
  .column {
    max-width: 720px;
    margin: 0 auto;
  }
  .question {
    display: flex;
    justify-content: flex-end;
    margin: 24px 0 16px;
  }
  .question p {
    max-width: 460px;
    margin: 0;
    padding: 11px 16px;
    border-radius: var(--r-lg);
    background: var(--surface);
    font-size: var(--text-base);
    line-height: 1.5;
  }
  .thinking {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: var(--text-md);
    color: var(--text-2);
  }
  .composer-wrap {
    padding: 0 28px 20px;
  }
  .error {
    margin-bottom: 10px;
  }
  .composer {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 10px 10px 10px 16px;
    border-radius: 18px;
    border: 1px solid var(--border);
    background: var(--bg);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  }
  .composer:focus-within {
    border-color: var(--text-3);
  }
  textarea {
    flex: 1;
    min-height: 30px;
    max-height: 160px;
    padding: 5px 0;
    border: none;
    background: none;
    font-size: var(--text-base);
    line-height: 1.45;
    resize: none;
    field-sizing: content;
  }
  textarea::placeholder {
    color: var(--text-3);
  }
  textarea:focus {
    outline: none;
  }
</style>
