/**
 * Behavior migrado desde HTML inline de is-doc-editor.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const doc = document.getElementById('doc');
      const out = document.getElementById('out');
      const sync = () => out.textContent = doc.value;
      doc.addEventListener('is-change', sync);
      sync();
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
