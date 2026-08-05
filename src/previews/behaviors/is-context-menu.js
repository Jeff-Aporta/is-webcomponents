/**
 * Behavior migrado desde HTML inline de is-context-menu.
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
      document.querySelectorAll('is-context-menu').forEach((m) => {
        m.addEventListener('is-select', (e) => {
          append(`[${new Date().toLocaleTimeString()}] ${e.detail.value}`);
        });
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
