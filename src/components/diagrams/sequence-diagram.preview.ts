/**
 * Behavior migrado desde HTML inline de is-sequence-diagram.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  void ctx.main;
  const lb = document.getElementById('lb') as HTMLElement & { payload: unknown; open: boolean } | null;
  const openBtn = document.getElementById('openViewer');
  if (lb && openBtn) {
    openBtn.addEventListener('click', () => {
      lb.payload = { preset: 'tk1437191' };
      lb.open = true;
    });
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
