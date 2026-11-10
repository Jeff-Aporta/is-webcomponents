// @contexto INDICE.md · src/components/forms/README.md
/**
 * Behavior migrado desde HTML inline de iswc-rte.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('@jeff-aporta/iswc-base/previews/_kit/schemas/preview.schemas.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('@jeff-aporta/iswc-base/previews/_kit/schemas/preview.schemas.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  const rte = document.getElementById('rte') as (HTMLElement & { value?: string }) | null;
  const out = document.getElementById('outHTML') as HTMLElement | null;
  if (rte && out) {
    const sync = (): void => { out.textContent = rte.value ?? ''; };
    rte.addEventListener('iswc-input', sync);
    sync();
  }
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
