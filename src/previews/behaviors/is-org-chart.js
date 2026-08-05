/**
 * Behavior migrado desde HTML inline de is-org-chart.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
      document.querySelector('is-org-chart').addEventListener('is-select', (e) => log.textContent = `${e.detail.node.title}: ${e.detail.node.name}\n` + log.textContent);
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
