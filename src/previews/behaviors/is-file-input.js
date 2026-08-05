/**
 * Behavior migrado desde HTML inline de is-file-input.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const fi = document.getElementById('fi');
      const log = document.getElementById('log');
      fi.addEventListener('is-change', (e) => {
        log.textContent = `Archivos: ${e.detail.files.length} — ${e.detail.files.map(f => f.name).join(', ') || 'ninguno'}`;
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
