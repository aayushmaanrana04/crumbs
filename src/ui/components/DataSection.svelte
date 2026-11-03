<script lang="ts">
  import { rpc } from '@/lib/rpc/client';
  import { download, exportJson, exportMarkdownZip, importJson } from '@/lib/library/transfer';

  let message = $state('');
  let error = $state('');
  const stamp = () => new Date().toISOString().slice(0, 10);

  async function onImport(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    message = '';
    error = '';
    try {
      const { added, skipped } = await importJson(file);
      message = `Imported ${added} document${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} already in your library` : ''}.`;
      await rpc('jobs.run');
    } catch (e) {
      error = `Import failed: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
</script>

<section>
  <h2 class="section-title">Your data</h2>
  <p class="muted small intro">Everything is stored in this browser. Export regularly if you want a backup.</p>
  <div class="row">
    <button class="btn" onclick={async () => download(await exportJson(), `summaryse-${stamp()}.json`)}>Export backup (JSON)</button>
    <button class="btn" onclick={async () => download(await exportMarkdownZip(), `summaryse-${stamp()}.zip`)}>Export as Markdown</button>
    <label class="btn">
      Import backup
      <input type="file" accept="application/json,.json" onchange={onImport} hidden />
    </label>
  </div>
  {#if message}<p class="small">{message}</p>{/if}
  {#if error}<p class="error-text small">{error}</p>{/if}
</section>

<style>
  .intro {
    margin: 0 0 var(--space-3);
  }
  .row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
</style>
