/**
 * Behavior migrado desde HTML inline de is-dropdown.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  document.getElementById('dd')?.addEventListener('is-select', (e) => {
        document.getElementById('log').textContent = `selección: ${e.detail.item.value}`;
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
