/**
 * Behavior migrado desde HTML inline de is-ag-grid.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  const log = root.querySelector<HTMLElement>('#log') || document.getElementById('log');
  const append = (line) => {
    if (!log) return;
    log.textContent = `${line}\n${log.textContent}`;
    log.scrollTop = 0;
  };

  function attach(g) {
    if (!g) return;
    g.addEventListener('is-cell-click', (e) => append(`cell-click ${e.detail?.column?.field}=${e.detail?.value}`));
    g.addEventListener('is-cell-edit', (e) => append(`cell-edit ${e.detail?.column?.field}: ${e.detail?.oldValue} → ${e.detail?.newValue}`));
    g.addEventListener('is-row-select', (e) => append(`row-select n=${e.detail?.rows?.length}`));
    g.addEventListener('is-sort-change', (e) => append(`sort ${e.detail?.column} ${e.detail?.direction}`));
    g.addEventListener('is-filter-change', (e) => append(`filter ${e.detail?.column} ${e.detail?.op} ${JSON.stringify(e.detail?.value)}`));
    g.addEventListener('is-quick-filter', (e) => append(`quick-filter ${JSON.stringify(e.detail?.value)}`));
    g.addEventListener('is-action', (e) => append(`action ${e.detail?.action} on ${e.detail?.row?.sku ?? ''}`));
    g.addEventListener('is-page-change', (e) => append(`page ${e.detail?.page}/${e.detail?.pageSize}`));
    g.addEventListener('is-column-reorder', (e) => append(`reorder ${e.detail?.colId} → ${e.detail?.toIndex}`));
    g.addEventListener('is-column-resize', (e) => append(`resize ${e.detail?.colId} → ${e.detail?.width}`));
    g.addEventListener('is-column-pin', (e) => append(`pin ${e.detail?.colId} ${e.detail?.side}`));
    g.addEventListener('is-column-hide', (e) => append(`hide ${e.detail?.colId}`));
  }

  const g = root.querySelector<HTMLElement>('#grid') || document.getElementById('grid');
  attach(g);
  attach(root.querySelector<HTMLElement>('#grid-density') || document.getElementById('grid-density'));
  attach(root.querySelector<HTMLElement>('#grid-grouping') || document.getElementById('grid-grouping'));
  attach(root.querySelector<HTMLElement>('#grid-filters') || document.getElementById('grid-filters'));

  const on = (id, fn) => {
    const el = root.querySelector<HTMLElement>(`#${id}`) || document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
  };

  on('btnSelAll', () => g?.api?.selectAll?.());
  on('btnCSV', () => g?.api?.exportCSV?.('catalogo.csv'));
  on('btnPage2', () => g?.api?.goToPage?.(2));

  const gDensity = root.querySelector<HTMLElement>('#grid-density') || document.getElementById('grid-density');
  on('btnCompact', () => gDensity?.api?.setDensity?.('compact'));
  on('btnNormal', () => gDensity?.api?.setDensity?.('normal'));
  on('btnComfy', () => gDensity?.api?.setDensity?.('comfortable'));
  on('btnResetState', () => gDensity?.api?.resetPersistedState?.());
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
