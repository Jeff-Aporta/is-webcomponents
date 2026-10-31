/**
 * Behavior migrado desde HTML inline de iswc-ag-grid.
 * Se ejecuta en mount() tras pintar la definition JSON.
 */
import type { PreviewMountContext } from '../../../previews/_kit/schemas/preview.schemas.ts';
import type { AgGridApi, IswcAgGridEl } from "../schemas/ag-grid.preview.schemas.js";

const TICKERS = [['AAPL', 'Apple Inc.'], ['MSFT', 'Microsoft Corp.'], ['NVDA', 'NVIDIA Corp.'], ['TSLA', 'Tesla Inc.'], ['AMZN', 'Amazon.com'], ['GOOG', 'Alphabet'], ['META', 'Meta Platforms'], ['NFLX', 'Netflix']];

/** Cartera determinista: la demo se ve igual en cada carga. */
function cartera(n: number): Record<string, unknown>[] {
  const filas: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    const [ticker, nombre] = TICKERS[i % TICKERS.length]!;
    const serie = Array.from({ length: 14 }, (_, k) => Math.abs(Math.sin(i + k * 0.9)) * 40 + 5);
    filas.push({ id: i, ticker, nombre, tipo: i % 3 ? 'Acción' : 'ETF', serie, precio: 100 + ((i * 37) % 500) / 3, delta: (((i * 13) % 41) - 20) / 10, cantidad: (i * 7) % 1000, pnl: ((i * 17) % 2000) - 1000, rating: i % 6 });
  }
  return filas;
}

const COLUMNAS_FINANCIERAS = [
  { headerName: 'Instrumento', children: [
    { field: 'ticker', headerName: 'Ticker', pinned: 'left', width: 210, cellRenderer: 'ticker', cellRendererParams: { subField: 'nombre' } },
    { field: 'tipo', headerName: 'Tipo', width: 100, cellRenderer: 'pill' },
  ] },
  { headerName: 'Mercado', children: [
    { field: 'serie', headerName: 'Tendencia', width: 150, cellRenderer: 'sparkline', cellRendererParams: { tipo: 'bar' }, filter: false, sortable: false },
    { field: 'precio', headerName: 'Precio', width: 120, cellRenderer: 'moneda', cellRendererParams: { currency: 'USD' }, enableCellChangeFlash: true },
    { field: 'delta', headerName: 'Δ %', width: 110, cellRenderer: 'delta', cellRendererParams: { conSigno: true, decimales: 2 } },
  ] },
  { field: 'cantidad', headerName: 'Cantidad', width: 110, cellRenderer: 'numero', enableCellChangeFlash: true },
  { field: 'pnl', headerName: 'P&L', width: 130, cellRenderer: 'moneda', cellRendererParams: { currency: 'USD' }, enableCellChangeFlash: true },
  { field: 'rating', headerName: 'Rating', width: 120, cellRenderer: 'rating' },
];

function montarFinanciero(root: HTMLElement): void {
  const g = root.querySelector<HTMLElement>('#grid-financiero') as (HTMLElement & { gridOptions: unknown }) | null;
  if (!g) return;
  g.gridOptions = {
    defaultColDef: { resizable: true, floatingFilter: true },
    statusBar: { statusPanels: [{ statusPanel: 'agTotalAndFilteredRowCountComponent' }] },
    sideBar: true,
    columnDefs: COLUMNAS_FINANCIERAS,
    rowData: cartera(134),
  };
}

function montarTiempoReal(root: HTMLElement): void {
  type Viva = HTMLElement & { gridOptions: unknown; api: { getRows: () => Record<string, number>[]; applyTransaction: (t: unknown) => void; setRows: (f: unknown[]) => void } };
  const g = root.querySelector<HTMLElement>('#grid-tiempo-real') as Viva | null;
  if (!g) return;
  g.gridOptions = { defaultColDef: { resizable: true }, columnDefs: COLUMNAS_FINANCIERAS, rowData: cartera(40) };
  let reloj = 0;
  let paso = 0;
  const tick = (): void => {
    const filas = g.api.getRows();
    const update = [];
    for (let i = 0; i < 6; i++) {
      paso += 1;
      const f = filas[(paso * 7) % filas.length]!;
      const cambio = Math.sin(paso) * 4;
      update.push({ ...f, precio: f['precio']! + cambio, delta: cambio, pnl: f['pnl']! + cambio * 10 });
    }
    g.api.applyTransaction({ update });
  };
  root.querySelector('#btnTick')?.addEventListener('click', () => {
    if (reloj) {
      clearInterval(reloj);
      reloj = 0;
      return;
    }
    reloj = window.setInterval(tick, 400);
  });
  root.querySelector('#btn100k')?.addEventListener('click', () => g.api.setRows(cartera(100000)));
}

export async function mount(ctx: PreviewMountContext): Promise<void> {
  const root = ctx.main;
  montarFinanciero(root);
  montarTiempoReal(root);
  const log = root.querySelector<HTMLElement>('#log') || document.getElementById('log');
  const append = (line: string): void => {
    if (!log) return;
    log.textContent = `${line}\n${log.textContent}`;
    log.scrollTop = 0;
  };

  function attach(g: IswcAgGridEl | null | undefined): void {
    if (!g) return;
    g.addEventListener('iswc-cell-click', (e: Event) =>
      append(`cell-click ${(e as CustomEvent<{ column?: { field?: string }; value?: unknown }>).detail?.column?.field}=${(e as CustomEvent<{ column?: { field?: string }; value?: unknown }>).detail?.value}`));
    g.addEventListener('iswc-cell-edit', (e: Event) =>
      append(`cell-edit ${(e as CustomEvent<{ column?: { field?: string }; oldValue?: unknown; newValue?: unknown }>).detail?.column?.field}: ${(e as CustomEvent<{ column?: { field?: string }; oldValue?: unknown; newValue?: unknown }>).detail?.oldValue} → ${(e as CustomEvent<{ column?: { field?: string }; oldValue?: unknown; newValue?: unknown }>).detail?.newValue}`));
    g.addEventListener('iswc-row-select', (e: Event) =>
      append(`row-select n=${(e as CustomEvent<{ rows?: unknown[] }>).detail?.rows?.length}`));
    g.addEventListener('iswc-sort-change', (e: Event) =>
      append(`sort ${(e as CustomEvent<{ column?: string; direction?: string }>).detail?.column} ${(e as CustomEvent<{ column?: string; direction?: string }>).detail?.direction}`));
    g.addEventListener('iswc-filter-change', (e: Event) =>
      append(`filter ${(e as CustomEvent<{ column?: string; op?: string; value?: unknown }>).detail?.column} ${(e as CustomEvent<{ column?: string; op?: string; value?: unknown }>).detail?.op} ${JSON.stringify((e as CustomEvent<{ column?: string; op?: string; value?: unknown }>).detail?.value)}`));
    g.addEventListener('iswc-quick-filter', (e: Event) =>
      append(`quick-filter ${JSON.stringify((e as CustomEvent<{ value?: unknown }>).detail?.value)}`));
    g.addEventListener('iswc-action', (e: Event) =>
      append(`action ${(e as CustomEvent<{ action?: string; row?: { sku?: string } }>).detail?.action} on ${(e as CustomEvent<{ action?: string; row?: { sku?: string } }>).detail?.row?.sku ?? ''}`));
    g.addEventListener('iswc-page-change', (e: Event) =>
      append(`page ${(e as CustomEvent<{ page?: number; pageSize?: number }>).detail?.page}/${(e as CustomEvent<{ page?: number; pageSize?: number }>).detail?.pageSize}`));
    g.addEventListener('iswc-column-reorder', (e: Event) =>
      append(`reorder ${(e as CustomEvent<{ colId?: string; toIndex?: number }>).detail?.colId} → ${(e as CustomEvent<{ colId?: string; toIndex?: number }>).detail?.toIndex}`));
    g.addEventListener('iswc-column-resize', (e: Event) =>
      append(`resize ${(e as CustomEvent<{ colId?: string; width?: number }>).detail?.colId} → ${(e as CustomEvent<{ colId?: string; width?: number }>).detail?.width}`));
    g.addEventListener('iswc-column-pin', (e: Event) =>
      append(`pin ${(e as CustomEvent<{ colId?: string; side?: string }>).detail?.colId} ${(e as CustomEvent<{ colId?: string; side?: string }>).detail?.side}`));
    g.addEventListener('iswc-column-hide', (e: Event) =>
      append(`hide ${(e as CustomEvent<{ colId?: string }>).detail?.colId}`));
  }

  const g = (root.querySelector<HTMLElement>('#grid') || document.getElementById('grid')) as IswcAgGridEl | null;
  attach(g);
  attach((root.querySelector<HTMLElement>('#grid-density') || document.getElementById('grid-density')) as IswcAgGridEl | null);
  attach((root.querySelector<HTMLElement>('#grid-grouping') || document.getElementById('grid-grouping')) as IswcAgGridEl | null);
  attach((root.querySelector<HTMLElement>('#grid-filters') || document.getElementById('grid-filters')) as IswcAgGridEl | null);

  const on = (id: string, fn: () => void): void => {
    const el = root.querySelector<HTMLElement>(`#${id}`) || document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
  };

  on('btnSelAll', () => g?.api?.selectAll?.());
  on('btnCSV', () => g?.api?.exportCSV?.('catalogo.csv'));
  on('btnPage2', () => g?.api?.goToPage?.(2));

  const gDensity = (root.querySelector<HTMLElement>('#grid-density') || document.getElementById('grid-density')) as IswcAgGridEl | null;
  on('btnCompact', () => gDensity?.api?.setDensity?.('compact'));
  on('btnNormal', () => gDensity?.api?.setDensity?.('normal'));
  on('btnComfy', () => gDensity?.api?.setDensity?.('comfortable'));
  on('btnResetState', () => gDensity?.api?.resetPersistedState?.());
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}
