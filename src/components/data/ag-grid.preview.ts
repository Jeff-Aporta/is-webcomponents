/**
 * Behavior migrado desde HTML inline de is-ag-grid.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
import type { PreviewMountContext } from '../../previews/_kit/types.d.ts';

interface AgGridApi {
  selectAll?(): void;
  exportCSV?(filename?: string): void;
  goToPage?(page: number): void;
  setDensity?(density: 'compact' | 'normal' | 'comfortable'): void;
  resetPersistedState?(): void;
}

interface IsAgGridEl extends HTMLElement {
  api?: AgGridApi;
}

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  const log = root.querySelector<HTMLElement>('#log') || document.getElementById('log');
  const append = (line: string): void => {
    if (!log) return;
    log.textContent = `${line}\n${log.textContent}`;
    log.scrollTop = 0;
  };

  function attach(g: IsAgGridEl | null | undefined): void {
    if (!g) return;
    g.addEventListener('is-cell-click', (e: Event) =>
      append(`cell-click ${(e as CustomEvent<{ column?: { field?: string }; value?: unknown }>).detail?.column?.field}=${(e as CustomEvent<{ column?: { field?: string }; value?: unknown }>).detail?.value}`));
    g.addEventListener('is-cell-edit', (e: Event) =>
      append(`cell-edit ${(e as CustomEvent<{ column?: { field?: string }; oldValue?: unknown; newValue?: unknown }>).detail?.column?.field}: ${(e as CustomEvent<{ column?: { field?: string }; oldValue?: unknown; newValue?: unknown }>).detail?.oldValue} → ${(e as CustomEvent<{ column?: { field?: string }; oldValue?: unknown; newValue?: unknown }>).detail?.newValue}`));
    g.addEventListener('is-row-select', (e: Event) =>
      append(`row-select n=${(e as CustomEvent<{ rows?: unknown[] }>).detail?.rows?.length}`));
    g.addEventListener('is-sort-change', (e: Event) =>
      append(`sort ${(e as CustomEvent<{ column?: string; direction?: string }>).detail?.column} ${(e as CustomEvent<{ column?: string; direction?: string }>).detail?.direction}`));
    g.addEventListener('is-filter-change', (e: Event) =>
      append(`filter ${(e as CustomEvent<{ column?: string; op?: string; value?: unknown }>).detail?.column} ${(e as CustomEvent<{ column?: string; op?: string; value?: unknown }>).detail?.op} ${JSON.stringify((e as CustomEvent<{ column?: string; op?: string; value?: unknown }>).detail?.value)}`));
    g.addEventListener('is-quick-filter', (e: Event) =>
      append(`quick-filter ${JSON.stringify((e as CustomEvent<{ value?: unknown }>).detail?.value)}`));
    g.addEventListener('is-action', (e: Event) =>
      append(`action ${(e as CustomEvent<{ action?: string; row?: { sku?: string } }>).detail?.action} on ${(e as CustomEvent<{ action?: string; row?: { sku?: string } }>).detail?.row?.sku ?? ''}`));
    g.addEventListener('is-page-change', (e: Event) =>
      append(`page ${(e as CustomEvent<{ page?: number; pageSize?: number }>).detail?.page}/${(e as CustomEvent<{ page?: number; pageSize?: number }>).detail?.pageSize}`));
    g.addEventListener('is-column-reorder', (e: Event) =>
      append(`reorder ${(e as CustomEvent<{ colId?: string; toIndex?: number }>).detail?.colId} → ${(e as CustomEvent<{ colId?: string; toIndex?: number }>).detail?.toIndex}`));
    g.addEventListener('is-column-resize', (e: Event) =>
      append(`resize ${(e as CustomEvent<{ colId?: string; width?: number }>).detail?.colId} → ${(e as CustomEvent<{ colId?: string; width?: number }>).detail?.width}`));
    g.addEventListener('is-column-pin', (e: Event) =>
      append(`pin ${(e as CustomEvent<{ colId?: string; side?: string }>).detail?.colId} ${(e as CustomEvent<{ colId?: string; side?: string }>).detail?.side}`));
    g.addEventListener('is-column-hide', (e: Event) =>
      append(`hide ${(e as CustomEvent<{ colId?: string }>).detail?.colId}`));
  }

  const g = (root.querySelector<HTMLElement>('#grid') || document.getElementById('grid')) as IsAgGridEl | null;
  attach(g);
  attach((root.querySelector<HTMLElement>('#grid-density') || document.getElementById('grid-density')) as IsAgGridEl | null);
  attach((root.querySelector<HTMLElement>('#grid-grouping') || document.getElementById('grid-grouping')) as IsAgGridEl | null);
  attach((root.querySelector<HTMLElement>('#grid-filters') || document.getElementById('grid-filters')) as IsAgGridEl | null);

  const on = (id: string, fn: () => void): void => {
    const el = root.querySelector<HTMLElement>(`#${id}`) || document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
  };

  on('btnSelAll', () => g?.api?.selectAll?.());
  on('btnCSV', () => g?.api?.exportCSV?.('catalogo.csv'));
  on('btnPage2', () => g?.api?.goToPage?.(2));

  const gDensity = (root.querySelector<HTMLElement>('#grid-density') || document.getElementById('grid-density')) as IsAgGridEl | null;
  on('btnCompact', () => gDensity?.api?.setDensity?.('compact'));
  on('btnNormal', () => gDensity?.api?.setDensity?.('normal'));
  on('btnComfy', () => gDensity?.api?.setDensity?.('comfortable'));
  on('btnResetState', () => gDensity?.api?.resetPersistedState?.());
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
