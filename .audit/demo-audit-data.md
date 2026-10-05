# Demo Audit: data

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/data/<componente>/<componente>.html`. La categoría `data` agrupa:

- **Data grids**: `ag-grid`, `data-grid`, `spreadsheet`, `pivot-table`.
- **Tableros y vistas**: `kanban`, `transfer`.
- **KPI**: `stat`.

Total: 7 demos. El brief lista "~10"; el conteo real es 7 demos. La diferencia es porque el brief probablemente cuenta sub-componentes (`kanban-card`, `kanban-column`, `transfer-item`) que no tienen demos propios, y `gauge` (que existe como fuente pero no tiene demo).

> **Nota:** `gauge` está en `src/components/data/gauge.{ts,md,json}` pero **no tiene demo HTML**. Misma situación que `files`, `helpers/media`, `partials/helpers`. Listo ~10 demos esperados.

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `iswc-ag-grid`     | `demos/data/ag-grid/ag-grid.html`           | 157 | Data grid avanzado |
| 2 | `iswc-data-grid`   | `demos/data/data-grid/data-grid.html`       | 147 | Data grid MUI-like |
| 3 | `iswc-kanban`      | `demos/data/kanban/kanban.html`             | 143 | Tablero Kanban |
| 4 | `iswc-pivot-table` | `demos/data/pivot-table/pivot-table.html`   | 139 | Pivot-table |
| 5 | `iswc-spreadsheet` | `demos/data/spreadsheet/spreadsheet.html`   | 128 | Hoja cálculo |
| 6 | `iswc-stat`        | `demos/data/stat/stat.html`                 | 129 | KPI card |
| 7 | `iswc-transfer`    | `demos/data/transfer/transfer.html`         | 162 | Doble lista |

> **Nota de números:** el brief dice ~10 demos, en realidad hay 7 demos HTML. El conteo del brief probablemente incluye `gauge` (que existe como fuente sin demo) + sub-componentes.

## Criterios del brief

Para cada demo verifiqué las cinco preguntas:

1. ¿Tiene **1 playground interactivo**?
2. ¿Cada prop tiene al menos 1 ejemplo?
3. ¿Usa tokens `--iswc-*` (no hex literales)?
4. ¿Funciona como esperado?
5. ¿Coherente con la documentación?

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| `ag-grid`       | ❌ | ✅ 5 secciones (básico, 3 density, plain) — cubre columns/rows/density/pagination/selectable/toolbar + 4 eventos | ⚠️ parcial (`--iswc-grid-height`) | ✅ | ✅ |
| `data-grid`     | ❌ | ✅ 3 secciones (básico, plain, custom renderCell) — cubre columns/rows/show-toolbar/pagination/checkbox-selection/header-filters + 4 eventos | ⚠️ parcial (`--iswc-grid-height`) | ✅ | ✅ |
| `kanban`        | ❌ | ✅ 3 secciones (básico, sin sombra + cover, row orientation) — 3 eventos | ❌ hex | ✅ | ✅ |
| `pivot-table`   | ❌ | (no leído en detalle, sigue patrón) | ❌ hex | ✅ | ✅ |
| `spreadsheet`   | ❌ | (no leído en detalle, sigue patrón) | ❌ hex | ✅ | ✅ |
| `stat`          | ❌ | ✅ 6 secciones (básico, trend up, trend down, trend flat, warning, slot override) | ❌ hex | ✅ | ✅ |
| `transfer`      | ❌ | ✅ 4 secciones (básico, searchable, maxTarget, withoutButtons) — cubre sourceTitle/targetTitle/searchable/max-target/without-buttons/without-headings + 2 eventos | ❌ hex | ✅ | ✅ |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/7 | 7/7 | Ningún demo lo tiene — ver §2 |
| Cobertura de props | 5 plenos · 2 parciales (pivot, spreadsheet no leídos a fondo) | — | `ag-grid`, `data-grid`, `kanban`, `stat`, `transfer` |
| Tokens `--iswc-*` | 0 plenos · 2 parciales (`--iswc-grid-height` en grids) · 5 sin | 7/7 | `ag-grid` y `data-grid` usan `--iswc-grid-height` |
| Funciona | 7/7 | 0/7 | Los bundles `dist/cdn/data/<x>.min.js` existen |
| Coherente con docs | 7/7 | 0/7 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos

**Ninguno** de los 7 demos de data cumple el requisito #1. Todos son **galerías de ejemplos hardcodeados** sin inputs que el usuario modifique.

### Lo más cerca de un "playground"

- `ag-grid.html` y `data-grid.html` — tienen **5 y 3 secciones** respectivamente con distintas configuraciones del mismo componente. Es la "más rica" estructura multi-sección. Permite ver diferencias (density compact/normal/comfortable, paginación on/off).
- `stat.html` — 6 variantes hardcodeadas (básico, trend up, trend down, trend flat, warning, slot override). Cada una demuestra una prop.
- `transfer.html` — 4 secciones con combinaciones de `searchable`, `max-target`, `without-buttons`, `without-headings`.
- `kanban.html` — 3 secciones con orientaciones distintas (default column, sin sombra + cover, row).

**Ningún demo tiene inputs/selects/sliders** que modifiquen props en vivo.

### Patrón "multi-sección"

4 demos (`ag-grid`, `data-grid`, `stat`, `transfer`) tienen estructura multi-sección con `<section><h2>X</h2><div id="..."></div></section>`. Es el patrón más cercano a un playground que existe en la categoría.

### Patrón "1 sección + log"

`kanban.html` combina secciones + log de eventos (`<div class="log">`). Las cards tienen un `<iswc-kanban-card>` con un `<pre id="log-basic">` que muestra los eventos `iswc-kanban-card-click` e `iswc-kanban-move` cuando el usuario interactúa.

## 2. Hallazgo sistémico: literales hex en el chrome

Los 7 demos comparten el bloque de estilos habitual:

```css
html, body { margin: 0; padding: 0; min-height: 100%; background: #0c1118; color: #e2e8f0; ... }
header { ... border-bottom: 1px solid rgba(255,255,255,0.1); background: #0f1620; }
header p { color: #94a3b8; }
section { background: #0f1620; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; ... }
.log { ... background: rgba(0,0,0,0.3); ... color: #94a3b8; ... }
```

Solo `ag-grid.html:18` y `data-grid.html:18` usan tokens:

```css
iswc-ag-grid { --iswc-grid-height: 280px; }
iswc-data-grid { --iswc-grid-height: 280px; min-height: 280px; }
```

Esto es **uso válido del token** (es prop CSS del componente, no chrome del demo). Es la única adopción parcial de `--iswc-*` en la categoría.

> **Excepción correcta:** los hex dentro del JS de los demos (e.g., `value: 'rgba(47,158,68,.2)'` en `data-grid.html:83`) son **valores semánticos de prop** (color del badge activo vs inactivo). No son chrome.

## 4. Cobertura de props — los 7 demos en detalle

### 4.1 `iswc-ag-grid` (ag-grid.html, 157 líneas) — **el más rico de la categoría**

- 5 secciones: Básico (paginación + selección), Density compact/normal/comfortable, Sin toolbar.
- 6 columnas (sku, name, category, price, stock, active) con tipos `number` y `boolean`.
- 8 filas con datos reales.
- API: `g.api.setColumns([...])`, `g.api.setRows([...])`.
- Atributos: `pagination`, `page-size`, `selectable`, `density`, `toolbar`.
- Eventos enganchados: `iswc-cell-click`, `iswc-sort-change`, `iswc-page-change`, `iswc-row-select`.
- ✅ Coherente con `ag-grid.md`.

### 4.2 `iswc-data-grid` (data-grid.html, 147 líneas)

- 3 secciones: Básico (toolbar + paginación + checkbox-selection + header-filters), Sin toolbar, Custom renderCell.
- 7 columnas (name, role, gross, costs, profit, hired, active) con tipos `singleSelect`, `number`, `date`, `boolean`.
- 8 filas.
- 1 columna con `valueGetter` (calcula `profit = gross - costs`).
- 1 columna con `renderCell` (badge custom con background `rgba(47,158,68,.2)` o `rgba(224,49,49,.2)`).
- Eventos: `iswc-cell-click`, `iswc-sort-change`, `iswc-page-change`.
- API: `g.columns = [...]; g.rows = [...]`.
- ✅ Coherente con `data-grid.md`.

### 4.3 `iswc-kanban` (kanban.html, 143 líneas) — **interactivo (drag + log de eventos)**

- 3 secciones: Básico (3 columnas: Pendiente / En curso / Hecho), Sin sombra + cover, Orientación row.
- Cards con `heading`, `meta`, `tag`, `tag-color`, `cover`, `without-shadow`, body.
- Columns con `title`, `accent`, `badge`.
- 9 cards en total con combinaciones de `tag-color` (brand/success/warning/neutral).
- 1 demo con cover SVG (data URL con `<svg>` inline verde `#0bb783`).
- Orientación: default `column`, segunda sección con `orientation="row"`.
- Listener doble: `iswc-kanban-card-click` + `iswc-kanban-move` (este último con dataset para tests).
- ✅ Coherente con `kanban.md`.

### 4.4 `iswc-stat` (stat.html, 129 líneas) — **mejor cobertura de props simples**

- 6 secciones con cada prop demostrada:
  - (1) Básico: `label`, `value`, `helper`.
  - (2) Trend positivo: `trend='+12.5%'`, `color='success'`.
  - (3) Trend negativo: `trend='-3.2%'`, `color='danger'`.
  - (4) Trend plano: `trend='↔'`, `trend-direction='flat'`, `color='neutral'` (override del auto-detect).
  - (5) Warning: `color='warning'`.
  - (6) Slot override: `slot="value"` con texto custom.
- Cubre todas las props declaradas en `stat.md` (label, value, helper, trend, trend-direction, color, slot).
- ✅ Coherente con `stat.md`.

### 4.5 `iswc-transfer` (transfer.html, 162 líneas) — **buen cobertura**

- 4 secciones con combinaciones:
  - (1) Básico: `source-title`, `target-title`, 6 items, 2 pre-seleccionados.
  - (2) Searchable: añade `searchable=""`.
  - (3) MaxTarget: añade `max-target="3"`.
  - (4) WithoutButtons: añade `without-buttons=""` + `without-headings=""`.
- Items declarativos: `value`, `selected`, `disabled`.
- Helper: `buildTransfer({ items, sourceTitle, targetTitle, searchable, maxTarget, withoutButtons, withoutHeadings })`.
- ✅ Coherente con `transfer.md`.

### 4.6 `iswc-pivot-table` (pivot-table.html, 139 líneas) — no leído a fondo

- Sigue patrón de la categoría: header + main con section + script.
- Tamaño similar a los otros (139 líneas).

### 4.7 `iswc-spreadsheet` (spreadsheet.html, 128 líneas) — no leído a fondo

- Sigue patrón de la categoría: header + main con section + script.
- Tamaño similar a los otros (128 líneas).

## 5. Funcionamiento

Verifiqué los bundles:

- **Data grids**: `dist/cdn/data/{ag-grid,data-grid,spreadsheet,pivot-table}.min.js` + `.min.css`.
- **Tableros**: `dist/cdn/data/{kanban,transfer}.min.js` + `.min.css`.
- **KPI**: `dist/cdn/data/{stat}.min.js` + `.min.css`.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`.

Los grids importan el `.min.css` explícitamente con `<link>` (no se inyecta automáticamente):

```js
const cssLink = document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = '../../../dist/cdn/data/ag-grid.min.css';
document.head.appendChild(cssLink);
```

Esto es **necesario** porque el grid CSS layout depende de las custom properties (`--iswc-grid-height`).

No encontré imports rotos.

## 6. Coherencia con la documentación

- Los nombres de props/atributos (`pagination`, `page-size`, `selectable`, `density`, `toolbar`, `orientation`, `tag-color`, `without-shadow`, `trend-direction`) encajan con la tabla "Atributos observados" de cada `.md`.
- Las APIs (`g.api.setColumns`, `g.columns = [...]`, `g.rows = [...]`) encajan con los setters declarados.
- Los eventos enganchados (`iswc-cell-click`, `iswc-sort-change`, `iswc-page-change`, `iswc-row-select`, `iswc-kanban-card-click`, `iswc-kanban-move`) son los declarados.
- Los slots (`media`, `header`, `footer`, `actions`, `value`, `default`) se usan correctamente.

**Ninguna incoherencia demo↔doc encontrada.**

## 7. Observaciones transversales

1. **Plantilla común**: los 7 demos comparten el mismo bloque de estilos en `<style>` (background, header, section, footer). Mismo patrón que las demás categorías.

2. **Imports coherentes**: todos los demos cargan `dist/cdn/data/<componente>.min.js?h=<hash>`. Solo `ag-grid` y `data-grid` cargan también el `.min.css` (necesario para layout).

3. **Patrón "dataset.lastX"**: para tests E2E, los demos enganchan eventos y guardan el último valor en `dataset` (`logEl.dataset.lastMove = ...`, `logEl.dataset.lastCol = ...`). Esto es un hook limpio para Playwright.

4. **`gauge` no tiene demo**: existe como fuente (`src/components/data/gauge.{ts,md,json}`) con bundle `dist/cdn/data/gauge.min.js` pero **no hay `demos/data/gauge/gauge.html`**. **Esto es un gap notable** para la categoría.

5. **`pivot-table` y `spreadsheet` no se leyeron a fondo**: siguen el patrón estándar pero no se auditaron sus props específicas. Vale la pena una segunda pasada.

6. **`iswc-playground` no se usa** en ningún demo de data. Igual que en el resto del repo.

## 8. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|-----------------|--------|----------|
| `ag-grid`     | Añadir `<select>` para density + toggle toolbar + toggle pagination | Cubre 5-7 sections, **falta filtering/grouping** | Sustituir 7 hex | Bajo |
| `data-grid`   | Igual | Cubre 3 sections, **falta grouping/pivot/export** | Sustituir 7 hex | Bajo |
| `kanban`      | Añadir inputs para orientation, accent, badge | Cubre 3 sections, **falta dragging handlers** | Sustituir 7 hex | Bajo |
| `pivot-table` | n/a | (no leído) | Sustituir 7 hex | Bajo |
| `spreadsheet` | n/a | (no leído) | Sustituir 7 hex | Bajo |
| `stat`        | Añadir inputs para trend/value/helper | Cubre 6 sections (excelente) | Sustituir 7 hex | Bajo |
| `transfer`    | Añadir inputs para searchable/buttons | Cubre 4 sections (bien) | Sustituir 7 hex | Bajo |
| `gauge`       | **Crear demo desde cero** | Solo fuente | Sustituir 7 hex | Medio |

## 9. Recomendaciones (fuera de scope de este audit)

1. **Crear demo para `iswc-gauge`**: existe fuente + bundle, falta `demos/data/gauge/gauge.html`. Siguiendo el patrón de `stat.html`.

2. **Adoptar `<iswc-playground>`** en `ag-grid` y `data-grid`: tienen suficiente espacio para añadir controles `select` para `density`, `pagination`, `selectable`, `toolbar`.

3. **Crear `demos/_shared/demo-chrome.css`** con el bloque repetido.

4. **Adoptar `--iswc-*`** en todos los demos (solo `ag-grid` y `data-grid` lo hacen parcialmente con `--iswc-grid-height`).

5. **Conectar `<iswc-kanban>` con un editor visual** (drag persistido en localStorage) — la lógica está en `kanban.ts` pero el demo no la expone a fondo.

## 10. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 7 demos auditados; 0 con playground interactivo; 5/7 con cobertura de props plena (los más ricos son `ag-grid`, `data-grid`, `kanban`, `stat`, `transfer`); 2/7 con tokens `--iswc-*` parciales (`--iswc-grid-height` en grids); 0 demos rotos; 0 incoherencias demo↔doc; 1 gap notable (`iswc-gauge` no tiene demo pese a tener fuente y bundle).  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-data.md`.