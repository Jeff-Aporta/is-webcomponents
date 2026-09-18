/**
 * Behavior migrado desde HTML inline de is-tooltip.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const tip = document.getElementById('t-manual') as HTMLElement & { open: boolean } | null;
  if (!tip) return;
  document.getElementById('t-manual-btn')?.addEventListener('click', () => { tip.open = !tip.open; });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
