/**
 * Behavior migrado desde HTML inline de is-rte.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const rte = document.getElementById('rte') as (HTMLElement & { value?: string }) | null;
  const out = document.getElementById('outHTML') as HTMLElement | null;
  if (rte && out) {
    const sync = (): void => { out.textContent = rte.value ?? ''; };
    rte.addEventListener('is-input', sync);
    sync();
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
