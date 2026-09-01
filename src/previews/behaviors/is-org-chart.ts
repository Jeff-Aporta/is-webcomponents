/**
 * Behavior migrado desde HTML inline de is-org-chart.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
  for (const org of document.querySelectorAll<HTMLElement>('is-org-chart')) {
    org.addEventListener('is-select', (e) => {
      log.textContent = `[${org.id}] ${e.detail.node.title || ''}: ${e.detail.node.name}\n` + log.textContent;
    });
    org.addEventListener('is-toggle', (e) => {
      log.textContent = `[${org.id}] toggle ${e.detail.id} → collapsed=${e.detail.collapsed}\n` + log.textContent;
    });
    org.addEventListener('is-open-viewer', () => {
      log.textContent = `[${org.id}] abrir visor\n` + log.textContent;
    });
  }
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
