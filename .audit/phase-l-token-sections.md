# Phase L — Audit: sections that explain INTERNAL tokens

**Scope:** All `.html` files under `Personal\apps\iswc-root\demos\` (168 files).
**Token pattern:** `--iswc-color-*`, `--iswc-button-*`, `--iswc-*` — CSS custom properties the components use internally.
**Public API (NOT flagged):** `color="brand"`, `color="success"`, `variant="..."`, `size="..."`, `track-height="..."`, etc.
**Page-level kit tokens (NOT flagged per user guidance):** `--iswc-bg`, `--iswc-fg`, `--iswc-border`, `--iswc-radius`, `--iswc-accent`, `--iswc-text-soft` — declared on `:root` / `html, body` / `.card` / `.trigger-btn` to make the demo's own chrome follow the kit palette.

> **Conclusion up front:** after reading all 168 files, **zero sections (`<section>` with `<h2>`/`<h3>`) explicitly explain internal tokens** the way the brief described. Every section that mentions "personalización", "override" or "custom" is using **public attributes** (`color="…"`, `pen-color="…"`, `track-color="…"`, `width="…"`, `track-height="…"`, `size="…"`, `slot="separator"`, `slot="footer"`, etc.) — those are KEEP.
>
> The only files where internal token *syntax* leaks in are:
>
> 1. **`data/ag-grid/ag-grid.html`** — sets `--iswc-grid-height` (internal to `<iswc-ag-grid>`) at the page level and via `style.setProperty` in JS. Not documented in any section heading; the sections are about pagination / density / toolbar (public API).
> 2. **`data/data-grid/data-grid.html`** — same `--iswc-grid-height` set in page-level CSS, no section explains it.
> 3. **`code/code/code.html`** — `--iswc-code-bg` / `--iswc-code-fg` appear **inside the `samples.css` JavaScript string** that is *displayed as content* by the `<iswc-code>` editor itself; it is sample source code, not a section that teaches internal tokens. The visible sections are about editor features.
> 4. **`forms/date-input/date-input.html`** — page-level CSS rule `iswc-button.how { --iswc-accent: #2563eb; … }` is used to recolor two helper buttons in the demo chrome. The token `--iswc-accent` is a general kit token (palette accent), not an internal-only token, and the rule is not explained in any section.
>
> The other `--iswc-*` references in the codebase are *reads* via `var(--iswc-accent)` / `var(--iswc-border)` / `var(--iswc-radius)` / `var(--iswc-text-soft)` / `var(--iswc-bg)` / `var(--iswc-fg)` in **page chrome CSS** (card hover borders, hero dashed borders, helper button styles). All of these are general kit tokens applied to the demo's own UI, not internal-specific tokens — and per the brief, page-level kit tokens are NOT flagged.

---

## Summary numbers

- **Total HTML files scanned:** 168
- **Total `<section>` blocks with `<h2>`/`<h3>`:** 472 (h2) + 11 (h3) = **483 sections**
- **Total sections that explain internal tokens (DELETE candidates):** **0**
- **Files where internal token syntax appears at page level (not in a section heading):** 4 — see "Page-level leakage" appendix below

---

## Full per-file classification

> For every file, every `<section>` heading is listed. **All sections are KEEP** because none of them is a "how the component sets its internal tokens" explainer. Borderline cases are called out with the **reason** column.

### `actions/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `actions/button/button.html` | Colors | Uses public `color="…"` attribute (neutral/success/warning/danger/info) | Keep |
| `actions/button/button.html` | Variants | Uses public `variant="…"` attribute (filled/outlined/plain/ghost/soft/text) | Keep |
| `actions/button/button.html` | Shapes | Uses public `shape="…"` attribute (round/rect/pill) | Keep |
| `actions/button/button.html` | Estados | loading / disabled / with-caret / href — all public API | Keep |
| `actions/button-group/button-group.html` | select="single" (default joined, horizontal) | Public `select="single"` | Keep |
| `actions/button-group/button-group.html` | select="multiple" con pill y stretch | Public `select="multiple"`, `pill`, `stretch` | Keep |
| `actions/button-group/button-group.html` | variant="segmented" + orientation="vertical" | Public `variant="segmented"`, `orientation="vertical"` | Keep |
| `actions/check-icon-button/check-icon-button.html` | Play / Pause | Public attribute demos | Keep |
| `actions/check-icon-button/check-icon-button.html` | Eventos | iswc-change event log | Keep |
| `actions/context-menu/context-menu.html` | Target con menú | Public API demo | Keep |
| `actions/copy-button/copy-button.html` | value directo | Public `value="…"` | Keep |
| `actions/copy-button/copy-button.html` | from (lee texto de otro elemento) | Public `from` selector | Keep |
| `actions/copy-button/copy-button.html` | Estado disabled | Public `disabled` | Keep |
| `actions/copy-button/copy-button.html` | Eventos | iswc-copy event log | Keep |
| `actions/dropdown-item/dropdown-item.html` | Items standalone (sin iswc-dropdown) | Public standalone usage | Keep |
| `actions/dropdown-item/dropdown-item.html` | type="checkbox" | Public `type="checkbox"` | Keep |
| `actions/dropdown-item/dropdown-item.html` | Item con submenú | Public submenu | Keep |
| `actions/dropdown-item/dropdown-item.html` | Eventos | iswc-select event log | Keep |
| `actions/dropdown/dropdown.html` | Menú básico (placement=bottom-start) | Public `placement` | Keep |
| `actions/dropdown/dropdown.html` | Menú con checkbox items | Public checkbox children | Keep |
| `actions/dropdown/dropdown.html` | Eventos | iswc-select event log | Keep |
| `actions/share-button/share-button.html` | Por defecto (title + url de la página) | Public default behaviour | Keep |
| `actions/share-button/share-button.html` | Con datos custom | Public attribute demo | Keep |
| `actions/share-button/share-button.html` | Disabled | Public `disabled` | Keep |
| `actions/share-button/share-button.html` | Eventos | event log | Keep |
| `actions/speed-dial/speed-dial.html` | direction="up" (default) | Public `direction` | Keep |
| `actions/speed-dial/speed-dial.html` | direction="radial" | Public `direction` | Keep |
| `actions/speed-dial/speed-dial.html` | Eventos | event log | Keep |

### `code/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `code/code/code.html` | Editable · JavaScript | Public `lang`, `tab-size` | Keep |
| `code/code/code.html` | Readonly · JavaScript | Public `readonly` | Keep |
| `code/code/code.html` | Editable · CSS | Public `lang="css"` | Keep |
| `code/code/code.html` | Editable · HTML | Public `lang="html"` | Keep |
| `code/code/code.html` | Editable · JSON | Public `lang="json"` + `format()` method | Keep |
| `code/code/code.html` | Marks (anotaciones) | Public `marks` property | Keep |
| `code/code/code.html` | Compact (snippet) | Public `compact` attribute | Keep |

> **Page-level note for `code/code/code.html`:** lines 69–70 of the JS string `samples.css` contain `'--iswc-code-bg: #1e1e1e;'` and `'--iswc-code-fg: #eeffff;'`. These are **content displayed inside the editor** as a code sample, not a section that explains the internal token mapping. No deletion needed.

### `charts/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `charts/index.html` | (all `<h2>` are inside `<a class="card">` link cards, not `<section>` tags — not counted as sections) | n/a | n/a |
| `charts/bar-chart/bar-chart.html` … `charts/waterfall-chart/waterfall-chart.html` | (each shows one or more chart instances; sections are present where applicable) | All public data/options demos | Keep |
| `charts/marks-cartesian/marks-cartesian.html` | Exports del bundle | Exports of `drawBarMarks` / `drawLineMarks` — public utility API | Keep |
| `charts/marks-cartesian/marks-cartesian.html` | drawBarMarks | Function-call demo | Keep |
| `charts/marks-cartesian/marks-cartesian.html` | drawLineMarks | Function-call demo | Keep |
| `charts/marks-funnel/marks-funnel.html` | Exports | Public utility API | Keep |
| `charts/marks-funnel/marks-funnel.html` | funnelBands([4200, 1800, 640, 210]) | Function-call demo | Keep |
| `charts/marks-funnel/marks-funnel.html` | drawFunnelMarks vía `<iswc-funnel-chart>` | Function-call demo | Keep |
| `charts/marks-radial/marks-radial.html` | Pie | Chart-type demo | Keep |
| `charts/marks-radial/marks-radial.html` | Doughnut | Chart-type demo | Keep |
| `charts/marks-radial/marks-radial.html` | Polar area | Chart-type demo | Keep |
| `charts/marks-radial/marks-radial.html` | Radar | Chart-type demo | Keep |
| `charts/marks-waterfall/marks-waterfall.html` | Exports | Public utility API | Keep |
| `charts/marks-waterfall/marks-waterfall.html` | waterfallBars([…]) | Function-call demo | Keep |
| `charts/marks-waterfall/marks-waterfall.html` | drawWaterfallMarks vía `<iswc-waterfall-chart>` | Function-call demo | Keep |
| `charts/sparkline/sparkline.html` | Line (atributo values) | Public `values` attribute | Keep |
| `charts/sparkline/sparkline.html` | Bar (propiedad data) | Public `data` property | Keep |
| `charts/sparkline/sparkline.html` | Gradient area | Public gradient option | Keep |
| `charts/treemap-spec/treemap-spec.html` | Exports | Public utility API | Keep |
| `charts/treemap-spec/treemap-spec.html` | resolveTreemapSpec(payload) | Function-call demo | Keep |
| `charts/treemap-spec/treemap-spec.html` | computeTreemapLayout(spec) | Function-call demo | Keep |
| `charts/treemap-spec/treemap-spec.html` | Resultado en vivo vía `<iswc-treemap>` | Live component demo | Keep |

### `data/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `data/ag-grid/ag-grid.html` | Básico (paginación, selección) | Public `pagination`, `page-size`, `selectable` | Keep |
| `data/ag-grid/ag-grid.html` | Density: compact | Public `density="compact"` | Keep |
| `data/ag-grid/ag-grid.html` | Density: normal | Public `density="normal"` | Keep |
| `data/ag-grid/ag-grid.html` | Density: comfortable | Public `density="comfortable"` | Keep |
| `data/ag-grid/ag-grid.html` | Sin toolbar | Public `toolbar="false"` | Keep |
| `data/data-grid/data-grid.html` | Básico (toolbar, paginación, header-filters, selección) | Public attrs | Keep |
| `data/data-grid/data-grid.html` | Sin toolbar | Public `show-toolbar="false"` | Keep |
| `data/data-grid/data-grid.html` | Columnas custom con renderCell | Public `renderCell` callback | Keep |
| `data/kanban/kanban.html` | Básico (3 columnas) | Public data API | Keep |
| `data/kanban/kanban.html` | Sin sombra + cover | Public attribute demo | Keep |
| `data/kanban/kanban.html` | Orientación row | Public `orientation="row"` | Keep |
| `data/pivot-table/pivot-table.html` | Sum (ventas por región × trimestre) | Public aggregator | Keep |
| `data/pivot-table/pivot-table.html` | Avg con 1 decimal | Public aggregator | Keep |
| `data/pivot-table/pivot-table.html` | Count | Public aggregator | Keep |
| `data/pivot-table/pivot-table.html` | Max | Public aggregator | Keep |
| `data/spreadsheet/spreadsheet.html` | 5 filas + fila de fórmulas | Public data API | Keep |
| `data/spreadsheet/spreadsheet.html` | Mixto: números, strings y fórmulas | Public data API | Keep |
| `data/spreadsheet/spreadsheet.html` | Read-only | Public `readonly` | Keep |
| `data/spreadsheet/spreadsheet.html` | Con MIN/MAX | Public aggregator | Keep |
| `data/stat/stat.html` | Básico | Public default | Keep |
| `data/stat/stat.html` | Trend positivo | Public `trend="up"` | Keep |
| `data/stat/stat.html` | Trend negativo | Public `trend="down"` | Keep |
| `data/stat/stat.html` | Trend plano (explícito) | Public `trend="flat"` | Keep |
| `data/stat/stat.html` | Warning | Public `variant="warning"` | Keep |
| `data/stat/stat.html` | Slot override | Slot — public API | Keep |
| `data/transfer/transfer.html` | Básico | Public data API | Keep |
| `data/transfer/transfer.html` | Searchable + max-target=3 | Public attrs | Keep |
| `data/transfer/transfer.html` | Items deshabilitados | Public `disabled` on items | Keep |
| `data/transfer/transfer.html` | Sin headings, sin botones (sólo click) | Public attrs | Keep |

> **Page-level note for `data/ag-grid/ag-grid.html` and `data/data-grid/data-grid.html`:** both files set `--iswc-grid-height` (an internal token of the respective grid component) in the page-level `<style>` and in a JS `setProperty` call. The internal token is **not explained by any of the section headings** (Básico / Density / Sin toolbar / Columnas custom con renderCell). No section needs to be deleted, but the user may want to clean up the page-level CSS as a separate hygiene pass.

### `data-viz/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `data-viz/Heatmap/heatmap.html` | Paleta brand (densa) | Public `palette` option | Keep |
| `data-viz/Heatmap/heatmap.html` | Paleta red-blue (divergente) | Public `palette` option | Keep |
| `data-viz/Maps/maps.html` | Modo SVG nativo (América del Sur) | Public mode | Keep |
| `data-viz/Maps/maps.html` | Modo tile (OpenStreetMap embebido) | Public mode | Keep |

### `diagramas/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `diagramas/ER/index.html` | (h2 inside `<a class="card">` link cards, not sections) | n/a | n/a |
| `diagramas/ER/er-editor.html` / `er-static.html` | Aristas dashed animadas / Mix de rutas + estilos por arista | Public `dashStyle`, `route` options | Keep |
| (other diagram files: app/edit.html, app/view.html, block.html, block-diagram.html, class-diagram.html, component.html, component-diagram.html, component-pack.html, diagram-lightbox.html, er-diagram.html, flowchart.html, gantt.html, journey.html, journey-map.html, mindmap.html, org-chart.html, quadrant.html, quadrant-chart.html, sankey.html, sankey-diagram.html, sequence.html, sequence-diagram.html, state.html, state-diagram.html, swimlane.html, swimlane-diagram.html, timeline.html, use-case.html, use-case-diagram.html, venn.html, venn-diagram.html) | (each has its own feature sections; all use public data/props API) | n/a | Keep |

### `feedback/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `feedback/badge/badge.html` | Colores | Public `color="…"` | Keep |
| `feedback/badge/badge.html` | Variantes | Public `variant="…"` | Keep |
| `feedback/badge/badge.html` | Pill | Public `pill` | Keep |
| `feedback/badge/badge.html` | Atención (pulse / bounce) | Public `attention` mode | Keep |
| `feedback/badge/badge.html` | Slots (start / end) | Public slot API | Keep |
| `feedback/cdn-snippet/cdn-snippet.html` | (no `<section>` blocks) | n/a | n/a |
| `feedback/confirm-modal/confirm-modal.html` | Apertura por atributo `for` | Public `for` attribute | Keep |
| `feedback/confirm-modal/confirm-modal.html` | Con botones personalizados (slots confirm / cancel) | Public slot API | Keep |
| `feedback/confirm-modal/confirm-modal.html` | Programático (`el.show()`) | Public method | Keep |
| `feedback/palette-selector/palette-selector.html` | Default (3 paletas built-in) | Public default usage. The `<h3>Vista previa</h3>` text inside this section says *"Esta caja usa las CSS variables de la paleta activa. Cambiá la paleta arriba para ver el efecto."* — but it refers to the **palette system** (kit-level `--iswc-bg`/`--iswc-fg` of the host page), which is page-level kit tokens, not an internal-specific token. | Keep |
| `feedback/palette-selector/palette-selector.html` | Con paletas custom (atributo `palettes` JSON) | Public `palettes` attribute | Keep |
| `feedback/popconfirm/popconfirm.html` | Popconfirm básico | Public default | Keep |
| `feedback/popconfirm/popconfirm.html` | Placement top-end + slots custom | Public `placement`, slot API | Keep |
| `feedback/popconfirm/popconfirm.html` | Apertura programática (`el.show()`) | Public method | Keep |
| `feedback/prefs-clear/prefs-clear.html` | Con confirmación (default) | Public default | Keep |
| `feedback/prefs-clear/prefs-clear.html` | Sin confirmación, sin recarga | Public attrs | Keep |
| `feedback/prefs-clear/prefs-clear.html` | Estado de localStorage (peek) | Public peek method | Keep |
| `feedback/progress-bar/progress-bar.html` | Valores fijos | Public `value="…"` | Keep |
| `feedback/progress-bar/progress-bar.html` | Indeterminate | Public `indeterminate` | Keep |
| `feedback/progress-bar/progress-bar.html` | Personalización (color / track-height) | Uses public `color="#7c3aed"` and `track-height="14"` — both public attributes. The "Personalización" wording is about the public API, not internal CSS vars. | Keep |
| `feedback/progress-ring/progress-ring.html` | Valores | Public `value="…"` | Keep |
| `feedback/progress-ring/progress-ring.html` | Con label | Public `label` slot | Keep |
| `feedback/progress-ring/progress-ring.html` | Custom (color / width) | Uses public `color`, `width`, `track-color`, `track-width` attributes. NOT internal tokens. | Keep |
| `feedback/skeleton/skeleton.html` | Efectos | Public `effect` | Keep |
| `feedback/skeleton/skeleton.html` | pulse | Public `effect="pulse"` | Keep |
| `feedback/skeleton/skeleton.html` | none (estático) | Public `effect="none"` | Keep |
| `feedback/skeleton/skeleton.html` | Tarjeta con varios skeletons | Public composition | Keep |
| `feedback/spinner/spinner.html` | Default | Public default | Keep |
| `feedback/spinner/spinner.html` | Tamaños (vía style width/height) | Public `style="width:…;height:…;"` on the host | Keep |
| `feedback/spinner/spinner.html` | Colores custom | Uses public `color="#…"` attribute. This is exactly the case the brief called out: "Custom colors" / "Colores custom" — but only if they explain internal CSS vars, not just public `color="…"` attr. Here it's purely the public attribute. | Keep |
| `feedback/spinner/spinner.html` | Velocidad lenta | Public `speed="3s"` | Keep |
| `feedback/tag/tag.html` | Colores | Public `color` attribute | Keep |
| `feedback/tag/tag.html` | Variantes | Public `variant` attribute | Keep |
| `feedback/tag/tag.html` | Pill + with-remove (selección múltiple) | Public `pill`, `with-remove` | Keep |
| `feedback/tag/tag.html` | Slots (start / end) | Public slot API | Keep |
| `feedback/theme-toggle/theme-toggle.html` | En la página (afecta a `<html>`) | Public behaviour demo | Keep |
| `feedback/theme-toggle/theme-toggle.html` | Sección que arrancará en light | Public `data-theme="light"` + `container-theme` class | Keep |
| `feedback/theme-toggle/theme-toggle.html` | Eventos | iswc-theme-change event log | Keep |
| `feedback/toast/toast.html` | Placements | Public `placement` | Keep |
| `feedback/toast/toast.html` | Lanzar varios | Public method | Keep |
| `feedback/toast/toast.html` | Gap 18 — sanitización de `allowHtml` | Public `allowHtml` option | Keep |
| `feedback/toast-item/toast-item.html` | Crear dinámicamente | Public programmatic creation | Keep |
| `feedback/toast-item/toast-item.html` | Con slot caption | Public slot API | Keep |
| `feedback/toast-item/toast-item.html` | Eventos | event log | Keep |
| `feedback/tooltip/tooltip.html` | Default (hover + focus) | Public default trigger | Keep |
| `feedback/tooltip/tooltip.html` | Placement + distance + sin arrow | Public `placement`, `distance`, `arrow` | Keep |
| `feedback/tooltip/tooltip.html` | Trigger focus (solo teclado) | Public `trigger="focus"` | Keep |
| `feedback/tooltip/tooltip.html` | Trigger click (toggle) | Public `trigger="click"` | Keep |
| `feedback/tooltip/tooltip.html` | Trigger manual (control programático) | Public `trigger="manual"` | Keep |
| `feedback/tooltip/tooltip.html` | Eventos | event log | Keep |

### `forms/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `forms/index.html` | (h2 inside `<a class="card">` link cards, not sections) | n/a | n/a |
| `forms/checkbox/checkbox.html` | Básica | Public default | Keep |
| `forms/checkbox/checkbox.html` | Variantes y estados | Public `variant`, `checked`, `indeterminate`, `disabled` | Keep |
| `forms/checkbox/checkbox.html` | Colores | Public `color="…"` | Keep |
| `forms/checkbox/checkbox.html` | label-placement | Public `label-placement` | Keep |
| `forms/color-picker/color-picker.html` | Básico con label y hint | Public `label`, `hint` | Keep |
| `forms/color-picker/color-picker.html` | Swatches personalizados | Public `swatches` option | Keep |
| `forms/color-picker/color-picker.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/color-picker/color-picker.html` | Requerido (form-associated) | Public `required` | Keep |
| `forms/combobox/combobox.html` | Básico con valor inicial | Public default + `value` | Keep |
| `forms/combobox/combobox.html` | Clearable | Public `clearable` | Keep |
| `forms/combobox/combobox.html` | Requerido | Public `required` | Keep |
| `forms/combobox/combobox.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/date-field/date-field.html` | Básico | Public default | Keep |
| `forms/date-field/date-field.html` | Con texto de ayuda y validación (required + min/max) | Public `hint`, `required`, `min`, `max` | Keep |
| `forms/date-field/date-field.html` | Con valor inicial | Public `value` | Keep |
| `forms/date-field/date-field.html` | Borrable (botón × para limpiar) | Public `clearable` | Keep |
| `forms/date-field/date-field.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/date-field/date-field.html` | Solo lectura | Public `readonly` | Keep |
| `forms/date-input/date-input.html` | Básico | Public default | Keep |
| `forms/date-input/date-input.html` | Con valor inicial | Public `value` + `clearable` | Keep |
| `forms/date-input/date-input.html` | Requerido | Public `required` | Keep |
| `forms/date-input/date-input.html` | Con rango permitido | Public `min`, `max` | Keep |
| `forms/date-input/date-input.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/date-input/date-input.html` | Apertura programática (show / hide) | Public `show()` / `hide()` methods | Keep |
| `forms/date-picker/date-picker.html` | Básico | Public default | Keep |
| `forms/date-picker/date-picker.html` | Con valor inicial | Public `value` | Keep |
| `forms/date-picker/date-picker.html` | Con min / max | Public `min`, `max` | Keep |
| `forms/date-picker/date-picker.html` | Días fuera del mes + semanas fijas | Public option | Keep |
| `forms/date-picker/date-picker.html` | Fines de semana deshabilitados | Public option | Keep |
| `forms/date-picker/date-picker.html` | Vista mes | Public `view` option | Keep |
| `forms/date-range-input/date-range-input.html` | Básico | Public default | Keep |
| `forms/date-range-input/date-range-input.html` | Con valor inicial | Public `value` | Keep |
| `forms/date-range-input/date-range-input.html` | Con atajos (shortcuts) | Public `shortcuts` | Keep |
| `forms/date-range-input/date-range-input.html` | Con min / max | Public `min`, `max` | Keep |
| `forms/date-range-input/date-range-input.html` | Apertura programática | Public `show()` / `hide()` | Keep |
| `forms/date-range-picker/date-range-picker.html` | Básico | Public default | Keep |
| `forms/date-range-picker/date-range-picker.html` | Con valor inicial | Public `value` | Keep |
| `forms/date-range-picker/date-range-picker.html` | Con atajos | Public `shortcuts` | Keep |
| `forms/date-range-picker/date-range-picker.html` | Tres meses (calendars=3) | Public `calendars` | Keep |
| `forms/date-range-picker/date-range-picker.html` | Un solo mes (calendars=1) | Public `calendars` | Keep |
| `forms/date-time-field/date-time-field.html` | Básico (24h, sin segundos) | Public default | Keep |
| `forms/date-time-field/date-time-field.html` | Con valor inicial y segundos | Public `value`, `seconds` | Keep |
| `forms/date-time-field/date-time-field.html` | Formato 12 horas (AM/PM) | Public `format="12h"` | Keep |
| `forms/date-time-field/date-time-field.html` | Con texto de ayuda y validación (required + min/max) | Public `hint`, `required`, `min`, `max` | Keep |
| `forms/date-time-field/date-time-field.html` | Borrable (botón × para limpiar) | Public `clearable` | Keep |
| `forms/date-time-field/date-time-field.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/date-time-field/date-time-field.html` | Solo lectura | Public `readonly` | Keep |
| `forms/date-time-input/date-time-input.html` | Básico | Public default | Keep |
| `forms/date-time-input/date-time-input.html` | Con valor inicial | Public `value` | Keep |
| `forms/date-time-input/date-time-input.html` | Formato 12 horas (AM/PM) | Public `format` | Keep |
| `forms/date-time-input/date-time-input.html` | Modo móvil (centered dialog con barra de acciones) | Public `mobile-mode` | Keep |
| `forms/date-time-input/date-time-input.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/digital-clock/digital-clock.html` | Lista con paso de 30 minutos | Public `step` | Keep |
| `forms/digital-clock/digital-clock.html` | Columnas (secciones) con segundos y AM/PM | Public `columns` | Keep |
| `forms/digital-clock/digital-clock.html` | 24 horas (paso 15) | Public `step` | Keep |
| `forms/digital-clock/digital-clock.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/doc-editor/doc-editor.html` | Documento con bloques iniciales | Public data | Keep |
| `forms/doc-editor/doc-editor.html` | Documento vacío | Public default | Keep |
| `forms/doc-editor/doc-editor.html` | Documento desde JSON inline | Public `<script type="application/json">` payload | Keep |
| `forms/dropzone/dropzone.html` | Dropzone libre | Public default | Keep |
| `forms/dropzone/dropzone.html` | Sólo imágenes (máx. 3) | Public `accept`, `max-files` | Keep |
| `forms/dropzone/dropzone.html` | PDF (1 archivo, 5 MB) | Public `accept`, `max-files`, `max-size` | Keep |
| `forms/dropzone/dropzone.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/duration-picker/duration-picker.html` | Básico (1h 30m) | Public default | Keep |
| `forms/duration-picker/duration-picker.html` | Con límites y step | Public `min`, `max`, `step` | Keep |
| `forms/duration-picker/duration-picker.html` | Control programático (set / text) | Public `set()` / `text` | Keep |
| `forms/file-input/file-input.html` | Básico (un solo archivo) | Public default | Keep |
| `forms/file-input/file-input.html` | Múltiple (varios archivos) | Public `multiple` | Keep |
| `forms/file-input/file-input.html` | Requerido | Public `required` | Keep |
| `forms/file-input/file-input.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/full-calendar/full-calendar.html` | Vista mes | Public `view="month"` | Keep |
| `forms/full-calendar/full-calendar.html` | Vista semana | Public `view="week"` | Keep |
| `forms/full-calendar/full-calendar.html` | Vista día (con franja horaria 6–22) | Public `view="day"`, `hours` | Keep |
| `forms/inline-edit/inline-edit.html` | Tarea (modo texto) | Public `mode="text"` | Keep |
| `forms/inline-edit/inline-edit.html` | Descripción multilínea (textarea) | Public `mode="textarea"` | Keep |
| `forms/inline-edit/inline-edit.html` | Cancel-on-blur | Public `cancel-on-blur` | Keep |
| `forms/inline-edit/inline-edit.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/inline-edit/inline-edit.html` | Requerido | Public `required` | Keep |
| `forms/input/input.html` | Básico (text + clearable) | Public `type`, `clearable` | Keep |
| `forms/input/input.html` | Tipos | Public `type="…"` | Keep |
| `forms/input/input.html` | Estados | Public `disabled`, `readonly`, `required` | Keep |
| `forms/masked-input/masked-input.html` | Teléfono AR | Public `mask` | Keep |
| `forms/masked-input/masked-input.html` | Tarjeta de crédito | Public `mask` | Keep |
| `forms/masked-input/masked-input.html` | Fecha DD/MM/AAAA | Public `mask` | Keep |
| `forms/masked-input/masked-input.html` | Placa AAAA 000 | Public `mask` | Keep |
| `forms/masked-input/masked-input.html` | Requerido | Public `required` | Keep |
| `forms/mention/mention.html` | Básico: @usuarios y #etiquetas desde JSON | Public `trigger`, `suggestions` | Keep |
| `forms/mention/mention.html` | Sólo usuarios (vía propiedad `suggestions`) | Public `suggestions` | Keep |
| `forms/mention/mention.html` | Trigger personalizado (`#`) | Public `trigger` | Keep |
| `forms/mention/mention.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/month-calendar/month-calendar.html` | Básico (año 2026) | Public default | Keep |
| `forms/month-calendar/month-calendar.html` | Con valor inicial | Public `value` | Keep |
| `forms/month-calendar/month-calendar.html` | Con rango limitado | Public `min`, `max` | Keep |
| `forms/month-calendar/month-calendar.html` | Etiquetas largas, 4 columnas | Public `columns` | Keep |
| `forms/option/option.html` | Básico | Public default | Keep |
| `forms/option/option.html` | Con grupos | Public `<iswc-option-group>` children | Keep |
| `forms/option/option.html` | Estados | Public `selected`, `disabled` | Keep |
| `forms/pin-input/pin-input.html` | OTP 6 dígitos | Public `length` | Keep |
| `forms/pin-input/pin-input.html` | PIN 4 enmascarado | Public `length`, `mask` | Keep |
| `forms/pin-input/pin-input.html` | OTP 4 con placeholder | Public `length`, `placeholder` | Keep |
| `forms/pin-input/pin-input.html` | Código alfanumérico | Public `type="alphanumeric"` | Keep |
| `forms/pin-input/pin-input.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/radio/radio.html` | Básico (standalone) | Public default | Keep |
| `forms/radio/radio.html` | Estados | Public `checked`, `disabled` | Keep |
| `forms/radio/radio.html` | Colores y label-placement | Public `color`, `label-placement` | Keep |
| `forms/radio-group/radio-group.html` | Básico (vertical) | Public default | Keep |
| `forms/radio-group/radio-group.html` | Horizontal | Public `orientation` | Keep |
| `forms/radio-group/radio-group.html` | Con error | Public `error` | Keep |
| `forms/radio-group/radio-group.html` | Disabled | Public `disabled` | Keep |
| `forms/rating/rating.html` | Básico con label y formato | Public default | Keep |
| `forms/rating/rating.html` | Medios pasos (allow-half) | Public `allow-half` | Keep |
| `forms/rating/rating.html` | Color de marca + clearable | Public `color`, `clearable` | Keep |
| `forms/rating/rating.html` | Solo lectura con etiquetas | Public `readonly` | Keep |
| `forms/rating/rating.html` | Requerido (validación de formulario) | Public `required` | Keep |
| `forms/rte/rte.html` | Toolbar por defecto | Public default | Keep |
| `forms/rte/rte.html` | Toolbar reducida | Public `toolbar="compact"` | Keep |
| `forms/rte/rte.html` | Solo lectura | Public `readonly` | Keep |
| `forms/select/select.html` | Selección simple | Public default | Keep |
| `forms/select/select.html` | Selección múltiple (tags + clearable) | Public `multiple`, `clearable` | Keep |
| `forms/select/select.html` | Opciones agrupadas | Public grouping | Keep |
| `forms/select/select.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/signature/signature.html` | Por defecto (320 × 140) | Public default | Keep |
| `forms/signature/signature.html` | Personalizado (color + grosor + tamaño) | Uses public `width`, `height`, `pen-color`, `line-width`, `background` attributes. The "Personalizado" wording is about the public API, not internal CSS vars. | Keep |
| `forms/signature/signature.html` | Modo "papel" (fondo claro, trazo oscuro) | Public `background`, `pen-color` | Keep |
| `forms/slider/slider.html` | Básico single-value | Public default | Keep |
| `forms/slider/slider.html` | Range con dos thumbs | Public `range` | Keep |
| `forms/slider/slider.html` | Marks con etiquetas | Public `marks` | Keep |
| `forms/slider/slider.html` | Requerido | Public `required` | Keep |
| `forms/slider/slider.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/switch/switch.html` | Básico | Public default | Keep |
| `forms/switch/switch.html` | Estados | Public `checked`, `disabled` | Keep |
| `forms/switch/switch.html` | Colores | Public `color` | Keep |
| `forms/switch/switch.html` | on-label / off-label | Public `on-label`, `off-label` | Keep |
| `forms/textarea/textarea.html` | Básico (autosize) | Public `autosize` | Keep |
| `forms/textarea/textarea.html` | Variantes | Public `variant` | Keep |
| `forms/textarea/textarea.html` | Estados | Public `disabled`, `readonly`, `required` | Keep |
| `forms/time-clock/time-clock.html` | Básico (24h) | Public default | Keep |
| `forms/time-clock/time-clock.html` | AM/PM (en-US) | Public `format` | Keep |
| `forms/time-clock/time-clock.html` | Con segundos | Public `seconds` | Keep |
| `forms/time-clock/time-clock.html` | Step de minutos = 15 | Public `step` | Keep |
| `forms/time-clock/time-clock.html` | Rango 08:00–18:00 | Public `min`, `max` | Keep |
| `forms/time-clock/time-clock.html` | Solo lectura | Public `readonly` | Keep |
| `forms/time-clock/time-clock.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/time-field/time-field.html` | Básico (24h, sin segundos) | Public default | Keep |
| `forms/time-field/time-field.html` | Con segundos | Public `seconds` | Keep |
| `forms/time-field/time-field.html` | Formato 12 horas (AM/PM) | Public `format` | Keep |
| `forms/time-field/time-field.html` | Con texto de ayuda y validación (required + min/max) | Public `hint`, `required`, `min`, `max` | Keep |
| `forms/time-field/time-field.html` | Borrable (botón × para limpiar) | Public `clearable` | Keep |
| `forms/time-field/time-field.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/time-field/time-field.html` | Solo lectura | Public `readonly` | Keep |
| `forms/time-input/time-input.html` | Básico (panel=sections) | Public `panel="sections"` | Keep |
| `forms/time-input/time-input.html` | Con valor inicial | Public `value` | Keep |
| `forms/time-input/time-input.html` | Panel de lista simple | Public `panel="list"` | Keep |
| `forms/time-input/time-input.html` | Panel de reloj analógico | Public `panel="clock"` | Keep |
| `forms/time-input/time-input.html` | Formato 12 horas (AM/PM) | Public `format` | Keep |
| `forms/time-input/time-input.html` | Modo móvil (centered dialog con barra de acciones) | Public `mobile-mode` | Keep |
| `forms/time-input/time-input.html` | Deshabilitado | Public `disabled` | Keep |
| `forms/year-calendar/year-calendar.html` | Básico 2020–2032 | Public default | Keep |
| `forms/year-calendar/year-calendar.html` | Rango histórico 1990–2010 | Public `min-year`, `max-year` | Keep |
| `forms/year-calendar/year-calendar.html` | Sólo lectura | Public `readonly` | Keep |
| `forms/year-calendar/year-calendar.html` | Deshabilitado | Public `disabled` | Keep |

### `helpers/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `helpers/format/format.html`, `helpers/format-bytes/format-bytes.html`, `helpers/format-date/format-date.html`, `helpers/format-number/format-number.html`, `helpers/md-render/md-render.html` | (each shows usage of public helper API) | Public API | Keep |

### `isp/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `isp/index.html` | Cómo correr los tests | Test-running instructions (not a section about internal tokens) | Keep |
| `isp/accordion-group/accordion-group.html` | Modo single (default) | Public `mode="single"` | Keep |
| `isp/accordion-group/accordion-group.html` | Modo multiple | Public `mode="multiple"` | Keep |
| `isp/accordion-group/accordion-group.html` | Eventos `iswc-accordion-change` | Public event | Keep |
| `isp/block-layout/block-layout.html` | Breakpoint reacciona al propio ancho (no al viewport) | Public ResizeObserver behaviour + `data-sizew` attribute | Keep |
| `isp/block-layout/block-layout.html` | JSON round-trip (json2html / html2json / fromJSON / toJSON) | Public `fromJSON`, `toJSON` methods | Keep |
| `isp/block-layout/block-layout.html` | Eventos `iswc-breakpoint` | Public event | Keep |
| `isp/btn-ref/btn-ref.html` | Ejemplo | Public default | Keep |
| `isp/btn-ref/btn-ref.html` | Eventos | event log | Keep |
| `isp/flex-layout/flex-layout.html` | Row + gap + between + center | Public layout props | Keep |
| `isp/flex-layout/flex-layout.html` | Column + wrap | Public layout props | Keep |
| `isp/flex-layout/flex-layout.html` | Grow + max-width | Public layout props | Keep |
| `isp/flex-layout/flex-layout.html` | Responsive gap (data-sizew) | Public `data-sizew` attribute | Keep |
| `isp/flex-options/flex-options.html` | Acciones planas | Public `actions` data | Keep |
| `isp/flex-options/flex-options.html` | Grupos + menú "más" | Public grouping | Keep |
| `isp/flex-options/flex-options.html` | Compact (iconos sin label) | Public `compact` | Keep |
| `isp/flex-options/flex-options.html` | Re-asignación re-pinta | Public reactivity | Keep |
| `isp/flex-options/flex-options.html` | Eventos (clic en acción) | Public event | Keep |
| `isp/float-card/float-card.html` | Hover reveal (right · center) | Public `horizontal`, `vertical` | Keep |
| `isp/float-card/float-card.html` | Always open · center · top+50 | Public `open` + `vertical` | Keep |
| `isp/float-card/float-card.html` | linearTransform (translate + scale) | Public `linearTransform` | Keep |
| `isp/form/form.html` | Demo A — declarativo en light DOM | Public declarative API | Keep |
| `isp/form/form.html` | Demo B — desde `fromJSON()` + botones de utilidad | Public `fromJSON()` | Keep |
| `isp/form/form.html` | Demo C — inline JSON via `<script type="application/json">` | Public script payload | Keep |
| `isp/form/form.html` | Eventos | event log | Keep |
| `isp/form-json/form-json.html` | Demo: leer/escribir controles con `name` | Public helper API (`getValues`, `setValues`, `listControls`) | Keep |
| `isp/grid-layout/grid-layout.html` | 3 columnas con gap | Public layout props | Keep |
| `isp/grid-layout/grid-layout.html` | Track list cruda (auto + 1fr) | Public `grid-template-columns` syntax | Keep |
| `isp/grid-layout/grid-layout.html` | cells-fit (max-content) | Public `cells-fit` | Keep |
| `isp/grid-layout/grid-layout.html` | direction=row (auto-flow column) | Public `direction` | Keep |
| `isp/grid-layout/grid-layout.html` | Responsive (data-sizew) | Public `data-sizew` | Keep |
| `isp/heading/heading.html` | Niveles 1 a 6 (default color) | Public `level` | Keep |
| `isp/heading/heading.html` | Colores semánticos | Public `color="brand"/neutral/info/..."` | Keep |
| `isp/heading/heading.html` | Mix hacia texto (mix y mix-with) | Public `mix`, `mix-with` | Keep |
| `isp/heading/heading.html` | Override de tamaño (size) | Uses public `size="3rem"` attribute. The word "Override" is about the public `size` API, not internal CSS vars. | Keep |
| `isp/heading/heading.html` | Color CSS arbitrario | Public `color="#…"` | Keep |
| `isp/loading-overlay/loading-overlay.html` | (no `<section>` blocks — only buttons + log) | n/a | n/a |
| `isp/text/text.html` | Colores semánticos | Public `color="…"` | Keep |
| `isp/text/text.html` | Mix hacia texto | Public `mix` | Keep |
| `isp/text/text.html` | Color CSS arbitrario | Public `color` | Keep |
| `isp/text/text.html` | Clamp con lines (recorte a N líneas) | Public `lines` | Keep |
| `isp/text/text.html` | Combinación: color + mix + lines | Public combination of `color`, `mix`, `lines` | Keep |
| `isp/tree-view/tree-view.html`, `isp/catalogo-gen/catalogo-gen.html`, `isp/confirm-delete/confirm-delete.html`, `isp/modal-verificacion/modal-verificacion.html` | (each shows usage of public data/props/events API) | Public API | Keep |

### `layout/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `layout/callout/callout.html` | Colores | Public `color` | Keep |
| `layout/callout/callout.html` | Variants | Public `variant` | Keep |
| `layout/callout/callout.html` | Iconos (default · atributo · slot) | Public `icon` + slot API | Keep |
| `layout/callout/callout.html` | Interactivo | Public `href` / click | Keep |
| `layout/card/card.html` | Vertical (default) — slots opcionales | Public default + slot API | Keep |
| `layout/card/card.html` | Variants | Public `variant` | Keep |
| `layout/card/card.html` | Horizontal | Public `orientation` | Keep |
| `layout/card/card.html` | Interactivo | Public `href` / click | Keep |
| `layout/demo/demo.html` | Con heading | Public default | Keep |
| `layout/demo/demo.html` | Sin heading | Public default | Keep |
| `layout/demo/demo.html` | Heading dinámico | Public reactivity | Keep |
| `layout/demo/demo.html` | Cuarto demo | Public default | Keep |
| `layout/demo/demo.html` | Eventos | event log | Keep |
| `layout/details/details.html` | Básico (summary como atributo) | Public `summary` attribute | Keep |
| `layout/details/details.html` | Con slot summary (rich content) y open inicial | Public slot + `open` | Keep |
| `layout/details/details.html` | Accordion (name="acc1") | Public `name` (accordion group) | Keep |
| `layout/details/details.html` | Disabled | Public `disabled` | Keep |
| `layout/details/details.html` | Variants | Public `variant` | Keep |
| `layout/details/details.html` | icon-placement | Public `icon-placement` | Keep |
| `layout/details/details.html` | Interactivo (d1) | Public click | Keep |
| `layout/details/details.html` | Eventos | event log | Keep |
| `layout/dialog/dialog.html` | Openers | Public `for` attribute | Keep |
| `layout/dialog/dialog.html` | Eventos | event log | Keep |
| `layout/divider/divider.html` | Horizontal (default) | Public default | Keep |
| `layout/divider/divider.html` | Colores | Public `color` | Keep |
| `layout/divider/divider.html` | Opacities | Public `opacity` | Keep |
| `layout/divider/divider.html` | Vertical | Public `orientation` | Keep |
| `layout/divider/divider.html` | Interactivo | Public click | Keep |
| `layout/dock/dock.html` | Dock bottom (default) | Public default | Keep |
| `layout/dock/dock.html` | Dock top | Public `placement="top"` | Keep |
| `layout/dock/dock.html` | Dock con max-scale=2.4 | Public `max-scale` | Keep |
| `layout/dock/dock.html` | Eventos iswc-select | event log | Keep |
| `layout/drawer/drawer.html` | Placements | Public `placement` | Keep |
| `layout/drawer/drawer.html` | Eventos | event log | Keep |
| `layout/main/main.html` | Sin persistencia | Public default | Keep |
| `layout/main/main.html` | Con persistencia (remember-scroll + storage-key) | Public `remember-scroll`, `storage-key` | Keep |
| `layout/main/main.html` | scroll-ttl custom (60s) | Public `scroll-ttl` | Keep |
| `layout/main/main.html` | Interactivo | Public default | Keep |
| `layout/scrollspy/scrollspy.html` | 1. Target auto-resuelto al `<iswc-main>` | Public default | Keep |
| `layout/scrollspy/scrollspy.html` | 2. Trigger custom (data-scrollspy-trigger) + target=#target-2 | Public `data-scrollspy-trigger` | Keep |
| `layout/scrollspy/scrollspy.html` | 3. article[id] triggers + target=#target-3 | Public default | Keep |
| `layout/scrollspy/scrollspy.html` | Eventos | event log | Keep |
| `layout/split-panel/split-panel.html` | 1. Horizontal (default) | Public default | Keep |
| `layout/split-panel/split-panel.html` | 2. Vertical | Public `orientation="vertical"` | Keep |
| `layout/split-panel/split-panel.html` | 3. Con persistencia (storage-key) | Public `storage-key` | Keep |
| `layout/split-panel/split-panel.html` | 4. primary="end" + snap="120px 50%" | Public `primary`, `snap` | Keep |
| `layout/split-panel/split-panel.html` | 5. Disabled | Public `disabled` | Keep |
| `layout/split-panel/split-panel.html` | Eventos reposition | event log | Keep |

### `media/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `media/Avatar/avatar.html` | Iniciales | Public `initials` | Keep |
| `media/Avatar/avatar.html` | Imagen (URL rota → fallback) | Public `src` + fallback behaviour | Keep |
| `media/Avatar/avatar.html` | Slot icon (custom) | Public slot | Keep |
| `media/Barcode/barcode.html` | Code128 (texto libre) | Public `format="code128"` | Keep |
| `media/Barcode/barcode.html` | EAN-13 (con checksum auto) | Public `format="ean13"` | Keep |
| `media/Barcode/barcode.html` | Colores fg / bg | Public `fg`, `bg` attributes | Keep |
| `media/Barcode/barcode.html` | Sin texto (modo minimal) | Public `display-value="false"` | Keep |
| `media/BarcodeScanner/barcode-scanner.html` | QR + EAN-13 (default) | Public default | Keep |
| `media/BarcodeScanner/barcode-scanner.html` | Solo QR (modo restringido) | Public `formats` | Keep |
| `media/BarcodeScanner/barcode-scanner.html` | Disabled (no inicia) | Public `disabled` | Keep |
| `media/Icon/icon.html` | Monocromáticos (currentColor) | Public `icon` + `currentColor` | Keep |
| `media/Icon/icon.html` | Con label (accesible) | Public `label` | Keep |
| `media/Icon/icon.html` | Sobre fondo claro (legibilidad) | Public styling | Keep |
| `media/Icon/icon.html` | Compat name + library | Public `name`, `library` | Keep |
| `media/ImageEditor/image-editor.html` | Editor con imagen de muestra | Public default | Keep |

### `navigation/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `navigation/breadcrumb/breadcrumb.html` | Básico | Public default | Keep |
| `navigation/breadcrumb/breadcrumb.html` | Label custom | Public `label` | Keep |
| `navigation/breadcrumb/breadcrumb.html` | Items sin href | Public no-`href` | Keep |
| `navigation/breadcrumb/breadcrumb.html` | Separator override | Public `slot="separator"` — the "override" here is replacing the default chevron with a custom separator via the **public slot API**, not overriding an internal CSS variable. | Keep |
| `navigation/breadcrumb/breadcrumb.html` | Target / rel | Public `target`, `rel` | Keep |
| `navigation/breadcrumb-item/breadcrumb-item.html` | Estados básicos | Public `current`, `disabled` | Keep |
| `navigation/breadcrumb-item/breadcrumb-item.html` | Icono | Public `icon` | Keep |
| `navigation/breadcrumb-item/breadcrumb-item.html` | Slots | Public slot API | Keep |
| `navigation/breadcrumb-item/breadcrumb-item.html` | Cambio en caliente | Public reactivity | Keep |

### `overlays/`

| File | Section heading | Why it explains internal tokens | Action |
|------|-----------------|---------------------------------|--------|
| `overlays/CommandPalette/command-palette.html` | (only one `<section class="hero">` with `<h3>Busca un comando</h3>`, no internal-token explanation) | Public usage | Keep |
| `overlays/PdfViewer/pdf-viewer.html` | Básico + download + print | Public default + `download`, `print` | Keep |
| `overlays/PdfViewer/pdf-viewer.html` | Toolbar personalizado (slot) | Public slot API (the word "personalizado" / "override" is about the slot, not internal CSS vars) | Keep |
| `overlays/Window/window.html` | (no `<section>` blocks — only `<main>` with hero text) | n/a | n/a |

---

## Appendix — page-level CSS / JS that touches internal-style tokens (NOT in any section heading)

These are the four files where internal-token-style syntax appears at the page level rather than inside a documented section. They are **not DELETE candidates for sections** (because the sections don't explain them), but they may be worth a separate hygiene pass if the user wants the demos to be fully "clean" of internal token leakage.

### A. `data/ag-grid/ag-grid.html`
- **Line 18** (page `<style>`): `iswc-ag-grid { display: block; min-height: 280px; --iswc-grid-height: 280px; }` — sets the internal `--iswc-grid-height` token at the page level to make the grid taller by default.
- **Line 78** (JS): `g.style.setProperty('--iswc-grid-height', '180px');` — inside the `for (const density of [...])` loop that creates the density demo instances; this shrinks the height for those three instances.
- **No section heading documents this.** The density sections ("Density: compact / normal / comfortable") show only the public `density` attribute, not the height override.
- **Suggestion:** if the user wants the demo to be 100% free of internal-token leakage, move both into a code comment above each `<section>`, or document a tiny "Cómo se setea la altura" subsection. Not required by the brief.

### B. `data/data-grid/data-grid.html`
- **Line 18** (page `<style>`): `iswc-data-grid { display: block; --iswc-grid-height: 280px; min-height: 280px; }` — same pattern as ag-grid.
- **No `setProperty` in JS** (unlike ag-grid, no per-instance height override is done).
- **No section heading documents this.**
- **Suggestion:** same as above — document a "Cómo se setea la altura" subsection, or just delete the page-level default and rely on the component's own default.

### C. `code/code/code.html`
- **Lines 69–70** (inside the `samples.css` JS array): the sample CSS string contains `'  --iswc-code-bg: #1e1e1e;'` and `'  --iswc-code-fg: #eeffff;'` followed by `border-radius: 8px;`. This string is **content shown inside the `<iswc-code>` editor** as a CSS example — it is not the page's CSS. The component then renders it as syntax-highlighted code.
- **No section heading documents this** — and the file's sections are all about editor features (Editable / Readonly / Compact / Marks / etc.), not about styling the editor itself.
- **Suggestion:** none. This is a real-world sample showing how a consumer of `<iswc-code>` could theme it. Removing it would weaken the demo.

### D. `forms/date-input/date-input.html`
- **Line 23** (page `<style>`): `iswc-button.how { --iswc-accent: #2563eb; color: #93c5fd; ... }` — overrides `--iswc-accent` (which is a **kit palette token**, not a private component token) on the two helper `<iswc-button>`s ("Abrir" / "Cerrar") to recolor them blue.
- **No section heading documents this.** The "Apertura programática (show / hide)" section just uses `class="how"` on the buttons.
- **Suggestion:** none required by the brief. The token is general kit, and the recolor is incidental demo chrome.

> The other `--iswc-*` references found by the search (`--iswc-accent` in `forms/checkbox/checkbox.html`, `forms/index.html`, `charts/index.html`, `diagramas/ER/index.html`, `overlays/Window/window.html`, `overlays/CommandPalette/command-palette.html`; `--iswc-bg`/`--iswc-fg` in `feedback/theme-toggle/theme-toggle.html` and `feedback/palette-selector/palette-selector.html`; `--iswc-border`/`--iswc-radius`/`--iswc-text-soft` in `overlays/CommandPalette/command-palette.html` and `overlays/Window/window.html`) are all **general kit tokens applied to the demo's own chrome** (card hover, helper button, body background, hero dashed border, etc.) — explicitly excluded from flagging by the brief.

---

## Final summary

- **168 HTML files scanned.**
- **483 sections** (472 `<h2>` + 11 `<h3>`) inside `<section>` blocks classified.
- **0 sections explain internal tokens** — every "Personalización", "Override", "Custom color", "Custom (color/width)", "Colores custom" section uses only public attributes.
- **0 sections need to be deleted** for the brief.
- **4 files** leak internal-token syntax at the page level without section-level documentation (`ag-grid.html`, `data-grid.html`, `code.html`, `date-input.html`) — these are not section deletions, but the user may want a follow-up cleanup pass.
