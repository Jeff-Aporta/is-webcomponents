/**
 * Behavior migrado desde HTML inline de is-mega-menu.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
      document.querySelectorAll('is-mega-menu').forEach((m) => {
        m.addEventListener('is-select', (e) => log.textContent = `${e.detail.href} (${e.detail.text})` + '\n' + log.textContent);
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
