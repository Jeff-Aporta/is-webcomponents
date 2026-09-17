import { paint } from '../_shared/highlight-code.js';
import type { ColumnDef, Row } from '../_shared/grid-types.js';

/** El componente `is-data-grid` visto desde fuera: HTMLElement con API extendida. */
type DataGridElement = HTMLElement & {
  columns: ColumnDef[];
  rows: Row[];
  pinnedRows: { top: Row[]; bottom: Row[] };
  sortModel: Array<{ field: string; sort: string | null }>;
  filterModel: { items: Array<{ field?: string; operator?: string; value?: unknown }>; logicOperator: string };
  quickFilterValue: string;
  columnVisibilityModel: Record<string, boolean>;
  pinnedColumns: { left: string[]; right: string[] };
  columnOrder: string[];
  columnGroupingModel: Array<Record<string, unknown>>;
  rowGroupingModel: string[];
  aggregationModel: Record<string, string>;
  pivotModel: { rows: string[]; columns: string[]; values: Array<{ field: string; fn: string }> } | null;
  listViewColumn: Partial<ColumnDef> | null;
  paginationModel: { page: number; pageSize: number };
  rowSelectionModel: unknown[];
  selectedRows: Row[];
  selectedIndices: number[];
  cellSelectionModel: { start: { id: unknown; field: string }; end: { id: unknown; field: string } } | null;
  hooks: Record<string, unknown>;
  density: string;
  editMode: 'cell' | 'row';
  listView: boolean;
  loading: boolean;
  setSortModel(m: Array<{ field: string; sort: string | null }>): void;
  setFilterModel(m: { items?: Array<{ field?: string; operator?: string; value?: unknown }>; logicOperator?: string }): void;
  pinColumn(f: string, side: 'left' | 'right' | null): void;
  autosizeColumns(): void;
  setColumnVisibility(f: string, v: boolean): void;
  setRowGroupingModel(m: string[]): void;
  setDensity(v: string): void;
  expandAll(): void;
  collapseAll(): void;
  setQuickFilter(v: string): void;
  setPage(page: number): void;
  setPageSize(size: number): void;
  selectAll(v: boolean): void;
  copySelectionToClipboard(): string;
  undo(): void;
  redo(): void;
  exportDataAsCsv(opts?: { fileName?: string }): void;
  exportDataAsExcel(opts?: { fileName?: string }): void;
  exportDataAsPrint(): void;
};

/**
 * Behavior migrado desde HTML inline de is-data-grid.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param ctx Contexto de montaje (root, main, aside, definition).
 */
export async function mount(ctx: import('../../previews/_kit/types.d.ts').PreviewMountContext): Promise<void> {
  const root = ctx.main;
  void root;
  /* ── Datos de ejemplo ─────────────────────────────────────────────── */
      const CITIES: string[] = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Pereira'];
      const NAMES: string[] = ['Ana', 'Luis', 'María', 'Carlos', 'Sofía', 'Diego', 'Valentina', 'Andrés', 'Camila', 'Julián', 'Laura', 'Pedro', 'Elena', 'Mateo', 'Lucía', 'Tomás'];
      const ROLES: string[] = ['Dev', 'QA', 'PM'];

      interface DemoRow extends Row {
        id: number;
        name: string;
        email: string;
        city: string;
        role: string;
        gross: number;
        costs: number;
        taxRate: number;
        hired: Date;
        active: boolean;
      }

      const makeRows = (n: number, offset = 0): DemoRow[] => Array.from({ length: n }, (_, k) => {
        const i = k + offset;
        return {
          id: i + 1,
          name: `${NAMES[i % NAMES.length]!} ${String.fromCharCode(65 + (i % 26))}.`,
          email: `${NAMES[i % NAMES.length]!.toLowerCase()}${i}@insoft.co`,
          city: CITIES[i % CITIES.length]!,
          role: ROLES[(i + Math.floor(i / CITIES.length)) % ROLES.length]!,
          gross: 1200 + ((i * 617) % 9000),
          costs: 400 + ((i * 233) % 3000),
          taxRate: [0.19, 0.05, 0.1][i % 3]!,
          hired: new Date(2019 + (i % 6), i % 12, 1 + (i % 27)),
          active: i % 4 !== 0,
        };
      });

      const rows = makeRows(60);

      const tagCell = ({ value }: { value: unknown }): HTMLElement => {
        const el = document.createElement('span');
        el.className = `tag-cell ${value ? 'tag-ok' : 'tag-no'}`;
        el.textContent = value ? 'activo' : 'baja';
        return el;
      };

      const money = (v: unknown): string => (v == null ? '' : Number(v).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }));

      const baseColumns = (): ColumnDef[] => [
        { field: 'id', headerName: 'ID', type: 'number', width: 64 },
        { field: 'name', headerName: 'Nombre', flex: 1, minWidth: 150, editable: true },
        { field: 'email', headerName: 'Email', flex: 1.4, minWidth: 200 },
        { field: 'city', headerName: 'Ciudad', width: 140, type: 'singleSelect', valueOptions: CITIES, editable: true },
        { field: 'role', headerName: 'Rol', width: 100, type: 'singleSelect', valueOptions: ROLES, editable: true },
        { field: 'gross', headerName: 'Bruto', type: 'number', width: 130, valueFormatter: money, editable: true },
        { field: 'costs', headerName: 'Costes', type: 'number', width: 120, valueFormatter: money },
        {
          field: 'profit',
          headerName: 'Margen',
          type: 'number',
          width: 130,
          valueGetter: (_v: unknown, row: Row) => Number(row['gross']) - Number(row['costs']),
          valueFormatter: money,
        },
        {
          field: 'taxRate',
          headerName: 'IVA',
          type: 'number',
          width: 90,
          valueGetter: (v: unknown) => Math.round(Number(v) * 100),
          valueFormatter: (v: unknown) => `${v}%`,
        },
        { field: 'hired', headerName: 'Alta', type: 'date', width: 120, editable: true },
        { field: 'active', headerName: 'Estado', type: 'boolean', width: 110, renderCell: tagCell, editable: true },
      ];

      const actionsColumn = (grid: DataGridElement): ColumnDef => ({
        field: 'acciones',
        type: 'actions',
        headerName: '',
        width: 90,
        getActions: ({ row, id }: { row: Row; id: unknown }) => [
          { label: `Ver ${row['name'] as string}`, icon: '👁', onClick: () => { grid.dispatchEvent(new CustomEvent('demo-view', { detail: row })); } },
          { label: 'Duplicar', icon: '⧉', showInMenu: true, onClick: () => { grid.rows = [...grid.rows, { ...row, id: Date.now() } as Row]; } },
          { label: 'Borrar', icon: '🗑', showInMenu: true, onClick: () => { grid.rows = grid.rows.filter((r: Row) => r['id'] !== id); } },
        ],
      });

      /** Helper: cast seguro de `document.getElementById` a IsDataGrid. */
      const $grid = (id: string): DataGridElement | null => {
        const el = document.getElementById(id);
        return el as DataGridElement | null;
      };

      /** Helper: cast seguro de `document.getElementById` a HTMLElement. */
      const $el = (id: string): HTMLElement | null => document.getElementById(id);

      /* ── 1. Grid completo ─────────────────────────────────────────────── */
      const full = $grid('g-full');
      if (full) {
        full.columns = [...baseColumns(), actionsColumn(full)];
        full.rows = rows.slice(0, 40) as unknown as Row[];
        full.aggregationModel = { gross: 'sum', costs: 'sum', profit: 'avg' };
      }
      const outFull = $el('out-full');
      const logTo = (el: HTMLElement | null) => (e: Event): void => {
        const detail = (e as CustomEvent).detail;
        if (el) el.textContent = `${e.type} → ${JSON.stringify(detail, replacer).slice(0, 220)}`;
      };
      const replacer = (key: string, value: unknown): unknown => (key === 'selectedRows' || key === 'row' ? undefined : value);

      // Rellena el <pre data-code-id="g-full"> con un snippet autocontenido
      // (columnas + filas + aggregation) que reproduce la tabla del #intro.
      {
        const introCode = document.querySelector<HTMLElement>('[data-code-id="g-full"]');
        if (introCode && full) {
          const cols = [...baseColumns(), actionsColumn(full)];
          const sampleRows = rows.slice(0, 40).map((r) => ({
            ...r,
            hired: r.hired instanceof Date ? r.hired.toISOString().slice(0, 10) : r.hired,
          }));
          const code = [
            '<is-data-grid show-toolbar quick-filter checkbox-selection',
            '  pagination page-size="10" page-size-options="10,25,50"',
            '  editable undo-redo clipboard tab-navigation="all" style="height:30rem">',
            '  <!-- Reemplaza tagCell / money por tus helpers reales -->',
            '  <script>',
            '    const tagCell = ({ value }) => {',
            '      const el = document.createElement("span");',
            '      el.className = `tag-cell ${value ? "tag-ok" : "tag-no"}`;',
            '      el.textContent = value ? "activo" : "baja";',
            '      return el;',
            '    };',
            '    const money = (v) => v == null ? "" : v.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });',
            '',
            '    grid.columns = ' + JSON.stringify(cols, null, 2) + ';',
            '    grid.rows    = ' + JSON.stringify(sampleRows, null, 2) + ';',
            '    grid.aggregationModel = ' + JSON.stringify({ gross: 'sum', costs: 'sum', profit: 'avg' }, null, 2) + ';',
            '  </' + 'script>',
            '</' + 'is-data-grid>',
          ].join('\n');
          if (introCode.localName === 'is-code') (introCode as unknown as { value: string }).value = code;
          else introCode.textContent = code;
          paint(introCode as unknown as Document);
        }
      }
      for (const type of ['is-sort-change', 'is-filter-change', 'is-select', 'is-page-change', 'is-row-update', 'is-column-pin', 'is-export']) {
        full?.addEventListener(type, logTo(outFull));
      }
      full?.addEventListener('demo-view', (e: Event) => {
        const detail = (e as CustomEvent).detail as Row;
        if (outFull) outFull.textContent = `acción Ver → ${detail['name']}`;
      });

      /* ── 2. Columnas y tipos ──────────────────────────────────────────── */
      const cols = $grid('g-cols');
      if (cols) {
        cols.columns = baseColumns();
        cols.rows = rows.slice(0, 12) as unknown as Row[];
      }

      /* ── 3. Ancho, anclaje, grupos, colSpan ───────────────────────────── */
      const layout = $grid('g-layout');
      if (layout) {
        layout.columns = [
          ...baseColumns().map((c: ColumnDef) => (c.field === 'name'
            ? { ...c, colSpan: (_v: unknown, row: Row) => ((row['id'] as number) % 7 === 0 ? 2 : 1) }
            : c)),
          actionsColumn(layout),
        ];
        layout.rows = rows.slice(0, 14) as unknown as Row[];
        layout.columnGroupingModel = [
          {
            groupId: 'persona',
            headerName: 'Persona',
            children: [
              { groupId: 'ident', headerName: 'Identidad', children: [{ field: 'name' }, { field: 'email' }] },
              { field: 'city' },
              { field: 'role' },
            ],
          },
          {
            groupId: 'dinero',
            headerName: 'Económico',
            children: [{ field: 'gross' }, { field: 'costs' }, { field: 'profit' }, { field: 'taxRate' }],
          },
        ];
      }

      /* ── 4. Edición ───────────────────────────────────────────────────── */
      const edit = $grid('g-edit');
      if (edit) {
        edit.columns = baseColumns().map((c: ColumnDef) => (c.field === 'name'
          ? {
            ...c,
            preProcessEditCellProps: ({ props }: { props: { value: unknown } }) => ({
              ...props,
              error: String(props.value || '').trim() === '' ? 'El nombre es obligatorio' : null,
            }),
          }
          : { ...c, editable: c.field !== 'id' && c.field !== 'profit' && c.field !== 'taxRate' }));
        edit.rows = rows.slice(0, 12).map((r) => ({ ...r })) as unknown as Row[];
        const outEdit = $el('out-edit');
        edit.hooks = {
          processRowUpdate: (next: Row) => {
            if (!String(next['name'] || '').trim()) throw new Error('nombre vacío');
            if (outEdit) outEdit.textContent = `guardado #${next['id']} → ${next['name']} · ${money(next['gross'])}`;
            return next;
          },
        };
        for (const type of ['is-edit-start', 'is-edit-stop', 'is-copy', 'is-paste', 'is-undo', 'is-redo']) {
          edit.addEventListener(type, (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (outEdit) outEdit.textContent = `${e.type} → ${JSON.stringify(detail, replacer)}`;
          });
        }
      }

      /* ── 5. Selección ─────────────────────────────────────────────────── */
      const select = $grid('g-select');
      if (select) {
        select.columns = baseColumns().slice(0, 7);
        select.rows = rows.slice(0, 15) as unknown as Row[];
        select.hooks = { isRowSelectable: ({ row }: { row: Row }) => Boolean(row['active']) };
        const outSelect = $el('out-select');
        select.addEventListener('is-select', (e: Event) => {
          const detail = (e as CustomEvent).detail as { rowSelectionModel: unknown[] };
          const ids = detail.rowSelectionModel as number[];
          if (outSelect) outSelect.textContent = `filas → [${ids.join(', ')}]`;
        });
        select.addEventListener('is-cell-select', (e: Event) => {
          const detail = (e as CustomEvent).detail as { cellSelectionModel: { start: { id: unknown; field: string }; end: { id: unknown; field: string } } };
          const start = detail.cellSelectionModel?.start;
          const end = detail.cellSelectionModel?.end;
          if (outSelect) outSelect.textContent = `rango → ${start?.id}:${start?.field} … ${end?.id}:${end?.field}`;
        });
      }

      /* ── 6. Orden y filtros ───────────────────────────────────────────── */
      const sort = $grid('g-sort');
      if (sort) {
        sort.columns = baseColumns();
        sort.rows = rows.slice(0, 30) as unknown as Row[];
        const outSort = $el('out-sort');
        sort.addEventListener('is-sort-change', (e: Event) => {
          const detail = (e as CustomEvent).detail as { sortModel: unknown };
          if (outSort) outSort.textContent = `sortModel → ${JSON.stringify(detail.sortModel)}`;
        });
        sort.addEventListener('is-filter-change', (e: Event) => {
          const detail = (e as CustomEvent).detail as { filterModel: unknown };
          if (outSort) outSort.textContent = `filterModel → ${JSON.stringify(detail.filterModel)}`;
        });
      }

      /* ── 7. Agrupación y tree data ────────────────────────────────────── */
      const group = $grid('g-group');
      if (group) {
        group.columns = baseColumns();
        group.rows = rows.slice(0, 30) as unknown as Row[];
        group.rowGroupingModel = ['city'];
        group.aggregationModel = { gross: 'sum', profit: 'avg' };
        group.expandAll();
      }

      const tree = $grid('g-tree');
      const files = [
        { id: 'f1', path: ['src'], name: 'src', size: null, kind: 'carpeta' },
        { id: 'f2', path: ['src', 'components'], name: 'components', size: null, kind: 'carpeta' },
        { id: 'f3', path: ['src', 'components', 'grid.js'], name: 'grid.js', size: 48120, kind: 'módulo' },
        { id: 'f4', path: ['src', 'components', 'grid.css'], name: 'grid.css', size: 9210, kind: 'estilo' },
        { id: 'f5', path: ['src', 'index.js'], name: 'index.js', size: 1240, kind: 'módulo' },
        { id: 'f6', path: ['docs'], name: 'docs', size: null, kind: 'carpeta' },
        { id: 'f7', path: ['docs', 'README.md'], name: 'README.md', size: 4300, kind: 'texto' },
      ];
      if (tree) {
        tree.columns = [
          { field: 'kind', headerName: 'Tipo', width: 120 },
          { field: 'size', headerName: 'Tamaño', type: 'number', width: 140, valueFormatter: (v: unknown) => (v == null ? '—' : `${(Number(v) / 1024).toFixed(1)} KB`) },
        ];
        tree.hooks = { getTreeDataPath: (row: Row) => row['path'] as readonly string[] };
        tree.rows = files as unknown as Row[];
        tree.aggregationModel = { size: 'sum' };
        tree.expandAll();
      }

      /* ── 8. Pivot ─────────────────────────────────────────────────────── */
      const pivot = $grid('g-pivot');
      if (pivot) {
        pivot.columns = baseColumns();
        pivot.rows = rows as unknown as Row[];
        pivot.pivotModel = { rows: ['city'], columns: ['role'], values: [{ field: 'gross', fn: 'sum' }] };
      }

      /* ── 9. Detail panel y filas ancladas ─────────────────────────────── */
      const detail = $grid('g-detail');
      if (detail) {
        detail.columns = baseColumns().slice(0, 6);
        detail.rows = rows.slice(0, 12).map((r) => ({ ...r })) as unknown as Row[];
        detail.pinnedRows = {
          top: [{ ...rows[0]!, id: 'top-1', name: 'Fila anclada arriba' } as unknown as Row],
          bottom: [{ ...rows[1]!, id: 'bottom-1', name: 'Fila anclada abajo' } as unknown as Row],
        };
        detail.hooks = {
          getDetailPanelContent: ({ row }: { row: Row }) => {
            const box = document.createElement('div');
            box.innerHTML = `<strong>${row['name']}</strong><br>${row['email']}<br>Ciudad: ${row['city']} · Rol: ${row['role']}<br>Margen: ${money(Number(row['gross']) - Number(row['costs']))}`;
            return box;
          },
        };
      }

      /* ── 10. Virtualización y carga incremental ───────────────────────── */
      const virtual = $grid('g-virtual');
      if (virtual) {
        virtual.columns = baseColumns();
        virtual.rows = makeRows(50000) as unknown as Row[];
        const outVirtual = $el('out-virtual');
        virtual.addEventListener('is-rows-scroll-end', () => {
          if (outVirtual) outVirtual.textContent = `is-rows-scroll-end → ${virtual.rows.length} filas cargadas`;
        });
      }

      /* ── 11. Densidad, list view y overlays ───────────────────────────── */
      const density = $grid('g-density');
      const densityRows = rows.slice(0, 20);
      if (density) {
        density.columns = baseColumns();
        density.rows = densityRows as unknown as Row[];
        density.listViewColumn = {
          field: 'name',
          headerName: 'Personas',
          renderCell: ({ row }: { row: Row }) => {
            const box = document.createElement('div');
            box.style.cssText = 'display:flex;justify-content:space-between;gap:1em;width:100%';
            box.innerHTML = `<span><strong>${row['name']}</strong> · ${row['city']}</span><span>${money(row['gross'])}</span>`;
            return box;
          },
        };
      }

      /* ── Controles de las demos ───────────────────────────────────────── */
      const actions: Record<string, () => void> = {
        'pin-left': () => layout && layout.pinColumn('id', 'left'),
        'pin-right': () => layout && layout.pinColumn('acciones', 'right'),
        unpin: () => { if (layout) layout.pinnedColumns = { left: [], right: [] }; },
        autosize: () => layout && layout.autosizeColumns(),
        'hide-city': () => layout && layout.setColumnVisibility('city', layout.columnVisibilityModel['city'] === false),
        'edit-cell': () => { if (edit) edit.editMode = 'cell'; },
        'edit-row': () => { if (edit) edit.editMode = 'row'; },
        undo: () => edit && edit.undo(),
        redo: () => edit && edit.redo(),
        'select-all': () => select && select.selectAll(true),
        'select-none': () => select && select.selectAll(false),
        copy: () => select && select.copySelectionToClipboard(),
        'sort-multi': () => sort && sort.setSortModel([{ field: 'role', sort: 'asc' }, { field: 'gross', sort: 'desc' }]),
        'filter-set': () => sort && sort.setFilterModel({
          items: [
            { field: 'gross', operator: '>', value: 5000 },
            { field: 'active', operator: 'is', value: 'true' },
          ],
          logicOperator: 'and',
        }),
        'filter-or': () => sort && sort.setFilterModel({ ...sort.filterModel, logicOperator: 'or' }),
        'filter-clear': () => sort && sort.setFilterModel({ items: [] }),
        'group-city': () => { if (group) { group.setRowGroupingModel(['city']); group.expandAll(); } },
        'group-city-role': () => { if (group) { group.setRowGroupingModel(['city', 'role']); group.expandAll(); } },
        'group-none': () => group && group.setRowGroupingModel([]),
        expand: () => group && group.expandAll(),
        collapse: () => group && group.collapseAll(),
        'd-compact': () => density && density.setDensity('compact'),
        'd-standard': () => density && density.setDensity('standard'),
        'd-comfortable': () => density && density.setDensity('comfortable'),
        'list-view': () => { if (density) density.listView = !density.listView; },
        loading: () => {
          if (!density) return;
          density.setAttribute('loading-variant', 'spinner');
          density.loading = !density.loading;
        },
        'loading-skeleton': () => {
          if (!density) return;
          density.setAttribute('loading-variant', 'skeleton');
          density.loading = true;
        },
        'loading-progress': () => {
          if (!density) return;
          density.setAttribute('loading-variant', 'progress');
          density.loading = true;
        },
        empty: () => { if (density) density.rows = []; },
        restore: () => {
          if (!density) return;
          density.loading = false;
          density.listView = false;
          density.rows = densityRows as unknown as Row[];
        },
        csv: () => full && full.exportDataAsCsv({ fileName: 'personas.csv' }),
        excel: () => full && full.exportDataAsExcel({ fileName: 'personas.xls' }),
        print: () => full && full.exportDataAsPrint(),
      };
      document.querySelectorAll<HTMLButtonElement>('.demo-bar button').forEach((btn: HTMLButtonElement) => {
        btn.addEventListener('click', () => actions[btn.dataset.act ?? '']?.());
      });
}

export function unmount(): void {
  /* no-op: listeners del HTML legado no tenían teardown */
}