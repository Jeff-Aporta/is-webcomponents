# Catálogo iswc-* (inventario completo)

Fuente viva: regenerar con `node scripts/sync-skill-catalog.mjs`.
Skill general: [SKILL.md](SKILL.md) · Runtime sin tag: [tools/runtime.md](tools/runtime.md).

## Categorías

| Carpeta | Propósito |
| --- | --- |
| `actions` | Acciones, comandos, menús |
| `charts` / `data-viz` | Series, distribuciones, mapas |
| `code` | Editor / visor de código |
| `data` | Grid, stats, transfer, kanban, pivot |
| `diagrams` | Flujos, ER, gantt, timeline… |
| `feedback` | Toast, tag, skeleton, progress, CDN snippet |
| `forms` | Captura y validación |
| `helpers` | Formato, observers, MD, popover, APIs módulo |
| `isp` | Layout/forms ContaPyme (ISP) |
| `layout` | Regiones, dialog, drawer, demo, dock |
| `media` | Iconos, avatar, video |
| `navigation` | Tabs, tree, stepper, breadcrumb, carousel |
| `overlays` | Command palette, PDF, window |
| `preview` | Shell de galería (no producto) |
| `cdn` / `core` | Loader y base CE (sin tag de producto) |

## Módulos API (sin custom element)

| API / módulo | CDN o ruta | Resumen | Guía |
| --- | --- | --- | --- |
| `ISWebComponentsLoader` | `core/loader.min.js` | Entry CDN: loadCSS*, load/ensure/has, pin, configure, espejos jsDelivr -> githack -> Pages, sheets, registerApp, SHA quemado. | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/cdn/loader.md) |
| `IswcUi / Ui` | `helpers/ui.min.js` | html, adoptCss, define, css, el: primitivas de apps dominio. No es CE. | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/ui.md) |
| `mdToHtml` | `helpers/md-lite.min.js` | Markdown -> HTML sin npm; fences codigo e iswc-* (diagramas). | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-lite.md) |
| `resolveIswcFenceTag` | `helpers/md-iswc-fences.min.js` | Lang fence iswc-* -> tag de diagrama (flowchart, er, sequence, ...). | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-iswc-fences.md) |
| `hydrateMdEmbeds` | `helpers/md-hydrate.min.js` | L.ensure de tags presentes + upgrade .md-iswc-code -> iswc-code. | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-hydrate.md) |
| `md-editor-api` | `helpers/md-editor-api.min.js` | CRUD/normalizacion para iswc-md-editor (endpoints, fieldMap, token). | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/md-editor-api.md) |
| `IsResponseCache` | `helpers/response-cache.min.js` | SWR IndexedDB: vivo/leer/guardar/invalidar; no bloquea el pintado. | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/helpers/response-cache.md) |
| `sync-pins` | `scripts/sync-pins.mjs (repo)` | Tras commit del kit: propaga SHA a kit-pin / ISS / PIN (deno task sync:pins). | [docs](https://github.com/Jeff-Aporta/is-webcomponents/blob/main/scripts/sync-pins.mjs) |

## Tags por categoría

### isp

| Doc | Tags |
| --- | --- |
| `isp/accordion-group.md` | `<iswc-accordion-group>` |
| `isp/block-layout.md` | `<iswc-block-layout>` |
| `isp/btn-ref.md` | `<iswc-btn-ref>` |
| `isp/catalogo-gen.md` | `<iswc-catalogo-gen>` |
| `isp/confirm-delete.md` | `<iswc-confirm-delete>` |
| `isp/flex-layout.md` | `<iswc-flex-layout>` |
| `isp/flex-options.md` | `<iswc-flex-options>` |
| `isp/float-card.md` | `<iswc-float-card>` |
| `isp/form.md` | `<iswc-form>` |
| `isp/modal-verificacion.md` | `<iswc-modal-verificacion>` |
| `isp/grid-layout.md` | `<iswc-grid-layout>` |
| `isp/heading.md` | `<iswc-heading>` |
| `isp/loading-overlay.md` | `<iswc-loading-overlay>` |
| `isp/text.md` | `<iswc-text>` |
| `isp/tree-view-roles.md` | `<iswc-tree-view>` |

### actions

| Doc | Tags |
| --- | --- |
| `actions/button.md` | `<iswc-button>` |
| `actions/button-group.md` | `<iswc-button-group>` |
| `actions/copy-button.md` | `<iswc-copy-button>` |
| `actions/share-button.md` | `<iswc-share-button>` |
| `actions/check-icon-button.md` | `<iswc-check-icon-button>` |
| `actions/dropdown.md` | `<iswc-dropdown>` |
| `actions/dropdown-item.md` | `<iswc-dropdown-item>` |
| `actions/fab.md` | `<iswc-fab>` |
| `actions/context-menu.md` | `<iswc-context-menu>` |
| `actions/speed-dial.md` | `<iswc-speed-dial>` |
| `actions/speed-dial-action.md` | `<iswc-speed-dial-action>` |

### media

| Doc | Tags |
| --- | --- |
| `media/icon.md` | `<iswc-icon>` |
| `media/avatar.md` | `<iswc-avatar>` |
| `media/theme-img.md` | `<iswc-theme-img>` |
| `media/video.md` | `<iswc-video>` |
| `media/speech.md` | `<iswc-speech>` |
| `media/media-recorder.md` | `<iswc-media-recorder>` |
| `media/video-playlist.md` | `<iswc-video-playlist>` |
| `media/barcode.md` | `<iswc-barcode>` |
| `media/barcode-scanner.md` | `<iswc-barcode-scanner>` |
| `media/image-editor.md` | `<iswc-image-editor>` |
| `iswc-icon-explorer` | `<iswc-icon-explorer>` |
| `media/qrcode.md` | `<iswc-qrcode>` |

### feedback

| Doc | Tags |
| --- | --- |
| `feedback/spinner.md` | `<iswc-spinner>` |
| `feedback/badge.md` | `<iswc-badge>` |
| `feedback/tag.md` | `<iswc-tag>` |
| `feedback/skeleton.md` | `<iswc-skeleton>` |
| `feedback/progress-bar.md` | `<iswc-progress-bar>` |
| `feedback/progress-ring.md` | `<iswc-progress-ring>` |
| `feedback/theme-toggle.md` | `<iswc-theme-toggle>` |
| `feedback/prefs-clear.md` | `<iswc-prefs-clear>` |
| `feedback/toast.md` | `<iswc-toast>` |
| `feedback/toast-item.md` | `<iswc-toast-item>` |
| `feedback/tooltip.md` | `<iswc-tooltip>` |
| `feedback/cdn-snippet.md` | `<iswc-cdn-snippet>` |
| `feedback/popconfirm.md` | `<iswc-popconfirm>` |
| `feedback/confirm-modal.md` | `<iswc-confirm-modal>` |
| `feedback/palette-selector.md` | `<iswc-palette-selector>` |

### layout

| Doc | Tags |
| --- | --- |
| `layout/split-panel.md` | `<iswc-split-panel>` |
| `layout/main.md` | `<iswc-main>` |
| `layout/card.md` | `<iswc-card>` |
| `layout/callout.md` | `<iswc-callout>` |
| `layout/details.md` | `<iswc-details>` |
| `layout/dialog.md` | `<iswc-dialog>` |
| `layout/drawer.md` | `<iswc-drawer>` |
| `layout/divider.md` | `<iswc-divider>` |
| `layout/scrollspy.md` | `<iswc-scrollspy>` |
| `layout/demo.md` | `<iswc-demo>` |
| `layout/dock.md` | `<iswc-dock>` |
| `layout/dock-item.md` | `<iswc-dock-item>` |

### helpers

| Doc | Tags |
| --- | --- |
| `helpers/popover.md` | `<iswc-popover>` |
| `helpers/ui.md` | `<iswc-ui>` |
| `diagrams/lightbox.md` | `<iswc-lightbox>` |
| `helpers/relative-time.md` | `<iswc-relative-time>` |
| `helpers/format.md` | `<iswc-format>` |
| `helpers/observer.md` | `<iswc-observer>` |
| `helpers/wake-lock.md` | `<iswc-wake-lock>` |
| `helpers/offscreen-canvas.md` | `<iswc-offscreen-canvas>` |
| `helpers/format-date.md` | `<iswc-format-date>` |
| `helpers/format-number.md` | `<iswc-format-number>` |
| `helpers/format-bytes.md` | `<iswc-format-bytes>` |
| `helpers/intersection-observer.md` | `<iswc-intersection-observer>` |
| `helpers/mutation-observer.md` | `<iswc-mutation-observer>` |
| `helpers/resize-observer.md` | `<iswc-resize-observer>` |
| `helpers/md-render.md` | `<iswc-md-render>` |
| `helpers/md-editor.md` | `<iswc-md-editor>` |
| `helpers/floating.md` | `<iswc-floating>` |

### navigation

| Doc | Tags |
| --- | --- |
| `navigation/breadcrumb.md` | `<iswc-breadcrumb>` |
| `navigation/breadcrumb-item.md` | `<iswc-breadcrumb-item>` |
| `navigation/tab-group.md` | `<iswc-tab-group>`, `<iswc-tab>`, `<iswc-tab-panel>` |
| `navigation/scroller.md` | `<iswc-scroller>` |
| `navigation/carousel.md` | `<iswc-carousel>` |
| `navigation/carousel-item.md` | `<iswc-carousel-item>` |
| `navigation/tree.md` | `<iswc-tree>` |
| `navigation/tree-item.md` | `<iswc-tree-item>` |
| `navigation/stepper.md` | `<iswc-stepper>` |
| `navigation/stepper-step.md` | `<iswc-stepper-step>` |
| `navigation/mega-menu.md` | `<iswc-mega-menu>` |

### forms

| Doc | Tags |
| --- | --- |
| `forms/combobox.md` | `<iswc-combobox>` |
| `forms/option.md` | `<iswc-option>` |
| `forms/checkbox.md` | `<iswc-checkbox>` |
| `forms/switch.md` | `<iswc-switch>` |
| `forms/radio-group.md` | `<iswc-radio-group>` |
| `forms/radio.md` | `<iswc-radio>` |
| `forms/input.md` | `<iswc-input>` |
| `forms/textarea.md` | `<iswc-textarea>` |
| `forms/slider.md` | `<iswc-slider>` |
| `forms/rating.md` | `<iswc-rating>` |
| `forms/select.md` | `<iswc-select>` |
| `forms/color-picker.md` | `<iswc-color-picker>` |
| `forms/file-input.md` | `<iswc-file-input>` |
| `forms/date-picker.md` | `<iswc-date-picker>` |
| `forms/month-calendar.md` | `<iswc-month-calendar>` |
| `forms/year-calendar.md` | `<iswc-year-calendar>` |
| `forms/date-range-picker.md` | `<iswc-date-range-picker>` |
| `forms/time-clock.md` | `<iswc-time-clock>` |
| `forms/digital-clock.md` | `<iswc-digital-clock>` |
| `forms/date-field.md` | `<iswc-date-field>` |
| `forms/time-field.md` | `<iswc-time-field>` |
| `forms/date-time-field.md` | `<iswc-date-time-field>` |
| `forms/date-input.md` | `<iswc-date-input>` |
| `forms/time-input.md` | `<iswc-time-input>` |
| `forms/date-time-input.md` | `<iswc-date-time-input>` |
| `forms/date-range-input.md` | `<iswc-date-range-input>` |
| `forms/pin-input.md` | `<iswc-pin-input>` |
| `forms/masked-input.md` | `<iswc-masked-input>` |
| `forms/inline-edit.md` | `<iswc-inline-edit>` |
| `forms/mention.md` | `<iswc-mention>` |
| `forms/duration-picker.md` | `<iswc-duration-picker>` |
| `forms/dropzone.md` | `<iswc-dropzone>` |
| `forms/full-calendar.md` | `<iswc-full-calendar>` |
| `forms/signature.md` | `<iswc-signature>` |
| `forms/rte.md` | `<iswc-rte>` |
| `forms/doc-editor.md` | `<iswc-doc-editor>` |

### code

| Doc | Tags |
| --- | --- |
| `code/code.md` | `<iswc-code>` |

### data

| Doc | Tags |
| --- | --- |
| `data/data-grid.md` | `<iswc-data-grid>` |
| `data/stat.md` | `<iswc-stat>` |
| `data/transfer.md` | `<iswc-transfer>` |
| `data/transfer-item.md` | `<iswc-transfer-item>` |
| `data/kanban.md` | `<iswc-kanban>` |
| `data/kanban-column.md` | `<iswc-kanban-column>` |
| `data/kanban-card.md` | `<iswc-kanban-card>` |
| `data/pivot-table.md` | `<iswc-pivot-table>` |
| `data/spreadsheet.md` | `<iswc-spreadsheet>` |
| `data/ag-grid.md` | `<iswc-ag-grid>` |

### data-viz

| Doc | Tags |
| --- | --- |
| `charts/chart.md` | `<iswc-chart>` |
| `charts/bar-chart.md` | `<iswc-bar-chart>` |
| `charts/line-chart.md` | `<iswc-line-chart>` |
| `charts/pie-chart.md` | `<iswc-pie-chart>` |
| `charts/doughnut-chart.md` | `<iswc-doughnut-chart>` |
| `charts/radar-chart.md` | `<iswc-radar-chart>` |
| `charts/polar-area-chart.md` | `<iswc-polar-area-chart>` |
| `charts/scatter-chart.md` | `<iswc-scatter-chart>` |
| `charts/bubble-chart.md` | `<iswc-bubble-chart>` |
| `charts/sparkline.md` | `<iswc-sparkline>` |
| `charts/waterfall-chart.md` | `<iswc-waterfall-chart>` |
| `charts/funnel-chart.md` | `<iswc-funnel-chart>` |
| `charts/treemap.md` | `<iswc-treemap>` |
| `data/gauge.md` | `<iswc-gauge>` |
| `data-viz/heatmap.md` | `<iswc-heatmap>` |
| `data-viz/maps.md` | `<iswc-maps>` |
| `data-viz/map-marker.md` | `<iswc-map-marker>` |

### diagrams

| Doc | Tags |
| --- | --- |
| `diagrams/flowchart.md` | `<iswc-flowchart>` |
| `diagrams/sequence-diagram.md` | `<iswc-sequence-diagram>` |
| `diagrams/diagram-lightbox.md` | `<iswc-diagram-lightbox>` |
| `diagrams/class-diagram.md` | `<iswc-class-diagram>` |
| `diagrams/state-diagram.md` | `<iswc-state-diagram>` |
| `diagrams/er-diagram.md` | `<iswc-er-diagram>` |
| `diagrams/er-editor.md` | `<iswc-er-editor>` |
| `diagrams/diagram-studio.md` | `<iswc-diagram-view-app>`, `<iswc-diagram-edit-app>` |
| `diagrams/block-diagram.md` | `<iswc-block-diagram>` |
| `diagrams/component-diagram.md` | `<iswc-component-diagram>` |
| `diagrams/mindmap.md` | `<iswc-mindmap>` |
| `diagrams/gantt.md` | `<iswc-gantt>` |
| `diagrams/timeline.md` | `<iswc-timeline>` |
| `diagrams/org-chart.md` | `<iswc-org-chart>` |
| `diagrams/sankey-diagram.md` | `<iswc-sankey-diagram>` |
| `diagrams/quadrant-chart.md` | `<iswc-quadrant-chart>` |
| `diagrams/venn-diagram.md` | `<iswc-venn-diagram>` |
| `diagrams/use-case-diagram.md` | `<iswc-use-case-diagram>` |
| `diagrams/swimlane-diagram.md` | `<iswc-swimlane-diagram>` |
| `diagrams/journey-map.md` | `<iswc-journey-map>` |

### overlays

| Doc | Tags |
| --- | --- |
| `overlays/command-palette.md` | `<iswc-command-palette>` |
| `overlays/pdf-viewer.md` | `<iswc-pdf-viewer>` |
| `overlays/window.md` | `<iswc-window>` |

### preview

| Doc | Tags |
| --- | --- |
| `layout/preview-component.md` | `<iswc-preview-component>` |
| `layout/preview-controls.md` | `<iswc-preview-controls>` |

