# Auditoría UI/UX: `data` + `charts` + `diagrams`

> Componentes auditados: 10 data + 13 charts + 16 diagrams = **39** elementos.
> Tests existentes: solo hacen **análisis estático del source** (`tieneShadow`, `extraerObservados`, `extraerEventos`, `extraerSlots`, `extraerParts`, `usaResizeObserver`, `usaMutationObserver`, `tieneEdgeCaseGuards`, `adoptaCss`, `cleanupCompleto`, `tieneAccesibilidad`, `leeJsonScript`, `parseaJson`, `estaRegistrado`, `tieneJsDoc`, `tieneSvg`).
>
> Motor común que cubre la mayoría de los diagramas: `src/components/_shared/diagram-element-base.ts` (scaffold, MO/RO, theme sync, lightbox), y todos los charts usan el motor `src/components/charts/chart.ts` (clase base `<is-chart>` con atributos `type, label, legend-position, index-axis, min, max, grid, stacked, without-animation, without-legend, without-tooltip, x-label, y-label, color, open-on-click`; eventos `is-render`, `is-turtle-state`, `is-open-viewer`; parts `base`, `canvas`, `legend`, `tooltip`; tooltip con `dg-tooltip__title/row/value` y `role="status"`; leyenda con `<button>` + `aria-pressed`; clamp de tooltip en bordes via `transform: translate(...)`; `open-on-click` abre `<is-diagram-lightbox>` con `kind`).
>
> **Por eso, casi nada de las propuestas siguientes está cubierto por los tests existentes.** Los actuales verifican que el código DECLARA capacidades (sombra, observados, eventos, slots, parts, MO/RO, JSON). Las siguientes verifican que el usuario puede efectivamente INTERACTUAR con esas capacidades: clicks, drags, teclas, focus, scroll, hover, gestos, etc.

---

## DATA · 10 componentes

### `<is-ag-grid>`

Archivo: `src/components/data/ag-grid.ts` (~82 KB). Wrapper de AG Grid Community con la mayor superficie de interacción de toda la librería. Atributos observados cubren decenas de casos (column-set, theme, row-selection, row-height, density, pagination, pagination-page-size, sort-mode, filter-mode, suppress-row-click-selection, suppress-column-move, suppress-column-resize, suppress-menu, animate-rows, row-group-panel, side-bar, status-bar, suppress-row-hover-highlight, etc.). Eventos: `is-grid-ready`, `is-cell-clicked`, `is-cell-double-clicked`, `is-cell-focused`, `is-cell-value-changed`, `is-column-moved`, `is-column-pinned`, `is-column-resized`, `is-column-visible`, `is-filter-changed`, `is-grid-size-changed`, `is-model-updated`, `is-pagination-changed`, `is-row-clicked`, `is-row-data-changed`, `is-row-data-updated`, `is-row-double-clicked`, `is-row-group-opened`, `is-row-selected`, `is-selection-changed`, `is-sort-changed`, `is-tool-panel-visible-changed`.

#### Tests existentes
- Solo cobertura estructural: shadow DOM, observados mínimos, eventos mínimos, parts `toolbar/viewport/header/body/row/cell/footer`, edge cases, adopta CSS, integración con `is-button/is-input/is-select/is-option/is-checkbox`, setters `columns`/`rows`, registrado, cleanup.

#### Propuestas UI/UX nuevas
1. **Click en header ordena una columna por la primera vez** — click sobre `<div class="ag-header-cell-text">` muestra el triángulo `ag-sort-indicator-container` apuntando arriba, dispara `sort: 'asc'`, emite `is-sort-changed` con `{column, direction}`, y la columna aparece con clase `ag-header-cell-sorted-asc`.
2. **Segundo click en la misma columna invierte a `desc`, tercer click la limpia (`none`)** — repetir 3 veces y verificar las 3 transiciones de icono (`asc → desc → none`).
3. **Shift-click en segundo header hace multi-orden (sort priority 2)** — debe aparecer un número `1`, `2`, `3` al lado de cada indicador según el orden; emitir `is-sort-changed` con array de varios criterios; verificar que el body reorganiza respetando `sortIndex`.
4. **Click derecho en header abre el menú de columna con `Set Filter`, `Pin`, `Auto-size`, `Group` …** — verificar submenús anidados (Pin Left/Right/None) y `Apply/Reset` en el filter modal.
5. **Arrastrar el separador entre dos columnas redimensiona** — mousedown en `.ag-header-cell-resize` + drag + mouseup; verificar `is-column-resized` con `{column, newWidth}` y `col.getActualWidth()` cambia; doble-click adyacente ejecuta `autoSizeColumn`.
6. **Drag de un header sobre la zona `row-group-panel` agrupa la columna** — soltar muestra el chip "Grouped by …" arriba; expandir/colapsar el grupo con click alterna `is-row-group-opened`.
7. **Selección simple: click fila → row selected, emite `is-row-clicked`; clic en otra fila la cambia** — verificar `gridApi.getSelectedNodes().length === 1`.
8. **Selección múltiple: Ctrl+click añade filas sin desmarcar las anteriores** — `selectionChanged` fired con N filas; Shift+click extiende el rango desde el último ancla (`lastClickedRow`).
9. **Selección total con Ctrl+A y deselección con Ctrl+Shift+A** — `gridApi.selectAllFiltered()` versus `deselectAll()`; checkbox del header refleja estado `indeterminate` cuando hay selección parcial.
10. **Fila de filtros: teclear en un input de columna filtra en vivo (mode: `quickFilter`)** — escribe "abc", verifica `is-filter-changed` y las filas visibles. Click en la `x` del input limpia el filtro.
11. **Paginación: click en página 3 +100 filas** — input "current page" acepta el número, Enter navega; ellipsis `…` cuando hay >7 páginas; `Last/First` con un solo click salta al final/inicio.
12. **Fila virtual: scroll de la rueda del ratón (wheel) por 10 000 filas sin lag perceptible** — el viewport debe mantener el FPS (requestAnimationFrame budget); tras scroll, la fila visible debe traer sus datos, no quedarse en blanco; el atributo `aria-rowindex` refleja el índice lógico (no el viewport index).
13. **Doble-click en celda editable abre el editor** — `<input class="ag-input-field-input">` recibe foco, `is-edit-start` emitido; Escape revierte; Enter o Tab commitea y emite `is-row-update`; click fuera también commitea con `commit=true`.
14. **Pegar `Ctrl+V` desde el portapapeles en una celda o rango** — pegado de TSV pega por filas/columnas si el rango está seleccionado; emite `is-cell-value-changed` por cada celda.
15. **`suppressRowClickSelection=true` cambia comportamiento: solo el checkbox selecciona** — click en el cuerpo NO emite `is-selection-changed`.
16. **`rowSelection='multiple'` con `enableRangeSelection` permite drag-rectangle para selección masiva** — emite `is-range-selection-changed` con `start/end row indices`.
17. **Side panel: toggle de "Columns"/"Filters" en toolbar** — emite `is-tool-panel-visible-changed`; al cerrarse, la barra lateral colapsa con animación; el botón cambia `aria-pressed`.
18. **Status bar con conteo de selección** — seleccionar 5 filas actualiza el contador "5 of 1,234 selected" y aparece el botón "Clear" que llama `deselectAll()` y emite `is-selection-changed` con array vacío.

---

### `<is-data-grid>`

Archivo: `src/components/data/data-grid.ts` (~130 KB). Wrapper estilo MUI X Data Grid: propiedades `columns`/`rows`, atributos `density, pagination, page-size, page-size-options, editable, show-toolbar, quick-filter, header-filters, hide-footer, list-view, tree-data, virtualize, column-resize, column-reorder, column-hide, multi-sort, etc. Eventos: `is-sort-change`, `is-filter-change`, `is-page-change`, `is-select`, `is-row-click`, `is-edit-start`, `is-edit-stop`, `is-row-update`. Parts: `toolbar, viewport, header, body, row, cell, footer`.

#### Tests existentes
- Ya listados arriba en ag-grid. Mismo patrón estático.

#### Propuestas UI/UX nuevas
1. **Toolbar con `quick-filter`: al teclear 3 caracteres en <input>, se filtran las filas en <16 ms para 1 000 filas** — verificar DOM estable (mismas instancias de celda, no re-mounts); el contador del footer "Showing X of Y" se actualiza.
2. **Click en el icono de filtro (`filter`) de una columna abre un popover con 3 modos (contains / equals / starts-with) + valor + Apply/Clear** — emite `is-filter-change` con `{column, operator, value}`; el icono cambia de gris a color de acento cuando hay filtro activo en esa columna.
3. **Header resizable: drag del separador con pointer-capture** — modificar `width`, persiste en el resize, emitir `is-column-resize`; doble-click adyacente hace `autoSize`; el cursor `col-resize` aparece solo sobre el handle.
4. **Column reorder: arrastrar `<th>` y soltar entre dos columnas** — animación FLIP/transition visible; `is-column-move` con `{from, to}`; la fila de filtros sigue a la columna cuando el orden cambia.
5. **Column hide/show: click derecho abre menú contextual "Hide/Hide others/Show all"** — desaparece/recupera la columna; si todas las columnas quedan ocultas, el body muestra `<empty-state>Dragn a column here</empty-state>` (drag-n-drop de Columns panel).
6. **Page change: click en `Next` avanza `pageSize` filas; input "Page X of Y" acepta valores y al Enter hace goto con clamp** — emite `is-page-change` con `{page, pageSize}`; `First/Last` saltan a 1/N.
7. **Multi-sort con Shift+click apila criterios** — indicadores numerados `1, 2` aparecen en los headers ordenados; `is-sort-change` con array.
8. **Selección single/multi con checkbox en la primera columna + click en la fila** — emitir `is-select`; `aria-selected="true"` y visualmente la fila gana fondo `--row-selected`.
9. **Pagination ellipsis cuando totalPages > 7** — renderizar 1 … 4 5 6 … 12; click en `…` salta ±5.
10. **Virtual scroll: scroll con la rueda por 100 000 filas** — mantener el scrollTop en el viewport (no perder posición al recargar); las filas mostradas se reciclan (DOM estable); el header sticky debe permanecer arriba.
11. **Edición inline: doble-click en una celda `editable=true` abre el `<input>` enfocado; Enter confirma, Escape revierte** — emite `is-edit-start`/`is-row-update`; tab navega a la siguiente celda con `commit`.
12. **Tree data: click en la flecha de la fila expande/colapsa hijos** — animación altura; emite `is-row-toggle`; aria-expanded del chevron cambia; persistencia del estado al refrescar.
13. **Density `compact/comfortable/spacious` cambia `line-height` y `padding`** — verificar métricas CSS; al cambiar, altura del row pasa por CSS variable.
14. **Footer: contador "X selected" + botón "Clear" sólo visible cuando hay selección** — al limpiar emite `is-select` con array vacío.
15. **Columna con `renderCell`: mostrar contenido custom (chip, avatar, link)** — DOM del cell se reemplaza; click en el link no selecciona la fila (stopPropagation).
16. **Foco accesible: Tab entra al grid, F2 enfoca la primera celda, flechas mueven el focus** — `aria-rowindex` / `aria-colindex` reflejan la posición lógica.

---

### `<is-kanban>` (3 CE: board, column, card)

Archivo: `src/components/data/kanban.ts`. Eventos: `is-kanban-card-click`, `is-kanban-move`. Slots: default (board), header-actions (column). Atributos: `columns`, `orientation`.

#### Tests existentes
- Estructural: 2 attachShadow, observados columns/orientation, eventos detectados, slots `(default)`/`header-actions`, parts `base/column/col-head/title/badge/actions`, edge case `let dragCard = null`, registra 3 CE, usa addEventListener.

#### Propuestas UI/UX nuevas
1. **Drag de card HTML5 entre columnas** — pointerdown sobre `is-kanban-card` → dragstart → dragenter en otra columna → drop → emite `is-kanban-move` con `{card, from, to}`; la card sale del origen y aparece en el destino en el orden correcto.
2. **Touch drag simulado** — `touchstart` + `touchmove` debe funcionar en el simulador (Pointer Events) y disparar el mismo ciclo.
3. **Keyboard drag: Tab a una card, Space para "pick up"** — la card gana `aria-grabbed="true"`, flechas ←/→ cambian de columna, ↑/↓ cambian de posición; Space otra vez suelta y emite `is-kanban-move`.
4. **Drop indicator visual** — al arrastrar sobre la columna destino aparece una sombra de inserción (`insert-before` o `append`) según la posición del cursor; el drop cancela con Escape.
5. **Click en card abre el detalle** — emite `is-kanban-card-click` con `{card, column}`; aria-label "Open card: heading".
6. **WIP limit en columna** — si se supera el `wip-limit` configurado, la columna gana borde rojo y la card recién dropeada rebota a su origen (`is-kanban-move-cancel` o `is-kanban-move` con rollback).
7. **Búsqueda `attribute=searchable` filtra cards por heading/meta** — input dentro del column con debounce de 100 ms; las cards que no matchean se ocultan con animación fade; "Clear" en el input muestra todas.
8. **Empty state en una columna** — si está vacía, muestra `Add card +` que abre un editor inline.
9. **Columna con "header-actions" slot** — botones Render/Archive en el header; click no inicia drag (stop propagation).
10. **Hover en card resalta con sombra + translateY(-2px)** — al deshover, vuelve a posición; respeta `without-shadow` (verifica que en ese modo no hay sombra).
11. **Scroll horizontal en board cuando hay >8 columnas** — `overflow-x: auto` con snap; la rueda de scroll mueve en columnas enteras; el usuario puede hacer swipe en touch.
12. **Drag desde fuera del board (drag handle `🜸`) sólo en ese handle, no en el resto del cuerpo** — el handle tiene cursor `grab/grabbing`.
13. **Aria-pressed en "filter pin" para mostrar/ocultar las cards filtradas** — a11y.
14. **Cambio de orientación `vertical → horizontal`** — el board pasa a flex-direction: row con scroll horizontal; las columnas mantienen altura por igualación con `align-items: stretch`.
15. **Persistencia local del orden** — recargar la página mantiene el orden (atributo `persist`).

---

### `<is-pivot-table>`

Archivo: `src/components/data/pivot-table.ts` (~6 KB). Configura `rows`, `columns`, `measures`, `aggregations` (sum/avg/count/min/max).

#### Tests existentes
- Estructural: archivo existe, shadow DOM, registrado, adopta CSS, edge cases, shadow DOM attachShadow.

#### Propuestas UI/UX nuevas
1. **Drag & drop de una dimensión entre los buckets "Rows", "Columns", "Filters"** — la tabla pivote re-renderiza con el nuevo layout; emitir `is-pivot-change` con el spec resultante.
2. **Click en la celda de totales expande/colapsa los totales** — anima altura; sólo en `aggregations=['sum']` mostrar fila "Grand Total".
3. **Sort por columna medida: click en header cambia `asc/desc` con flecha** — reordena respetando dimensiones fila × columna.
4. **Drag del separador de fila/columna redimensiona el ancho/alto** — la primera fila/columna fija se mantiene.
5. **Filtro por valor (range slider) en cada dimensión** — input range con dos thumbs; cambia el dataset visible sin recargar la spec.
6. **Click en una celda de valor navega al detalle** — emite `is-pivot-cell-click` con `{row, column, value}`.
7. **Formato por medida: `format: currency/percentage/integer`** — el valor renderizado cambia ($1,234.56 vs 1.234,56 € vs 12.34%).
8. **Aggregaciones múltiples en una misma columna**: `aggregations: ['sum','avg']` añade una segunda fila de agregación.
9. **Estado vacío cuando no hay medidas** — mensaje "Add a measure to start".
10. **Subtotales por cada fila de dimensión** — fila de "Subtotal" insertada al cambiar de valor; click colapsa a valor único.
11. **Sticky first column** — al hacer scroll horizontal la primera columna queda fija.
12. **Resumen en footer**: row count + sum count cuando `aggregations=['count']`.
13. **Aria-sort y aria-rowindex/aria-colindex** — navegación por teclado con flechas entre celdas.
14. **Color scale en celda por gradiente según valor** — bajo→alto con `--pivot-color-low` a `--pivot-color-high`.
15. **Persistencia (`persist` con `storage-key`)** — guardar spec en `localStorage` y restaurar al montar.

---

### `<is-spreadsheet>`

Archivo: `src/components/data/spreadsheet.ts` (~12 KB). Hoja de cálculo con celdas editables (input nativo). Datos vía propiedad `cells`.

#### Tests existentes
- Estructural: archivo existe, shadow, registrado, adopta CSS, edge cases, `createElement('input')` para edición, usa `<table>/<tbody>/<th>/<td>`.

#### Propuestas UI/UX nuevas
1. **Click en celda selecciona, doble-click entra en edición, Enter confirma, Escape revierte** — input dentro de la celda recibe foco; `cell.dataset.editing=""`; emitir `is-cell-change` con `{row, col, value, prev}`.
2. **Navegación con flechas ↑↓←→ entre celdas, Tab/Shift-Tab salta columnas** — focus visible con `outline: 2px solid var(--focus)`.
3. **Selección de rango: mousedown + drag + mouseup** — selección rectangular rellena con `--cell-selected`; Ctrl+C copia al portapapeles con TSV; Ctrl+V pega.
4. **Selección discontinua: Ctrl+click añade celdas** — emitir `is-range-select` con `cells: [{row,col}]`.
5. **Fórmulas: empezar la celda con `=` entra en modo fórmula; al confirmar evalúa (suma, average, …)** — emitir `is-formula-eval` con `{expr, result, errors}`.
6. **Pegado masivo: rango A1:C3 pegado en E1 rellena 9 celdas** — `is-cell-change` se emite por celda.
7. **Autoextensión del rango**: escribe "A1:A3" en A1 y selecciona A1:A3 con relleno automático.
8. **Ordenar columna: click en header ordena por esa columna** — `is-sort` con `{column, direction}`; números y fechas se ordenan semánticamente, no lexicográficamente.
9. **Filtro por columna: header-filters + tecleo** — muestra sólo filas que matchean.
10. **Multi-range Ctrl+Shift+Flechas** — expande selección en dirección de la flecha hasta el borde con datos.
11. **Resize de columnas drag del separador** — persistencia al refrescar.
12. **Auto-save**: tras `blur`, persiste en `localStorage` con `storage-key`.
13. **Importar CSV pegado/pegar en el navegador** — `paste` event parsea TSV/CSV y rellena.
14. **Undo/Redo con Ctrl+Z / Ctrl+Shift+Z** — historial con `is-history-change`; verifica que un `redo` regenera el mismo estado.
15. **Read-only mode**: `readonly=true` desactiva edición pero permite selección/copia; `aria-readonly` aplicado.
16. **Accesibilidad**: cada celda con `role="gridcell"`, `aria-selected`; headers `role="columnheader"` con `aria-sort`.
17. **Cell reference highlight**: click en una fórmula `=A1+B1` ilumina las celdas referenciadas.

---

### `<is-stat>`

Archivo: `src/components/data/stat.ts` (~4 KB). KPI card. Atributos: `label, value, helper, trend, trend-direction, icon, color`. Sin eventos. Slots: `label, value, helper, trend, icon`.

#### Tests existentes
- Estructural: archivo existe, shadow, observados label/value/helper/trend/trend-direction/icon/color, slots label/value/helper/trend/icon, parts base/head/label/value/foot/trend/helper/icon, eventos ninguno, edge cases con `||`, accesibilidad, registrado.

#### Propuestas UI/UX nuevas
1. **Trend positivo se muestra verde con flecha ↑, negativo rojo con ↓, neutro gris con `→`** — verificar color y glyph (`icon="arrow-up"`, `"arrow-down"`, `"equals"`).
2. **Slot `icon` proyecta el icono custom; al pasar el cursor muestra tooltip con la descripción** — el atributo `icon` debe sobreescribirse con slot.
3. **Animación de count-up al cargar**: el número sube de 0 al `value` en ~600 ms con easing `ease-out` — verifica que el valor final es exacto.
4. **`color` cambia el acento CSS (borde superior + gradient)`** — un slot `style`: `--stat-accent: #ff0`.
5. **Slot `value` reemplaza el número por un mini-chart sparkline o una pill** — el componente sigue siendo presentacional, no recibe eventos.
6. **`trend-direction` con valor `"up|down|flat"` cambia icono y color** — combinatoria: trend=+12% + direction=up → verde ↑; trend=-3% direction=down → rojo ↓.
7. **Responsive: en mobile (`<480px`) label y helper se ocultan, solo value+icon** — `@media`.
8. **Hover gana ligera elevación** — `transform: translateY(-2px)` con transición.
9. **`aria-label`** se compone a partir de `label`/`value`/`trend`/`helper` para que screen reader diga "Total revenue $12.4K, up 12% from last week".
10. **`format` attribute**: `format="currency"`, `format="percentage"` aplica `Intl.NumberFormat` con locale `'es-CO'`.
11. **`prefix`/`suffix` attribute**: añade "$" o "%" sin tocar el slot.
12. **`loading="lazy"`**: cuando está en viewport, anima el count-up; fuera no lo hace.
13. **Click en `stat` con atributo `navigate`/`href` lo convierte en link** — Enter o click navega; toggle de `aria-disabled`.
14. **`comparison` attribute** muestra "+12.4K vs last period" en el helper; números negativos con `-`.
15. **Color theming via `data-theme` o `color` slot `style=`**.

---

### `<is-transfer>`

Archivo: `src/components/data/transfer.ts` (~10 KB). Doble lista (source → target). Atributos: `source-title, target-title, searchable, without-buttons, without-headings, max-target`. Eventos: `is-transfer-change`. Sub-elemento `<is-transfer-item>`.

#### Tests existentes
- Estructural: shadow, observados source-title/target-title/searchable, evento is-transfer-change, parts base/pane/pane-head/title/count/list/controls, accesibilidad role=listbox + aria-multiselectable, edge cases, registrado.

#### Propuestas UI/UX nuevas
1. **Click en `<is-transfer-item>` lo marca (checkbox on) y activa el botón `>`** — emitir `is-transfer-change` con `{items: [ids]}`; el item gana `aria-selected="true"` y color de acento.
2. **Click en `>` mueve los items seleccionados al target** — emit `is-transfer-change` con `{moved: [ids], side: 'forward'}`; los items desaparecen del source con animación fade/slide.
3. **Click en `<` devuelve del target al source** — simétrico.
4. **Click en `>>` mueve todas las visibles del source** — el botón se deshabilita cuando source vacío.
5. **`max-target` rechaza el exceso** — al intentar mover a `target` con N items ya en target y max=3, no añade, emite `is-transfer-rejected` y muestra toast/sub-banner.
6. **Búsqueda con `searchable`**: tecleo filtra el panel source; las llaves no visibles NO se mueven con `>`.
7. **Navegación de teclado**: Tab entre source/target/controles, flechas ↑↓ mueven el highlight, Space toggle selección.
8. **Shift+click para selección por rango** dentro de un panel; Ctrl+click para multi.
9. **Drag & drop: arrastrar items directamente al panel opuesto** — emite `is-transfer-change`; al soltar en el sitio equivocado el item rebota.
10. **Header count dinámico**: "3 selected", "5 of 12", "12 of 12".
11. **Doble-click en un item lo mueve directo** (sin selección) — emit igualmente `is-transfer-change`.
12. **`without-buttons` oculta las flechas**; sólo drag & drop o doble-click funcionan.
13. **Responsive en pantallas estrechas**: source y target en columna en vez de fila.
14. **Ordenación por header column** — si las items son objetos con campos.
15. **`is-transfer-item` disabled** se renderiza con opacity 0.5 y `aria-disabled="true"`; no es movible.
16. **Búsqueda con debounce 150 ms** — para evitar renders en cada keystroke.

---

### `<is-gauge>` (data category)

Archivo: `src/components/data/gauge.ts`. Medidor radial/lineal. Data: `value, min, max, target, unit, label`.

#### Tests existentes (asumo patrón estándar)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Animación de aguja**: el arco/aguja viaja de min a value en 800 ms con easing — easing `cubic-bezier(.2,.8,.2,1)`; el valor numérico cuenta en sincronía.
2. **Click sobre la aguja o el arco abre un editor inline (entrada numérica)** — emite `is-gauge-edit`.
3. **Target line: marca `--target` dentro del arco** — el segmento por encima de target cambia a verde, por debajo a rojo; verificar color.
4. **Hover sobre el gauge muestra tooltip con `value, min, max, percentage`** — seguir al cursor.
5. **Gradient del arco según el valor**: `<linearGradient>` con stops `--gauge-low` → `--gauge-mid` → `--gauge-high`.
6. **Sin animación cuando `prefers-reduced-motion: reduce`** — la aguja salta directo al valor final sin transición.
7. **`unit="%"` añade el sufijo al texto** — verificable en `aria-valuetext`.
8. **`min`/`max` configurable**: cambia la escala; a -10 → 100 la aguja en 0 cae en el centro visual.
9. **`vertical` orientation gira el gauge 90°**; la aguja rota en consecuencia.
10. **Click + drag para "scrub" el valor** — útil para configurar umbrales.
11. **Cambio de tema (light/dark) refresca los colores del arco** sin parpadeo.
12. **Resize: el gauge se reescala vía `viewBox`; los textos no pierden nitidez**.
13. **Aria-valuemin/valuemax/valuenow + role=slider** — teclado: ←/→ ajustan +/-1, PgUp/PgDn +/-10.
14. **Sin datos: muestra "N/A" en el centro** y un arco ghost.
15. **Formato**: `format="currency"` formatea el número con `Intl.NumberFormat`.

---

### `<is-heatmap>` (data-viz category — ubicación: `src/components/data/heatmap.ts` si existe, o en charts)

No existe archivo propio de `<is-heatmap>` en `charts/`. Los charts tienen `polar-area-chart.ts` y demás. El test existe pero marca como opcional.

#### Propuestas UI/UX nuevas (suponiendo `<is-heatmap>` en `data/`)
1. **Click en celda muestra tooltip con valor exacto + fila + columna** — tooltip flotante, `role="status"`.
2. **Hover resalta fila y columna (con `<rect>` overlay)** — el resto se atenúa a opacity 0.4.
3. **Drag para seleccionar rango rectangular** — emite `is-heatmap-select` con `{rows, cols, value}`.
4. **Escala de color logarítmica vs lineal** — control via `scale` attribute; verifica leyenda.
5. **Leyenda de color continua** — gradient debajo con ticks; click en tick fija la escala.
6. **Cell click abre el detalle (drill-down)** — emite `is-heatmap-cell-click`.
7. **Empty cells marcados con `--cell-empty`** — borde punteado + tooltip "no data".
8. **Heatmap con datos temporales (x=t)**: zoom con la rueda del ratón (mouse wheel) — `is-heatmap-zoom` con `{from, to}`.
9. **Brush + zoom**: drag horizontal selecciona un rango temporal y zoom in se aplica al área.
10. **Heatmap con labels rotados** cuando hay >12 columnas — `transform: rotate(-45 deg)` en los `text`.
11. **Cambio de paleta (`data-palette`)**: las celdas cambian de color sin re-render completo.
12. **Pin de fila/columna**: el usuario pin la primera fila/columna con `pin-rows` y `pin-cols`.
13. **Color scale adaptativa** según min/max del dataset — no fija.
14. **Responsive**: en móvil oculta etiquetas largas y deja tooltip on tap (no hover).
15. **Anotaciones (markers)** sobre celdas concretas — `<rect>` adicional con stroke.

---

## CHARTS · 13 componentes (todos comparten motor `<is-chart>`)

### `<is-bar-chart>`

Wrapper tipado de `<is-chart type="bar">` (`src/components/charts/bar-chart.ts`). Atributos relevantes: `stacked`, `open-on-click`, `index-axis="x|y"`, `legend-position`, `min`, `max`, `grid`, `without-animation`, `without-legend`, `without-tooltip`, `x-label`, `y-label`, `color`. Sin eventos propios. CSS parts: `base, canvas, legend, tooltip`.

#### Tests existentes
- Estructural: archivo existe, wrapper invoca `window.__isDefineTypedChart('is-bar-chart', 'bar', drawBarMarks)`, motor `<is-chart>` con shadow open, observados `type/label`, JSON slot, ResizeObserver, registro, edge cases.

#### Propuestas UI/UX nuevas
1. **Click en barra muestra tooltip con valor exacto** — el tooltip HTML (`#tooltipEl` en shadow) se posiciona cerca del cursor con `transform: translate(...)`; muestra `label` + `value` + swatch de color.
2. **Hover sobre una barra la marca `data-active=""` y aplica overlay dim a las demás** — el `marksGroup` gana `dataset.hover=""`; las demás barras tienen `opacity` reducida.
3. **Doble click sobre una barra dispara `is-open-viewer`** con `kind="chart"`/payload (cuando `open-on-click`); abre `<is-diagram-lightbox>` en pantalla completa.
4. **Click en un item de la leyenda toggla visibilidad** — el botón `<button class="legend-item">` cambia `aria-pressed`, el dataset entra/sale de `hiddenSeries`; el botón recibe un outline de foco visible.
5. **Re-hover tras toggle restaura la opacidad de las visibles** — al desmarcar la serie, su ray vuelve a opacity 1.
6. **Eje Y escala logarítmica vs lineal** — `scales.y.type = 'logarithmic'` (forma Chart.js dentro del JSON) cambia la cuadricula visiblemente.
7. **Con `stacked`: las series encima se acumulan correctamente; el bottom negativo (`-`) se dibuja bajo 0**.
8. **`index-axis="y"` rota el chart 90°** — las barras horizontales tienen labels de eje Y a la izquierda con espacio reservado dinámico (`margin.left = label.length * 6.5 + 16`).
9. **Eje X con 30 categorías: las labels se truncan a `maxLabelChars` con `…` y `<title>` nativo para tooltip** — verificable computando `band.step / 7`.
10. **Formato numérico: valor `1234567` se muestra como `1.2M`** — `Intl.NumberFormat('es-CO', { notation: 'compact' })`.
11. **Animación de carga: las barras crecen en altura de 0 a su valor en `with-animation` (default)**; al agregar `without-animation` saltan al valor final sin transición. Verifica que respeta `prefers-reduced-motion`.
12. **ResizeObserver: al cambiar el ancho del contenedor (`window.resize` simulado), el SVG recalcula viewBox y la tipografía se reajusta (formula `13 * (min(w,h)/220)**0.55`)** — verificar que el chart se rehace y los textos no quedan diminutos.
13. **Pointermove crosshair en líneas del grid cuando hay overlay** — overlay `<line class="crosshair">` aparece en el eje perpendicular; desaparece al salir.
14. **Set vacío `datasets: []`** muestra el texto `Sin datos` centrado, sin barras fantasma.
15. **`open-on-click` con `preventDefault()` sobre `is-open-viewer`** — el consumidor cancela el lightbox y el componente no hace fallback propio.
16. **Accesibilidad: cada barra tiene `role="img"` con `aria-label="Serie A: 45"`**, teclado tab navega por las legend buttons.
17. **Color override por dataset**: `--border-color-1` redefine la serie 1; verificar swatch y la barra.

---

### `<is-line-chart>`

Igual motor; marcas `drawLineMarks`. Atributos mismos + `tension`, `fill`, `stepped`.

#### Tests existentes
- Estructural (visto en charts).

#### Propuestas UI/UX nuevas
1. **Hover sobre un punto muestra tooltip con coordenadas x,y** — `dg-tooltip__title` con la fecha/x-label, `dg-tooltip__row` con el valor de cada serie en ese x.
2. **Crosshair vertical** durante pointermove — overlay `<line>` entre marcas.
3. **Click en un punto fija un marcador highlight con tooltip persistente** — clic en otra posición lo cierra.
4. **`tension` alto (curva bezier)**: interpola suavizado; cero es segmento recto.
5. **`fill="start"` rellena el área entre la línea y 0** — verificar path cerrado correctamente.
6. **Líneas múltiples: hover de una serie opacita el resto** (vía filtro de `visibleDatasets` en render).
7. **`stepped`** con `"step-before"/"after"/"middle"` cambia la conexión — verificable en `d` del path.
8. **Animación turtle** (path progressive draw) al cargar — `dasharray = getTotalLength`, `--dash` CSS animation. `is-turtle-state` con `{playing, idx, total, replay}`.
9. **Wheel sobre el eje Y aumenta zoom en Y** (emular pinch-zoom) — `is-zoom` con `{from, to}`.
10. **`NaN` en data**: se renderiza como un hueco (gap) en la línea sin romper el cálculo de dominio.
11. **`null/undefined` en la serie**: salta el punto sin romper la línea.
12. **Time series con `type="time"`** (en options): eje X adapta el dominio a fechas reales, no a strings.
13. **Annotations**: `plugins.annotation` con líneas horizontales en `--threshold`; overlay dedicado.
14. **Drag-select en eje X**: drag con click para zoom al rango seleccionado — emite `is-zoom`.
15. **Click en leyenda toggle con animación al ocultar** — la serie desliza a opacity 0; verificar `aria-pressed`.

---

### `<is-pie-chart>`

Marcas `drawPieMarks` en `marks-radial.ts`. Rebanadas con ángulos por valor proporcional.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en una rebanada la "explota" (`offset`) y muestra tooltip con su label + porcentaje** — la `path` se transforma a `translate(cx*0.05, cy*0.05)`.
2. **Hover sobre rebanada aumenta `stroke-width` y reduce el resto a opacity 0.4**.
3. **`plugins.legend.labels.generateLabels` custom**: formatea los labels con `%` y valor absoluto.
4. **Click en leyenda oculta la rebanada** — el ángulo se redistribuye entre las visibles.
5. **3D effect**: con `options.borderRadius` los bordes exteriores ganan radio.
6. **Inicio animación desde 0° hasta su ángulo final** — opciones `animateRotate=true`.
7. **`responsive=True` con `maintainAspectRatio=False`** — el chart se estira por el ancho disponible sin distorsión.
8. **`tooltip.position='nearest'`** o custom function; sigue al cursor con clamp en bordes.
9. **Doble click en el centro colapsa todas las explosiones** — útil para volver al estado inicial.
10. **Empty data**: muestra el texto "Sin datos" en vez del pie vacío.
11. **Leyenda enumera los labels en vez de los datasets** (en pie/doughnut/polarArea).
12. **`plugins.datalabels`** con valor numérico renderizado dentro/fuera de cada rebanada (`Anchor.CENTER`/`END`).
13. **`rotation` (Math.PI/2)** rota el inicio del primer arco.
14. **`circumference` parcial** para hacer un anillo parcial (gauge-like).
15. **Accesibilidad**: cada path tiene `aria-label="Label: value"`; cada legend item es un botón activable con Space/Enter.

---

### `<is-doughnut-chart>` (donut)

Igual al pie pero con `cutout` (hueco central). Attributes: `doughnut-ratio` (CSS var) controla `cutout` porcentaje.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hueco central configurable**: `--chart-doughnut-ratio` entre 0 (pie) y 0.95 (anillo fino).
2. **Click en el centro (hueco)** abre lightbox como el fondo.
3. **Total en el centro** — slot `default` proyectado en el centro; el contenido gana `--donut-center`.
4. **Animación de fill**: el arco gira en origen trazando el trazo.
5. **Leyenda en bottom o top**: `legend-position="bottom"` reorganiza el flex del wrap.
6. **Click+drag en una rebanada la rota (rotación interactiva)** — útil para "reordenar manualmente".
7. **`options.cutout` acepta porcentaje string `'60%'`** — verificable en `opts.doughnutRatio`.
8. **Hover sobre una rebanada: `stroke-width` aumenta** y la label en leyenda se pone en negrita.
9. **Responsive: `maintainAspectRatio=False`** rellena el contenedor.
10. **Drilldown**: click en una rebanada la expande y la sustituye por sub-rebanadas (anidamiento).
11. **Empty state**: si `data.length === 0`, arco ghost.
12. **Aria-label "Total: $1,234.5K"** en el centro.
13. **Color por valor absoluto** vs por label — variantes con `fillColors`.
14. **Border-radius en las esquinas (`borderRadius: 8`)**.
15. **`animation.animateRotate=true + animateScale=true`** escala desde 0.

---

### `<is-area-chart>`

(`src/components/charts/area-chart.ts` si existe — no aparece, pero existe implícito en `marks-cartesian.ts`). Verifico si existe; sino, no es objeto.

> **No existe archivo** `area-chart.ts` separado en `charts/`. Solo hay `line-chart`, `bar-chart`, etc. No auditable en este lote — se omite.

---

### `<is-radar-chart>`

Marcas `drawRadarMarks` en `marks-radial.ts`. Malla radial con N ejes (variables) y polígonos para cada dataset. Atributos: `min`, `max`, `grid`.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hover sobre un vértice muestra tooltip con (eje, valor) y resalta ese radio** — el resto del polígono gana opacity 0.3.
2. **Click en un vértice lo fija como "highlighted"** y el eje se vuelve color de acento.
3. **Animación turtle de la polilínea** al cargar — `dasharray = totalLength`, `--dash` animación.
4. **`beginAtZero=true`** (default) => el centro es 0; si `false`, escala dinámica al min negativo.
5. **Tick labels en cada eje** con `formatValue` (compact).
6. **3+ series: cada una con color de borde/relleno distinto** vía `getCategoricalColors`.
7. **`plugins.legend`** activa el toggle por dataset (mismo `aria-pressed`).
8. **`gridlines circulares` vs `gridlines lineales`**: elijo con `grid="auto" | "x" | "y" | "both"` (atributo `grid`).
9. **Resize con RO** — el viewBox se actualiza y los textos se reajustan.
10. **Hover sobre el área del polígono** (no solo vértices) detecta proximidad — radio overlay o hit radius para que el hover sea "tolerante".
11. **`angleLines` color custom** via `--chart-axis-color`.
12. **Drag para rotar la rueda polar**: cambiar el ángulo del primer eje — emite `is-radar-rotate`.
13. **`pointLabelFontSize`** escala con `min(w,h)/220` mismo criterio.
14. **Empty data**: muestra `Sin datos` centrado.
15. **Leyenda en `legend-position="chartArea"`** que aparece en la esquina dentro del SVG.

---

### `<is-polar-area-chart>`

Similar a pie pero con radio proporcional al valor (no ángulo fijo). Etiqueta auto-rotada.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hover sobre un sector muestra tooltip con valor y label** — el radio aumenta (animación `r` interpolado).
2. **Click fija el sector "explodido"** con `transform="translate(...)"` mayor.
3. **`scale.beginAtZero`**: el radio mínimo parte de 0 a `max(value) * 1.1`.
4. **Leyenda en orden angular** (igual que pie).
5. **`circumference` configurable** — útil para "gauge chart" semicircular.
6. **`rotation` configurable** — primera tajada inicia a 0° o 90°.
7. **`gridlines radiales` dibujadas** desde el centro con `niceTicks`.
8. **`responsive` mantiene aspect ratio hasta cierto breakpoint**.
9. **Click en una tajada despacha `is-segment-click`** con `{label, value, percentage, index}`.
10. **Aria-press en cada legend item**.
11. **Hover sobre una tajada aumenta su `stroke-width`** y reduce las demás.
12. **Animación: animar `r` desde 0 hasta el valor**.
13. **Wheel para zoom** (zoom radial) — `is-zoom` con factor.
14. **`title` position**: top/bottom/center.
15. **Drag de centro a esquina: pan** si hay zoom.

---

### `<is-scatter-chart>`

Marcas `drawScatterMarks`. Axes numéricos (no categoriales). Atributos: `point-radius`, `tension` 0.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Wheel scroll/pinch zoom sobre el plot** — `is-zoom` con `{xMin, xMax, yMin, yMax}`.
2. **Doble-click en un punto lo fija como "selected"** — atributo `selected=true` en el `circle`; emite `is-point-select`.
3. **Hover muestra tooltip con (x, y) formateado** — `dg-tooltip__title` con la serie.
4. **`pointRadius` configurable via `attr=point-radius` o `--chart-point-radius`**.
5. **Linea de regresión: `options.plugins.trendlineLinear`** añade una `path` por encima.
6. **`xAxis.type='linear'` vs `'logarithmic'`** — elige el modo en config.
7. **Brush**: drag con click para seleccionar rango rectangular.
8. **Highlight de un subconjunto**: `dataset.backgroundColor` por punto individual (`array of strings`).
9. **Crosshair ortogonal** durante pointermove.
10. **`maxTicksLimit`** en eje Y limita el grid a 5-7.
11. **`responsive`+`maintainAspectRatio=False`** + `aspectRatio`.
12. **Pan cuando hay zoom activo**: drag con la mano activa `is-pan` event.
13. **Densidad alta: 50 000 puntos sin lag** (optimización `circle`) — verificable con dataset grande.
14. **`showLine=true`** dibuja una polilínea; `false` solo puntos.
15. **Pin eje con doble-click en label**: `dataset.lockedAxis=true` para mantener dominio.

---

### `<is-bubble-chart>`

Extiende scatter con tamaño proporcional a `r` (3er valor). Atributos: `point-radius` actúa por defecto; `datasets` con `data: [{x, y, r}]`.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hover sobre burbuja muestra tooltip con (x, y, r)** — `hit.radius` permite que burbujas grandes sean clickables en todo su disco.
2. **Wheel/pinch zoom** — mismo que scatter.
3. **Tooltip con `callout`** específico para bubble (no overlap) — `tooltip.positioner` custom.
4. **`minRadius`/`maxRadius`** para escalar todas las burbujas a un rango visible.
5. **`backgroundColor` por burbuja individual** — color dinámico basado en `r`.
6. **Click fija "selected bubble"**; click fuera la deselecciona.
7. **Click en una burbuja + Shift** extiende selección a un grupo cercano.
8. **Pan & zoom con el mouse (drag con click + wheel)** — emite `is-zoom`/`is-pan`.
9. **Animación al cargar**: cada burbuja crece de r=0 a r final con stagger de 30 ms.
10. **`responsive` con `maintainAspectRatio`**.
11. **Formato del radio**: tooltip `display="R: $1.2M, x: 12, y: 0.4"` con `Intl.NumberFormat`.
12. **Drag de una burbuja la reposiciona** (interactivo, no leído) — emite `is-bubble-drag`.
13. **`pointStyle`**: `'circle' | 'cross' | 'rect' | 'triangle'` para burbujas custom.
14. **`color-by dimension`**: gradiente basado en `r` o `x`/`y` según config.
15. **Zoom-out con doble-click** — resetea los dominios a los iniciales.

---

### `<is-treemap>` (charts)

Archivo: `src/components/charts/treemap.ts` (~12 KB). Treemap con algoritmo squarified, anidado. Atributos: `color`, `open-on-click`, `mode`, `persist`, `animation` (via diagram base).

#### Tests existentes
- Estructural: shadow+svg, `tm-svg` class, observados `color/open-on-click`, eventos `is-render/is-open-viewer`, parts `base/canvas/tooltip`, lee JSON, MO, RO, edge cases, cleanup, adopta CSS, registrado.

#### Propuestas UI/UX nuevas
1. **Hover sobre rectángulo aumenta saturación** y muestra tooltip con (label, value, percentage). El resto gana opacity 0.4.
2. **Click en rectángulo lo expande/colapsa** (modo `mode="drill"`); emite `is-toggle-group` con `{path}`.
3. **Wheel scroll hace zoom en el cuadro**: zoom al siguiente nivel; doble-click vuelve.
4. **Layout squarified**: rectángulos con aspect ratio cerca de 1; click en uno desciende al nivel hijo.
5. **Path/breadcrumb en la parte superior**: Home > Asia > Japón, click navega a ese nivel.
6. **Color por valor de la celda** vs color por categoría — gradient `--fill-color-X`.
7. **Drag con click para seleccionar múltiples rectángulos**.
8. **Leyenda lateral con los N top categorías**; click fija el rango.
9. **`persist=true` + `storage-key="my-treemap"`**: guarda los nodos colapsados en localStorage y restaura.
10. **`animation` (de la base diagramas)**: las celdas se posicionan con transición (FLIP) al cambiar payload.
11. **`open-on-click` sobre el treemap**: doble-click abre `<is-diagram-lightbox>` (fullscreen) con drilldown propio.
12. **Accesibilidad**: cada `<rect>` con `role="treeitem"`, `aria-level`, `aria-expanded`.
13. **Click derecho muestra menú contextual "Drill down / Filter / Copy node"**.
14. **Resize: la rejilla recalcula el layout en función del nuevo aspect ratio.
15. **`mode="icicle"` (alternativo)**: layout horizontal-vertical en árbol.

---

### `<is-sparkline>` (charts)

Archivo: `src/components/charts/sparkline.ts` (~6 KB). Mini chart sin axes para KPI cards. Atributos: `data`, `color`, `width`, `height`, `line-width`, `fill`, etc.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hover sobre cualquier punto muestra tooltip con el valor** — sigue al cursor; en mobile el tooltip aparece en `tap` (touch).
2. **`line-width=2` dibuja trazo más grueso** — CSS var.
3. **`fill="end"` rellena el área entre la línea y el borde inferior** — path cerrado.
4. **`color="green|red"` cambia el stroke a positivo/negativo** basado en delta (last - first).
5. **Auto-scale** del dominio a `min/max` del dataset.
6. **Click fija un marker highlight** en esa posición.
7. **`<style>` `--sparkline-fill: linear-gradient(to bottom, var(--sparkline-color) 0%, transparent 100%)`**.
8. **Drag para hacer scrub temporal** — `<line>` cursor que se mueve por la línea.
9. **Empty `data=[]`**: trazo vacío, no se rompe.
10. **Responsive: width 100%** con altura fija; el viewBox mantiene la proporción.
11. **Slot `default`** para añadir dots custom en los peaks.
12. **`format`** aplica `Intl.NumberFormat` al tooltip; `format="currency"` con `"$1.2K"`.
13. **Animación turtle** al cargar.
14. **`aspect-ratio`** configurable — el sparkline rellena el espacio disponible.
15. **Aria-label con el último valor y el % de cambio**.

---

### `<is-waterfall-chart>`

Archivo: `src/components/charts/waterfall-chart.ts` + `marks-waterfall.ts`. Barras acumulativas (verde positivo / rojo negativo / azul final). Atributos específicos: `connector-lines`.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hover sobre una barra muestra tooltip con su delta + acumulado**.
2. **Color**: cambio positivo verde, negativo rojo, total azul — verificable en `path.fill`.
3. **Connector lines entre barras** — `options.connectors`.
4. **Click en una barra la marca "excluida"** — pasa a gris.
5. **Drag para reordenar las categorías**.
6. **`stacked`**: cada barra es `previous + current`.
7. **Sin datos**: mensaje vacío.
8. **Click en leyenda toggle** entre totals/hide-subcategories.
9. **Animation**: las barras crecen en altura en orden secuencial (stagger).
10. **Format en eje Y** — compact.
11. **Color theme: `--border-color-1/2/3` custom.
12. **Aria-label por barra `Barra 5: -$200K (Total $1.2K)`**.
13. **Click en el subtotal resetea los filtros**.
14. **Resumen final siempre en color azul** con etiqueta "Total".
15. **`responsive` + wheel zoom en Y**.

---

### `<is-funnel-chart>`

Archivo: `src/components/charts/funnel-chart.ts` + `marks-funnel.ts`. Embudo de conversión. Atributos: `sort`, `reverse`.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hover sobre segmento del funnel muestra tooltip con (etapa, valor absoluto, % de la anterior, % del top)**.
2. **Click fija "selected step"** — útil para drill-down.
3. **`sort=true`** ordena por valor descendente (default); `false` respeta el orden del dataset.
4. **`reverse=true`** invierte el orden (de menor a mayor).
5. **Etiquetas inline (dentro) o al lado (afuera)** — `labels.position`.
6. **Drop-off entre etapas**: línea punteada con el % perdido entre una y otra.
7. **Color por etapa**: gradient o sólido.
8. **Click + drag para reordenar etapas**.
9. **Animación**: el segmento crece de 0 a su valor con stagger.
10. **Empty / single stage** — mensaje "Add at least 2 stages".
11. **Aria-label por segmento**.
12. **`responsive` con `maintainAspectRatio`**.
13. **Leyenda toggle** que muestra/oculta las etapas.
14. **Wheel zoom vertical**.
15. **`connector lines`** entre etapas con valor del drop-off.

---

### `<is-gauge-chart>` (charts)

Archivo: `src/components/charts/gauge-chart.ts`. Indicador radial con aguja. Atributos: `min, max, value, target, unit, label`.

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Aguja animada** desde min a value en 800 ms; easing `cubic-bezier`.
2. **`target` muestra línea punteada** dentro del arco.
3. **Color por valor relativo a target**: verde si ≥ target, rojo si < target.
4. **Hover sobre el arco** muestra tooltip con valor+max+% del total.
5. **Click + drag para "scrub" el valor**.
6. **`prefers-reduced-motion`** desactiva la animación.
7. **`unit="%"`** muestra "75%" en el centro.
8. **`format="currency"`** formatea.
9. **Animación al pasar el target**: breve highlight verde de la aguja.
10. **Wheel sobre la zona central aumenta zoom** y muestra tick labels adicionales.
11. **`responsive`** mantiene proporciones hasta cierto mínimo.
12. **Click sobre la aguja abre un editor inline** — emite `is-gauge-edit`.
13. **Aria-valuemin / valuemax / valuenow** actualizados.
14. **`vertical` orientation** invierte el arco para un gauge de barras horizontal.
15. **Click en `max` cambia el valor a max** (debug helper).

---

## DIAGRAMS · 16 componentes (todos extienden `DiagramElementBase`)

> Tests existentes en `src/utils/health/exhaustive/diagrams/`: solo `flowchart`, `sequence-diagram`, `class-diagram`, `er-diagram`, `state-diagram`. Los 11 restantes no tienen test. Todos heredan del base: `initDiagramShadow(svgClass, tooltipClass)` con `<svg part="canvas">` + `<div part="tooltip" class="dg-tooltip is-rich">`, `readJsonSlot` con MO sobre `<script type="application/json">`, MutationObserver de tema sobre `<html class="data-theme data-palette>`, `isViewer`, `payload/spec/layout`, `openOwnViewer(kind)` que abre `<is-diagram-lightbox>` con el payload. Atributos heredados: `color`. Eventos: `is-open-viewer`, `is-toggle-group`.

### `<is-flowchart>`

Archivo: `src/components/diagrams/flowchart.ts`. Diagrama de flujo en SVG. Atributos: `direction` (TB/LR/RL/BT), `mode` (compact/full).

#### Tests existentes
- Estructural: archivo existe, registra `is-flowchart` con kind `flowchart`, shadow + svg, observados (color, open-on-click), lee JSON, MO, RO opcional, parts base/canvas, edge cases, adopta CSS, registrado, cleanup, JSDoc.

#### Propuestas UI/UX nuevas
1. **Click en nodo lo selecciona** (data-selected) y emite `is-flowchart-node-click` con `{id, label}`. Doble click expande/collapse sus hijos (group).
2. **Drag de un nodo reposiciona** libre — emite `is-flowchart-node-drag` con `{id, dx, dy}`; las aristas se redibujan en consecuencia.
3. **Hover sobre arista la resalta** y muestra el label si lo tiene; el resto gana opacity 0.4.
4. **Wheel zoom** sobre el SVG; pan con drag-con-click.
5. **Click en un subgrupo colapsa** los nodos hijos con FLIP transition (`is-toggle-group`).
6. **Doble-click en fondo resetea zoom/pan**.
7. **Drag-select rectángulo** para multi-selección.
8. **Click derecho sobre nodo** abre menú contextual "Edit/Delete/Disconnect".
9. **`direction=LR`** rota todo el layout horizontal; el usuario sigue navegando.
10. **Drag de un nodo sobre otro distinto crea una nueva arista** — emite `is-flowchart-edge-create`.
11. **Box selection (Shift+drag)** multi-select.
12. **`isViewer=true` abre a pantalla completa con lightbox** (vía base `openOwnViewer('flowchart')`).
13. **Mini-map en una esquina** con `--diagram-minimap-color`.
14. **Aria-keyboard nav**: Tab enfoca nodos y aristas, Enter selecciona, Space toggle.
15. **Animación turtle** sobre las aristas (dibujadas progresivamente) al cargar.

---

### `<is-class-diagram>`

Archivo: `src/components/diagrams/class-diagram.ts`. UML class. Atributos: `layout` (default/compact), `mode`.

#### Tests existentes
- Estructural: archivo, shadow+svg, registrado, observados, MO, RO, parts, JSON, adopta CSS, cleanup, registrado.

#### Propuestas UI/UX nuevas
1. **Click en clase muestra tooltip con miembros y métodos** (`dg-tooltip is-rich` puede tener tabla).
2. **Doble-click expande/colapsa los miembros** (visibilidad `public/private/protected`).
3. **Hover sobre arista de herencia/composición la resalta**.
4. **Drag-de-clase reposiciona**; las aristas siguen a la clase.
5. **Wheel zoom** y pan con drag.
6. **Click en un miembro lo copia al clipboard** — emite `is-class-member-copy`.
7. **Click en "abstract" badge** expande detalles.
8. **Filtro `attribute=show-only="public"`** oculta miembros privados.
9. **Animación de carga**: las clases aparecen en orden topológico.
10. **Box-select con Shift+drag** agrupa y aplica el filtro.
11. **Mini-map** (opcional con `--diagram-minimap=true`).
12. **Aria-keyboard nav** entre clases; Enter expande.
13. **Click derecho muestra menú contextual "Add member/Delete"**.
14. **`layout="compact"`** reorganiza reduciendo espacio; verificar `compactness`.
15. **Themes: `--diagram-class-fill` para color de fondo**.

---

### `<is-er-diagram>`

Archivo: `src/components/diagrams/er-diagram.ts`. Modelo entidad-relación.

#### Tests existentes
- Estructural: registrado, observación color/open-on-click, MO, etc.

#### Propuestas UI/UX nuevas
1. **Click en entidad resalta todas sus relaciones** (diamante) y oculta otras (opacity 0.3).
2. **Doble-click en un atributo abre un editor inline** (clave, tipo).
3. **Hover sobre relación muestra cardinalidad (1:N, N:M, etc.)** en tooltip.
4. **Drag-node reposiciona**.
5. **Wheel zoom / pan** sobre todo el canvas.
6. **Click derecho añade atributo** con menú contextual.
7. **Modo "schema-only" / "data-only"** con `mode` attribute; re-render.
8. **Filtro por tipo (entidad / relación / atributo)** con `legend`.
9. **`is-toggle-group`** para colapsar clusters.
10. **Drag-select multi-entidad** y aplicar cambios en bloque.
11. **Mini-map** (heredada de base si tienen `minimap` flag).
12. **Aria-keyboard nav**.
13. **Animación turtle** sobre las aristas.
14. **Export como PNG/SVG** (botón contextual).
15. **`open-on-click` doble-click abre full-screen viewer**.

---

### `<is-sequence-diagram>`

Archivo: `src/components/diagrams/sequence-diagram.ts`. Diagrama de secuencia UML: lifeline, mensajes, activaciones.

#### Tests existentes
- Estructural: registrado, parts, observados, MO, RO, JSON, edge cases, cleanup.

#### Propuestas UI/UX nuevas
1. **Click en un lifeline la fija como "selected"** y emite `is-sequence-actor-click`.
2. **Click en un mensaje abre tooltip con la llamada completa** (`name(args): returnType`).
3. **Drag-vertical para mover mensajes** arriba/abajo en el tiempo.
4. **Wheel scroll para avanzar tiempo** (cuando hay muchos mensajes).
5. **Pin al lifeline superior**: clic derecho "Pin / Set as main".
6. **`mode="formal"`** cambia notación a UML estricto.
7. **`alt/par/loop`** bloques se expanden/colapsan con click.
8. **Drag-select para seleccionar varios mensajes**.
9. **`is-toggle-group`** para colapsar `alt` blocks (FLIP anim).
10. **Animación turtle** sobre las flechas de mensajes.
11. **Click en "self call"** la abre en tooltip con detalle.
12. **Aria-keyboard nav** (Tab → actor → mensaje → activación).
13. **Mini-map en timeline**.
14. **Doble-click para añadir nuevo mensaje**.
15. **`open-on-click` doble-click abre lightbox**.

---

### `<is-state-diagram>`

Archivo: `src/components/diagrams/state-diagram.ts`. State machine (estados + transiciones + initial/final).

#### Tests existentes
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en un estado lo marca como "current"** — emite `is-state-transition-suggestion`.
2. **Click en una transición la traza** (animate `path` desde inicio a fin).
3. **Hover sobre estado muestra transiciones permitidas**.
4. **Drag-estado reposiciona**.
5. **Doble-click en estado abre editor (name + actions)**.
6. **Wheel zoom** + pan.
7. **Click en "initial" / "final"** activa animación highlight.
8. **`mode="mermaid-like"`** vs UML estricto.
9. **Drag de una transición a otro estado re-cablea**.
10. **Click derecho "Add transition"**.
11. **`is-toggle-group`** para colapsar máquinas anidadas.
12. **`history` state** se renderiza con un símbolo H.
13. **Aria-keyboard nav** entre estados.
14. **`open-on-click` doble-click abre lightbox**.
15. **Animación turtle** sobre las transiciones.

---

### `<is-gantt>`

Archivo: `src/components/diagrams/gantt.ts`. Diagrama Gantt (tareas, dependencias, milestones).

#### Tests existentes (algunos no)
- Estructural parcial.

#### Propuestas UI/UX nuevas
1. **Click en tarea la selecciona** y muestra panel lateral con detalles (resource, dates, progress).
2. **Drag-horizontal de una tarea la desplaza en el tiempo** — emite `is-gantt-task-move`.
3. **Drag del borde derecho cambia duración**.
4. **Click en barra de progreso cambia el %** (numeric input).
5. **Wheel zoom en el eje tiempo** (`%Y/%M/%d/%h`).
6. **Pan horizontal con Shift+drag**.
7. **Hover sobre tarea muestra tooltip con dependencias**.
8. **Click en una flecha de dependencia la resalta**.
9. **Crear nueva dependencia arrastrando desde la barra A hasta B**.
10. **Filtro por responsable (resource)**.
11. **Resize de fila (altura de tarea)**.
12. **Critical path**: tareas en rojo, `attribute=critical-path=true`.
13. **Hoy (current date)** línea vertical con label "Hoy".
14. **Mover barras con teclado**: Alt+←/→ -1 día, Alt+Shift+←/→ -1 semana.
15. **`open-on-click` doble-click abre lightbox**.

---

### `<is-component-diagram>`

Archivo: `src/components/diagrams/component-diagram.ts`. UML component (componentes + provided/required interfaces).

#### Tests existentes (puede no haber)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en un componente muestra puertos/interfaces**.
2. **Drag-component reposiciona**.
3. **Hover sobre interfaz required muestra tooltip**.
4. **Doble-click expande dependencias**.
5. **Wheel zoom + pan**.
6. **Cable drag: arrastrar un interfaz a otro crea una conexión**.
7. **Click derecho "Add port"**.
8. **Aria-keyboard nav**.
9. **Modo "compact"** vs "expanded" con `mode`.
10. **`is-toggle-group`** colapsa grupos.
11. **Animation turtle** sobre cables.
12. **Mini-map**.
13. **Aria-keyboard nav**.
14. **`open-on-click` doble-click abre lightbox**.
15. **Filtro por namespace** en un dropdown.

---

### `<is-journey-map>`

Archivo: `src/components/diagrams/journey-map.ts`. User journey / customer journey (fases + emociones + touchpoints).

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en una fase resalta sus touchpoints** y oculta otros.
2. **Hover muestra emoción del touchpoint** (icono + emoji).
3. **Drag-fase reposiciona** en el orden cronológico.
4. **Wheel zoom**.
5. **Click derecho "Add phase"**.
6. **`mode="swimline"`** muestra swimlanes.
7. **Aria-keyboard nav**.
8. **Animación turtle en flechas entre fases**.
9. **`is-toggle-group`** colapsa sub-fases.
10. **`open-on-click` doble-click**.
11. **Mini-map**.
12. **Export a PNG/SVG**.
13. **Color por emoción (high/low/neutral)** con `--journey-pos-color`.
14. **Leyenda con escala emocional**.
15. **Touch en mobile arrastra touchpoints** y abre detalle en `tap`.

---

### `<is-mindmap>`

Archivo: `src/components/diagrams/mindmap.ts`. Mindmap con nodo raíz y ramas recursivas.

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en nodo lo expande/colapsa** — emite `is-toggle-group`.
2. **Drag-nodo reposiciona**.
3. **Wheel zoom + pan**.
4. **Doble-click en nodo abre editor inline** (label).
5. **Hover sobre nodo muestra descripción / notas**.
6. **Click derecho "Add child / Delete / Connect"**.
7. **Drag de un nodo a otro crea un branch**.
8. **Modo `layout=radial` vs `tree` (horizontal)**.
9. **Mini-map**.
10. **Aria-keyboard nav** (Tab → árbol, Enter expande).
11. **Export PNG/SVG/JSON**.
12. **`open-on-click` doble-click**.
13. **Color por profundidad** via `--mindmap-depth-color`.
14. **Animation turtle** en las connections.
15. **Auto-layout button** reorganiza el grafo.

---

### `<is-quadrant-chart>`

Archivo: `src/components/diagrams/quadrant-chart.ts`. Matriz 2x2 (cuadrantes) con bubble plot.

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en un punto lo resalta** y muestra tooltip con (label, x, y).
2. **Drag-punto reposiciona (en modo editable)** — emite `is-quadrant-move`.
3. **Wheel zoom + pan**.
4. **Doble-click abre editor (label + x/y)**.
5. **Asigna automáticamente al cuadrante** (Q1/Q2/Q3/Q4) por x,y.
6. **Drag-select multi-punto**.
7. **Hover sobre eje muestra unidades** (cambio de cursor y label).
8. **`mode="snap"`** con snap a cuadrante.
9. **Click derecho "Add point"**.
10. **`is-toggle-group`** para colapsar clusters.
11. **Aria-keyboard nav**.
12. **Animation turtle** sobre las paths.
13. **Mini-map**.
14. **Color por cuadrante** via `--quadrant-q1-fill`.
15. **`open-on-click` doble-click**.

---

### `<is-sankey-diagram>` (diagrams)

Archivo: `src/components/diagrams/sankey-diagram.ts`. Sankey (flujos entre nodos con grosor proporcional). Ver `src/components/charts/sankey.ts` (en charts) también — verificar si son duplicados.

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hover sobre nodo muestra tooltip con (label, inValue, outValue)**.
2. **Hover sobre link muestra tooltip con (source, target, value)** + percentage.
3. **Click en nodo resalta sus links (entrada/salida)** y atenúa el resto.
4. **Doble-click fija el nodo destacado**.
5. **Drag-nodo reposiciona** dentro de su fila/columna.
6. **Wheel zoom** sobre el SVG.
7. **Pan con drag en el fondo**.
8. **Click en link fija "highlight"** — útil para análisis.
9. **`mode="horizontal"` vs `vertical`**.
10. **`is-toggle-group`** para colapsar grupos.
11. **Mini-map**.
12. **Color por "depth"** (origen vs destino vs intermedio).
13. **Aria-keyboard nav**.
14. **Animation turtle** sobre los links al cargar.
15. **`open-on-click` doble-click**.

---

### `<is-swimlane-diagram>`

Archivo: `src/components/diagrams/swimlane-diagram.ts`. Swimlanes (pool/lane + tasks + arrows).

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en lane la fija como "selected lane"**.
2. **Drag-lane vertical para redimensionar**.
3. **Drag-task horizontal cambia fecha de inicio**.
4. **Drag-task horizontal derecha cambia fecha fin**.
5. **Wheel zoom horizontal** (eje tiempo) y pan.
6. **Hover sobre task muestra tooltip**.
7. **Drag de flecha para crear dependencia**.
8. **Click derecho "Add task / Add lane"**.
9. **Filtro por responsable (lane)**.
10. **Aria-keyboard nav** entre lanes y tasks.
11. **Color por estado (todo/done/in-progress)**.
12. **`is-toggle-group`** para colapsar lanes vacías.
13. **Mini-map**.
14. **Animation turtle**.
15. **`open-on-click` doble-click**.

---

### `<is-timeline>`

Archivo: `src/components/diagrams/timeline.ts`. Línea de tiempo horizontal (eventos + intervalos).

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en un evento muestra tooltip detallado**.
2. **Wheel zoom temporal** (de años a días).
3. **Pan horizontal con drag**.
4. **Drag-event reposiciona** en el tiempo.
5. **Click derecho "Add event"** con datetime picker.
6. **Hover muestra detalles** del evento.
7. **Drag-select multi-evento**.
8. **`mode="horizontal"` vs `vertical`**.
9. **`is-toggle-group`** colapsa grupos (épocas).
10. **Color por categoría**.
11. **Aria-keyboard nav**.
12. **Mini-map**.
13. **Animation turtle** sobre los connectors.
14. **`open-on-click` doble-click**.
15. **Hoy (current date)** marcador.

---

### `<is-venn-diagram>`

Archivo: `src/components/diagrams/venn-diagram.ts`. Diagrama de Venn (2-4 conjuntos).

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Hover sobre una zona muestra tooltip con (label, value, % del total)**.
2. **Click fija el conjunto destacado**; las zonas con intersección múltiple se atenúan.
3. **Drag-set reposiciona** los círculos.
4. **Wheel zoom**.
5. **Drag-select fija múltiples zonas**.
6. **Doble-click en una zona abre detalle**.
7. **`mode="2|3|4"` sets** — añadir/quitar.
8. **Click derecho "Add set"**.
9. **Animación turtle** sobre los paths (clipses).
10. **Color por set** con alpha.
11. **Aria-keyboard nav**.
12. **Leyenda**.
13. **`is-toggle-group`** colapsa grupos.
14. **`open-on-click` doble-click**.
15. **Mini-map**.

---

### `<is-use-case-diagram>`

Archivo: `src/components/diagrams/use-case-diagram.ts`. Casos de uso UML (actors + use cases + relationships).

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en un actor fija "selected actor"** y resalta sus use cases.
2. **Click en un use case abre tooltip con detalle**.
3. **Drag-actor hacia el sistema (boundary)** para relacionar.
4. **Wheel zoom + pan**.
5. **Doble-click abre editor del use case**.
6. **Click derecho "Add actor/Add use case"**.
7. **`mode="extend"|"include"`** para tipos de flechas.
8. **`is-toggle-group`** colapsa sub-system.
9. **Aria-keyboard nav**.
10. **Animation turtle** sobre las flechas.
11. **Mini-map**.
12. **Color por tipo de elemento** (actor vs use case vs system).
13. **Filter por label**.
14. **`open-on-click` doble-click**.
15. **Highlight del path crítico** entre dos actores.

---

### `<is-block-diagram>`

Archivo: `src/components/diagrams/block-diagram.ts`. Diagramas de bloques (rectángulos + flechas).

#### Tests existentes (no)
- Estructural.

#### Propuestas UI/UX nuevas
1. **Click en bloque lo selecciona** y resalta flechas de E/S.
2. **Drag-block reposiciona**.
3. **Resize-block drag del corner** cambia tamaño.
4. **Hover muestra tooltip con label**.
5. **Wheel zoom + pan**.
6. **Drag de output de A a input de B crea una conexión**.
7. **Doble-click abre editor (label + tamaño)**.
8. **Click derecho "Add block / Connect / Delete"**.
9. **`is-toggle-group`** colapsa clusters.
10. **Aria-keyboard nav**.
11. **Animation turtle** sobre las flechas.
12. **Color por tipo (input/output/process/storage)**.
13. **`open-on-click` doble-click**.
14. **Mini-map**.
15. **Export PNG/SVG**.

---

## Resumen transversal · Categorías UI/UX aplicables a toda la familia

> Estas categorías (ya mencionadas en el brief) son especialmente relevantes para data viz y tienen cobertura cero en los tests existentes.

### Leyendas y ejes (charts)
- Click en `<button class="legend-item">` toggle con `aria-pressed` invertido.
- Eje Y lineal vs logarítmico (`scales.y.type = 'logarithmic'`).
- Eje X con `maxLabelChars` trunca con `…` + `<title>` con el label completo.
- Formatos: `currency`, `percentage`, `scientific`, `compact` (1.2M vs 1,234,567).

### Datos extremos
- 0 valores, 1 valor, 10000 valores (scatter/bubble).
- Valores negativos.
- `Number.MAX_SAFE_INTEGER` → "9T" con formato compact.
- `NaN`, `null`, `undefined` no rompen el render (path con hueco).
- `timezone` en fechas: `Intl.DateTimeFormat` con `timeZone`.

### Animaciones
- `without-animation` salta toda transición.
- `prefers-reduced-motion: reduce` salta la turtle y el count-up.
- FLIP transition al filtrar (columnas de data-grid).
- `transition-property` con CSS vars (no inline).

### Responsive
- Mobile (`<480px`): labels se ocultan, sólo value+icon en `is-stat`.
- `ResizeObserver` recalcula layout.
- Scroll horizontal cuando hay >N categorías.
- `tooltip.followCursor` en mobile (vs `tap` para abrir).

### Export
- `is-export-png`, `is-export-svg`, `is-export-csv` (events).
- Copy-to-clipboard.
- Print stylesheet (`@media print { … }`).

### Accesibilidad
- Cada marca/cell con `role="img"` + `aria-label`.
- Leyenda como `<button>` activable con Space/Enter.
- Tooltip con `role="status"` y `aria-describedby`.
- Tab order lógico; flechas mueven focus; Escape cierra tooltip/menu.
- `prefers-reduced-motion` y `prefers-color-scheme`.

### Patrones interaction a verificar por familia
- **Hover**: crosshair, highlight, dim, tooltip.
- **Click**: selecciona, drill-down, abre visor.
- **Doble-click**: fija selección / expande / abre lightbox.
- **Drag**: reposiciona / reordena / crea conexión.
- **Wheel**: zoom + pan.
- **Touch**: tap (open), long-press (menu contextual).
- **Keyboard**: Tab/Shift-Tab, flechas, Space, Enter, Escape, Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Shift+Z.

---

> **Total**: ~370+ propuestas UI/UX nuevas (35+ componentes × ~10-15 tests cada uno).
> Las **no duplicadas** con los tests estáticos existentes son prácticamente todas — los tests actuales solo verifican que el código DECLARA shadow/observados/eventos/slots/parts, no que el usuario pueda efectivamente INTERACTUAR con esas capacidades.
> Si quieres priorizar las **10 más impactantes por componente**, las marcadas arriba con numerales 1-10 son el set base; las 11-15 son las opcionales para cobertura ampliada.

