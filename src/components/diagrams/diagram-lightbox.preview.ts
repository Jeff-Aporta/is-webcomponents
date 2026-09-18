/**
 * Behavior migrado desde HTML inline de is-diagram-lightbox.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */

type LightboxLike = HTMLElement & { payload: unknown; open: boolean; };
type PresetLike = HTMLSelectElement;

export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  void ctx.main;
  const lb = document.getElementById('lb') as LightboxLike | null;
  const preset = document.getElementById('preset') as PresetLike | null;
  const openBtn = document.getElementById('openViewer');
  if (!lb || !preset) return;

  const open = (): void => {
    lb.payload = { preset: preset.value };
    lb.open = true;
  };

  openBtn?.addEventListener('click', open);
  preset.addEventListener('input', () => {
    // Mantén el payload sincronizado con la selección cuando el visor esté abierto.
    if (lb.open) lb.payload = { preset: preset.value };
  });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
