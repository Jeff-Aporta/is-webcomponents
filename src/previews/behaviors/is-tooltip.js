/**
 * Behavior migrado desde HTML inline de is-tooltip.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const tip = document.getElementById('t-manual');
      document.getElementById('t-manual-btn')?.addEventListener('click', () => { tip.open = !tip.open; });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
