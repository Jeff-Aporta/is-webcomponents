/**
 * Behavior migrado desde HTML inline de is-gauge.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const g = document.getElementById('gInteractive');
      const s = document.getElementById('gSlider');
      s.addEventListener('is-input', (e) => {
        g.setAttribute('value', e.detail.value);
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
