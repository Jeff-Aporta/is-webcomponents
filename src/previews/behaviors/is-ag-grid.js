/**
 * Behavior migrado desde HTML inline de is-ag-grid.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx) {
  const root = ctx.main;
  void root;
  const log = document.getElementById('log');
      const append = (line) => { log.textContent = line + '\n' + log.textContent; log.scrollTop = 0; };
  
      function attach(g) {
        if (!g) return;
        g.addEventListener('is-cell-click',      (e) => append(`cell-click ${e.detail?.column?.field}=${e.detail?.value}`));
        g.addEventListener('is-cell-edit',       (e) => append(`cell-edit ${e.detail?.column?.field}: ${e.detail?.oldValue} → ${e.detail?.newValue}`));
        g.addEventListener('is-row-select',      (e) => append(`row-select n=${e.detail?.rows?.length}`));
        g.addEventListener('is-sort-change',     (e) => append(`sort ${e.detail?.column} ${e.detail?.direction}`));
        g.addEventListener('is-filter-change',   (e) => append(`filter ${e.detail?.column} ${e.detail?.op} ${JSON.stringify(e.detail?.value)}`));
        g.addEventListener('is-quick-filter',    (e) => append(`quick-filter ${JSON.stringify(e.detail?.value)}`));
        g.addEventListener('is-action',          (e) => append(`action ${e.detail?.action} on ${e.detail?.row?.sku ?? ''}`));
        g.addEventListener('is-page-change',     (e) => append(`page ${e.detail?.page}/${e.detail?.pageSize}`));
        g.addEventListener('is-column-reorder',  (e) => append(`reorder ${e.detail?.colId} → ${e.detail?.toIndex}`));
        g.addEventListener('is-column-resize',   (e) => append(`resize ${e.detail?.colId} → ${e.detail?.width}`));
        g.addEventListener('is-column-pin',      (e) => append(`pin ${e.detail?.colId} ${e.detail?.side}`));
        g.addEventListener('is-column-hide',     (e) => append(`hide ${e.detail?.colId}`));
      }
  
      const g = document.getElementById('grid');
      attach(g);
      attach(document.getElementById('grid-density'));
      attach(document.getElementById('grid-grouping'));
      attach(document.getElementById('grid-filters'));
  
      document.getElementById('btnSelAll').addEventListener('click', () => g.api.selectAll());
      document.getElementById('btnCSV').addEventListener('click', () => g.api.exportCSV('catalogo.csv'));
      document.getElementById('btnPage2').addEventListener('click', () => g.api.goToPage(2));
      const gDensity = document.getElementById('grid-density');
      document.getElementById('btnCompact').addEventListener('click', () => gDensity.api.setDensity('compact'));
      document.getElementById('btnNormal').addEventListener('click', () => gDensity.api.setDensity('normal'));
      document.getElementById('btnComfy').addEventListener('click', () => gDensity.api.setDensity('comfortable'));
      document.getElementById('btnResetState').addEventListener('click', () => gDensity.api.resetPersistedState());
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
