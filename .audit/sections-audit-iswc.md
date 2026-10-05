# Phase J1 — Audit secciones de docs en is-webcomponents

> Generado por `.audit/audit-sections.mjs`. Cada fila es un `.md`
> en `src/components/**/*.md`. Las columnas muestran si la sección
> del estándar de 9 secciones está presente (✅), ausente (❌) o
> parcial (⚠️ = "No expone" o texto trivial).

## Estándar aplicado

| # | Sección | Aceptamos (regex) |
|---|---------|-------------------|
| 1 | Anatomía | `Propósito` / `Anatomía` / `Cuándo usarlo` / `Cuándo no usarlo` / `Importación` |
| 2 | Atributos | `Atributos` / `Atributos y propiedades` / `Atributos observados` |
| 3 | Props | `Propiedades` / `Propiedades públicas` / `Props` |
| 4 | States | `Custom states` / `States` |
| 5 | Eventos | `Eventos` / `Events` |
| 6 | Slots | `Slots` |
| 7 | Parts | `CSS parts` / `Parts` |
| 8 | API JS | `API` / `API JavaScript` / `API JS` / `Métodos` / `Métodos y propiedades públicas` |
| 9 | Ejemplos | `Ejemplos` / `Ejemplo mínimo` / `Ejemplo avanzado` / `Usage` |

> **Nota:** en este repo no existe ningún H2 `Anatomía`. La sección
> canónica de identidad es el H1 + `## Propósito` + `## Cuándo usarlo`
> + `## Importación` + `## Ejemplo mínimo`. Marcamos la columna como
> ✅ si **al menos uno** de los proxies está presente.

## Resumen

- **Total de .md auditados:** 198
  - Web Components completos (`kind: component`): **179** (cumplen: 164)
  - Stubs de sub-componentes (`kind: stub`): **15** (cumplen: 0)
  - Módulos / utilidades no-WC (`kind: module`): **4** (cumplen: 0)
- **Cumplen las 9 secciones:** 164
- **Tienen al menos 1 gap:** 34

### Frecuencia de cada gap

| Sección | Faltante en N .md |
|---------|-------------------|
| Anatomía | 1 |
| Atributos | 32 |
| Props | 34 |
| States | 34 |
| Eventos | 33 |
| Slots | 34 |
| Parts | 34 |
| API JS | 16 |
| Ejemplos | 15 |

## Categoría: `actions` (11 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `actions/button-group` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/button` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/check-icon-button` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/context-menu` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/copy-button` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/dropdown-item` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/dropdown` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/fab` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/share-button` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `actions/speed-dial-action` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `actions/speed-dial` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `charts` (13 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `charts/bar-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/bubble-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/doughnut-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/funnel-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/line-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/pie-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/polar-area-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/radar-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/scatter-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/sparkline` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/treemap` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `charts/waterfall-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `code` (1 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `code/code` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `data` (11 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `data/ag-grid` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `data/data-grid` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `data/gauge` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `data/kanban-card` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `data/kanban-column` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `data/kanban` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `data/pivot-table` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `data/spreadsheet` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `data/stat` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `data/transfer-item` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `data/transfer` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `data-viz` (3 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `data-viz/heatmap` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `data-viz/map-marker` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `data-viz/maps` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `diagrams` (21 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `diagrams/block-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/class-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/component-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/diagram-lightbox` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/diagram-studio` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `diagrams/er-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/er-editor` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | Atributos, Props, States, Eventos, Slots, Parts |
| `diagrams/flowchart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/gantt` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/journey-map` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/lightbox` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/mindmap` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/org-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/quadrant-chart` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/sankey-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/sequence-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/state-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/swimlane-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/timeline` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/use-case-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `diagrams/venn-diagram` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `feedback` (15 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `feedback/badge` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/cdn-snippet` | WC | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | Props, States, Eventos, Slots, Parts |
| `feedback/confirm-modal` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/palette-selector` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/popconfirm` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/prefs-clear` | WC | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ | Props, States, Slots, Parts |
| `feedback/progress-bar` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/progress-ring` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/skeleton` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/spinner` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/tag` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/theme-toggle` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/toast-item` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/toast` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `feedback/tooltip` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `files` (8 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `files/csv-edit` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `files/csv-view` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `files/docx-view` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `files/file-edit` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `files/file-view` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `files/pptx-view` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `files/txt-edit` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `files/txt-view` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |

## Categoría: `forms` (36 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `forms/checkbox` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/color-picker` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/combobox` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/date-field` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/date-input` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/date-picker` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/date-range-input` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/date-range-picker` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/date-time-field` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/date-time-input` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/digital-clock` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/doc-editor` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/dropzone` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/duration-picker` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/file-input` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/full-calendar` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/inline-edit` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/input` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/masked-input` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/mention` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/month-calendar` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/option` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/pin-input` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/radio-group` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/radio` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/rating` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/rte` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/select` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/signature` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/slider` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/switch` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/textarea` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/time-clock` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/time-field` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/time-input` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `forms/year-calendar` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `helpers` (21 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `helpers/floating` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/format-bytes` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/format-date` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/format-number` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/format` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/intersection-observer` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/md-editor-api` | módulo | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `helpers/md-editor` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/md-hydrate` | módulo | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `helpers/md-iswc-fences` | módulo | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `helpers/md-lite` | módulo | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `helpers/md-render` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/mutation-observer` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/observer` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/offscreen-canvas` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/popover` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/relative-time` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/resize-observer` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/response-cache` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |
| `helpers/ui` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `helpers/wake-lock` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `isp` (16 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `isp/accordion-group` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/block-layout` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/btn-ref` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/catalogo-gen` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/confirm-delete` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/flex-layout` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/flex-options` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/float-card` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/form` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/grid-layout` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/heading` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/loading-overlay` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/modal-verificacion` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/text` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `isp/tree-view-roles` | stub | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | Anatomía, Atributos, Props, States, Eventos, Slots, Parts, API JS, Ejemplos |
| `isp/tree-view` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `layout` (14 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `layout/callout` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/card` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/demo` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `layout/details` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/dialog` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/divider` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/dock-item` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `layout/dock` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/drawer` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/main` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/preview-component` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `layout/preview-controls` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `layout/scrollspy` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `layout/split-panel` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `media` (11 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `media/avatar` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/barcode-scanner` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/barcode` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/icon` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/image-editor` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/media-recorder` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/qrcode` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/speech` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/theme-img` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | Atributos, Props, States, Eventos, Slots, Parts |
| `media/video-playlist` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `media/video` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `navigation` (13 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `navigation/breadcrumb-item` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `navigation/breadcrumb` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `navigation/carousel-item` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `navigation/carousel` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `navigation/mega-menu` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `navigation/scroller` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `navigation/stepper-step` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `navigation/stepper` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `navigation/tab-group` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `navigation/tab-panel` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `navigation/tab` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `navigation/tree-item` | stub | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | Atributos, Props, States, Eventos, Slots, Parts, API JS |
| `navigation/tree` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `overlays` (3 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `overlays/command-palette` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `overlays/pdf-viewer` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| `overlays/window` | WC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

## Categoría: `preview` (1 .md)

| Componente | Tipo | Anatomía | Atributos | Props | States | Eventos | Slots | Parts | API JS | Ejemplos | Gaps |
|------------|------|----------|-----------|-------|--------|---------|-------|-------|--------|----------|------|
| `preview/playground` | WC | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | Atributos, Props, States, Eventos, Slots, Parts, Ejemplos |

## Issues (lista plana)

- `src/components/actions/speed-dial-action.md` (stub) — falta **Atributos**
- `src/components/actions/speed-dial-action.md` (stub) — falta **Props**
- `src/components/actions/speed-dial-action.md` (stub) — falta **States**
- `src/components/actions/speed-dial-action.md` (stub) — falta **Eventos**
- `src/components/actions/speed-dial-action.md` (stub) — falta **Slots**
- `src/components/actions/speed-dial-action.md` (stub) — falta **Parts**
- `src/components/actions/speed-dial-action.md` (stub) — falta **API JS**
- `src/components/data-viz/map-marker.md` (stub) — falta **Atributos**
- `src/components/data-viz/map-marker.md` (stub) — falta **Props**
- `src/components/data-viz/map-marker.md` (stub) — falta **States**
- `src/components/data-viz/map-marker.md` (stub) — falta **Eventos**
- `src/components/data-viz/map-marker.md` (stub) — falta **Slots**
- `src/components/data-viz/map-marker.md` (stub) — falta **Parts**
- `src/components/data-viz/map-marker.md` (stub) — falta **API JS**
- `src/components/data/kanban-card.md` (stub) — falta **Atributos**
- `src/components/data/kanban-card.md` (stub) — falta **Props**
- `src/components/data/kanban-card.md` (stub) — falta **States**
- `src/components/data/kanban-card.md` (stub) — falta **Eventos**
- `src/components/data/kanban-card.md` (stub) — falta **Slots**
- `src/components/data/kanban-card.md` (stub) — falta **Parts**
- `src/components/data/kanban-card.md` (stub) — falta **API JS**
- `src/components/data/kanban-column.md` (stub) — falta **Atributos**
- `src/components/data/kanban-column.md` (stub) — falta **Props**
- `src/components/data/kanban-column.md` (stub) — falta **States**
- `src/components/data/kanban-column.md` (stub) — falta **Eventos**
- `src/components/data/kanban-column.md` (stub) — falta **Slots**
- `src/components/data/kanban-column.md` (stub) — falta **Parts**
- `src/components/data/kanban-column.md` (stub) — falta **API JS**
- `src/components/data/transfer-item.md` (stub) — falta **Atributos**
- `src/components/data/transfer-item.md` (stub) — falta **Props**
- `src/components/data/transfer-item.md` (stub) — falta **States**
- `src/components/data/transfer-item.md` (stub) — falta **Eventos**
- `src/components/data/transfer-item.md` (stub) — falta **Slots**
- `src/components/data/transfer-item.md` (stub) — falta **Parts**
- `src/components/data/transfer-item.md` (stub) — falta **API JS**
- `src/components/diagrams/diagram-studio.md` — falta **Atributos**
- `src/components/diagrams/diagram-studio.md` — falta **Props**
- `src/components/diagrams/diagram-studio.md` — falta **States**
- `src/components/diagrams/diagram-studio.md` — falta **Eventos**
- `src/components/diagrams/diagram-studio.md` — falta **Slots**
- `src/components/diagrams/diagram-studio.md` — falta **Parts**
- `src/components/diagrams/diagram-studio.md` — falta **API JS**
- `src/components/diagrams/er-editor.md` — falta **Atributos**
- `src/components/diagrams/er-editor.md` — falta **Props**
- `src/components/diagrams/er-editor.md` — falta **States**
- `src/components/diagrams/er-editor.md` — falta **Eventos**
- `src/components/diagrams/er-editor.md` — falta **Slots**
- `src/components/diagrams/er-editor.md` — falta **Parts**
- `src/components/feedback/cdn-snippet.md` — falta **Props**
- `src/components/feedback/cdn-snippet.md` — falta **States**
- `src/components/feedback/cdn-snippet.md` — falta **Eventos**
- `src/components/feedback/cdn-snippet.md` — falta **Slots**
- `src/components/feedback/cdn-snippet.md` — falta **Parts**
- `src/components/feedback/prefs-clear.md` — falta **Props**
- `src/components/feedback/prefs-clear.md` — falta **States**
- `src/components/feedback/prefs-clear.md` — falta **Slots**
- `src/components/feedback/prefs-clear.md` — falta **Parts**
- `src/components/files/csv-edit.md` — falta **Atributos**
- `src/components/files/csv-edit.md` — falta **Props**
- `src/components/files/csv-edit.md` — falta **States**
- `src/components/files/csv-edit.md` — falta **Eventos**
- `src/components/files/csv-edit.md` — falta **Slots**
- `src/components/files/csv-edit.md` — falta **Parts**
- `src/components/files/csv-edit.md` — falta **Ejemplos**
- `src/components/files/csv-view.md` — falta **Atributos**
- `src/components/files/csv-view.md` — falta **Props**
- `src/components/files/csv-view.md` — falta **States**
- `src/components/files/csv-view.md` — falta **Eventos**
- `src/components/files/csv-view.md` — falta **Slots**
- `src/components/files/csv-view.md` — falta **Parts**
- `src/components/files/csv-view.md` — falta **Ejemplos**
- `src/components/files/docx-view.md` — falta **Atributos**
- `src/components/files/docx-view.md` — falta **Props**
- `src/components/files/docx-view.md` — falta **States**
- `src/components/files/docx-view.md` — falta **Eventos**
- `src/components/files/docx-view.md` — falta **Slots**
- `src/components/files/docx-view.md` — falta **Parts**
- `src/components/files/docx-view.md` — falta **Ejemplos**
- `src/components/files/file-edit.md` — falta **Atributos**
- `src/components/files/file-edit.md` — falta **Props**
- `src/components/files/file-edit.md` — falta **States**
- `src/components/files/file-edit.md` — falta **Eventos**
- `src/components/files/file-edit.md` — falta **Slots**
- `src/components/files/file-edit.md` — falta **Parts**
- `src/components/files/file-edit.md` — falta **Ejemplos**
- `src/components/files/file-view.md` — falta **Atributos**
- `src/components/files/file-view.md` — falta **Props**
- `src/components/files/file-view.md` — falta **States**
- `src/components/files/file-view.md` — falta **Eventos**
- `src/components/files/file-view.md` — falta **Slots**
- `src/components/files/file-view.md` — falta **Parts**
- `src/components/files/file-view.md` — falta **Ejemplos**
- `src/components/files/pptx-view.md` — falta **Atributos**
- `src/components/files/pptx-view.md` — falta **Props**
- `src/components/files/pptx-view.md` — falta **States**
- `src/components/files/pptx-view.md` — falta **Eventos**
- `src/components/files/pptx-view.md` — falta **Slots**
- `src/components/files/pptx-view.md` — falta **Parts**
- `src/components/files/pptx-view.md` — falta **Ejemplos**
- `src/components/files/txt-edit.md` — falta **Atributos**
- `src/components/files/txt-edit.md` — falta **Props**
- `src/components/files/txt-edit.md` — falta **States**
- `src/components/files/txt-edit.md` — falta **Eventos**
- `src/components/files/txt-edit.md` — falta **Slots**
- `src/components/files/txt-edit.md` — falta **Parts**
- `src/components/files/txt-edit.md` — falta **Ejemplos**
- `src/components/files/txt-view.md` — falta **Atributos**
- `src/components/files/txt-view.md` — falta **Props**
- `src/components/files/txt-view.md` — falta **States**
- `src/components/files/txt-view.md` — falta **Eventos**
- `src/components/files/txt-view.md` — falta **Slots**
- `src/components/files/txt-view.md` — falta **Parts**
- `src/components/files/txt-view.md` — falta **Ejemplos**
- `src/components/helpers/md-editor-api.md` (módulo) — falta **Atributos**
- `src/components/helpers/md-editor-api.md` (módulo) — falta **Props**
- `src/components/helpers/md-editor-api.md` (módulo) — falta **States**
- `src/components/helpers/md-editor-api.md` (módulo) — falta **Eventos**
- `src/components/helpers/md-editor-api.md` (módulo) — falta **Slots**
- `src/components/helpers/md-editor-api.md` (módulo) — falta **Parts**
- `src/components/helpers/md-editor-api.md` (módulo) — falta **Ejemplos**
- `src/components/helpers/md-hydrate.md` (módulo) — falta **Atributos**
- `src/components/helpers/md-hydrate.md` (módulo) — falta **Props**
- `src/components/helpers/md-hydrate.md` (módulo) — falta **States**
- `src/components/helpers/md-hydrate.md` (módulo) — falta **Eventos**
- `src/components/helpers/md-hydrate.md` (módulo) — falta **Slots**
- `src/components/helpers/md-hydrate.md` (módulo) — falta **Parts**
- `src/components/helpers/md-hydrate.md` (módulo) — falta **Ejemplos**
- `src/components/helpers/md-iswc-fences.md` (módulo) — falta **Atributos**
- `src/components/helpers/md-iswc-fences.md` (módulo) — falta **Props**
- `src/components/helpers/md-iswc-fences.md` (módulo) — falta **States**
- `src/components/helpers/md-iswc-fences.md` (módulo) — falta **Eventos**
- `src/components/helpers/md-iswc-fences.md` (módulo) — falta **Slots**
- `src/components/helpers/md-iswc-fences.md` (módulo) — falta **Parts**
- `src/components/helpers/md-iswc-fences.md` (módulo) — falta **Ejemplos**
- `src/components/helpers/md-lite.md` (módulo) — falta **Atributos**
- `src/components/helpers/md-lite.md` (módulo) — falta **Props**
- `src/components/helpers/md-lite.md` (módulo) — falta **States**
- `src/components/helpers/md-lite.md` (módulo) — falta **Eventos**
- `src/components/helpers/md-lite.md` (módulo) — falta **Slots**
- `src/components/helpers/md-lite.md` (módulo) — falta **Parts**
- `src/components/helpers/md-lite.md` (módulo) — falta **Ejemplos**
- `src/components/helpers/response-cache.md` — falta **Atributos**
- `src/components/helpers/response-cache.md` — falta **Props**
- `src/components/helpers/response-cache.md` — falta **States**
- `src/components/helpers/response-cache.md` — falta **Eventos**
- `src/components/helpers/response-cache.md` — falta **Slots**
- `src/components/helpers/response-cache.md` — falta **Parts**
- `src/components/helpers/response-cache.md` — falta **Ejemplos**
- `src/components/isp/tree-view-roles.md` (stub) — falta **Anatomía**
- `src/components/isp/tree-view-roles.md` (stub) — falta **Atributos**
- `src/components/isp/tree-view-roles.md` (stub) — falta **Props**
- `src/components/isp/tree-view-roles.md` (stub) — falta **States**
- `src/components/isp/tree-view-roles.md` (stub) — falta **Eventos**
- `src/components/isp/tree-view-roles.md` (stub) — falta **Slots**
- `src/components/isp/tree-view-roles.md` (stub) — falta **Parts**
- `src/components/isp/tree-view-roles.md` (stub) — falta **API JS**
- `src/components/isp/tree-view-roles.md` (stub) — falta **Ejemplos**
- `src/components/layout/demo.md` (stub) — falta **Atributos**
- `src/components/layout/demo.md` (stub) — falta **Props**
- `src/components/layout/demo.md` (stub) — falta **States**
- `src/components/layout/demo.md` (stub) — falta **Eventos**
- `src/components/layout/demo.md` (stub) — falta **Slots**
- `src/components/layout/demo.md` (stub) — falta **Parts**
- `src/components/layout/demo.md` (stub) — falta **API JS**
- `src/components/layout/dock-item.md` (stub) — falta **Atributos**
- `src/components/layout/dock-item.md` (stub) — falta **Props**
- `src/components/layout/dock-item.md` (stub) — falta **States**
- `src/components/layout/dock-item.md` (stub) — falta **Eventos**
- `src/components/layout/dock-item.md` (stub) — falta **Slots**
- `src/components/layout/dock-item.md` (stub) — falta **Parts**
- `src/components/layout/dock-item.md` (stub) — falta **API JS**
- `src/components/layout/preview-component.md` (stub) — falta **Atributos**
- `src/components/layout/preview-component.md` (stub) — falta **Props**
- `src/components/layout/preview-component.md` (stub) — falta **States**
- `src/components/layout/preview-component.md` (stub) — falta **Eventos**
- `src/components/layout/preview-component.md` (stub) — falta **Slots**
- `src/components/layout/preview-component.md` (stub) — falta **Parts**
- `src/components/layout/preview-component.md` (stub) — falta **API JS**
- `src/components/layout/preview-controls.md` (stub) — falta **Atributos**
- `src/components/layout/preview-controls.md` (stub) — falta **Props**
- `src/components/layout/preview-controls.md` (stub) — falta **States**
- `src/components/layout/preview-controls.md` (stub) — falta **Eventos**
- `src/components/layout/preview-controls.md` (stub) — falta **Slots**
- `src/components/layout/preview-controls.md` (stub) — falta **Parts**
- `src/components/layout/preview-controls.md` (stub) — falta **API JS**
- `src/components/media/theme-img.md` — falta **Atributos**
- `src/components/media/theme-img.md` — falta **Props**
- `src/components/media/theme-img.md` — falta **States**
- `src/components/media/theme-img.md` — falta **Eventos**
- `src/components/media/theme-img.md` — falta **Slots**
- `src/components/media/theme-img.md` — falta **Parts**
- `src/components/navigation/carousel-item.md` (stub) — falta **Atributos**
- `src/components/navigation/carousel-item.md` (stub) — falta **Props**
- `src/components/navigation/carousel-item.md` (stub) — falta **States**
- `src/components/navigation/carousel-item.md` (stub) — falta **Eventos**
- `src/components/navigation/carousel-item.md` (stub) — falta **Slots**
- `src/components/navigation/carousel-item.md` (stub) — falta **Parts**
- `src/components/navigation/carousel-item.md` (stub) — falta **API JS**
- `src/components/navigation/stepper-step.md` (stub) — falta **Atributos**
- `src/components/navigation/stepper-step.md` (stub) — falta **Props**
- `src/components/navigation/stepper-step.md` (stub) — falta **States**
- `src/components/navigation/stepper-step.md` (stub) — falta **Eventos**
- `src/components/navigation/stepper-step.md` (stub) — falta **Slots**
- `src/components/navigation/stepper-step.md` (stub) — falta **Parts**
- `src/components/navigation/stepper-step.md` (stub) — falta **API JS**
- `src/components/navigation/tab-panel.md` (stub) — falta **Atributos**
- `src/components/navigation/tab-panel.md` (stub) — falta **Props**
- `src/components/navigation/tab-panel.md` (stub) — falta **States**
- `src/components/navigation/tab-panel.md` (stub) — falta **Eventos**
- `src/components/navigation/tab-panel.md` (stub) — falta **Slots**
- `src/components/navigation/tab-panel.md` (stub) — falta **Parts**
- `src/components/navigation/tab-panel.md` (stub) — falta **API JS**
- `src/components/navigation/tab.md` (stub) — falta **Atributos**
- `src/components/navigation/tab.md` (stub) — falta **Props**
- `src/components/navigation/tab.md` (stub) — falta **States**
- `src/components/navigation/tab.md` (stub) — falta **Eventos**
- `src/components/navigation/tab.md` (stub) — falta **Slots**
- `src/components/navigation/tab.md` (stub) — falta **Parts**
- `src/components/navigation/tab.md` (stub) — falta **API JS**
- `src/components/navigation/tree-item.md` (stub) — falta **Atributos**
- `src/components/navigation/tree-item.md` (stub) — falta **Props**
- `src/components/navigation/tree-item.md` (stub) — falta **States**
- `src/components/navigation/tree-item.md` (stub) — falta **Eventos**
- `src/components/navigation/tree-item.md` (stub) — falta **Slots**
- `src/components/navigation/tree-item.md` (stub) — falta **Parts**
- `src/components/navigation/tree-item.md` (stub) — falta **API JS**
- `src/components/preview/playground.md` — falta **Atributos**
- `src/components/preview/playground.md` — falta **Props**
- `src/components/preview/playground.md` — falta **States**
- `src/components/preview/playground.md` — falta **Eventos**
- `src/components/preview/playground.md` — falta **Slots**
- `src/components/preview/playground.md` — falta **Parts**
- `src/components/preview/playground.md` — falta **Ejemplos**

**Total issues:** 233 (de los cuales 98 son de Web Components completos)

## H2/H3 headings observados que NO entran en el estándar

Útil para el schema: decide si los promovemos a estándar o los
recategorizamos. Aparecen en este set los headings que vimos en al
menos un .md y que ninguno de los 9 patrones matchea.

- 1. Módulo / carpeta normal (group + cell + unanchored)
- 2. Lección / hoja (atom)
- 3. Módulo hermético (group + hermetic)
- 4. Prisión liberable (group + prison)
- 5. Celda desechable (group + cell)
- 6. Congelador de rama (group + freezer)
- 7. Nodo anclado puntual (freeze: true)
- API JSON / HTML
- Accesibilidad
- Agrupadores y ratio
- App API
- Atributos clave
- Atributos observados de <iswc-map-marker>
- Atributos observados de <iswc-maps>
- Atributos observados — <iswc-dock-item>
- Atributos observados — <iswc-dock>
- Atributos reflejados (salida)
- Borrado vs liberar vs extinguir
- CSS custom properties
- Cadena con hydrate
- Catálogo ilustrativo por caso de uso
- Checker
- Combinaciones válidas (ejemplos)
- Comportamiento
- Contrato del enlace
- Cuerpo JSON (json2html / html2json)
- Defectos que sorprenden
- Dependencias y componentes relacionados
- Diff y resumen de commit
- Drag & drop (resumen visual)
- Dónde asignarlos
- Ejemplo (JSON → DOM)
- Errores / prevención
- Errores comunes
- Errores conocidos (no repetir)
- Exports adicionales del módulo
- Extender por type (opcional)
- Fuentes
- Getters derivados (solo lectura)
- Historial de queries (memoria de sesión)
- Integración con formularios
- Layout
- Los tres ejes (lo que escribes)
- Mapeo Svelte → Web Component
- Matriz: dónde usa el adaptador cada rol
- Multi-hotkey
- Métodos y propiedades públicas — grid.api (persistencia / columnas)
- Navegación
- Panel de columnas
- Persistencia (OBLIGATORIO respetar)
- Por qué existen
- Propiedades JS (no atributos: llevan funciones/objetos)
- Propiedades de solo lectura
- Páginas
- Qué hacer
- Qué no hacer
- Qué se persiste
- Reglas
- Reglas para LLM
- Reiniciar
- Relación con ISP
- Schema del payload
- Snippet generado (forma canónica)
- format() sobre un diff
