/**
 * Behavior migrado desde HTML inline de is-image-editor.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const editor = document.getElementById('editor1');
  const out = document.getElementById('crop1') as HTMLImageElement | null;
  const log = document.getElementById('log');
  if (editor) {
    editor.addEventListener('is-crop', (e: Event) => {
      const ev = e as CustomEvent<{ dataURL: string; crop: { x: number; y: number; width: number; height: number } }>;
      if (out) {
        out.src = ev.detail.dataURL;
        out.hidden = false;
      }
      const c = ev.detail.crop;
      if (log) log.textContent = `crop @ ${Math.round(c.x)},${Math.round(c.y)} tamaño ${Math.round(c.width)}x${Math.round(c.height)}`;
    });
    editor.addEventListener('is-change', (e: Event) => {
      const ev = e as CustomEvent<{ crop: { x: number; y: number; width: number; height: number } }>;
      const c = ev.detail.crop;
      if (log) log.textContent = `crop movido: ${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.width)}x${Math.round(c.height)}`;
    });
  }
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
