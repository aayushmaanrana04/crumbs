<script lang="ts">
  import { rpc } from '@/lib/rpc/client';
  import { db } from '@/lib/db/schema';
  import { deleteAllData } from '@/lib/library/documents';
  import { download, exportJson, exportMarkdownZip, importJson } from '@/lib/library/transfer';
  import Button from '@/ui/kit/Button.svelte';
  import SettingsGroup from '@/ui/kit/SettingsGroup.svelte';
  import SettingsRow from '@/ui/kit/SettingsRow.svelte';

  let message = $state('');
  let error = $state('');
  const stamp = () => new Date().toISOString().slice(0, 10);

  async function deleteEverything() {
    const pages = await db.documents.count();
    const what = `all ${pages} page${pages === 1 ? '' : 's'}, with their summaries, highlights, notes and projects`;
    if (!confirm(`Delete ${what} from this browser? This can't be undone, so export a backup first if you might want it back.\n\nYour settings, keys and AI activity log are kept.`)) return;
    await deleteAllData();
    await rpc('jobs.run');
    message = 'Your library was deleted from this browser.';
    error = '';
  }

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

<SettingsGroup title="Your data" description="Everything is stored in this browser. Export regularly if you want a backup.">
  <SettingsRow title="Backup" detail="Everything, including summaries and highlights, as one JSON file.">
    {#snippet control()}
      <Button size="sm" onclick={async () => download(await exportJson(), `carrel-${stamp()}.json`)}>Export</Button>
      <label class="import">
        Import
        <input type="file" accept="application/json,.json" onchange={onImport} hidden />
      </label>
    {/snippet}
  </SettingsRow>
  <SettingsRow title="Markdown" detail="One file per page, for Obsidian or any notes app.">
    {#snippet control()}
      <Button size="sm" onclick={async () => download(await exportMarkdownZip(), `carrel-${stamp()}.zip`)}>Export</Button>
    {/snippet}
  </SettingsRow>
  <SettingsRow title="Delete everything" detail="Remove every page, summary, highlight, note and project from this browser.">
    {#snippet control()}<Button size="sm" kind="danger" onclick={deleteEverything}>Delete…</Button>{/snippet}
  </SettingsRow>
  {#if message || error}
    <SettingsRow title={error ? 'Import failed' : 'Done'} detail={error || message} />
  {/if}
</SettingsGroup>

<style>
  .import {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--r-sm);
    background: var(--surface);
    font-size: var(--text-sm);
    font-weight: 500;
    cursor: pointer;
  }
  .import:hover {
    background: var(--hover);
  }
</style>
