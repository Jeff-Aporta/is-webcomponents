/**
 * Behavior migrado desde HTML inline de is-pivot-table.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
      document.querySelectorAll('is-pivot-table').forEach((p) => {
        p.addEventListener('is-cell-click', (e) => log.textContent = `${e.detail.row} · ${e.detail.col} = ${e.detail.value}\n` + log.textContent);
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
