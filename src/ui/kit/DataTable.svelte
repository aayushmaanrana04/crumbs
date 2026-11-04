<script lang="ts">
  let { columns, rows }: { columns: string[]; rows: string[][] } = $props();
</script>

<div class="wrap">
  <table>
    <thead>
      <tr>{#each columns as c, i (i)}<th>{c}</th>{/each}</tr>
    </thead>
    <tbody>
      {#each rows as row, r (r)}
        <tr>{#each row as cell, i (i)}<td>{cell}</td>{/each}</tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .wrap {
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--text-md);
  }
  th {
    padding: 9px 14px;
    background: var(--surface);
    text-align: left;
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-2);
    white-space: nowrap;
  }
  td {
    padding: 9px 14px;
    border-top: 1px solid var(--border);
    vertical-align: top;
    line-height: 1.45;
  }
  td:first-child {
    font-weight: 500;
  }
</style>
