/**
 * Behavior migrado desde HTML inline de is-gauge.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const g = document.getElementById('gInteractive');
  const s = document.getElementById('gSlider');
  if (!g || !s) return;
  s.addEventListener('is-input', (e: Event) => {
    const detail = (e as CustomEvent<{ value: string }>).detail;
    g.setAttribute('value', detail.value);
  });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
