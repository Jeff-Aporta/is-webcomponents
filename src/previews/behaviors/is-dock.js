/**
 * Behavior migrado desde HTML inline de is-dock.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
      function append(line) {
        log.textContent = line + '\n' + log.textContent;
        log.scrollTop = 0;
      }
      document.querySelectorAll('is-dock').forEach((d) => {
        d.addEventListener('is-select', (e) => append(`select: ${e.detail.item.getAttribute('label')}`));
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
