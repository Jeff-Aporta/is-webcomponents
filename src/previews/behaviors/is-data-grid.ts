import { paint } from '../../components/_shared/highlight-code.js';

/**
 * Behavior migrado desde HTML inline de is-data-grid.
 * Se ejecuta en mount() tras pintar la definition JSON.
 * @param {import('../_kit/types.d.ts').PreviewMountContext} ctx
 */
export async function mount(ctx: import('../_kit/types.d.ts').PreviewMountContext) {
  const root = ctx.main;
  void root;
  /* ── Datos de ejemplo ─────────────────────────────────────────────── */
      const CITIES = ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga', 'Pereira'];
      const NAMES = ['Ana', 'Luis', 'María', 'Carlos', 'Sofía', 'Diego', 'Valentina', 'Andrés', 'Camila', 'Julián', 'Laura', 'Pedro', 'Elena', 'Mateo', 'Lucía', 'Tomás'];
      const ROLES = ['Dev', 'QA', 'PM'];
  
      const makeRows = (n, offset = 0) => Array.from({ length: n }, (_, k) => {
        const i = k + offset;
        return {
          id: i + 1,
          name: `${NAMES[i % NAMES.length]} ${String.fromCharCode(65 + (i % 26))}.`,
          email: `${NAMES[i % NAMES.length].toLowerCase()}${i}@insoft.co`,
          city: CITIES[i % CITIES.length],
          role: ROLES[(i + Math.floor(i / CITIES.length)) % ROLES.length],
          gross: 1200 + ((i * 617) % 9000),
          costs: 400 + ((i * 233) % 3000),
          taxRate: [0.19, 0.05, 0.1][i % 3],
          hired: new Date(2019 + (i % 6), i % 12, 1 + (i % 27)),
          active: i % 4 !== 0,
        };
      });
  
      const rows = makeRows(60);
  
      const tagCell = ({ value }) => {
        const el = document.createElement('span');
        el.className = `tag-cell ${value ? 'tag-ok' : 'tag-no'}`;
        el.textContent = value ? 'activo' : 'baja';
        return el;
      };
  
      const money = (v) => (v == null ? '' : v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }));
  
      const baseColumns = () => [
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
          valueGetter: (v, row) => row.gross - row.costs,
          valueFormatter: money,
        },
        {
          field: 'taxRate',
          headerName: 'IVA',
          type: 'number',
          width: 90,
          valueGetter: (v: number) => Math.round(v * 100),
          valueFormatter: (v) => `${v}%`,
        },
        { field: 'hired', headerName: 'Alta', type: 'date', width: 120, editable: true },
        { field: 'active', headerName: 'Estado', type: 'boolean', width: 110, renderCell: tagCell, editable: true },
      ];
  
      const actionsColumn = (grid) => ({
        field: 'acciones',
        type: 'actions',
        headerName: '',
        width: 90,
        getActions: ({ row, id }) => [
          { label: `Ver ${row.name}`, icon: '👁', onClick: () => { grid.dispatchEvent(new CustomEvent('demo-view', { detail: row })); } },
          { label: 'Duplicar', icon: '⧉', showInMenu: true, onClick: () => { grid.rows = [...grid.rows, { ...row, id: Date.now() }]; } },
          { label: 'Borrar', icon: '🗑', showInMenu: true, onClick: () => { grid.rows = grid.rows.filter((r) => r.id !== id); } },
        ],
      });
  
      /* ── 1. Grid completo ─────────────────────────────────────────────── */
      const full = document.getElementById('g-full');
      full.columns = [...baseColumns(), actionsColumn(full)];
      full.rows = rows.slice(0, 40);
      full.aggregationModel = { gross: 'sum', costs: 'sum', profit: 'avg' };
      const outFull = document.getElementById('out-full');
      const logTo = (el) => (e) => { el.textContent = `${e.type} → ${JSON.stringify(e.detail, replacer).slice(0, 220)}`; };
      const replacer = (key, value) => (key === 'selectedRows' || key === 'row' ? undefined : value);
  
      // Rellena el <pre data-code-id="g-full"> con un snippet autocontenido
      // (columnas + filas + aggregation) que reproduce la tabla del #intro.
      {
        const introCode = document.querySelector<HTMLElement>('[data-code-id="g-full"]');
        if (introCode) {
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
          if (introCode.localName === 'is-code') introCode.value = code;
          else introCode.textContent = code;
          paint(introCode);
        }
      }
      for (const type of ['is-sort-change', 'is-filter-change', 'is-select', 'is-page-change', 'is-row-update', 'is-column-pin', 'is-export']) {
        full.addEventListener(type, logTo(outFull));
      }
      full.addEventListener('demo-view', (e) => { outFull.textContent = `acción Ver → ${e.detail.name}`; });
  
      /* ── 2. Columnas y tipos ──────────────────────────────────────────── */
      const cols = document.getElementById('g-cols');
      cols.columns = baseColumns();
      cols.rows = rows.slice(0, 12);
  
      /* ── 3. Ancho, anclaje, grupos, colSpan ───────────────────────────── */
      const layout = document.getElementById('g-layout');
      layout.columns = [
        ...baseColumns().map((c) => (c.field === 'name'
          ? { ...c, colSpan: (v, row) => (row.id % 7 === 0 ? 2 : 1) }
          : c)),
        actionsColumn(layout),
      ];
      layout.rows = rows.slice(0, 14);
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
  
      /* ── 4. Edición ───────────────────────────────────────────────────── */
      const edit = document.getElementById('g-edit');
      edit.columns = baseColumns().map((c) => (c.field === 'name'
        ? {
          ...c,
          preProcessEditCellProps: ({ props }) => ({
            ...props,
            error: String(props.value || '').trim() === '' ? 'El nombre es obligatorio' : null,
          }),
        }
        : { ...c, editable: c.field !== 'id' && c.field !== 'profit' && c.field !== 'taxRate' }));
      edit.rows = rows.slice(0, 12).map((r) => ({ ...r }));
      const outEdit = document.getElementById('out-edit');
      edit.hooks = {
        processRowUpdate: (next) => {
          if (!String(next.name || '').trim()) throw new Error('nombre vacío');
          outEdit.textContent = `guardado #${next.id} → ${next.name} · ${money(next.gross)}`;
          return next;
        },
      };
      for (const type of ['is-edit-start', 'is-edit-stop', 'is-copy', 'is-paste', 'is-undo', 'is-redo']) {
        edit.addEventListener(type, (e) => { outEdit.textContent = `${e.type} → ${JSON.stringify(e.detail, replacer)}`; });
      }
  
      /* ── 5. Selección ─────────────────────────────────────────────────── */
      const select = document.getElementById('g-select');
      select.columns = baseColumns().slice(0, 7);
      select.rows = rows.slice(0, 15);
      select.hooks = { isRowSelectable: ({ row }) => row.active };
      const outSelect = document.getElementById('out-select');
      select.addEventListener('is-select', (e) => { outSelect.textContent = `filas → [${e.detail.rowSelectionModel.join(', ')}]`; });
      select.addEventListener('is-cell-select', (e) => {
        const { start, end } = e.detail.cellSelectionModel || {};
        outSelect.textContent = `rango → ${start?.id}:${start?.field} … ${end?.id}:${end?.field}`;
      });
  
      /* ── 6. Orden y filtros ───────────────────────────────────────────── */
      const sort = document.getElementById('g-sort');
      sort.columns = baseColumns();
      sort.rows = rows.slice(0, 30);
      const outSort = document.getElementById('out-sort');
      sort.addEventListener('is-sort-change', (e) => { outSort.textContent = `sortModel → ${JSON.stringify(e.detail.sortModel)}`; });
      sort.addEventListener('is-filter-change', (e) => { outSort.textContent = `filterModel → ${JSON.stringify(e.detail.filterModel)}`; });
  
      /* ── 7. Agrupación y tree data ────────────────────────────────────── */
      const group = document.getElementById('g-group');
      group.columns = baseColumns();
      group.rows = rows.slice(0, 30);
      group.rowGroupingModel = ['city'];
      group.aggregationModel = { gross: 'sum', profit: 'avg' };
      group.expandAll();
  
      const tree = document.getElementById('g-tree');
      const files = [
        { id: 'f1', path: ['src'], name: 'src', size: null, kind: 'carpeta' },
        { id: 'f2', path: ['src', 'components'], name: 'components', size: null, kind: 'carpeta' },
        { id: 'f3', path: ['src', 'components', 'grid.js'], name: 'grid.js', size: 48120, kind: 'módulo' },
        { id: 'f4', path: ['src', 'components', 'grid.css'], name: 'grid.css', size: 9210, kind: 'estilo' },
        { id: 'f5', path: ['src', 'index.js'], name: 'index.js', size: 1240, kind: 'módulo' },
        { id: 'f6', path: ['docs'], name: 'docs', size: null, kind: 'carpeta' },
        { id: 'f7', path: ['docs', 'README.md'], name: 'README.md', size: 4300, kind: 'texto' },
      ];
      tree.columns = [
        { field: 'kind', headerName: 'Tipo', width: 120 },
        { field: 'size', headerName: 'Tamaño', type: 'number', width: 140, valueFormatter: (v: number) => (v == null ? '—' : `${(v / 1024).toFixed(1)} KB`) },
      ];
      tree.hooks = { getTreeDataPath: (row) => row.path };
      tree.rows = files;
      tree.aggregationModel = { size: 'sum' };
      tree.expandAll();
  
      /* ── 8. Pivot ─────────────────────────────────────────────────────── */
      const pivot = document.getElementById('g-pivot');
      pivot.columns = baseColumns();
      pivot.rows = rows;
      pivot.pivotModel = { rows: ['city'], columns: ['role'], values: [{ field: 'gross', fn: 'sum' }] };
  
      /* ── 9. Detail panel y filas ancladas ─────────────────────────────── */
      const detail = document.getElementById('g-detail');
      detail.columns = baseColumns().slice(0, 6);
      detail.rows = rows.slice(0, 12).map((r) => ({ ...r }));
      detail.pinnedRows = {
        top: [{ ...rows[0], id: 'top-1', name: 'Fila anclada arriba' }],
        bottom: [{ ...rows[1], id: 'bottom-1', name: 'Fila anclada abajo' }],
      };
      detail.hooks = {
        getDetailPanelContent: ({ row }) => {
          const box = document.createElement('div');
          box.innerHTML = `<strong>${row.name}</strong><br>${row.email}<br>Ciudad: ${row.city} · Rol: ${row.role}<br>Margen: ${money(row.gross - row.costs)}`;
          return box;
        },
      };
  
      /* ── 10. Virtualización y carga incremental ───────────────────────── */
      const virtual = document.getElementById('g-virtual');
      virtual.columns = baseColumns();
      virtual.rows = makeRows(50000);
      const outVirtual = document.getElementById('out-virtual');
      virtual.addEventListener('is-rows-scroll-end', () => { outVirtual.textContent = `is-rows-scroll-end → ${virtual.rows.length} filas cargadas`; });
  
      /* ── 11. Densidad, list view y overlays ───────────────────────────── */
      const density = document.getElementById('g-density');
      const densityRows = rows.slice(0, 20);
      density.columns = baseColumns();
      density.rows = densityRows;
      density.listViewColumn = {
        field: 'name',
        headerName: 'Personas',
        renderCell: ({ row }) => {
          const box = document.createElement('div');
          box.style.cssText = 'display:flex;justify-content:space-between;gap:1em;width:100%';
          box.innerHTML = `<span><strong>${row.name}</strong> · ${row.city}</span><span>${money(row.gross)}</span>`;
          return box;
        },
      };
  
      /* ── Controles de las demos ───────────────────────────────────────── */
      const actions = {
        'pin-left': () => layout.pinColumn('id', 'left'),
        'pin-right': () => layout.pinColumn('acciones', 'right'),
        unpin: () => { layout.pinnedColumns = { left: [], right: [] }; },
        autosize: () => layout.autosizeColumns(),
        'hide-city': () => layout.setColumnVisibility('city', layout.columnVisibilityModel.city === false),
        'edit-cell': () => { edit.editMode = 'cell'; },
        'edit-row': () => { edit.editMode = 'row'; },
        undo: () => edit.undo(),
        redo: () => edit.redo(),
        'select-all': () => select.selectAll(true),
        'select-none': () => select.selectAll(false),
        copy: () => select.copySelectionToClipboard(),
        'sort-multi': () => sort.setSortModel([{ field: 'role', sort: 'asc' }, { field: 'gross', sort: 'desc' }]),
        'filter-set': () => sort.setFilterModel({
          items: [
            { field: 'gross', operator: '>', value: 5000 },
            { field: 'active', operator: 'is', value: 'true' },
          ],
          logicOperator: 'and',
        }),
        'filter-or': () => sort.setFilterModel({ ...sort.filterModel, logicOperator: 'or' }),
        'filter-clear': () => sort.setFilterModel({ items: [] }),
        'group-city': () => { group.setRowGroupingModel(['city']); group.expandAll(); },
        'group-city-role': () => { group.setRowGroupingModel(['city', 'role']); group.expandAll(); },
        'group-none': () => group.setRowGroupingModel([]),
        expand: () => group.expandAll(),
        collapse: () => group.collapseAll(),
        'd-compact': () => density.setDensity('compact'),
        'd-standard': () => density.setDensity('standard'),
        'd-comfortable': () => density.setDensity('comfortable'),
        'list-view': () => { density.listView = !density.listView; },
        loading: () => { density.setAttribute('loading-variant', 'spinner'); density.loading = !density.loading; },
        'loading-skeleton': () => { density.setAttribute('loading-variant', 'skeleton'); density.loading = true; },
        'loading-progress': () => { density.setAttribute('loading-variant', 'progress'); density.loading = true; },
        empty: () => { density.rows = []; },
        restore: () => { density.loading = false; density.listView = false; density.rows = densityRows; },
        csv: () => full.exportDataAsCsv({ fileName: 'personas.csv' }),
        excel: () => full.exportDataAsExcel({ fileName: 'personas.xls' }),
        print: () => full.exportDataAsPrint(),
      };
      document.querySelectorAll<HTMLButtonElement>('.demo-bar button').forEach((btn: HTMLElement) => {
        btn.addEventListener('click', () => actions[btn.dataset.act]?.());
      });
}

export function unmount() {
  /* no-op: listeners del HTML legado no tenían teardown */
}
