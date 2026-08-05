/**
 * Behavior migrado desde HTML inline de is-duration-picker.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
      document.querySelectorAll('is-duration-picker').forEach((d) => {
        d.addEventListener('is-change', (e) => console.log('duration', e.detail.value, e.detail.text));
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
