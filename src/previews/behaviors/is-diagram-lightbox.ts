/**
 * Behavior migrado desde HTML inline de is-diagram-lightbox.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const lb = document.getElementById('lb');
      const preset = document.getElementById('preset');
  
      const open = () => {
        lb.payload = { preset: preset.value };
        lb.open = true;
      };
  
      document.getElementById('openViewer').addEventListener('click', open);
      preset.addEventListener('input', () => {
        // Mantén el payload sincronizado con la selección cuando el visor esté abierto.
        if (lb.open) lb.payload = { preset: preset.value };
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
