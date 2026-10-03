# Índice de IS Web Components

Mapa de toda la documentación del repositorio. Punto de entrada único para agentes y humanos que quieren entender cómo funciona el kit.

Conventions del repo: [`AGENTS.md`](../AGENTS.md) (cerebro de agentes, errores a no repetir) · [`README.md`](../README.md) · [`manifest.js`](../manifest.js) / [`src/manifest.ts`](../src/manifest.ts) (single source of truth de componentes).

## 1. Skills (cómo hacer cosas)

Skills que viven dentro del repo (`src/skills/`, `skills/`) y se sirven por CDN/dist cuando la skill es consumida por una app externa.

### Skills de producto (kit, fuente de verdad)

- [`is-webcomponents`](../skills/is-webcomponents/SKILL.md) — skill raíz: arquitectura, reglas de reuso, bootstrap CDN, catálogo de tags.
- [`is-cdn-install`](../skills/is-cdn-install/SKILL.md) — bootstrap, espejos, pin SHA, fallback.
- [`document-component`](../src/skills/document-component/SKILL.md) — cómo escribir la ficha `.md` de un componente (anatomía, custom states).
- [`build-component`](../src/skills/build-component/SKILL.md) — checklist de qué tener en cuenta al crear un `iswc-*` nuevo.

### Tools de la skill raíz

- [`build`](../skills/is-webcomponents/tools/build.md) — fundar o extender una app con `iswc-*` por CDN o local.
- [`migrate`](../skills/is-webcomponents/tools/migrate.md) — convertir un frontend con framework a vanilla + `iswc-*`.
- [`local`](../skills/is-webcomponents/tools/local.md) — vendorizar el kit y bootear local-first, con CDN como fallback.
- [`runtime`](../skills/is-webcomponents/tools/runtime.md) — APIs sin tag: loader, IswcUi, md-lite/hydrate/fences, response-cache, sync-pins.

### Referencias

- [`catalog.md`](../skills/is-webcomponents/catalog.md) — inventario completo de tags + APIs.
- [`reference.md`](../skills/is-webcomponents/reference.md) — mapa intención → componente.
- [`PROMPT.md`](../skills/is-webcomponents/PROMPT.md) — prompt LLM listo para copiar.
- [`document-component/references/anatomy-section.md`](../src/skills/document-component/references/anatomy-section.md) — plantilla de la sección "Anatomía".
- [`document-component/references/custom-states.md`](../src/skills/document-component/references/custom-states.md) — guía de estados custom del host.

## 2. Componentes por categoría

Todas las fichas viven en `src/components/<categoría>/<nombre>.md`. La lista sigue el `manifest.ts`.

### isp (primitivas portada de ISP-SvelteComponents)

- [accordion-group](../src/components/isp/accordion-group.md)
- [block-layout](../src/components/isp/block-layout.md)
- [btn-ref](../src/components/isp/btn-ref.md)
- [catalogo-gen](../src/components/isp/catalogo-gen.md)
- [confirm-delete](../src/components/isp/confirm-delete.md)
- [flex-layout](../src/components/isp/flex-layout.md)
- [flex-options](../src/components/isp/flex-options.md)
- [float-card](../src/components/isp/float-card.md)
- [form](../src/components/isp/form.md)
- [modal-verificacion](../src/components/isp/modal-verificacion.md)
- [grid-layout](../src/components/isp/grid-layout.md)
- [heading](../src/components/isp/heading.md)
- [loading-overlay](../src/components/isp/loading-overlay.md)
- [text](../src/components/isp/text.md)
- [tree-view](../src/components/isp/tree-view.md) (roles en [tree-view-roles](../src/components/isp/tree-view-roles.md))

### actions

- [button](../src/components/actions/button.md)
- [button-group](../src/components/actions/button-group.md)
- [check-icon-button](../src/components/actions/check-icon-button.md)
- [context-menu](../src/components/actions/context-menu.md)
- [copy-button](../src/components/actions/copy-button.md)
- [dropdown](../src/components/actions/dropdown.md)
- [dropdown-item](../src/components/actions/dropdown-item.md)
- [fab](../src/components/actions/fab.md)
- [share-button](../src/components/actions/share-button.md)
- [speed-dial](../src/components/actions/speed-dial.md)
- [speed-dial-action](../src/components/actions/speed-dial-action.md)

### media

- [icon](../src/components/media/icon.md)
- [avatar](../src/components/media/avatar.md)
- [theme-img](../src/components/media/theme-img.md)
- [video](../src/components/media/video.md)
- [video-playlist](../src/components/media/video-playlist.md)
- [speech](../src/components/media/speech.md)
- [media-recorder](../src/components/media/media-recorder.md)
- [barcode](../src/components/media/barcode.md)
- [barcode-scanner](../src/components/media/barcode-scanner.md)
- [image-editor](../src/components/media/image-editor.md)
- [qrcode](../src/components/media/qrcode.md)
- Explorador de iconos: meta-página declarada en el manifest (`iswc-icon-explorer`); no tiene ficha `.md`.

### feedback

- [spinner](../src/components/feedback/spinner.md)
- [badge](../src/components/feedback/badge.md)
- [tag](../src/components/feedback/tag.md)
- [skeleton](../src/components/feedback/skeleton.md)
- [progress-bar](../src/components/feedback/progress-bar.md)
- [progress-ring](../src/components/feedback/progress-ring.md)
- [theme-toggle](../src/components/feedback/theme-toggle.md)
- [prefs-clear](../src/components/feedback/prefs-clear.md)
- [toast](../src/components/feedback/toast.md)
- [toast-item](../src/components/feedback/toast-item.md)
- [tooltip](../src/components/feedback/tooltip.md)
- [popconfirm](../src/components/feedback/popconfirm.md)
- [confirm-modal](../src/components/feedback/confirm-modal.md)
- [cdn-snippet](../src/components/feedback/cdn-snippet.md)
- [palette-selector](../src/components/feedback/palette-selector.md)

### layout

- [split-panel](../src/components/layout/split-panel.md)
- [main](../src/components/layout/main.md)
- [card](../src/components/layout/card.md)
- [callout](../src/components/layout/callout.md)
- [details](../src/components/layout/details.md)
- [dialog](../src/components/layout/dialog.md)
- [drawer](../src/components/layout/drawer.md)
- [divider](../src/components/layout/divider.md)
- [scrollspy](../src/components/layout/scrollspy.md)
- [demo](../src/components/layout/demo.md)
- [dock](../src/components/layout/dock.md)
- [dock-item](../src/components/layout/dock-item.md)
- [preview-component](../src/components/layout/preview-component.md) (chrome de la galería, expuesto por CDN)
- [preview-controls](../src/components/layout/preview-controls.md) (panel de controles del playground)

### helpers

- [popover](../src/components/helpers/popover.md)
- [ui](../src/components/helpers/ui.md) (módulo `IswcUi`, no CE)
- [relative-time](../src/components/helpers/relative-time.md)
- [format](../src/components/helpers/format.md)
- [format-date](../src/components/helpers/format-date.md)
- [format-number](../src/components/helpers/format-number.md)
- [format-bytes](../src/components/helpers/format-bytes.md)
- [observer](../src/components/helpers/observer.md)
- [intersection-observer](../src/components/helpers/intersection-observer.md)
- [mutation-observer](../src/components/helpers/mutation-observer.md)
- [resize-observer](../src/components/helpers/resize-observer.md)
- [wake-lock](../src/components/helpers/wake-lock.md)
- [offscreen-canvas](../src/components/helpers/offscreen-canvas.md)
- [md-render](../src/components/helpers/md-render.md)
- [md-editor](../src/components/helpers/md-editor.md)
- [md-lite](../src/components/helpers/md-lite.md) (`mdToHtml`, módulo sin tag)
- [md-iswc-fences](../src/components/helpers/md-iswc-fences.md) (`resolveIswcFenceTag`)
- [md-hydrate](../src/components/helpers/md-hydrate.md) (`hydrateMdEmbeds`)
- [md-editor-api](../src/components/helpers/md-editor-api.md)
- [response-cache](../src/components/helpers/response-cache.md) (`IsResponseCache`)
- [floating](../src/components/helpers/floating.md) (building block interno, no API pública)
- [lightbox](../src/components/diagrams/lightbox.md) (categoría lógica: helpers; carpeta física: diagrams)

### navigation

- [breadcrumb](../src/components/navigation/breadcrumb.md)
- [breadcrumb-item](../src/components/navigation/breadcrumb-item.md)
- [tab-group](../src/components/navigation/tab-group.md) (ficha compartida por `tab` y `tab-panel`)
- [tab](../src/components/navigation/tab.md)
- [tab-panel](../src/components/navigation/tab-panel.md)
- [scroller](../src/components/navigation/scroller.md)
- [carousel](../src/components/navigation/carousel.md)
- [carousel-item](../src/components/navigation/carousel-item.md)
- [tree](../src/components/navigation/tree.md)
- [tree-item](../src/components/navigation/tree-item.md)
- [stepper](../src/components/navigation/stepper.md)
- [stepper-step](../src/components/navigation/stepper-step.md)
- [mega-menu](../src/components/navigation/mega-menu.md)

### forms

- [combobox](../src/components/forms/combobox.md)
- [option](../src/components/forms/option.md)
- [checkbox](../src/components/forms/checkbox.md)
- [switch](../src/components/forms/switch.md)
- [radio-group](../src/components/forms/radio-group.md)
- [radio](../src/components/forms/radio.md)
- [input](../src/components/forms/input.md)
- [textarea](../src/components/forms/textarea.md)
- [slider](../src/components/forms/slider.md)
- [rating](../src/components/forms/rating.md)
- [select](../src/components/forms/select.md)
- [color-picker](../src/components/forms/color-picker.md)
- [file-input](../src/components/forms/file-input.md)
- [date-picker](../src/components/forms/date-picker.md)
- [month-calendar](../src/components/forms/month-calendar.md)
- [year-calendar](../src/components/forms/year-calendar.md)
- [date-range-picker](../src/components/forms/date-range-picker.md)
- [time-clock](../src/components/forms/time-clock.md)
- [digital-clock](../src/components/forms/digital-clock.md)
- [date-field](../src/components/forms/date-field.md)
- [time-field](../src/components/forms/time-field.md)
- [date-time-field](../src/components/forms/date-time-field.md)
- [date-input](../src/components/forms/date-input.md)
- [time-input](../src/components/forms/time-input.md)
- [date-time-input](../src/components/forms/date-time-input.md)
- [date-range-input](../src/components/forms/date-range-input.md)
- [pin-input](../src/components/forms/pin-input.md)
- [masked-input](../src/components/forms/masked-input.md)
- [inline-edit](../src/components/forms/inline-edit.md)
- [mention](../src/components/forms/mention.md)
- [duration-picker](../src/components/forms/duration-picker.md)
- [dropzone](../src/components/forms/dropzone.md)
- [full-calendar](../src/components/forms/full-calendar.md)
- [signature](../src/components/forms/signature.md)
- [rte](../src/components/forms/rte.md)
- [doc-editor](../src/components/forms/doc-editor.md)

### code

- [code](../src/components/code/code.md)

### data

- [data-grid](../src/components/data/data-grid.md)
- [stat](../src/components/data/stat.md)
- [transfer](../src/components/data/transfer.md)
- [transfer-item](../src/components/data/transfer-item.md)
- [kanban](../src/components/data/kanban.md)
- [kanban-column](../src/components/data/kanban-column.md)
- [kanban-card](../src/components/data/kanban-card.md)
- [gauge](../src/components/data/gauge.md)
- [pivot-table](../src/components/data/pivot-table.md)
- [spreadsheet](../src/components/data/spreadsheet.md)
- [ag-grid](../src/components/data/ag-grid.md)

### data-viz (categoría lógica `data-viz`; carpeta física `charts/` o `data-viz/`)

La categoría `data-viz` agrupa los charts. En disco, los archivos viven en `src/components/charts/` (serie, distribución, jerarquías) o `src/components/data-viz/` (mapas, heatmap).

- [chart](../src/components/charts/chart.md)
- [bar-chart](../src/components/charts/bar-chart.md)
- [line-chart](../src/components/charts/line-chart.md)
- [pie-chart](../src/components/charts/pie-chart.md)
- [doughnut-chart](../src/components/charts/doughnut-chart.md)
- [radar-chart](../src/components/charts/radar-chart.md)
- [polar-area-chart](../src/components/charts/polar-area-chart.md)
- [scatter-chart](../src/components/charts/scatter-chart.md)
- [bubble-chart](../src/components/charts/bubble-chart.md)
- [sparkline](../src/components/charts/sparkline.md)
- [waterfall-chart](../src/components/charts/waterfall-chart.md)
- [funnel-chart](../src/components/charts/funnel-chart.md)
- [treemap](../src/components/charts/treemap.md)
- [heatmap](../src/components/data-viz/heatmap.md)
- [maps](../src/components/data-viz/maps.md)
- [map-marker](../src/components/data-viz/map-marker.md)
- [gauge](../src/components/data/gauge.md) (categoría lógica `data-viz`; carpeta física `data/`)
- [diagram-lightbox](../src/components/diagrams/diagram-lightbox.md) (categoría lógica `diagrams`; ver §2 diagramas)

### diagrams

- [flowchart](../src/components/diagrams/flowchart.md)
- [sequence-diagram](../src/components/diagrams/sequence-diagram.md)
- [class-diagram](../src/components/diagrams/class-diagram.md)
- [state-diagram](../src/components/diagrams/state-diagram.md)
- [er-diagram](../src/components/diagrams/er-diagram.md)
- [er-editor](../src/components/diagrams/er-editor.md)
- [block-diagram](../src/components/diagrams/block-diagram.md)
- [component-diagram](../src/components/diagrams/component-diagram.md)
- [mindmap](../src/components/diagrams/mindmap.md)
- [gantt](../src/components/diagrams/gantt.md)
- [timeline](../src/components/diagrams/timeline.md)
- [org-chart](../src/components/diagrams/org-chart.md)
- [sankey-diagram](../src/components/diagrams/sankey-diagram.md)
- [quadrant-chart](../src/components/diagrams/quadrant-chart.md)
- [venn-diagram](../src/components/diagrams/venn-diagram.md)
- [use-case-diagram](../src/components/diagrams/use-case-diagram.md)
- [swimlane-diagram](../src/components/diagrams/swimlane-diagram.md)
- [journey-map](../src/components/diagrams/journey-map.md)
- [diagram-lightbox](../src/components/diagrams/diagram-lightbox.md) (visor de diagramas)
- [diagram-studio](../src/components/diagrams/diagram-studio.md) (app visor/editor por enlace)
- [lightbox](../src/components/diagrams/lightbox.md) (categoría lógica `helpers`; ver §2 helpers)

### overlays

- [command-palette](../src/components/overlays/command-palette.md)
- [pdf-viewer](../src/components/overlays/pdf-viewer.md)
- [window](../src/components/overlays/window.md)

### files (visores/editores de archivos)

- [txt-view](../src/components/files/txt-view.md)
- [txt-edit](../src/components/files/txt-edit.md)
- [csv-view](../src/components/files/csv-view.md)
- [csv-edit](../src/components/files/csv-edit.md)
- [docx-view](../src/components/files/docx-view.md)
- [pptx-view](../src/components/files/pptx-view.md)
- [file-view](../src/components/files/file-view.md)
- [file-edit](../src/components/files/file-edit.md)

### preview (chrome de la galería)

- [preview-component](../src/components/layout/preview-component.md) (alias; carpeta física `layout/`)
- [preview-controls](../src/components/layout/preview-controls.md) (alias; carpeta física `layout/`)
- [playground](../src/components/preview/playground.md)

## 3. Componentes shared (utilidades internas)

Pieza transversal que se reusa desde varios componentes del kit. No son `iswc-*`: viven en `src/components/_shared/`.

### Bases de herencia y mixins

- [`element-base`](../src/core/element-base.ts) — base genérica: initShadow, `#mounted`, upgradeProperties, hooks `onConnected`/`onDisconnected`/`onAttributeChanged`. (Vive en `src/core/`, no en `_shared/`.)
- [`element.ts`](../src/core/element.ts) — consolida `ElementBase.define`, `adopt-css`, `upgradeProperties` y `emit` (antes vivían sueltos en `_shared/`; ahora un solo import cubre los 152/148/115/98 que los necesitaban).
- [`modal-base`](../src/components/_shared/modal-base.ts) — base de modales (`<iswc-dialog>`, `<iswc-drawer>`): open/close animado cancelable, focus trap, light-dismiss, eventos `iswc-show`/`iswc-hide`/etc.
- [`form-control-mixin`](../src/components/_shared/form-control-mixin.ts) — mixin puntual para form-controls: `label`, `hint`, `error-text`, `disabled`, `readonly`, `required`, `aria-describedby`, `aria-invalid`.
- [`form-associated`](../src/components/_shared/form-associated.ts) — helper form-associated custom element.
- `IswcUi.adoptCss()` (en [`helpers/ui.md`](../src/components/helpers/ui.md)) — inyecta `<link>` al shadow del host.

### Atributos visuales compartidos

- [intent](../src/components/_shared/intent.ts) — atributo `color` semántico (success, warning, danger, …).
- [tone](../src/components/_shared/tone.ts) — atributo `variant` de peso visual (outlined, filled, plain, accent, …).
- [isp-color](../src/components/_shared/isp-color.ts) — paleta ISP.
- [tk-color](../src/components/_shared/tk-color.ts) y [tk-hue](../src/components/_shared/tk-hue.ts) — helpers de color para wrappers de dominio.
- [theme-scope](../src/components/_shared/theme-scope.ts) — scope de tema/paleta dentro del shadow.

### Formateo y observación

- [date-utils](../src/components/_shared/date-utils.ts) — utilidades de fecha.
- [resolve-locale](../src/components/_shared/resolve-locale.ts) — resolución de locale.
- [scroll-memory](../src/components/_shared/scroll-memory.ts) — memoria de scroll por ancla.
- [prefs](../src/components/_shared/prefs.ts) — preferencias del usuario.
- [url-nav](../src/components/_shared/url-nav.ts) — navegación por URL.
- [json-html](../src/components/_shared/json-html.ts) — render JSON → HTML.
- [dom-utils](../src/components/_shared/dom-utils.ts) y [misc-utils](../src/components/_shared/misc-utils.ts) — utilidades varias.
- [reflect](../src/components/_shared/reflect.ts) — helpers de reflection.

### Wrappers de backward compatibility (format)

- [format](../src/components/_shared/) (en `helpers/format.ts`) — componente general.
- Wrappers: `<iswc-format-date>`, `<iswc-format-number>`, `<iswc-format-bytes>`, `<iswc-relative-time>` son thin wrappers sobre el anterior. Ver §2 helpers.

### Diagramas (núcleo compartido)

- [diagram-element-base](../src/components/_shared/diagram-element-base.ts)
- [diagram-arrow](../src/components/_shared/diagram-arrow.ts)
- [diagram-grid](../src/components/_shared/diagram-grid.ts)
- [diagram-header](../src/components/_shared/diagram-header.ts)
- [diagram-tipos](../src/components/_shared/diagram-tipos.ts)
- [diagram-text-wrap](../src/components/_shared/diagram-text-wrap.ts)
- [diagram-edge-actors](../src/components/_shared/diagram-edge-actors.ts)
- [diagram-edge-spread](../src/components/_shared/diagram-edge-spread.ts)
- [diagram-edge-style](../src/components/_shared/diagram-edge-style.ts)
- [diagram-edit](../src/components/_shared/diagram-edit.ts)
- [diagram-astar](../src/components/_shared/diagram-astar.ts)
- [lane-layout](../src/components/_shared/lane-layout.ts)
- [node-link-layout](../src/components/_shared/node-link-layout.ts)
- [tree-layout](../src/components/_shared/tree-layout.ts)
- [path-turtle](../src/components/_shared/path-turtle.ts)

### Charts (núcleo compartido)

- [svg-chart-engine](../src/components/_shared/svg-chart-engine.ts)
- [chart-palette](../src/components/_shared/chart-palette.ts)

### Code highlight

- [code-format](../src/components/_shared/code-format.ts)
- [code-highlight](../src/components/_shared/code-highlight.ts)
- [code-langs](../src/components/_shared/code-langs.ts)
- [code-model](../src/components/_shared/code-model.ts)
- [code-text](../src/components/_shared/code-text.ts)
- [code-theme](../src/components/_shared/code-theme.ts)
- [code-diff](../src/components/_shared/code-diff.ts)
- [highlight-code](../src/components/_shared/highlight-code.ts)

### Media shape

- [media-shape](../src/components/_shared/media-shape.ts)
- [button-shape](../src/components/_shared/button-shape.ts)
- [picker-element](../src/components/_shared/picker-element.ts)
- [isp-modal-chrome](../src/components/_shared/isp-modal-chrome.css)
- [modal-chrome](../src/components/_shared/modal-chrome.css)
- [host-base](../src/components/_shared/host-base.css)
- [focus-ring](../src/components/_shared/focus-ring.css)
- [scrollbars](../src/components/_shared/scrollbars.css)
- [diagram-kit](../src/components/_shared/diagram-kit.css)
- [popover-panel](../src/components/_shared/popover-panel.css)

### Otros

- [cdn-ref](../src/components/_shared/cdn-ref.ts)
- [isp-record-utils](../src/components/_shared/isp-record-utils.ts)
- [llm-agent-prompt](../src/components/_shared/llm-agent-prompt.ts)
- [popup-dismiss](../src/components/_shared/popup-dismiss.ts)
- [position](../src/components/_shared/position.ts) (motor de flip/shift/arrow/hover-bridge, base de `<iswc-floating>`).
- [prompt-md](../src/components/_shared/prompt-md.ts)
- [tk-icon-inline](../src/components/_shared/tk-icon-inline.ts)
- [tk-inline-md](../src/components/_shared/tk-inline-md.ts)
- [tk-rich-text](../src/components/_shared/tk-rich-text.ts)
- [web-otp](../src/components/_shared/web-otp.ts)
- [web-share](../src/components/_shared/web-share.ts)

## 4. Sistema de iconos

- [icon-loader](../src/components/_shared/icon-loader.ts) — motor de resolución de iconos (local → jsDelivr → API → fallback `<iconify-icon>`).
- [icon](../src/components/media/icon.md) — ficha del componente `<iswc-icon>` (resolución inline + `#normalizeInlineSvg()` para heredar `currentColor`).
- Loader CDN: [`ISWebComponentsLoader`](../src/cdn/loader.md) — `loadCSSBase` + `loadCSSPalettesDefault` + `load("iswc-icon")` traen el tag y sus hojas.
- Colecciones commiteadas: `assets/icons/mdi/` (7447 SVGs) y `assets/icons/tabler/` (6184 SVGs) + sus índices `mdi.json` y `tabler.json`; `manifest.json` resume todas las colecciones. El resto se regenera con `deno task icons:download`.
- Descarga: [`scripts/download-icons.ts`](../scripts/download-icons.ts) (idempotente; usar `--only=mdi --only=tabler` para no re-bajar 723 MB).
- Lección crítica: nunca cargar SVG como `<img src>` desde el loader (rompe `currentColor`). El flujo correcto es `resolveIconRaw()` → `innerHTML` inline en Shadow DOM, con `fill`/`stroke: currentColor` forzados por `#normalizeInlineSvg()`.

## 5. Sistema de estilos

- [is-base.css](../src/styles/is-base.css) — tokens `--iswc-*` y temas (`data-theme="dark|light"`).
- [palettes.css](../src/styles/palettes.css) — paletas insoft / contapyme / agrowin (`data-palette="…"`).
- [palettes.json](../src/styles/palettes.json) — fuente JSON de las paletas.
- [system.css](../src/styles/system.css) — sistema de estilos base (reset + layout shell).
- [presentation.css](../src/styles/presentation.css) — chrome de los previews (frame, tabs, copy-button).
- [shell.css](../src/styles/shell.css) — barra lateral, iframe, split-panel del home.
- [palette-build.ts](../src/styles/palette-build.ts) — generador de `palettes.css` desde `palettes.json`.
- CSS nativo (nesting estándar) — no usamos preprocesador; todo es CSS plano. Algunos selectores con `:state(...)` requieren clase plana (ver §6 errores de `AGENTS.md`).
- [anatomy-section](../src/skills/document-component/references/anatomy-section.md) — cómo documentar el CSS propio de un componente en su ficha `.md`.

## 6. Demo y galería

- [Home gallery](../index.html) — landing con iframe del preview (`iswc-data-theme="dark"`, `iswc-data-palette="contapyme"`).
- [Dev server](../scripts/serve.mjs) — servidor en :8391 con `Cache-Control: no-store`.
- Demos por componente: [`demos/<categoría>/<nombre>/<nombre>.html`](../demos/) (p. ej. [`actions/button/button.html`](../demos/actions/button/button.html)).
- Previews sueltos: [`previews/<categoría>/iswc-<name>.html`](../previews/) (p. ej. [`previews/data-viz/is-chart.html`](../previews/data-viz/is-chart.html), [`previews/feedback/is-popconfirm.html`](../previews/feedback/is-popconfirm.html)).
- Chrome inyectado en cada demo: [`scripts/preview-chrome.js`](../scripts/preview-chrome.js) (snippet CDN + theme + palette), [`scripts/docs-chrome.js`](../scripts/docs-chrome.js) (TOC + scrollspy), [`scripts/preview-boot.js`](../scripts/preview-boot.js).
- Auditoría de demos: [`src/utils/health/exhaustive/`](../src/utils/health/exhaustive/) (smoke tests por componente, `run-all-tests.mjs`).
- Highlighter de `<pre class="code">`: [`scripts/highlight-pre.js`](../scripts/highlight-pre.js) (CodeMirror reactivo al `data-theme`).
- Snapshot tooling: [`scripts/shoot-all.mjs`](../scripts/shoot-all.mjs) y [`scripts/shoot-one.mjs`](../scripts/shoot-one.mjs) (artefactos en `.shots/`).

## 7. Arquitectura

- [manifest.ts](../src/manifest.ts) (fuente) y [manifest.js](../manifest.js) (publicado) — single source of truth: tag, categoría, `script`, `style`, `page`.
- [Loader CDN](../src/cdn/loader.md) ([`loader.ts`](../src/cdn/loader.ts)) — entry CDN, espejos, pin SHA, sheets, `registerApp`.
- [ensure-element.ts](../src/cdn/ensure-element.ts) — espera y registra un `iswc-*` bajo demanda.
- [load-plan.ts](../src/cdn/load-plan.ts) — planificación de cargas por categoría.
- [asset-store.ts](../src/cdn/asset-store.ts) — registro de assets cacheados.
- [collect-iswc-tags.ts](../src/cdn/collect-iswc-tags.ts) — barrido de tags `iswc-*` del HTML.
- [sheet-cache.ts](../src/cdn/sheet-cache.ts) — cache de hojas CSS por tag.
- [Build pipeline](../scripts/build.mjs) — genera `dist/cdn/{tag}.min.js` + `.min.css` + `is-base.min.css` + loader + gallery-app.
- [Build overlays](../scripts/build-overlays.mjs) — bundle dedicado para los `overlays/*`.
- [Bundle demos](../scripts/bundle-demos.mjs) — empaqueta los HTML de demo para servir sin dev server.
- [Bundle scripts](../scripts/bundle-scripts.mjs) — empaqueta los scripts de la galería.
- [Fix preview paths](../scripts/fix-preview-paths.ts) — reescribe `../` a `../../` tras folderizar.
- [Sync pins](../scripts/sync-pins.mjs) — propaga el SHA del kit a apps consumidoras (`kit-pin`, `ISS`, `PIN`).
- [Verify theme contract](../scripts/verify-theme-contract.cjs) — asserts de tokens `--iswc-*` y paletas.
- Estructura de componentes: `src/components/<categoría>/<nombre>.{js,ts,css,md}` + carpeta `_shared/` con bases reutilizables.
- Estructura de demos: `demos/<categoría>/<nombre>/<nombre>.html` + `_testing/<nombre>.test.mjs` + `_testing/<nombre>.stagehand.test.mjs`.

## 8. Tests

- Test runner E2E: [`src/utils/testing/e2e/run.ts`](../src/utils/testing/e2e/run.ts) + tests por suite (`00-arranque`, `01-is-code`, `02-componentes`, `03-problemas`, `04-controles`, `05-cobertura-total`, `06-modales`, `07-a11y-gaps`, `08-priority-gaps`, `09-top50-gaps`, `10-ux-proposals`).
- Smoke tests exhaustivos: [`src/utils/health/exhaustive/run-all-tests.mjs`](../src/utils/health/exhaustive/run-all-tests.mjs) (cubre los 185 componentes del manifest).
- Módulo de cobertura por suite: [`src/utils/health/exhaustive/count.mjs`](../src/utils/health/exhaustive/count.mjs) + [`merge-children.mjs`](../src/utils/health/exhaustive/merge-children.mjs).
- Tests en raíz: [`tests/`](../tests/) (p. ej. [`tests/home-coverage.test.mjs`](../tests/home-coverage.test.mjs)).
- Helpers comunes viven dentro de cada `*.test.ts` (no hay `_helpers.ts` compartido; las suites se auto-contienen).
- Verificación e2e contra el repo: [`scripts/verify-page.py`](../scripts/verify-page.py) (requiere `verify-server.cjs` en :8765 + Playwright).
- Verificación de tema y tokens: [`scripts/verify-theme-contract.cjs`](../scripts/verify-theme-contract.cjs).
- Auditoría de manifests/previews/iconos (histórico): ahora está cubierta por los smoke tests en `src/utils/health/exhaustive/`. Las auditorías previas viven en [`.audit/`](../.audit/).

## 9. Auditorías

Auditorías transversales al repo:

- [Zod migration audit](../.audit/zod-migration-audit.md) — estado de la migración de tipos a Zod (brief G-4 en `.superpowers/sdd/2026-10-03-zod-migration/`).
- [UI/UX data charts diagrams](../.audit/AUDIT-UI-UX-DATA-CHARTS-DIAGRAMS.md) — auditoría visual de data, charts y diagramas.
- [Last audit run](../.audit/last.md) — última corrida del motor `iswc-audit` (resumen + hallazgos por severidad).
- [Media test proposals](../.audit/media-test-proposals.md) — propuestas de tests sobre media.
- [Tests to implement](../.audit/tests-to-implement.md) — backlog priorizado de tests pendientes (también [`tests-to-implement-F0.4.md`](../.audit/tests-to-implement-F0.4.md) y [`tests-to-implement-captain-2026.md`](../.audit/tests-to-implement-captain-2026.md)).
- Briefs y reportes de la fase Zod migration (A→I): [`.superpowers/sdd/2026-10-03-zod-migration/`](../.superpowers/sdd/2026-10-03-zod-migration/) (briefs por fase + reportes `phase-*-report.md`).
- Logs crudos: [`.audit/discovery.json`](../.audit/discovery.json), [`groups.json`](../.audit/groups.json), [`exhaustive-results.txt`](../.audit/exhaustive-results.txt), [`test-all-run.log`](../.audit/test-all-run.log), etc.
- Snapshots: [`.shots/`](../.shots/) (artefactos de `scripts/shoot-all.mjs`).
- Tour UX: [`.tour/`](../.tour/) y [`.e2e-ux/`](../.e2e-ux/) (recorridos automatizados por la galería).

## 10. ADRs y decisiones

Decisiones cerradas que no se deben reabrir cada sesión. El formato y la política viven en [adr.md](../specs/adr.md).

- [ADR (índice y formato)](../specs/adr.md) — debates cerrados de alcance general; los debates solo de un dominio viven como sección fija en `specs/<dominio>/spec.md`.
- [Constitution](../specs/constitution.md) — carta de leyes del kit.
- [Constraints](../specs/constraints.md) — invariantes duras.
- [Lessons](../specs/lessons.md) — catálogo de errores pagados (síntoma → regla → guardián).
- [Componentes](../specs/componentes.md) — decisiones sobre el catálogo.
- [CDN](../specs/cdn.md) — decisiones de distribución.
- [Iconos](../specs/iconos.md) — decisiones sobre el sistema de iconos.
- [Documentación](../specs/documentacion.md) — decisiones sobre docs.
- [Testing](../specs/testing.md) — decisiones sobre tests.
- [Flujo SDD](../specs/flujo-sdd.md) — cómo se hacen specs y cambios.
- [ISWC refactor plan](../specs/iswc-refactor-plan.md) y [f6](../specs/iswc-refactor-f6.md) — planes históricos de refactor.

### Specs por dominio

- [galeria/spec.md](../specs/galeria/spec.md), [galeria/e2e.md](../specs/galeria/e2e.md), [galeria/home.md](../specs/galeria/home.md), [galeria/preview-cdn.md](../specs/galeria/preview-cdn.md).
- [plantillas/spec.template.md](../specs/plantillas/spec.template.md), [plantillas/tasks.template.md](../specs/plantillas/tasks.template.md).
- [playground/spec.md](../specs/playground/spec.md).
- [file-preview/spec.md](../specs/file-preview/spec.md).
- [typescript/spec.md](../specs/typescript/spec.md) + [typescript/tasks.md](../specs/typescript/tasks.md).
- [commons/auditoria/](../specs/commons/auditoria/) — plantillas de feedback de auditoría.
- [health/wip-history/](../specs/health/wip-history/) — checkpoints y planes activos del módulo de health.

### Planes y notas en este repo

- [docs/handoff-strong-typing.md](handoff-strong-typing.md) — handoff del tipado fuerte.
- [docs/auditoria-exhaustiva.md](auditoria-exhaustiva.md) — bitácora de la auditoría exhaustiva.
- [docs/auditoria-final.md](auditoria-final.md) — reporte final de la auditoría.
- [docs/plan-er-editor-archify-alignment.md](plan-er-editor-archify-alignment.md) — plan de alineación `iswc-er-editor` con el resto.
- [docs/superpowers/plans/2026-10-03-zod-migration.md](superpowers/plans/2026-10-03-zod-migration.md) — plan de la migración a Zod.
- [docs/superpowers/plans/2026-10-03-file-preview-family.md](superpowers/plans/2026-10-03-file-preview-family.md) — plan de la familia file-preview.
