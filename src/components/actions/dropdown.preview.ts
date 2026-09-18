/**
 * Behavior migrado desde HTML inline de is-dropdown.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../../previews/_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  const dd = document.getElementById('dd');
  const log = document.getElementById('log');
  if (!dd || !log) return;
  dd.addEventListener('is-select', (e: Event) => {
    const detail = (e as CustomEvent<{ item: { value: string } }>).detail;
    log.textContent = `selección: ${detail.item.value}`;
  });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
