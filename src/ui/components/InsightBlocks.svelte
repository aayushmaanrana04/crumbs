<script lang="ts">
  import type { InsightBlock } from '@/lib/db/schema';
  import Markdown from '@/ui/components/Markdown.svelte';
  import BarChart from '@/ui/kit/BarChart.svelte';
  import Callout from '@/ui/kit/Callout.svelte';
  import CodeBlock from '@/ui/kit/CodeBlock.svelte';
  import DataTable from '@/ui/kit/DataTable.svelte';
  import SectionHeading from '@/ui/kit/SectionHeading.svelte';

  // Renders one structured block of a summary. Text goes through Markdown so `inline code` works.
  let { block }: { block: InsightBlock } = $props();
</script>

{#if block.type === 'steps'}
  {#if block.title}<SectionHeading label={block.title} />{/if}
  <ol class="steps">
    {#each block.items as item, i (i)}
      <li>
        <span class="n">{i + 1}</span>
        <div class="step">
          <Markdown source={item.text} size="compact" />
          {#if item.code}<CodeBlock code={item.code} lang={item.lang} />{/if}
        </div>
      </li>
    {/each}
  </ol>
{:else if block.type === 'table'}
  {#if block.title}<SectionHeading label={block.title} />{/if}
  <DataTable columns={block.columns} rows={block.rows} />
{:else if block.type === 'chart'}
  {#if block.title}<SectionHeading label={block.title} />{/if}
  <BarChart series={block.series} unit={block.unit} />
{:else if block.type === 'list'}
  {#if block.title}<SectionHeading label={block.title} />{/if}
  <ul class="list">
    {#each block.items as item, i (i)}<li><Markdown source={item} size="compact" /></li>{/each}
  </ul>
{:else if block.type === 'code'}
  {#if block.title}<SectionHeading label={block.title} />{/if}
  <CodeBlock code={block.code} lang={block.lang} />
{:else if block.type === 'quote'}
  <figure class="quote">
    <blockquote>“{block.text}”</blockquote>
    {#if block.by}<figcaption>{block.by}</figcaption>{/if}
  </figure>
{:else if block.type === 'callout'}
  <Callout tone={block.tone}><Markdown source={block.text} size="compact" /></Callout>
{/if}

<style>
  .steps {
    display: grid;
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .steps li {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .n {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--primary);
    color: var(--on-primary);
    font-size: var(--text-xs);
    font-weight: 600;
  }
  .step {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 8px;
    padding-top: 1px;
  }
  .list {
    display: grid;
    gap: 8px;
    margin: 0;
    padding-left: 18px;
  }
  .list li::marker {
    color: var(--text-3);
  }
  .quote {
    margin: 0;
    padding: 4px 0 4px 16px;
    border-left: 3px solid var(--hover);
  }
  blockquote {
    margin: 0;
    font-size: var(--text-lg);
    line-height: 1.55;
  }
  figcaption {
    margin-top: 6px;
    font-size: var(--text-sm);
    color: var(--text-3);
  }
</style>
