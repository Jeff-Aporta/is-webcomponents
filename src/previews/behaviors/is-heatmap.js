/**
 * Behavior migrado desde HTML inline de is-heatmap.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
      const append = (line) => { log.textContent = line + '\n' + log.textContent; log.scrollTop = 0; };
      document.querySelectorAll('is-heatmap').forEach((h) => {
        h.addEventListener('is-cell-hover', (e) => append(`${e.detail.x} · ${e.detail.y} = ${e.detail.value}`));
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
