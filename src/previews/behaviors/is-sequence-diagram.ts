/**
 * Behavior migrado desde HTML inline de is-sequence-diagram.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const lb = document.getElementById('lb');
      document.getElementById('openViewer').addEventListener('click', () => {
        lb.payload = { preset: 'tk1437191' };
        lb.open = true;
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
