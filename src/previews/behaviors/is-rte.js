/**
 * Behavior migrado desde HTML inline de is-rte.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const rte = document.getElementById('rte');
      const out = document.getElementById('outHTML');
      const sync = () => out.textContent = rte.value;
      rte.addEventListener('is-input', sync);
      sync();
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
