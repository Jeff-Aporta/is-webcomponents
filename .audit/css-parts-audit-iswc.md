# Audit CSS Parts — iswc-root

- **Generated:** 2026-10-03
- **Scope:** every `.ts` component in `src/components/**` that exposes at least one `::part()` and has a sibling `<comp>.md`.
- **Detection:** `part="…"` literals, `setAttribute("part", "…")`, and `exportparts="internal:external"` aliases. CSS Parts sections in the `.md` files are parsed from the Markdown table immediately under the `### CSS parts` heading.

## Resumen

| Métrica | Total |
| --- | --- |
| Componentes auditados (con parts y `.md`) | **135** |
| Componentes con sección "CSS parts" en `.md` | **116** |
| Componentes SIN sección "CSS parts" en `.md` | **19** |
| Componentes con issues (faltan docs o sobran docs) | **43** |
| Parts declarados pero no documentados (missing) | **106** |
| Parts documentados pero no declarados (undocumented) | **3** |

## Tabla por componente

Columnas:
- **Component** → tag `<iswc-…>`.
- **File** → ruta del `.ts` fuente.
- **Declared** → parts propios (`part="…"`) + nombres expuestos vía `exportparts`.
- **Documented** → parts listados en la tabla CSS parts del `.md`.
- **Issues** → flags: ⚠️ `missing`, 🚫 `undocumented`, ❌ `no-section`.

| Component | File | Declared | Documented | Issues |
| --- | --- | --- | --- | --- |
| `<iswc-button-group>` | `src/components/actions/button-group.ts` | `base` | `base` | — |
| `<iswc-button>` | `src/components/actions/button.ts` | `button` `caret` `end` `label` `spinner` `sr-status` `start` | `button` `caret` `end` `label` `spinner` `start` | ⚠️ missing: `sr-status` |
| `<iswc-check-icon-button>` | `src/components/actions/check-icon-button.ts` | `button` `icon` | `button` `icon` | — |
| `<iswc-context-menu>` | `src/components/actions/context-menu.ts` | `items` `panel` | `items` `panel` | — |
| `<iswc-copy-button>` | `src/components/actions/copy-button.ts` | `button` `copy-icon` `error-icon` `feedback` `feedback-body` `success-icon` | `button` `copy-icon` `error-icon` `success-icon` | ⚠️ missing: `feedback`, `feedback-body` |
| `<iswc-dropdown-item>` | `src/components/actions/dropdown-item.ts` | `base` `checkmark` `details` `icon` `label` `submenu` `submenu-icon` | `base` `checkmark` `details` `icon` `label` `submenu` `submenu-icon` | — |
| `<iswc-dropdown>` | `src/components/actions/dropdown.ts` | `dialog` `menu` `trigger-wrap` | `dialog` `menu` `trigger-wrap` | — |
| `<iswc-fab>` | `src/components/actions/fab.ts` | `base` `icon` `label` | `base` `icon` `label` | — |
| `<iswc-share-button>` | `src/components/actions/share-button.ts` | `button` | — | ❌ no-section<br>⚠️ missing: `button` |
| `<iswc-speed-dial>` | `src/components/actions/speed-dial.ts` | `action` `actions` `root` `trigger` | `action` `actions` `root` `trigger` | — |
| `<iswc-chart>` | `src/components/charts/chart.ts` | `base` `canvas` `legend` `sr-status` `tooltip` | `base` `canvas` `legend` `tooltip` | ⚠️ missing: `sr-status` |
| `<iswc-sparkline>` | `src/components/charts/sparkline.ts` | `canvas` `sparkline` `sr-status` | `canvas` `sparkline` | ⚠️ missing: `sr-status` |
| `<iswc-treemap>` | `src/components/charts/treemap.ts` | `base` `canvas` `tooltip` | `base` `canvas` `tooltip` | — |
| `<iswc-code>` | `src/components/code/code.ts` | `editor` `root` `seed` `tooltip` | `editor` `root` `seed` `tooltip` | — |
| `<iswc-heatmap>` | `src/components/data-viz/heatmap.ts` | `canvas` `legend` `root` `sr-status` | `canvas` `legend` `root` | ⚠️ missing: `sr-status` |
| `<iswc-maps>` | `src/components/data-viz/maps.ts` | `canvas` `root` | `canvas` `root` | — |
| `<iswc-ag-grid>` | `src/components/data/ag-grid.ts` | `body` `count` `footer` `group-header` `group-panel` `header` `root` `sidebar` `tool-panel` `toolbar` `viewport` | `body` `count` `footer` `group-header` `group-panel` `header` `root` `sidebar` `tool-panel` `toolbar` `viewport` | — |
| `<iswc-data-grid>` | `src/components/data/data-grid.ts` | `aggregation-row` `base` `body` `cell` `column-groups` `detail-panel` `footer` `header` `header-cell` `header-filters` `header-row` `overlay` `pagination` `pinned-bottom` `pinned-top` `quick-filter` `row` `toolbar` `toolbar-button` `viewport` | `aggregation-row` `base` `body` `column-groups` `footer` `header` `header-filters` `header-row` `overlay` `pagination` `pinned-bottom` `pinned-top` `quick-filter` `toolbar` `toolbar-button` `viewport` | ⚠️ missing: `cell`, `detail-panel`, `header-cell`, `row` |
| `<iswc-gauge>` | `src/components/data/gauge.ts` | `base` `content` `fill` `label` `svg` `track` `value` | `base` `content` `fill` `label` `svg` `track` `value` | — |
| `<iswc-kanban>` | `src/components/data/kanban.ts` | `actions` `badge` `base` `card` `col-foot` `col-head` `column` `cover` `footer` `head` `heading` `lane` `meta` `tag` `title` | `actions` `badge` `base` `card` `col-foot` `col-head` `column` `cover` `footer` `head` `heading` `lane` `meta` `tag` `title` | — |
| `<iswc-pivot-table>` | `src/components/data/pivot-table.ts` | `root` `table` | `root` `table` | — |
| `<iswc-spreadsheet>` | `src/components/data/spreadsheet.ts` | `grid` `root` | `grid` `root` | — |
| `<iswc-stat>` | `src/components/data/stat.ts` | `base` `foot` `head` `helper` `icon` `label` `trend` `value` | `base` `foot` `head` `helper` `icon` `label` `trend` `value` | — |
| `<iswc-transfer>` | `src/components/data/transfer.ts` | `base` `controls` `count` `item` `list` `pane` `pane-head` `search` `sr-status` `title` | `base` `controls` `count` `item` `list` `pane` `pane-head` `search` `title` | ⚠️ missing: `sr-status` |
| `<iswc-lightbox>` | `src/components/diagrams/lightbox.ts` | `code-panel` `dialog` `host` `stage` `toast` `toolbar` `toolbar__lead` `toolbar__trail` | `code-panel` `dialog` `host` `stage` `toast` `toolbar` `toolbar__lead` `toolbar__trail` | — |
| `<iswc-org-chart>` | `src/components/diagrams/org-chart.ts` | `canvas` `root` `tooltip` | `canvas` `root` `tooltip` | — |
| `<iswc-badge>` | `src/components/feedback/badge.ts` | `badge` `end` `label` `start` | `badge` `end` `label` `start` | — |
| `<iswc-confirm-modal>` | `src/components/feedback/confirm-modal.ts` | `actions` `backdrop` `base` `heading` `message` | `actions` `backdrop` `base` `heading` `message` | — |
| `<iswc-palette-selector>` | `src/components/feedback/palette-selector.ts` | `mark` `menu` `option` `trigger` | `caret` `label` `lead` `menu` `option` `trigger` | ⚠️ missing: `mark`<br>🚫 undocumented: `caret`, `label`, `lead` |
| `<iswc-popconfirm>` | `src/components/feedback/popconfirm.ts` | `actions` `arrow` `base` `message` | `actions` `arrow` `base` `message` | — |
| `<iswc-prefs-clear>` | `src/components/feedback/prefs-clear.ts` | `button` | — | ❌ no-section<br>⚠️ missing: `button` |
| `<iswc-progress-bar>` | `src/components/feedback/progress-bar.ts` | `indicator` `label` `progress-bar` | `indicator` `label` `progress-bar` | — |
| `<iswc-progress-ring>` | `src/components/feedback/progress-ring.ts` | `indicator` `label` `progress-ring` `track` | `indicator` `label` `progress-ring` `track` | — |
| `<iswc-skeleton>` | `src/components/feedback/skeleton.ts` | `indicator` | `indicator` | — |
| `<iswc-spinner>` | `src/components/feedback/spinner.ts` | `spinner` | `spinner` | — |
| `<iswc-tag>` | `src/components/feedback/tag.ts` | `end` `label` `remove-button` `start` `tag` | `end` `label` `remove-button` `start` `tag` | — |
| `<iswc-theme-toggle>` | `src/components/feedback/theme-toggle.ts` | `button` | `button` | — |
| `<iswc-toast-item>` | `src/components/feedback/toast-item.ts` | `base` `caption` `close-button` `icon` `message` `progress` `title` | `base` `caption` `close-button` `icon` `message` `progress` `title` | — |
| `<iswc-toast>` | `src/components/feedback/toast.ts` | `stack` | `stack` | — |
| `<iswc-tooltip>` | `src/components/feedback/tooltip.ts` | `base` `base__arrow` `base__popup` `body` `tooltip` | `base` `body` `tooltip` | ⚠️ missing: `base__arrow`, `base__popup` |
| `<iswc-csv-edit>` | `src/components/files/csv-edit.ts` | `add-row` `export` `root` `stage` `table` `toolbar` | — | ❌ no-section<br>⚠️ missing: `add-row`, `export`, `root`, `stage`, `table`, `toolbar` |
| `<iswc-csv-view>` | `src/components/files/csv-view.ts` | `empty` `root` `stage` `table` | — | ❌ no-section<br>⚠️ missing: `empty`, `root`, `stage`, `table` |
| `<iswc-docx-view>` | `src/components/files/docx-view.ts` | `body` `root` | — | ❌ no-section<br>⚠️ missing: `body`, `root` |
| `<iswc-file-edit>` | `src/components/files/file-edit.ts` | `error` `root` `stage` | — | ❌ no-section<br>⚠️ missing: `error`, `root`, `stage` |
| `<iswc-file-view>` | `src/components/files/file-view.ts` | `error` `root` `stage` | — | ❌ no-section<br>⚠️ missing: `error`, `root`, `stage` |
| `<iswc-pptx-view>` | `src/components/files/pptx-view.ts` | `root` `slide` `stage` | — | ❌ no-section<br>⚠️ missing: `root`, `slide`, `stage` |
| `<iswc-txt-edit>` | `src/components/files/txt-edit.ts` | `editor` `root` | — | ❌ no-section<br>⚠️ missing: `editor`, `root` |
| `<iswc-txt-view>` | `src/components/files/txt-view.ts` | `body` `empty` `root` | — | ❌ no-section<br>⚠️ missing: `body`, `empty`, `root` |
| `<iswc-checkbox>` | `src/components/forms/checkbox.ts` | `base` `control` `form-control` `hint` `label` `mark` | `base` `control` `form-control` `hint` `label` `mark` | — |
| `<iswc-color-picker>` | `src/components/forms/color-picker.ts` | `base` `dialog` `eyedropper` `hex-input` `hint` `input` `label` `panel` `swatch` `trigger` | `base` `dialog` `eyedropper` `hex-input` `hint` `input` `label` `panel` `swatch` `trigger` | — |
| `<iswc-combobox>` | `src/components/forms/combobox.ts` | `base` `clear` `dialog` `form-control` `hint` `input` `label` `listbox` `option` `trigger` | `base` `clear` `dialog` `form-control` `hint` `input` `label` `listbox` `trigger` | ⚠️ missing: `option` |
| `<iswc-date-picker>` | `src/components/forms/date-picker.ts` | `base` `day` `grid` `month-label` `month-select` `month-view` `nav` `week-number` `weekdays` `year-select` `year-view` | `base` `grid` `month-label` `month-select` `month-view` `nav` `weekdays` `year-select` `year-view` | ⚠️ missing: `day`, `week-number` |
| `<iswc-date-range-picker>` | `src/components/forms/date-range-picker.ts` | `base` `calendars` `shortcuts` | `base` `calendars` `shortcuts` | — |
| `<iswc-digital-clock>` | `src/components/forms/digital-clock.ts` | `base` `option` | `base` | ⚠️ missing: `option` |
| `<iswc-doc-editor>` | `src/components/forms/doc-editor.ts` | `blocks` `menu` `root` | `blocks` `menu` `root` | — |
| `<iswc-dropzone>` | `src/components/forms/dropzone.ts` | `queue` `root` `zone` | `queue` `root` `zone` | — |
| `<iswc-duration-picker>` | `src/components/forms/duration-picker.ts` | `hours` `minutes` `root` `seconds` | `hours` `minutes` `root` `seconds` | — |
| `<iswc-file-input>` | `src/components/forms/file-input.ts` | `base` `dropzone` `file` `file-list` `hint` `input` `label` `remove-button` | `base` `dropzone` `file-list` `hint` `input` `label` | ⚠️ missing: `file`, `remove-button` |
| `<iswc-full-calendar>` | `src/components/forms/full-calendar.ts` | `grid` `root` `toolbar` | `grid` `root` `toolbar` | — |
| `<iswc-inline-edit>` | `src/components/forms/inline-edit.ts` | `display` `editor` `editor-wrap` `root` | `display` `editor` `editor-wrap` `root` | — |
| `<iswc-input>` | `src/components/forms/input.ts` | `base` `clear` `count` `end` `error-text` `form-control` `hint` `input` `label` `prefix` `start` `suffix` `support` `toggle` | `base` `clear` `count` `end` `error-text` `form-control` `hint` `input` `label` `prefix` `start` `suffix` `support` `toggle` | — |
| `<iswc-masked-input>` | `src/components/forms/masked-input.ts` | `field` `input` | `field` `input` | — |
| `<iswc-mention>` | `src/components/forms/mention.ts` | `input` `popup` `root` | `input` `popup` `root` | — |
| `<iswc-month-calendar>` | `src/components/forms/month-calendar.ts` | `base` `month` | `base` | ⚠️ missing: `month` |
| `<iswc-option>` | `src/components/forms/option.ts` | `base` `description` `label` `start` | `base` `description` `label` `start` | — |
| `<iswc-pin-input>` | `src/components/forms/pin-input.ts` | `base` `cells` | `base` `cells` | — |
| `<iswc-radio-group>` | `src/components/forms/radio-group.ts` | `base` `error-text` `form-control` `hint` `label` | `base` `error-text` `form-control` `hint` `label` | — |
| `<iswc-radio>` | `src/components/forms/radio.ts` | `base` `control` `description` `dot` `label` `text` | `base` `control` `description` `dot` `label` `text` | — |
| `<iswc-rating>` | `src/components/forms/rating.ts` | `base` `form-control` `hover-label` `icon-empty` `icon-filled` `label` `star` | `base` `form-control` `hover-label` `icon-empty` `icon-filled` `label` `star` | — |
| `<iswc-rte>` | `src/components/forms/rte.ts` | `content` `placeholder` `root` `source` `toolbar` | `content` `placeholder` `root` `source` `toolbar` | — |
| `<iswc-select>` | `src/components/forms/select.ts` | `base` `check` `clear` `dialog` `error-text` `group` `group-label` `hint` `label` `listbox` `option` `option-description` `option-start` `tag` `tag-more` `trigger` | `base` `clear` `dialog` `error-text` `hint` `label` `listbox` `trigger` | ⚠️ missing: `check`, `group`, `group-label`, `option`, `option-description`, `option-start`, `tag`, `tag-more` |
| `<iswc-signature>` | `src/components/forms/signature.ts` | `canvas` `hint` `root` | `canvas` `hint` `root` | — |
| `<iswc-slider>` | `src/components/forms/slider.ts` | `base` `form-control` `hint` `label` `mark` `mark-label` `rail` `thumb` `track` `value-label` | `base` `form-control` `hint` `label` `rail` `thumb` `track` `value-label` | ⚠️ missing: `mark`, `mark-label` |
| `<iswc-switch>` | `src/components/forms/switch.ts` | `base` `control` `form-control` `hint` `label` `mark` `thumb` `track-label` | `base` `control` `form-control` `hint` `label` `mark` `thumb` `track-label` | — |
| `<iswc-textarea>` | `src/components/forms/textarea.ts` | `base` `count` `error-text` `form-control` `hint` `label` `support` `textarea` | `base` `count` `error-text` `form-control` `hint` `label` `support` `textarea` | — |
| `<iswc-time-clock>` | `src/components/forms/time-clock.ts` | `base` `clock` `hand` `header` `hours` `minutes` `number` `seconds` | `base` `clock` `hand` `header` `hours` `minutes` `seconds` | ⚠️ missing: `number` |
| `<iswc-year-calendar>` | `src/components/forms/year-calendar.ts` | `base` `year` | `base` | ⚠️ missing: `year` |
| `<iswc-floating>` | `src/components/helpers/floating.ts` | `anchor` `arrow` `base` `hover-bridge` `popup` | `anchor` `arrow` `base` `hover-bridge` `popup` | — |
| `<iswc-format-bytes>` | `src/components/helpers/format-bytes.ts` | `bytes` | `bytes` | — |
| `<iswc-format-date>` | `src/components/helpers/format-date.ts` | `date` | `date` | — |
| `<iswc-format-number>` | `src/components/helpers/format-number.ts` | `number` | `number` | — |
| `<iswc-format>` | `src/components/helpers/format.ts` | `value` | — | ❌ no-section<br>⚠️ missing: `value` |
| `<iswc-md-editor>` | `src/components/helpers/md-editor.ts` | `copy` `dialog` `dialog-filename` `dialog-label` `footer` `footer-discard` `footer-download` `footer-meta` `footer-save` `plain` `plain-switch` `preview` `preview-body` `preview-empty` `surface` `toolbar` `toolbar-button` `vars` `vars-label` `vars-list` | `copy` `dialog` `dialog-label` `plain` `plain-switch` `preview` `preview-body` `preview-empty` `surface` `toolbar` `toolbar-button` | ⚠️ missing: `dialog-filename`, `footer`, `footer-discard`, `footer-download`, `footer-meta`, `footer-save`, `vars`, `vars-label`, `vars-list` |
| `<iswc-md-render>` | `src/components/helpers/md-render.ts` | `body` `empty` | `body` `empty` | — |
| `<iswc-observer>` | `src/components/helpers/observer.ts` | `base` | — | ❌ no-section<br>⚠️ missing: `base` |
| `<iswc-offscreen-canvas>` | `src/components/helpers/offscreen-canvas.ts` | `canvas` | — | ❌ no-section<br>⚠️ missing: `canvas` |
| `<iswc-popover>` | `src/components/helpers/popover.ts` | `body` `dialog` `popup` `popup__arrow` `popup__hover-bridge` `popup__popup` | `body` `dialog` `popup` | ⚠️ missing: `popup__arrow`, `popup__hover-bridge`, `popup__popup` |
| `<iswc-relative-time>` | `src/components/helpers/relative-time.ts` | `time` | `time` | — |
| `<iswc-accordion-group>` | `src/components/isp/accordion-group.ts` | `base` | `base` | — |
| `<iswc-block-layout>` | `src/components/isp/block-layout.ts` | `content` | `content` | — |
| `<iswc-btn-ref>` | `src/components/isp/btn-ref.ts` | `base` `label-text` `open` | `base` `label-text` `open` | — |
| `<iswc-catalogo-gen>` | `src/components/isp/catalogo-gen.ts` | `drawer` `grid-wrap` `pk-backdrop` `pk-modal` `root` `toolbar` | `drawer` `grid-wrap` `root` `toolbar` | ⚠️ missing: `pk-backdrop`, `pk-modal` |
| `<iswc-confirm-delete>` | `src/components/isp/confirm-delete.ts` | `actions` `backdrop` `base` `fields` `heading` `message` | `actions` `backdrop` `base` `fields` `heading` `message` | — |
| `<iswc-flex-layout>` | `src/components/isp/flex-layout.ts` | `content` | `content` | — |
| `<iswc-flex-options>` | `src/components/isp/flex-options.ts` | `toolbar` | `toolbar` | — |
| `<iswc-float-card>` | `src/components/isp/float-card.ts` | `panel` `wrap` | `panel` `wrap` | — |
| `<iswc-form>` | `src/components/isp/form.ts` | `buttons` `content` `footer` `form` `header` | `buttons` `content` `footer` `form` `header` | — |
| `<iswc-grid-layout>` | `src/components/isp/grid-layout.ts` | `content` | `content` | — |
| `<iswc-heading>` | `src/components/isp/heading.ts` | `heading` | `heading` | — |
| `<iswc-loading-overlay>` | `src/components/isp/loading-overlay.ts` | `backdrop` `indicator` `message` `panel` | `backdrop` `indicator` `message` `panel` | — |
| `<iswc-modal-verificacion>` | `src/components/isp/modal-verificacion.ts` | `actions` `backdrop` `base` `heading` `results` `stats` | `actions` `backdrop` `base` `heading` `results` `stats` | — |
| `<iswc-text>` | `src/components/isp/text.ts` | `content` | `content` | — |
| `<iswc-tree-view>` | `src/components/isp/tree-view.ts` | `body` `drawer` `root` `toolbar` | `body` `drawer` `root` `toolbar` | — |
| `<iswc-callout>` | `src/components/layout/callout.ts` | `base` `icon` `message` | `base` `icon` `message` | — |
| `<iswc-card>` | `src/components/layout/card.ts` | `actions` `body` `footer` `header` `media` | `actions` `body` `footer` `header` `media` | — |
| `<iswc-details>` | `src/components/layout/details.ts` | `base` `content` `header` `icon` `summary` | `base` `content` `header` `icon` `summary` | — |
| `<iswc-dialog>` | `src/components/layout/dialog.ts` | `backdrop` `body` `close-button` `dialog` `footer` `header` `header-actions` `title` | `backdrop` `body` `close-button` `dialog` `footer` `header` `header-actions` `title` | — |
| `<iswc-divider>` | `src/components/layout/divider.ts` | `divider` | `divider` | — |
| `<iswc-dock>` | `src/components/layout/dock.ts` | `item` `label` `root` | `item` `label` `root` | — |
| `<iswc-drawer>` | `src/components/layout/drawer.ts` | `backdrop` `body` `close-button` `drawer` `footer` `header` `header-actions` `title` | `backdrop` `body` `close-button` `drawer` `footer` `header` `header-actions` `title` | — |
| `<iswc-preview-component>` | `src/components/layout/preview-component.ts` | `aside` `main` `page` `toc-drawer` `toc-toggle` | — | ❌ no-section<br>⚠️ missing: `aside`, `main`, `page`, `toc-drawer`, `toc-toggle` |
| `<iswc-split-panel>` | `src/components/layout/split-panel.ts` | `divider` `end` `panel` `start` | `divider` `end` `panel` `start` | — |
| `<iswc-avatar>` | `src/components/media/avatar.ts` | `avatar` `icon` `image` `initials` | `avatar` `icon` `image` `initials` | — |
| `<iswc-barcode-scanner>` | `src/components/media/barcode-scanner.ts` | `hint` `preview` | — | ❌ no-section<br>⚠️ missing: `hint`, `preview` |
| `<iswc-barcode>` | `src/components/media/barcode.ts` | `canvas` `root` `text` | `canvas` `root` `text` | — |
| `<iswc-icon>` | `src/components/media/icon.ts` | `icon` | `icon` | — |
| `<iswc-image-editor>` | `src/components/media/image-editor.ts` | `canvas` `root` `selection` `status` `toolbar` `viewport` | `canvas` `root` `selection` `status` `toolbar` `viewport` | — |
| `<iswc-media-recorder>` | `src/components/media/media-recorder.ts` | `download` `preview` `status` | — | ❌ no-section<br>⚠️ missing: `download`, `preview`, `status` |
| `<iswc-qrcode>` | `src/components/media/qrcode.ts` | `canvas` `root` `status` | `canvas` `root` `status` | — |
| `<iswc-speech>` | `src/components/media/speech.ts` | `bar` `transcript` | — | ❌ no-section<br>⚠️ missing: `bar`, `transcript` |
| `<iswc-theme-img>` | `src/components/media/theme-img.ts` | `image` | — | ❌ no-section<br>⚠️ missing: `image` |
| `<iswc-video-playlist>` | `src/components/media/video-playlist.ts` | `base` `channel` `header` `header-actions` `mute-button` `play-button` `player-toolbar` `playlist` `playlist-duration` `playlist-item` `playlist-items` `playlist-thumbnail` `playlist-title` `playlist-toggle` `seek` `status` `time` `title` `tools-left` `tools-right` `video-playlist` `volume-slider` | `base` `channel` `header` `header-actions` `mute-button` `play-button` `player-toolbar` `playlist` `playlist-items` `playlist-toggle` `seek` `status` `time` `title` `tools-left` `tools-right` `video-playlist` `volume-slider` | ⚠️ missing: `playlist-duration`, `playlist-item`, `playlist-thumbnail`, `playlist-title` |
| `<iswc-video>` | `src/components/media/video.ts` | `base` `big-play` `controls` `fullscreen-button` `mute-button` `pip-button` `play-button` `progress` `seek` `settings-button` `time` `video` `volume` `volume-slider` | `base` `big-play` `controls` `fullscreen-button` `mute-button` `pip-button` `play-button` `progress` `seek` `settings-button` `time` `video` `volume` `volume-slider` | — |
| `<iswc-breadcrumb-item>` | `src/components/navigation/breadcrumb-item.ts` | `end` `label` `separator` `start` | `end` `label` `separator` `start` | — |
| `<iswc-breadcrumb>` | `src/components/navigation/breadcrumb.ts` | `breadcrumb` | `breadcrumb` | — |
| `<iswc-carousel>` | `src/components/navigation/carousel.ts` | `base` `controls` `indicators` `track` `viewport` | `base` `controls` `indicators` `track` `viewport` | — |
| `<iswc-mega-menu>` | `src/components/navigation/mega-menu.ts` | `panel` `root` `trigger` | `panel` `root` `trigger` | — |
| `<iswc-scroller>` | `src/components/navigation/scroller.ts` | `base` `scroll-button` `viewport` | `base` `scroll-button` `viewport` | — |
| `<iswc-stepper>` | `src/components/navigation/stepper.ts` | `base` `description` `indicator` `label` `line` | `base` `description` `indicator` `label` `line` | — |
| `<iswc-tab-group>` | `src/components/navigation/tab-group.ts` | `active-indicator` `base` `body` `close-button` `end` `nav` `scroll-button` `scroll-button-end` `scroll-button-start` `start` `tab-group` `tabs` | `active-indicator` `base` `body` `close-button` `end` `nav` `scroll-button` `scroll-button-end` `scroll-button-start` `start` `tab-group` `tabs` | — |
| `<iswc-tree>` | `src/components/navigation/tree.ts` | `base` `checkbox` `expand-toggle` `icon` `item` `item-children` `item-content` `items` | `base` `checkbox` `expand-toggle` `icon` `item` `item-children` `item-content` `items` | — |
| `<iswc-command-palette>` | `src/components/overlays/command-palette.ts` | `dialog` `empty` `footer` `input` `keys` `panel` `results` `sr-status` | `dialog` `empty` `footer` `input` `panel` `results` `sr-status` | ⚠️ missing: `keys` |
| `<iswc-pdf-viewer>` | `src/components/overlays/pdf-viewer.ts` | `download` `frame` `print` `root` `toolbar` | `download` `frame` `print` `root` `toolbar` | — |
| `<iswc-window>` | `src/components/overlays/window.ts` | `body` `header` `resizer` `root` | `body` `header` `root` | ⚠️ missing: `resizer` |
| `<iswc-playground>` | `src/components/preview/playground.ts` | `body` `config` `controls` `head` `lede` `root` `stage` `stage-wrap` `title` | — | ❌ no-section<br>⚠️ missing: `body`, `config`, `controls`, `head`, `lede`, `root`, `stage`, `stage-wrap`, `title` |

## ❌ Componentes SIN sección "CSS parts" en `.md`

Estos componentes exponen parts pero su `.md` no documenta la API. Tienen que añadir la sección:

| Component | Parts expuestos |
| --- | --- |
| `<iswc-share-button>` | `button` |
| `<iswc-prefs-clear>` | `button` |
| `<iswc-csv-edit>` | `add-row` `export` `root` `stage` `table` `toolbar` |
| `<iswc-csv-view>` | `empty` `root` `stage` `table` |
| `<iswc-docx-view>` | `body` `root` |
| `<iswc-file-edit>` | `error` `root` `stage` |
| `<iswc-file-view>` | `error` `root` `stage` |
| `<iswc-pptx-view>` | `root` `slide` `stage` |
| `<iswc-txt-edit>` | `editor` `root` |
| `<iswc-txt-view>` | `body` `empty` `root` |
| `<iswc-format>` | `value` |
| `<iswc-observer>` | `base` |
| `<iswc-offscreen-canvas>` | `canvas` |
| `<iswc-preview-component>` | `aside` `main` `page` `toc-drawer` `toc-toggle` |
| `<iswc-barcode-scanner>` | `hint` `preview` |
| `<iswc-media-recorder>` | `download` `preview` `status` |
| `<iswc-speech>` | `bar` `transcript` |
| `<iswc-theme-img>` | `image` |
| `<iswc-playground>` | `body` `config` `controls` `head` `lede` `root` `stage` `stage-wrap` `title` |

## ⚠️ Parts declarados pero NO documentados

Aparecen en `part="…"` / `exportparts="…"` del `.ts` pero el `.md` no los lista. Posibles causas: sección CSS Parts inexistente o incompleta, o partes internas que se filtran al exterior sin querer.

| Component | Parts faltantes en `.md` |
| --- | --- |
| `<iswc-button>` | `sr-status` |
| `<iswc-copy-button>` | `feedback` `feedback-body` |
| `<iswc-share-button>` | `button` |
| `<iswc-chart>` | `sr-status` |
| `<iswc-sparkline>` | `sr-status` |
| `<iswc-heatmap>` | `sr-status` |
| `<iswc-data-grid>` | `cell` `detail-panel` `header-cell` `row` |
| `<iswc-transfer>` | `sr-status` |
| `<iswc-palette-selector>` | `mark` |
| `<iswc-prefs-clear>` | `button` |
| `<iswc-tooltip>` | `base__arrow` `base__popup` |
| `<iswc-csv-edit>` | `add-row` `export` `root` `stage` `table` `toolbar` |
| `<iswc-csv-view>` | `empty` `root` `stage` `table` |
| `<iswc-docx-view>` | `body` `root` |
| `<iswc-file-edit>` | `error` `root` `stage` |
| `<iswc-file-view>` | `error` `root` `stage` |
| `<iswc-pptx-view>` | `root` `slide` `stage` |
| `<iswc-txt-edit>` | `editor` `root` |
| `<iswc-txt-view>` | `body` `empty` `root` |
| `<iswc-combobox>` | `option` |
| `<iswc-date-picker>` | `day` `week-number` |
| `<iswc-digital-clock>` | `option` |
| `<iswc-file-input>` | `file` `remove-button` |
| `<iswc-month-calendar>` | `month` |
| `<iswc-select>` | `check` `group` `group-label` `option` `option-description` `option-start` `tag` `tag-more` |
| `<iswc-slider>` | `mark` `mark-label` |
| `<iswc-time-clock>` | `number` |
| `<iswc-year-calendar>` | `year` |
| `<iswc-format>` | `value` |
| `<iswc-md-editor>` | `dialog-filename` `footer` `footer-discard` `footer-download` `footer-meta` `footer-save` `vars` `vars-label` `vars-list` |
| `<iswc-observer>` | `base` |
| `<iswc-offscreen-canvas>` | `canvas` |
| `<iswc-popover>` | `popup__arrow` `popup__hover-bridge` `popup__popup` |
| `<iswc-catalogo-gen>` | `pk-backdrop` `pk-modal` |
| `<iswc-preview-component>` | `aside` `main` `page` `toc-drawer` `toc-toggle` |
| `<iswc-barcode-scanner>` | `hint` `preview` |
| `<iswc-media-recorder>` | `download` `preview` `status` |
| `<iswc-speech>` | `bar` `transcript` |
| `<iswc-theme-img>` | `image` |
| `<iswc-video-playlist>` | `playlist-duration` `playlist-item` `playlist-thumbnail` `playlist-title` |
| `<iswc-command-palette>` | `keys` |
| `<iswc-window>` | `resizer` |
| `<iswc-playground>` | `body` `config` `controls` `head` `lede` `root` `stage` `stage-wrap` `title` |

## 🚫 Parts documentados pero NO declarados

El `.md` los promete pero el `.ts` no los expone. Son deuda: o se eliminan de la doc o se implementan.

| Component | Parts no expuestos |
| --- | --- |
| `<iswc-palette-selector>` | `caret` `label` `lead` |

## Tablas por componente: `Part | Descripción`

Para cada componente auditado, la tabla siguiente lista los parts declarados en `.ts`, su presencia/ausencia en `.md`, y la descripción (cuando existe) del `.md`.

Leyenda de la columna "Estado": ✅ documentado · ⚠️ declarado pero no documentado · 🚫 documentado pero no declarado · ❓ `.md` sin sección CSS parts.

### `<iswc-button-group>`

Archivo: `src/components/actions/button-group.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |

### `<iswc-button>`

Archivo: `src/components/actions/button.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `button` | Personalizable con `::part(button)`. | ✅ |
| `caret` | Personalizable con `::part(caret)`. | ✅ |
| `end` | Personalizable con `::part(end)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `spinner` | Personalizable con `::part(spinner)`. | ✅ |
| `sr-status` | — | ⚠️ declarado pero no documentado |
| `start` | Personalizable con `::part(start)`. | ✅ |

### `<iswc-check-icon-button>`

Archivo: `src/components/actions/check-icon-button.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `button` | Personalizable con `::part(button)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |

### `<iswc-context-menu>`

Archivo: `src/components/actions/context-menu.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `items` | Personalizable con `::part(items)`. | ✅ |
| `panel` | Personalizable con `::part(panel)`. | ✅ |

### `<iswc-copy-button>`

Archivo: `src/components/actions/copy-button.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `button` | Personalizable con `::part(button)`. | ✅ |
| `copy-icon` | Personalizable con `::part(copy-icon)`. | ✅ |
| `error-icon` | Personalizable con `::part(error-icon)`. | ✅ |
| `feedback` | — | ⚠️ declarado pero no documentado |
| `feedback-body` | — | ⚠️ declarado pero no documentado |
| `success-icon` | Personalizable con `::part(success-icon)`. | ✅ |

### `<iswc-dropdown-item>`

Archivo: `src/components/actions/dropdown-item.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `checkmark` | Personalizable con `::part(checkmark)`. | ✅ |
| `details` | Personalizable con `::part(details)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `submenu` | Personalizable con `::part(submenu)`. | ✅ |
| `submenu-icon` | Personalizable con `::part(submenu-icon)`. | ✅ |

### `<iswc-dropdown>`

Archivo: `src/components/actions/dropdown.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `dialog` | Personalizable con `::part(dialog)`. | ✅ |
| `menu` | Personalizable con `::part(menu)`. | ✅ |
| `trigger-wrap` | Personalizable con `::part(trigger-wrap)`. | ✅ |

### `<iswc-fab>`

Archivo: `src/components/actions/fab.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |

### `<iswc-share-button>`

Archivo: `src/components/actions/share-button.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `button` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-speed-dial>`

Archivo: `src/components/actions/speed-dial.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `action` | Personalizable con `::part(action)` en `<iswc-speed-dial-action>`. | ✅ |
| `actions` | Personalizable con `::part(actions)`. | ✅ |
| `root` | Personalizable con `::part(root)`. | ✅ |
| `trigger` | Personalizable con `::part(trigger)`. | ✅ |

### `<iswc-chart>`

Archivo: `src/components/charts/chart.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `canvas` | Personalizable con `::part(canvas)`. | ✅ |
| `legend` | Personalizable con `::part(legend)`. | ✅ |
| `sr-status` | — | ⚠️ declarado pero no documentado |
| `tooltip` | Personalizable con `::part(tooltip)`. | ✅ |

### `<iswc-sparkline>`

Archivo: `src/components/charts/sparkline.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | Personalizable con `::part(canvas)`. | ✅ |
| `sparkline` | Personalizable con `::part(sparkline)`. | ✅ |
| `sr-status` | — | ⚠️ declarado pero no documentado |

### `<iswc-treemap>`

Archivo: `src/components/charts/treemap.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `canvas` | Personalizable con `::part(canvas)`. | ✅ |
| `tooltip` | Personalizable con `::part(tooltip)`. | ✅ |

### `<iswc-code>`

Archivo: `src/components/code/code.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `editor` | Host del editor (`.editor-host`). | ✅ |
| `root` | Contenedor. | ✅ |
| `seed` | `<textarea>` semilla (oculto). | ✅ |
| `tooltip` | `<iswc-tooltip>` de documentación. | ✅ |

### `<iswc-heatmap>`

Archivo: `src/components/data-viz/heatmap.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | El `<svg>` donde se dibuja la matriz (`role="img"`). | ✅ |
| `legend` | Caja de la leyenda; queda con `hidden` cuando no hay espacio o `legend-position="none"`. | ✅ |
| `root` | Contenedor grid que reparte lienzo y leyenda. | ✅ |
| `sr-status` | — | ⚠️ declarado pero no documentado |

### `<iswc-maps>`

Archivo: `src/components/data-viz/maps.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | Área del mapa (28rem de alto) que contiene el `<svg>` o el `<iframe>`. | ✅ |
| `root` | Caja exterior con borde, radio y fondo elevado. | ✅ |

### `<iswc-ag-grid>`

Archivo: `src/components/data/ag-grid.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `body` | Cuerpo de filas. | ✅ |
| `count` | Contador de filas del pie. | ✅ |
| `footer` | Pie del grid. | ✅ |
| `group-header` | Cabecera de grupos. | ✅ |
| `group-panel` | Zona de agrupación por columnas. | ✅ |
| `header` | Fila de encabezados. | ✅ |
| `root` | Contenedor; lleva `data-density`. | ✅ |
| `sidebar` | Panel lateral. | ✅ |
| `tool-panel` | Contenido del panel lateral. | ✅ |
| `toolbar` | Barra superior (`role="toolbar"`). | ✅ |
| `viewport` | Área desplazable (`role="grid"`). | ✅ |

### `<iswc-data-grid>`

Archivo: `src/components/data/data-grid.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `aggregation-row` | Personalizable con `::part(aggregation-row)`. | ✅ |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `body` | Personalizable con `::part(body)`. | ✅ |
| `cell` | — | ⚠️ declarado pero no documentado |
| `column-groups` | Personalizable con `::part(column-groups)`. | ✅ |
| `detail-panel` | — | ⚠️ declarado pero no documentado |
| `footer` | Personalizable con `::part(footer)`. | ✅ |
| `header` | Personalizable con `::part(header)`. | ✅ |
| `header-cell` | — | ⚠️ declarado pero no documentado |
| `header-filters` | Personalizable con `::part(header-filters)`. | ✅ |
| `header-row` | Personalizable con `::part(header-row)`. | ✅ |
| `overlay` | Personalizable con `::part(overlay)`. | ✅ |
| `pagination` | Personalizable con `::part(pagination)`. | ✅ |
| `pinned-bottom` | Personalizable con `::part(pinned-bottom)`. | ✅ |
| `pinned-top` | Personalizable con `::part(pinned-top)`. | ✅ |
| `quick-filter` | Personalizable con `::part(quick-filter)`. | ✅ |
| `row` | — | ⚠️ declarado pero no documentado |
| `toolbar` | Personalizable con `::part(toolbar)`. | ✅ |
| `toolbar-button` | Personalizable con `::part(toolbar-button)`. | ✅ |
| `viewport` | Personalizable con `::part(viewport)`. | ✅ |

### `<iswc-gauge>`

Archivo: `src/components/data/gauge.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `content` | Personalizable con `::part(content)`. | ✅ |
| `fill` | Personalizable con `::part(fill)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `svg` | Personalizable con `::part(svg)`. | ✅ |
| `track` | Personalizable con `::part(track)`. | ✅ |
| `value` | Personalizable con `::part(value)`. | ✅ |

### `<iswc-kanban>`

Archivo: `src/components/data/kanban.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `actions` | Personalizable con `::part(actions)`. | ✅ |
| `badge` | Personalizable con `::part(badge)`. | ✅ |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `card` | Personalizable con `::part(card)`. | ✅ |
| `col-foot` | Personalizable con `::part(col-foot)`. | ✅ |
| `col-head` | Personalizable con `::part(col-head)`. | ✅ |
| `column` | Personalizable con `::part(column)`. | ✅ |
| `cover` | Personalizable con `::part(cover)`. | ✅ |
| `footer` | Personalizable con `::part(footer)`. | ✅ |
| `head` | Personalizable con `::part(head)`. | ✅ |
| `heading` | Personalizable con `::part(heading)`. | ✅ |
| `lane` | Personalizable con `::part(lane)`. | ✅ |
| `meta` | Personalizable con `::part(meta)`. | ✅ |
| `tag` | Personalizable con `::part(tag)`. | ✅ |
| `title` | Personalizable con `::part(title)`. | ✅ |

### `<iswc-pivot-table>`

Archivo: `src/components/data/pivot-table.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `root` | Contenedor con scroll, borde, radio y `max-height: 60vh`. Ajusta aquí la altura o quita el borde. | ✅ |
| `table` | El `<table>` de la pivote. Útil para cambiar `font-size` o `border-collapse`. | ✅ |

### `<iswc-spreadsheet>`

Archivo: `src/components/data/spreadsheet.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `grid` | El `<table>` de la rejilla. Sirve para cambiar `font-size` o `table-layout`. | ✅ |
| `root` | Contenedor con scroll, borde, radio y `max-height: 70vh`. Ajusta aquí el alto visible. | ✅ |

### `<iswc-stat>`

Archivo: `src/components/data/stat.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `foot` | Personalizable con `::part(foot)`. | ✅ |
| `head` | Personalizable con `::part(head)`. | ✅ |
| `helper` | Personalizable con `::part(helper)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `trend` | Personalizable con `::part(trend)`. | ✅ |
| `value` | Personalizable con `::part(value)`. | ✅ |

### `<iswc-transfer>`

Archivo: `src/components/data/transfer.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `controls` | Personalizable con `::part(controls)`. | ✅ |
| `count` | Personalizable con `::part(count)`. | ✅ |
| `item` | Personalizable con `::part(item)`. | ✅ |
| `list` | Personalizable con `::part(list)`. | ✅ |
| `pane` | Personalizable con `::part(pane)`. | ✅ |
| `pane-head` | Personalizable con `::part(pane-head)`. | ✅ |
| `search` | Personalizable con `::part(search)`. | ✅ |
| `sr-status` | — | ⚠️ declarado pero no documentado |
| `title` | Personalizable con `::part(title)`. | ✅ |

### `<iswc-lightbox>`

Archivo: `src/components/diagrams/lightbox.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `code-panel` | Personalizable con `::part(code-panel)`. | ✅ |
| `dialog` | Personalizable con `::part(dialog)`. | ✅ |
| `host` | Personalizable con `::part(host)`. | ✅ |
| `stage` | Personalizable con `::part(stage)`. | ✅ |
| `toast` | Personalizable con `::part(toast)`. | ✅ |
| `toolbar` | Personalizable con `::part(toolbar)`. | ✅ |
| `toolbar__lead` | Personalizable con `::part(toolbar__lead)`. | ✅ |
| `toolbar__trail` | Personalizable con `::part(toolbar__trail)`. | ✅ |

### `<iswc-org-chart>`

Archivo: `src/components/diagrams/org-chart.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | SVG del diagrama. | ✅ |
| `root` | Contenedor. | ✅ |
| `tooltip` | Panel de detalle del nodo. | ✅ |

### `<iswc-badge>`

Archivo: `src/components/feedback/badge.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `badge` | Personalizable con `::part(badge)`. | ✅ |
| `end` | Personalizable con `::part(end)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `start` | Personalizable con `::part(start)`. | ✅ |

### `<iswc-confirm-modal>`

Archivo: `src/components/feedback/confirm-modal.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `actions` | La fila de botones. | ✅ |
| `backdrop` | El fondo oscurecido a pantalla completa. | ✅ |
| `base` | La caja del modal. | ✅ |
| `heading` | El título. | ✅ |
| `message` | El bloque de texto. | ✅ |

### `<iswc-palette-selector>`

Archivo: `src/components/feedback/palette-selector.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `caret` | Personalizable con `::part(caret)`. | 🚫 documentado pero no declarado |
| `label` | Personalizable con `::part(label)`. | 🚫 documentado pero no declarado |
| `lead` | Personalizable con `::part(lead)`. | 🚫 documentado pero no declarado |
| `mark` | — | ⚠️ declarado pero no documentado |
| `menu` | Personalizable con `::part(menu)`. | ✅ |
| `option` | Personalizable con `::part(option)`. | ✅ |
| `trigger` | Personalizable con `::part(trigger)`. | ✅ |

### `<iswc-popconfirm>`

Archivo: `src/components/feedback/popconfirm.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `actions` | Personalizable con `::part(actions)`. | ✅ |
| `arrow` | Personalizable con `::part(arrow)`. | ✅ |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `message` | Personalizable con `::part(message)`. | ✅ |

### `<iswc-prefs-clear>`

Archivo: `src/components/feedback/prefs-clear.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `button` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-progress-bar>`

Archivo: `src/components/feedback/progress-bar.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `indicator` | Personalizable con `::part(indicator)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `progress-bar` | Personalizable con `::part(progress-bar)`. | ✅ |

### `<iswc-progress-ring>`

Archivo: `src/components/feedback/progress-ring.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `indicator` | Personalizable con `::part(indicator)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `progress-ring` | Personalizable con `::part(progress-ring)`. | ✅ |
| `track` | Personalizable con `::part(track)`. | ✅ |

### `<iswc-skeleton>`

Archivo: `src/components/feedback/skeleton.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `indicator` | Personalizable con `::part(indicator)`. | ✅ |

### `<iswc-spinner>`

Archivo: `src/components/feedback/spinner.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `spinner` | Personalizable con `::part(spinner)`. | ✅ |

### `<iswc-tag>`

Archivo: `src/components/feedback/tag.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `end` | Personalizable con `::part(end)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `remove-button` | Personalizable con `::part(remove-button)`. | ✅ |
| `start` | Personalizable con `::part(start)`. | ✅ |
| `tag` | Personalizable con `::part(tag)`. | ✅ |

### `<iswc-theme-toggle>`

Archivo: `src/components/feedback/theme-toggle.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `button` | Personalizable con `::part(button)`. | ✅ |

### `<iswc-toast-item>`

Archivo: `src/components/feedback/toast-item.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `caption` | Personalizable con `::part(caption)`. | ✅ |
| `close-button` | Personalizable con `::part(close-button)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |
| `message` | Personalizable con `::part(message)`. | ✅ |
| `progress` | Personalizable con `::part(progress)`. | ✅ |
| `title` | Personalizable con `::part(title)`. | ✅ |

### `<iswc-toast>`

Archivo: `src/components/feedback/toast.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `stack` | Personalizable con `::part(stack)`. | ✅ |

### `<iswc-tooltip>`

Archivo: `src/components/feedback/tooltip.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `base__arrow` | — | ⚠️ declarado pero no documentado |
| `base__popup` | — | ⚠️ declarado pero no documentado |
| `body` | Personalizable con `::part(body)`. | ✅ |
| `tooltip` | Personalizable con `::part(tooltip)`. | ✅ |

### `<iswc-csv-edit>`

Archivo: `src/components/files/csv-edit.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `add-row` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `export` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `stage` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `table` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `toolbar` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-csv-view>`

Archivo: `src/components/files/csv-view.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `empty` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `stage` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `table` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-docx-view>`

Archivo: `src/components/files/docx-view.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `body` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-file-edit>`

Archivo: `src/components/files/file-edit.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `error` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `stage` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-file-view>`

Archivo: `src/components/files/file-view.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `error` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `stage` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-pptx-view>`

Archivo: `src/components/files/pptx-view.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `slide` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `stage` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-txt-edit>`

Archivo: `src/components/files/txt-edit.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `editor` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-txt-view>`

Archivo: `src/components/files/txt-view.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `body` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `empty` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-checkbox>`

Archivo: `src/components/forms/checkbox.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `control` | Personalizable con `::part(control)`. | ✅ |
| `form-control` | Personalizable con `::part(form-control)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `mark` | Personalizable con `::part(mark)`. | ✅ |

### `<iswc-color-picker>`

Archivo: `src/components/forms/color-picker.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `dialog` | Personalizable con `::part(dialog)`. | ✅ |
| `eyedropper` | Botón EyeDropper (oculto si la API no existe). | ✅ |
| `hex-input` | Personalizable con `::part(hex-input)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `input` | Personalizable con `::part(input)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `panel` | Personalizable con `::part(panel)`. | ✅ |
| `swatch` | Personalizable con `::part(swatch)`. | ✅ |
| `trigger` | Personalizable con `::part(trigger)`. | ✅ |

### `<iswc-combobox>`

Archivo: `src/components/forms/combobox.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `clear` | Personalizable con `::part(clear)`. | ✅ |
| `dialog` | Personalizable con `::part(dialog)`. | ✅ |
| `form-control` | Personalizable con `::part(form-control)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `input` | Personalizable con `::part(input)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `listbox` | Personalizable con `::part(listbox)`. | ✅ |
| `option` | — | ⚠️ declarado pero no documentado |
| `trigger` | Personalizable con `::part(trigger)`. | ✅ |

### `<iswc-date-picker>`

Archivo: `src/components/forms/date-picker.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `day` | — | ⚠️ declarado pero no documentado |
| `grid` | Personalizable con `::part(grid)`. | ✅ |
| `month-label` | Personalizable con `::part(month-label)`. | ✅ |
| `month-select` | Personalizable con `::part(month-select)`. | ✅ |
| `month-view` | Personalizable con `::part(month-view)`. | ✅ |
| `nav` | Personalizable con `::part(nav)`. | ✅ |
| `week-number` | — | ⚠️ declarado pero no documentado |
| `weekdays` | Personalizable con `::part(weekdays)`. | ✅ |
| `year-select` | Personalizable con `::part(year-select)`. | ✅ |
| `year-view` | Personalizable con `::part(year-view)`. | ✅ |

### `<iswc-date-range-picker>`

Archivo: `src/components/forms/date-range-picker.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `calendars` | Personalizable con `::part(calendars)`. | ✅ |
| `shortcuts` | Personalizable con `::part(shortcuts)`. | ✅ |

### `<iswc-digital-clock>`

Archivo: `src/components/forms/digital-clock.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `option` | — | ⚠️ declarado pero no documentado |

### `<iswc-doc-editor>`

Archivo: `src/components/forms/doc-editor.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `blocks` | Columna flex que contiene todos los bloques. | ✅ |
| `menu` | Popover del menú de tipos que abre `/`. | ✅ |
| `root` | Contenedor externo con borde, fondo y `min-height: 14rem`. | ✅ |

### `<iswc-dropzone>`

Archivo: `src/components/forms/dropzone.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `queue` | `<ol>` con las filas de archivos. | ✅ |
| `root` | Contenedor flex vertical con la zona y la cola. | ✅ |
| `zone` | Área punteada de drop (`tabindex="0"`, foco visible). | ✅ |

### `<iswc-duration-picker>`

Archivo: `src/components/forms/duration-picker.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `hours` | Casilla de horas. | ✅ |
| `minutes` | Casilla de minutos. | ✅ |
| `root` | Contenedor del control. | ✅ |
| `seconds` | Casilla de segundos. | ✅ |

### `<iswc-file-input>`

Archivo: `src/components/forms/file-input.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `dropzone` | Personalizable con `::part(dropzone)`. | ✅ |
| `file` | — | ⚠️ declarado pero no documentado |
| `file-list` | Personalizable con `::part(file-list)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `input` | Personalizable con `::part(input)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `remove-button` | — | ⚠️ declarado pero no documentado |

### `<iswc-full-calendar>`

Archivo: `src/components/forms/full-calendar.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `grid` | Rejilla de la vista activa. | ✅ |
| `root` | Contenedor. | ✅ |
| `toolbar` | Barra de navegación y selector de vista. | ✅ |

### `<iswc-inline-edit>`

Archivo: `src/components/forms/inline-edit.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `display` | Bloque de lectura. | ✅ |
| `editor` | `input` o `textarea` interno. | ✅ |
| `editor-wrap` | Contenedor del editor. | ✅ |
| `root` | Contenedor. | ✅ |

### `<iswc-input>`

Archivo: `src/components/forms/input.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `clear` | Personalizable con `::part(clear)`. | ✅ |
| `count` | Personalizable con `::part(count)`. | ✅ |
| `end` | Personalizable con `::part(end)`. | ✅ |
| `error-text` | Personalizable con `::part(error-text)`. | ✅ |
| `form-control` | Personalizable con `::part(form-control)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `input` | Personalizable con `::part(input)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `prefix` | Personalizable con `::part(prefix)`. | ✅ |
| `start` | Personalizable con `::part(start)`. | ✅ |
| `suffix` | Personalizable con `::part(suffix)`. | ✅ |
| `support` | Personalizable con `::part(support)`. | ✅ |
| `toggle` | Personalizable con `::part(toggle)`. | ✅ |

### `<iswc-masked-input>`

Archivo: `src/components/forms/masked-input.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `field` | Contenedor del campo. | ✅ |
| `input` | Input interno. | ✅ |

### `<iswc-mention>`

Archivo: `src/components/forms/mention.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `input` | Input interno. | ✅ |
| `popup` | Panel de sugerencias. | ✅ |
| `root` | Contenedor. | ✅ |

### `<iswc-month-calendar>`

Archivo: `src/components/forms/month-calendar.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `month` | — | ⚠️ declarado pero no documentado |

### `<iswc-option>`

Archivo: `src/components/forms/option.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `description` | Personalizable con `::part(description)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `start` | Personalizable con `::part(start)`. | ✅ |

### `<iswc-pin-input>`

Archivo: `src/components/forms/pin-input.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `cells` | Personalizable con `::part(cells)`. | ✅ |

### `<iswc-radio-group>`

Archivo: `src/components/forms/radio-group.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `error-text` | Personalizable con `::part(error-text)`. | ✅ |
| `form-control` | Personalizable con `::part(form-control)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |

### `<iswc-radio>`

Archivo: `src/components/forms/radio.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `control` | Personalizable con `::part(control)`. | ✅ |
| `description` | Personalizable con `::part(description)`. | ✅ |
| `dot` | Personalizable con `::part(dot)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `text` | Personalizable con `::part(text)`. | ✅ |

### `<iswc-rating>`

Archivo: `src/components/forms/rating.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `form-control` | Personalizable con `::part(form-control)`. | ✅ |
| `hover-label` | Personalizable con `::part(hover-label)`. | ✅ |
| `icon-empty` | Personalizable con `::part(icon-empty)`. | ✅ |
| `icon-filled` | Personalizable con `::part(icon-filled)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `star` | Personalizable con `::part(star)`. | ✅ |

### `<iswc-rte>`

Archivo: `src/components/forms/rte.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `content` | Área editable WYSIWYG. | ✅ |
| `placeholder` | Texto de ayuda. | ✅ |
| `root` | Contenedor. | ✅ |
| `source` | `textarea` del modo código fuente. | ✅ |
| `toolbar` | Barra de botones. | ✅ |

### `<iswc-select>`

Archivo: `src/components/forms/select.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `check` | — | ⚠️ declarado pero no documentado |
| `clear` | Personalizable con `::part(clear)`. | ✅ |
| `dialog` | Personalizable con `::part(dialog)`. | ✅ |
| `error-text` | Personalizable con `::part(error-text)`. | ✅ |
| `group` | — | ⚠️ declarado pero no documentado |
| `group-label` | — | ⚠️ declarado pero no documentado |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `listbox` | Personalizable con `::part(listbox)`. | ✅ |
| `option` | — | ⚠️ declarado pero no documentado |
| `option-description` | — | ⚠️ declarado pero no documentado |
| `option-start` | — | ⚠️ declarado pero no documentado |
| `tag` | — | ⚠️ declarado pero no documentado |
| `tag-more` | — | ⚠️ declarado pero no documentado |
| `trigger` | Personalizable con `::part(trigger)`. | ✅ |

### `<iswc-signature>`

Archivo: `src/components/forms/signature.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | Canvas de dibujo. | ✅ |
| `hint` | Texto de ayuda mientras está vacío. | ✅ |
| `root` | Contenedor. | ✅ |

### `<iswc-slider>`

Archivo: `src/components/forms/slider.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `form-control` | Personalizable con `::part(form-control)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `mark` | — | ⚠️ declarado pero no documentado |
| `mark-label` | — | ⚠️ declarado pero no documentado |
| `rail` | Personalizable con `::part(rail)`. | ✅ |
| `thumb` | Personalizable con `::part(thumb)`. | ✅ |
| `track` | Personalizable con `::part(track)`. | ✅ |
| `value-label` | Personalizable con `::part(value-label)`. | ✅ |

### `<iswc-switch>`

Archivo: `src/components/forms/switch.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `control` | Personalizable con `::part(control)`. | ✅ |
| `form-control` | Personalizable con `::part(form-control)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `mark` | Personalizable con `::part(mark)`. | ✅ |
| `thumb` | Personalizable con `::part(thumb)`. | ✅ |
| `track-label` | Personalizable con `::part(track-label)`. | ✅ |

### `<iswc-textarea>`

Archivo: `src/components/forms/textarea.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `count` | Personalizable con `::part(count)`. | ✅ |
| `error-text` | Personalizable con `::part(error-text)`. | ✅ |
| `form-control` | Personalizable con `::part(form-control)`. | ✅ |
| `hint` | Personalizable con `::part(hint)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `support` | Personalizable con `::part(support)`. | ✅ |
| `textarea` | Personalizable con `::part(textarea)`. | ✅ |

### `<iswc-time-clock>`

Archivo: `src/components/forms/time-clock.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `clock` | Personalizable con `::part(clock)`. | ✅ |
| `hand` | Personalizable con `::part(hand)`. | ✅ |
| `header` | Personalizable con `::part(header)`. | ✅ |
| `hours` | Personalizable con `::part(hours)`. | ✅ |
| `minutes` | Personalizable con `::part(minutes)`. | ✅ |
| `number` | — | ⚠️ declarado pero no documentado |
| `seconds` | Personalizable con `::part(seconds)`. | ✅ |

### `<iswc-year-calendar>`

Archivo: `src/components/forms/year-calendar.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `year` | — | ⚠️ declarado pero no documentado |

### `<iswc-floating>`

Archivo: `src/components/helpers/floating.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `anchor` | Slot del ancla. | ✅ |
| `arrow` | Flecha. | ✅ |
| `base` | Contenedor. | ✅ |
| `hover-bridge` | Puente de hover. | ✅ |
| `popup` | Panel flotante. | ✅ |

### `<iswc-format-bytes>`

Archivo: `src/components/helpers/format-bytes.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `bytes` | Personalizable con `::part(bytes)`. | ✅ |

### `<iswc-format-date>`

Archivo: `src/components/helpers/format-date.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `date` | Personalizable con `::part(date)`. | ✅ |

### `<iswc-format-number>`

Archivo: `src/components/helpers/format-number.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `number` | Personalizable con `::part(number)`. | ✅ |

### `<iswc-format>`

Archivo: `src/components/helpers/format.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `value` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-md-editor>`

Archivo: `src/components/helpers/md-editor.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `copy` | `<iswc-copy-button>` de la vista previa. | ✅ |
| `dialog` | El `<iswc-dialog>` interno. | ✅ |
| `dialog-filename` | — | ⚠️ declarado pero no documentado |
| `dialog-label` | Título del diálogo. | ✅ |
| `footer` | — | ⚠️ declarado pero no documentado |
| `footer-discard` | — | ⚠️ declarado pero no documentado |
| `footer-download` | — | ⚠️ declarado pero no documentado |
| `footer-meta` | — | ⚠️ declarado pero no documentado |
| `footer-save` | — | ⚠️ declarado pero no documentado |
| `plain` | `<textarea>` del modo texto plano. | ✅ |
| `plain-switch` | Switch «Texto plano». | ✅ |
| `preview` | Contenedor de la vista previa (clic para abrir). | ✅ |
| `preview-body` | Contenido renderizado (markdown + HTML + chips). | ✅ |
| `preview-empty` | Texto de estado vacío. | ✅ |
| `surface` | Superficie editable/preview dentro del diálogo. | ✅ |
| `toolbar` | Barra de formato (solo si `can-edit`). | ✅ |
| `toolbar-button` | Cada botón de la toolbar. | ✅ |
| `vars` | — | ⚠️ declarado pero no documentado |
| `vars-label` | — | ⚠️ declarado pero no documentado |
| `vars-list` | — | ⚠️ declarado pero no documentado |

### `<iswc-md-render>`

Archivo: `src/components/helpers/md-render.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `body` | Contenedor renderizado / editable. | ✅ |
| `empty` | Placeholder vacío. | ✅ |

### `<iswc-observer>`

Archivo: `src/components/helpers/observer.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-offscreen-canvas>`

Archivo: `src/components/helpers/offscreen-canvas.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-popover>`

Archivo: `src/components/helpers/popover.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `body` | Personalizable con `::part(body)`. | ✅ |
| `dialog` | Personalizable con `::part(dialog)`. | ✅ |
| `popup` | Personalizable con `::part(popup)`. | ✅ |
| `popup__arrow` | — | ⚠️ declarado pero no documentado |
| `popup__hover-bridge` | — | ⚠️ declarado pero no documentado |
| `popup__popup` | — | ⚠️ declarado pero no documentado |

### `<iswc-relative-time>`

Archivo: `src/components/helpers/relative-time.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `time` | Personalizable con `::part(time)`. | ✅ |

### `<iswc-accordion-group>`

Archivo: `src/components/isp/accordion-group.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |

### `<iswc-block-layout>`

Archivo: `src/components/isp/block-layout.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `content` | El `<slot>` del contenido. | ✅ |

### `<iswc-btn-ref>`

Archivo: `src/components/isp/btn-ref.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Contenedor del campo. | ✅ |
| `label-text` | Etiqueta resuelta bajo el valor. | ✅ |
| `open` | Botón filtro que abre el modal. | ✅ |

### `<iswc-catalogo-gen>`

Archivo: `src/components/isp/catalogo-gen.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `drawer` | Drawer de ficha. | ✅ |
| `grid-wrap` | Contenedor de la grilla. | ✅ |
| `pk-backdrop` | — | ⚠️ declarado pero no documentado |
| `pk-modal` | — | ⚠️ declarado pero no documentado |
| `root` | Contenedor. | ✅ |
| `toolbar` | Barra de acciones. | ✅ |

### `<iswc-confirm-delete>`

Archivo: `src/components/isp/confirm-delete.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `actions` | Personalizable con `::part(actions)`. | ✅ |
| `backdrop` | Personalizable con `::part(backdrop)`. | ✅ |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `fields` | Personalizable con `::part(fields)`. | ✅ |
| `heading` | Personalizable con `::part(heading)`. | ✅ |
| `message` | Personalizable con `::part(message)`. | ✅ |

### `<iswc-flex-layout>`

Archivo: `src/components/isp/flex-layout.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `content` | El `<slot>` de los ítems. | ✅ |

### `<iswc-flex-options>`

Archivo: `src/components/isp/flex-options.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `toolbar` | Fila de acciones. | ✅ |

### `<iswc-float-card>`

Archivo: `src/components/isp/float-card.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `panel` | Caja absoluta del slot `float`. | ✅ |
| `wrap` | Contenedor relativo. | ✅ |

### `<iswc-form>`

Archivo: `src/components/isp/form.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `buttons` | Contenedor de los botones de acción. | ✅ |
| `content` | Cuerpo. | ✅ |
| `footer` | Pie. | ✅ |
| `form` | Elemento `<form>` interno (`novalidate`). | ✅ |
| `header` | Cabecera. | ✅ |

### `<iswc-grid-layout>`

Archivo: `src/components/isp/grid-layout.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `content` | El `<slot>` de las celdas. | ✅ |

### `<iswc-heading>`

Archivo: `src/components/isp/heading.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `heading` | El elemento `<hN>`; personalizable con `::part(heading)`. | ✅ |

### `<iswc-loading-overlay>`

Archivo: `src/components/isp/loading-overlay.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `backdrop` | Personalizable con `::part(backdrop)`. | ✅ |
| `indicator` | Personalizable con `::part(indicator)`. | ✅ |
| `message` | Personalizable con `::part(message)`. | ✅ |
| `panel` | Personalizable con `::part(panel)`. | ✅ |

### `<iswc-modal-verificacion>`

Archivo: `src/components/isp/modal-verificacion.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `actions` | Personalizable con `::part(actions)`. | ✅ |
| `backdrop` | Personalizable con `::part(backdrop)`. | ✅ |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `heading` | Personalizable con `::part(heading)`. | ✅ |
| `results` | Personalizable con `::part(results)`. | ✅ |
| `stats` | Personalizable con `::part(stats)`. | ✅ |

### `<iswc-text>`

Archivo: `src/components/isp/text.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `content` | El `<slot>` del texto. | ✅ |

### `<iswc-tree-view>`

Archivo: `src/components/isp/tree-view.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `body` | Lista scrollable. | ✅ |
| `drawer` | Ficha lateral. | ✅ |
| `root` | Host interno `.isp-tree`. | ✅ |
| `toolbar` | Barra superior. | ✅ |

### `<iswc-callout>`

Archivo: `src/components/layout/callout.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |
| `message` | Personalizable con `::part(message)`. | ✅ |

### `<iswc-card>`

Archivo: `src/components/layout/card.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `actions` | Personalizable con `::part(actions)`. | ✅ |
| `body` | Personalizable con `::part(body)`. | ✅ |
| `footer` | Personalizable con `::part(footer)`. | ✅ |
| `header` | Personalizable con `::part(header)`. | ✅ |
| `media` | Personalizable con `::part(media)`. | ✅ |

### `<iswc-details>`

Archivo: `src/components/layout/details.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `content` | Personalizable con `::part(content)`. | ✅ |
| `header` | Personalizable con `::part(header)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |
| `summary` | Personalizable con `::part(summary)`. | ✅ |

### `<iswc-dialog>`

Archivo: `src/components/layout/dialog.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `backdrop` | Personalizable con `::part(backdrop)`. | ✅ |
| `body` | Personalizable con `::part(body)`. | ✅ |
| `close-button` | Personalizable con `::part(close-button)`. | ✅ |
| `dialog` | Personalizable con `::part(dialog)`. | ✅ |
| `footer` | Personalizable con `::part(footer)`. | ✅ |
| `header` | Personalizable con `::part(header)`. | ✅ |
| `header-actions` | Personalizable con `::part(header-actions)`. | ✅ |
| `title` | Personalizable con `::part(title)`. | ✅ |

### `<iswc-divider>`

Archivo: `src/components/layout/divider.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `divider` | Personalizable con `::part(divider)`. | ✅ |

### `<iswc-dock>`

Archivo: `src/components/layout/dock.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `item` | Ancla del ítem (`<iswc-dock-item>`). | ✅ |
| `label` | Etiqueta del ítem. | ✅ |
| `root` | Contenedor de la barra (`<iswc-dock>`). | ✅ |

### `<iswc-drawer>`

Archivo: `src/components/layout/drawer.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `backdrop` | Personalizable con `::part(backdrop)`. | ✅ |
| `body` | Personalizable con `::part(body)`. | ✅ |
| `close-button` | Personalizable con `::part(close-button)`. | ✅ |
| `drawer` | Personalizable con `::part(drawer)`. | ✅ |
| `footer` | Personalizable con `::part(footer)`. | ✅ |
| `header` | Personalizable con `::part(header)`. | ✅ |
| `header-actions` | Personalizable con `::part(header-actions)`. | ✅ |
| `title` | Personalizable con `::part(title)`. | ✅ |

### `<iswc-preview-component>`

Archivo: `src/components/layout/preview-component.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `aside` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `main` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `page` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `toc-drawer` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `toc-toggle` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-split-panel>`

Archivo: `src/components/layout/split-panel.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `divider` | Personalizable con `::part(divider)`. | ✅ |
| `end` | Personalizable con `::part(end)`. | ✅ |
| `panel` | Personalizable con `::part(panel)`. | ✅ |
| `start` | Personalizable con `::part(start)`. | ✅ |

### `<iswc-avatar>`

Archivo: `src/components/media/avatar.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `avatar` | Personalizable con `::part(avatar)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |
| `image` | Personalizable con `::part(image)`. | ✅ |
| `initials` | Personalizable con `::part(initials)`. | ✅ |

### `<iswc-barcode-scanner>`

Archivo: `src/components/media/barcode-scanner.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `hint` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `preview` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-barcode>`

Archivo: `src/components/media/barcode.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | El `<svg>` generado. | ✅ |
| `root` | Personalizable con `::part(root)`. | ✅ |
| `text` | Línea de texto bajo el código. | ✅ |

### `<iswc-icon>`

Archivo: `src/components/media/icon.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `icon` | Personalizable con `::part(icon)`. | ✅ |

### `<iswc-image-editor>`

Archivo: `src/components/media/image-editor.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | Lienzo del editor. | ✅ |
| `root` | Personalizable con `::part(root)`. | ✅ |
| `selection` | Rectángulo de recorte con sus manejadores. | ✅ |
| `status` | `<output>` con el estado actual. | ✅ |
| `toolbar` | Barra que aloja el slot `toolbar`. | ✅ |
| `viewport` | Área visible sobre la que se arrastra el recorte. | ✅ |

### `<iswc-media-recorder>`

Archivo: `src/components/media/media-recorder.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `download` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `preview` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `status` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-qrcode>`

Archivo: `src/components/media/qrcode.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `canvas` | Contenedor del `<svg>`. | ✅ |
| `root` | Personalizable con `::part(root)`. | ✅ |
| `status` | `<output>` con el estado de carga o el error. | ✅ |

### `<iswc-speech>`

Archivo: `src/components/media/speech.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `bar` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `transcript` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-theme-img>`

Archivo: `src/components/media/theme-img.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `image` | — | ⚠️ declarado · ❓ `.md` sin sección |

### `<iswc-video-playlist>`

Archivo: `src/components/media/video-playlist.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `channel` | Personalizable con `::part(channel)`. | ✅ |
| `header` | Personalizable con `::part(header)`. | ✅ |
| `header-actions` | Personalizable con `::part(header-actions)`. | ✅ |
| `mute-button` | Personalizable con `::part(mute-button)`. | ✅ |
| `play-button` | Personalizable con `::part(play-button)`. | ✅ |
| `player-toolbar` | Personalizable con `::part(player-toolbar)`. | ✅ |
| `playlist` | Personalizable con `::part(playlist)`. | ✅ |
| `playlist-duration` | — | ⚠️ declarado pero no documentado |
| `playlist-item` | — | ⚠️ declarado pero no documentado |
| `playlist-items` | Personalizable con `::part(playlist-items)`. | ✅ |
| `playlist-thumbnail` | — | ⚠️ declarado pero no documentado |
| `playlist-title` | — | ⚠️ declarado pero no documentado |
| `playlist-toggle` | Personalizable con `::part(playlist-toggle)`. | ✅ |
| `seek` | Personalizable con `::part(seek)`. | ✅ |
| `status` | Personalizable con `::part(status)`. | ✅ |
| `time` | Personalizable con `::part(time)`. | ✅ |
| `title` | Personalizable con `::part(title)`. | ✅ |
| `tools-left` | Personalizable con `::part(tools-left)`. | ✅ |
| `tools-right` | Personalizable con `::part(tools-right)`. | ✅ |
| `video-playlist` | Personalizable con `::part(video-playlist)`. | ✅ |
| `volume-slider` | Personalizable con `::part(volume-slider)`. | ✅ |

### `<iswc-video>`

Archivo: `src/components/media/video.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `big-play` | Personalizable con `::part(big-play)`. | ✅ |
| `controls` | Personalizable con `::part(controls)`. | ✅ |
| `fullscreen-button` | Personalizable con `::part(fullscreen-button)`. | ✅ |
| `mute-button` | Personalizable con `::part(mute-button)`. | ✅ |
| `pip-button` | Personalizable con `::part(pip-button)`. | ✅ |
| `play-button` | Personalizable con `::part(play-button)`. | ✅ |
| `progress` | Personalizable con `::part(progress)`. | ✅ |
| `seek` | Personalizable con `::part(seek)`. | ✅ |
| `settings-button` | Personalizable con `::part(settings-button)`. | ✅ |
| `time` | Personalizable con `::part(time)`. | ✅ |
| `video` | Personalizable con `::part(video)`. | ✅ |
| `volume` | Personalizable con `::part(volume)`. | ✅ |
| `volume-slider` | Personalizable con `::part(volume-slider)`. | ✅ |

### `<iswc-breadcrumb-item>`

Archivo: `src/components/navigation/breadcrumb-item.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `end` | Personalizable con `::part(end)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `separator` | Personalizable con `::part(separator)`. | ✅ |
| `start` | Personalizable con `::part(start)`. | ✅ |

### `<iswc-breadcrumb>`

Archivo: `src/components/navigation/breadcrumb.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `breadcrumb` | Personalizable con `::part(breadcrumb)`. | ✅ |

### `<iswc-carousel>`

Archivo: `src/components/navigation/carousel.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `controls` | Personalizable con `::part(controls)`. | ✅ |
| `indicators` | Personalizable con `::part(indicators)`. | ✅ |
| `track` | Personalizable con `::part(track)`. | ✅ |
| `viewport` | Personalizable con `::part(viewport)`. | ✅ |

### `<iswc-mega-menu>`

Archivo: `src/components/navigation/mega-menu.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `panel` | El `<dialog>` con las columnas. | ✅ |
| `root` | Contenedor relativo del trigger y el panel. | ✅ |
| `trigger` | El `<iswc-button>` que abre el menú. | ✅ |

### `<iswc-scroller>`

Archivo: `src/components/navigation/scroller.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `scroll-button` | Personalizable con `::part(scroll-button)`. | ✅ |
| `viewport` | Personalizable con `::part(viewport)`. | ✅ |

### `<iswc-stepper>`

Archivo: `src/components/navigation/stepper.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `description` | Personalizable con `::part(description)`. | ✅ |
| `indicator` | Personalizable con `::part(indicator)`. | ✅ |
| `label` | Personalizable con `::part(label)`. | ✅ |
| `line` | Personalizable con `::part(line)`. | ✅ |

### `<iswc-tab-group>`

Archivo: `src/components/navigation/tab-group.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `active-indicator` | Personalizable con `::part(active-indicator)`. | ✅ |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `body` | Personalizable con `::part(body)`. | ✅ |
| `close-button` | Personalizable con `::part(close-button)`. | ✅ |
| `end` | Personalizable con `::part(end)`. | ✅ |
| `nav` | Personalizable con `::part(nav)`. | ✅ |
| `scroll-button` | Personalizable con `::part(scroll-button)`. | ✅ |
| `scroll-button-end` | Personalizable con `::part(scroll-button-end)`. | ✅ |
| `scroll-button-start` | Personalizable con `::part(scroll-button-start)`. | ✅ |
| `start` | Personalizable con `::part(start)`. | ✅ |
| `tab-group` | Personalizable con `::part(tab-group)`. | ✅ |
| `tabs` | Personalizable con `::part(tabs)`. | ✅ |

### `<iswc-tree>`

Archivo: `src/components/navigation/tree.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `base` | Personalizable con `::part(base)`. | ✅ |
| `checkbox` | Personalizable con `::part(checkbox)`. | ✅ |
| `expand-toggle` | Personalizable con `::part(expand-toggle)`. | ✅ |
| `icon` | Personalizable con `::part(icon)`. | ✅ |
| `item` | Personalizable con `::part(item)`. | ✅ |
| `item-children` | Personalizable con `::part(item-children)`. | ✅ |
| `item-content` | Personalizable con `::part(item-content)`. | ✅ |
| `items` | Personalizable con `::part(items)`. | ✅ |

### `<iswc-command-palette>`

Archivo: `src/components/overlays/command-palette.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `dialog` | Personalizable con `::part(dialog)`. | ✅ |
| `empty` | Personalizable con `::part(empty)`. | ✅ |
| `footer` | Personalizable con `::part(footer)`. | ✅ |
| `input` | Personalizable con `::part(input)`. | ✅ |
| `keys` | — | ⚠️ declarado pero no documentado |
| `panel` | Personalizable con `::part(panel)`. | ✅ |
| `results` | Personalizable con `::part(results)`. | ✅ |
| `sr-status` | Region aria-live polite oculta visualmente. | ✅ |

### `<iswc-pdf-viewer>`

Archivo: `src/components/overlays/pdf-viewer.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `download` | Personalizable con `::part(download)`. | ✅ |
| `frame` | Personalizable con `::part(frame)`. | ✅ |
| `print` | Personalizable con `::part(print)`. | ✅ |
| `root` | Personalizable con `::part(root)`. | ✅ |
| `toolbar` | Personalizable con `::part(toolbar)`. | ✅ |

### `<iswc-window>`

Archivo: `src/components/overlays/window.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `body` | Personalizable con `::part(body)`. | ✅ |
| `header` | Personalizable con `::part(header)`. | ✅ |
| `resizer` | — | ⚠️ declarado pero no documentado |
| `root` | Personalizable con `::part(root)`. | ✅ |

### `<iswc-playground>`

Archivo: `src/components/preview/playground.ts`

| Part | Descripción | Estado |
| --- | --- | --- |
| `body` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `config` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `controls` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `head` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `lede` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `root` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `stage` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `stage-wrap` | — | ⚠️ declarado · ❓ `.md` sin sección |
| `title` | — | ⚠️ declarado · ❓ `.md` sin sección |

## ℹ️ Nota sobre `sr-status`

Varios componentes exponen un `sr-status` (región `aria-live` para anuncios a lectores de pantalla) pero no lo documentan:

- `<iswc-button>`
- `<iswc-chart>`
- `<iswc-sparkline>`
- `<iswc-heatmap>`
- `<iswc-transfer>`

Recomendación: documentar como `::part(sr-status)` consistente con el resto del repo.
