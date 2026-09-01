/**
 * Behavior migrado desde HTML inline de is-image-editor.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const editor = document.getElementById('editor1');
      const out = document.getElementById('crop1');
      const log = document.getElementById('log');
      editor.addEventListener('is-crop', (e) => {
        out.src = e.detail.dataURL;
        out.hidden = false;
        const c = e.detail.crop;
        log.textContent = `crop @ ${Math.round(c.x)},${Math.round(c.y)} tamaño ${Math.round(c.width)}x${Math.round(c.height)}`;
      });
      editor.addEventListener('is-change', (e) => {
        const c = e.detail.crop;
        log.textContent = `crop movido: ${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.width)}x${Math.round(c.height)}`;
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
