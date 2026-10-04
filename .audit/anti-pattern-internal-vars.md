# Audit: Anti-pattern "Internal CSS Variables Set From Props" — `is-webcomponents`

- **Phase:** I1 (zod migration, audit only)
- **Scope:** every component in `src/components/**/*.ts` (excluding `*.preview.ts` preview helpers and `*.*.selfcheck.ts` self-tests)
- **Brief reference:** `.superpowers/sdd/2026-10-03-zod-migration/phase-i-1-brief.md`
- **Working directory:** `C:\ContaPyme\Personal\apps\is-webcomponents`

---

## 1. Regla del usuario (resumen)

> **Anti-pattern:** un componente NO debe setear variables CSS internas
> (`--iswc-color-X`, `--iswc-button-X`, etc.) desde props (color, size, variant, etc.).
>
> **Patrón correcto:**
> - El componente acepta props semánticas (`color="brand"`, `size="md"`, etc.).
> - El consumer define el styling vía CSS class, inline style, o las props de color del componente.
> - Existe un **common helper** para todo lo relacionado (tema, paleta, etc.).

Por tanto, este audit trata como **anti-pattern** cualquier caso donde
un componente del kit asigna un `--iswc-*-X` o un `--_tone-*` interno en
el host (o un descendiente) desde el valor de una prop suya.

---

## 2. Metodología

1. Listado de fuentes: `src/components/**/*.ts` (excluyendo `*.preview.ts` y `*.selfcheck.ts`).
   Total: **410 archivos .ts** en `src/components/`; tras filtrar,
   **~110 componentes web** son auditables.
2. Patrones buscados dentro del código de cada componente:
   - `style.setProperty('--iswc-...')` (literal o por variable)
   - `host.style.setProperty('--iswc-...')` y `el.style.setProperty('--iswc-...')`
   - `style.setProperty('--_tone-...')` (variantes de `applyToneRamp`)
   - `style.setProperty('--mx-lns')` y similares (iswc‑escopados o no)
   - Mapa `static styleAttrs = { attr: '--iswc-...', ... }` (mecanismo común)
   - Llamadas a `syncIspColor(this, { colorVar: '--iswc-...' })`
3. Verificación caso por caso de cuál prop dispara el set y en qué línea/función.
4. Recolección por categoría (A explícito, B `styleAttrs`, C `syncIspColor`,
   D `applyToneRamp`).

---

## 3. Inventario de mecanismos que aplican el anti-pattern

| # | Mecanismo | Ubicación | Descripción |
|---|-----------|-----------|-------------|
| M1 | `static styleAttrs = { … }` (declaración) | 72 componentes + 1 factory (`_shared/picker-element.ts`) | Mapa estático `attr → '--iswc-X'`. `ElementBase` lo aplica en `connectedCallback` (`syncStyleAttrs`) y `attributeChangedCallback` (`syncStyleAttrs` por `{ [name]: map[name] }`). Implementado en `src/core/attrs.ts:61-86`. |
| M2 | `syncStyleAttr` / `syncStyleAttrs` | `src/core/attrs.ts:61-86` | Helper central que aplica el mapa. Elimina la var cuando el attr está ausente. Con `onlyColorValues: true` filtra valores que no parecen color CSS. |
| M3 | `style.setProperty('--iswc-…')` ad-hoc | 9 archivos | Set explícito desde el cuerpo de `#syncXxx()` / setter / `onAttributeChanged`. |
| M4 | `syncIspColor(this, { colorVar, mixVar, mixWithVar })` | `_shared/isp-color.ts:86-125`, usado por `isp/heading.ts`, `isp/text.ts` | Helper que toma `color`/`mix`/`mix-with` attrs y los vuelca a `--iswc-*-color/mix/mix-with`. |
| M5 | `applyToneRamp(el, color, { prefix })` | `src/core/attrs.ts:113-132`, usado por `actions/button.ts` | Cuando `color` es un literal CSS, deriva `--_tone`, `--_tone-stronger`, `--_tone-strongest`, `--_tone-paler`, `--_tone-pale`, `--_tone-text`, `--_tone-soft`, `--_tone-soft-active`, `--_tone-on`. (No usa `--iswc-` como prefijo por defecto, pero es el mismo anti-pattern conceptualmente.) |

---

## 4. Casos explícitos `style.setProperty('--iswc-…')` desde props

> Cada fila es un `(componente, prop, línea, var-set, fuente del valor)`.
> Las rutas son relativas a `C:\ContaPyme\Personal\apps\is-webcomponents\`.

| # | Componente | Archivo:Línea | Prop / origen | Variable seteada | Anti-pattern |
|---|-----------|---------------|--------------|------------------|--------------|
| 1 | `<iswc-button>` | `src/components/actions/button.ts:496` | `hue` (0–360) | `--iswc-button-selected-hue` | **Sí** — coord con `<iswc-button-group>`; pero sigue siendo prop→var interno. |
| 2 | `<iswc-button>` | `src/components/actions/button.ts:497` | `hue` | `--iswc-button-selected-color` (derivado `hsl(h, 70%, 45%)`) | **Sí**. |
| 3 | `<iswc-button>` | `src/components/actions/button.ts:179` (vía `applyToneRamp`) | `color` (solo si es literal CSS) | `--_tone`, `--_tone-stronger`, `--_tone-strongest`, `--_tone-paler`, `--_tone-pale`, `--_tone-text`, `--_tone-soft`, `--_tone-soft-active`, `--_tone-on` | **Sí** — ver §6-D. |
| 4 | `<iswc-code>` | `src/components/code/code.ts:210` | `min-height` (CSS length) | `--iswc-code-min-height` | **Sí** — además hay duplicado en `styleAttrs` (línea 116). |
| 5 | `<iswc-data-grid>` | `src/components/data/data-grid.ts:1241` | `row-height` (derivado de atributo) | `--iswc-grid-row-h` | **Sí** — el atributo ya está declarado también en `styleAttrs` (`height` y `padding`); esto es un duplicado paralelo. |
| 6 | `<iswc-data-grid>` | `src/components/data/data-grid.ts:1242` | `header-height` | `--iswc-grid-head-h` | **Sí** — duplicado paralelo al `styleAttrs`. |
| 7 | `<iswc-data-grid>` | `src/components/data/data-grid.ts:1290` | DOM `this.#head.offsetHeight` (no es prop pública, es medición) | `--iswc-grid-head-total` | **No estrictamente** (es un set interno desde DOM), pero sigue siendo un `--iswc-*` interno en host que el consumidor no controla. |
| 8 | `<iswc-date-picker>` | `src/components/forms/date-picker.ts:528` | `show-week-numbers` (semántica) | `--iswc-dp-cols` (`repeat(7, 1fr)` vs `2.2em repeat(7, 1fr)`) | **Sí**. |
| 9 | `<iswc-palette-selector>` | `src/components/feedback/palette-selector.ts:434-436` | `value` (paleta activa) — propaga el HSL de la paleta | `--iswc-brand-h`, `--iswc-brand-s`, `--iswc-brand-b` en el host | **Sí**. |
| 10 | `<iswc-palette-selector>` | `src/components/feedback/palette-selector.ts:438-441` | `value` (paleta activa) | `--iswc-logo-bg`, `--iswc-logo-fg` en el host | **Sí**. |
| 11 | `<iswc-palette-selector>` | `src/components/feedback/palette-selector.ts:473-477` | item de menú (`p.accent` desde JSON de paletas) | `--iswc-brand-h/s/b` y `--iswc-swatch` en cada `<li>` | **Sí** — además es descendiente, no host. |
| 12 | `<iswc-txt-edit>` | `src/components/files/txt-edit.ts:46-47` | `height` (setter) | `--iswc-file-height` | **Sí**. |
| 13 | `<iswc-txt-view>` | `src/components/files/txt-view.ts:37-38` | `height` (setter) | `--iswc-file-height` | **Sí**. |
| 14 | `<iswc-catalogo-gen>` | `src/components/isp/catalogo-gen.ts:401` | `q-rows-header` (qRowsHeader JS prop) | `--iswc-cat-rows` | **Sí**. |
| 15 | `<iswc-heading>` | `src/components/isp/heading.ts:67-83` (vía `syncIspColor`) | `color`, `mix`, `mix-with` | `--iswc-heading-color`, `--iswc-heading-mix`, `--iswc-heading-mix-with` | **Sí** — ver §6-C. |
| 16 | `<iswc-heading>` | `src/components/isp/heading.ts:80-82` | `size` (CSS length) | `--iswc-heading-size` | **Sí**. |
| 17 | `<iswc-text>` | `src/components/isp/text.ts:56-67` (vía `syncIspColor`) | `color`, `mix`, `mix-with` | `--iswc-text-color`, `--iswc-text-mix`, `--iswc-text-mix-with` | **Sí** — ver §6-C. |
| 18 | `<iswc-month-calendar>` | `src/components/forms/month-calendar.ts:94` | `columns` (número) | `--iswc-month-columns` | **Sí**. |
| 19 | `<iswc-year-calendar>` | `src/components/forms/year-calendar.ts:79` | `columns` (número) | `--iswc-year-columns` | **Sí**. |
| 20 | `<iswc-tooltip>` | `src/components/feedback/tooltip.ts:155` | (hard-coded, no prop) | `--iswc-tooltip-arrow-color` re‑escrito a `var(--iswc-tooltip-bg, #212529)` para sincronizar la flecha con el bg | **Borderline** — no viene de una prop sino de `palettes.css`/CSS global; es una duplicación defensiva que reescribe una var que ya existía. Anotar para revisión pero **no** es el anti-pattern del brief. |

> Nota: las filas 1–2 (`<iswc-button>` `hue`) están documentadas en `actions/button.ts:283-285` como mecanismo de coordinación padre‑hijo
> (`<iswc-button-group>` lee `--iswc-button-selected-hue` del botón seleccionado para pintar el highlight). El anti-pattern del brief dice
> "el componente asigna `--iswc-*-X` desde props"; el botón expone la prop `hue` como CSS var para que su padre la consuma. Sigue
> siendo set prop→var, así que cuenta como caso, pero la **recomendación** es diferente: probablemente deba seguir haciéndolo el grupo, no el botón.

---

## 5. Casos del mecanismo `static styleAttrs` (M1/M2)

> El `styleAttrs` es el "common helper" al que alude la regla, pero por la
> definición estricta del brief sigue siendo **el componente setea
> `--iswc-*-X` desde props**. Cada fila es un `(componente, attr → var)`.
> Esta tabla es larga porque es el patrón prevalente; **no** excluye
> ninguno de los archivos anteriores.

| # | Componente (host) | Archivo:Línea del mapa | Atributos mapeados → `--iswc-*-X` |
|---|--------------------|------------------------|------------------------------------|
| 1 | `<iswc-button-group>` | `src/components/actions/button-group.ts:44-50` | `radius→--iswc-button-group-radius`, `gap→--iswc-button-group-gap`, `padding→--iswc-button-group-pad`, `accent→--iswc-button-group-accent` (color), `border-width→--iswc-button-border-width` |
| 2 | `<iswc-button>` | `src/components/actions/button.ts:157-169` | `radius→--iswc-button-border-radius`, `border-width→--iswc-button-border-width`, `font-weight→--iswc-button-font-weight`, `font-family→--iswc-button-font-family`, `transition-duration→--iswc-button-transition-duration`, `color-hover→--_tone-stronger` (color), `color-active→--_tone-strongest` (color), `color-text→--_tone-on` (color) |
| 3 | `<iswc-copy-button>` | `src/components/actions/copy-button.ts:89-91` | `max-width→--iswc-copy-button-max-width` |
| 4 | `<iswc-dropdown-item>` | `src/components/actions/dropdown-item.ts:43-50` | `radius→--iswc-dropdown-item-radius`, `padding→--iswc-dropdown-item-padding`, `gap→--iswc-dropdown-item-gap`, `text-color→--iswc-dropdown-item-text` (color), `bg-hover→--iswc-dropdown-item-bg-hover` (color), `danger-color→--iswc-dropdown-item-danger` (color) |
| 5 | `<iswc-dropdown>` | `src/components/actions/dropdown.ts:49-52` | `show-duration→--iswc-dropdown-show-duration`, `hide-duration→--iswc-dropdown-hide-duration` |
| 6 | `<iswc-fab>` | `src/components/actions/fab.ts:68-71` | `size→--iswc-fab-size`, `shadow→--iswc-fab-shadow` |
| 7 | `<iswc-speed-dial>` | `src/components/actions/speed-dial.ts:77-79` | `radius→--iswc-speed-dial-radius` |
| 8 | `<iswc-chart>` | `src/components/charts/chart.ts:176-200` | `text-color→--chart-text`, `muted-color→--chart-muted`, `surface→--chart-surface`, `grid-color→--iswc-chart-grid-color`, `axis-color→--chart-axis-color`, `bar-radius→--chart-bar-radius`, `bar-gap→--chart-bar-gap`, `line-width→--chart-line-width`, `point-radius→--chart-point-radius`, `slice-gap→--chart-slice-gap`, `doughnut-ratio→--chart-doughnut-ratio`, `tick-size→--chart-tick-size`, `legend-size→--chart-legend-size`, `title-size→--chart-title-size`, `tooltip-size→--chart-tooltip-size`, `fill-1→--fill-color-1` … `fill-6→--fill-color-6` |
| 9 | `<iswc-sparkline>` | `src/components/charts/sparkline.ts:36-39` | `line-color→--line-color`, `line-width→--line-width` |
| 10 | `<iswc-code>` | `src/components/code/code.ts:111-117` | `radius→--iswc-code-radius`, `border-color→--iswc-code-border` (color), `bg→--iswc-code-bg` (color), `text-color→--iswc-code-fg` (color), `min-height→--iswc-code-min-height` |
| 11 | `<iswc-ag-grid>` | `src/components/data/ag-grid.ts:377-383` | `header-height→--iswc-grid-header-h`, `header-bg→--iswc-grid-header-bg` (color), `stripe-color→--iswc-grid-stripe` (color), `row-hover→--iswc-grid-row-hover` (color), `selected-color→--iswc-grid-selected` (color) |
| 12 | `<iswc-data-grid>` | `src/components/data/data-grid.ts:360-367` | `radius→--iswc-grid-radius`, `accent→--iswc-grid-accent` (color), `header-bg→--iswc-grid-header-bg` (color), `row-hover→--iswc-grid-row-hover` (color), `height→--iswc-grid-height`, `padding→--iswc-grid-pad` |
| 13 | `<iswc-gauge>` | `src/components/data/gauge.ts:45-47` | `track-color→--iswc-gauge-track-color` (color) |
| 14 | `<iswc-transfer>` | `src/components/data/transfer.ts:80-82` | `row-height→--iswc-transfer-row-height` |
| 15 | `<iswc-heatmap>` | `src/components/data-viz/heatmap.ts:53-56` | `text-color→--iswc-heatmap-text` (color), `grid-color→--iswc-heatmap-grid-color` (color) |
| 16 | `<iswc-maps>` | `src/components/data-viz/maps.ts:52-55` | `grid-color→--iswc-maps-grid-color` (color), `meridian-color→--iswc-maps-meridian-color` (color) |
| 17 | `<iswc-lightbox>` | `src/components/diagrams/lightbox.ts:90-96` | `bg→--iswc-lightbox-bg` (color), `text-color→--iswc-lightbox-text` (color), `border-color→--iswc-lightbox-border` (color), `backdrop-color→--iswc-lightbox-backdrop` (color), `backdrop-blur→--iswc-lightbox-backdrop-blur` |
| 18 | `<iswc-badge>` | `src/components/feedback/badge.ts:38-40` | `pulse-color→--iswc-badge-pulse-color` (color) |
| 19 | `<iswc-cdn-snippet>` | `src/components/feedback/cdn-snippet.ts:71-75` | `radius→--iswc-cdn-snippet-radius`, `border-color→--iswc-cdn-snippet-border`, `pre-bg→--iswc-cdn-snippet-pre-bg` |
| 20 | `<iswc-confirm-modal>` | `src/components/feedback/confirm-modal.ts:52-57` | `bg→--iswc-confirm-modal-bg` (color), `text-color→--iswc-confirm-modal-text` (color), `border-color→--iswc-confirm-modal-border` (color), `accent→--iswc-confirm-modal-accent` (color) |
| 21 | `<iswc-popconfirm>` | `src/components/feedback/popconfirm.ts:58-64` | `bg→--iswc-popconfirm-bg` (color), `text-color→--iswc-popconfirm-text` (color), `border-color→--iswc-popconfirm-border` (color), `accent→--iswc-popconfirm-accent` (color), `danger-color→--iswc-popconfirm-danger` (color) |
| 22 | `<iswc-progress-bar>` | `src/components/feedback/progress-bar.ts:32-36` | `track-height→--iswc-progress-bar-track-height`, `track-color→--iswc-progress-bar-track-color`, `color→--iswc-progress-bar-color` (color) |
| 23 | `<iswc-progress-ring>` | `src/components/feedback/progress-ring.ts:35-40` | `track-width→--iswc-progress-ring-track-width`, `width→--iswc-progress-ring-width`, `track-color→--iswc-progress-ring-track-color` (color), `color→--iswc-progress-ring-color` (color) |
| 24 | `<iswc-skeleton>` | `src/components/feedback/skeleton.ts:28-31` | `color→--iswc-skeleton-color` (color), `sheen-color→--iswc-skeleton-sheen` (color) |
| 25 | `<iswc-spinner>` | `src/components/feedback/spinner.ts:23-28` | `track-width→--iswc-spinner-track-width`, `track-color→--iswc-spinner-track-color` (color), `color→--iswc-spinner-color` (color), `speed→--iswc-spinner-speed` |
| 26 | `<iswc-tooltip>` | `src/components/feedback/tooltip.ts:62-66` | `max-width→--iswc-tooltip-max-width`, `arrow-size→--iswc-tooltip-arrow-size`, `arrow-color→--iswc-tooltip-arrow-color` (color) |
| 27 | `<iswc-checkbox>` | `src/components/forms/checkbox.ts:61-71` | `size→--iswc-checkbox-size`, `radius→--iswc-checkbox-radius`, `bg→--iswc-checkbox-bg` (color), `bg-hover→--iswc-checkbox-bg-hover` (color), `border-color→--iswc-checkbox-border` (color), `accent→--iswc-checkbox-accent` (color), `focus-color→--iswc-checkbox-focus` (color), `mark-color→--iswc-checkbox-mark` (color), `halo→--iswc-checkbox-halo` |
| 28 | `<iswc-color-picker>` | `src/components/forms/color-picker.ts:84-90` | `radius→--iswc-picker-radius`, `border-color→--iswc-picker-border` (color), `bg→--iswc-picker-bg` (color), `text-color→--iswc-picker-text` (color), `focus-color→--iswc-picker-focus` (color) |
| 29 | `<iswc-combobox>` | `src/components/forms/combobox.ts:67-73` | `radius→--iswc-combobox-border-radius`, `border-color→--iswc-combobox-border` (color), `bg→--iswc-combobox-bg` (color), `text-color→--iswc-combobox-text` (color), `focus-color→--iswc-combobox-focus` (color) |
| 30 | `<iswc-date-picker>` | `src/components/forms/date-picker.ts:88-92` | `radius→--iswc-datepicker-radius`, `border-color→--iswc-datepicker-border` (color), `bg→--iswc-datepicker-bg` (color) |
| 31 | `<iswc-date-range-picker>` | `src/components/forms/date-range-picker.ts:116-119` | `bg→--iswc-daterange-bg` (color), `border-color→--iswc-daterange-border` (color) |
| 32 | `<iswc-digital-clock>` | `src/components/forms/digital-clock.ts:31-33` | `clock-height→--iswc-clock-height` |
| 33 | `<iswc-duration-picker>` | `src/components/forms/duration-picker.ts:34-37` | `bg→--iswc-duration-picker-bg` (color), `border-color→--iswc-duration-picker-border` (color) |
| 34 | `<iswc-input>` | `src/components/forms/input.ts:116-123` | `radius→--iswc-input-border-radius`, `border-color→--iswc-input-border` (color), `bg→--iswc-input-bg` (color), `text-color→--iswc-input-text` (color), `focus-color→--iswc-input-focus` (color), `danger-color→--iswc-input-danger` (color) |
| 35 | `<iswc-pin-input>` | `src/components/forms/pin-input.ts:48-56` | `cell-size→--iswc-pin-cell-size`, `gap→--iswc-pin-gap`, `bg→--iswc-pin-bg` (color), `text-color→--iswc-pin-text` (color), `border-color→--iswc-pin-border` (color), `focus-color→--iswc-pin-focus` (color), `danger-color→--iswc-pin-danger` (color) |
| 36 | `<iswc-radio-group>` | `src/components/forms/radio-group.ts:62-64` | `accent→--iswc-radio-accent` (color) |
| 37 | `<iswc-radio>` | `src/components/forms/radio.ts:42-44` | `accent→--iswc-radio-accent` (color) |
| 38 | `<iswc-rating>` | `src/components/forms/rating.ts:81-87` | `size→--iswc-rating-size`, `gap→--iswc-rating-gap`, `color→--iswc-rating-color` (color), `empty-color→--iswc-rating-empty` (color), `focus-color→--iswc-rating-focus` (color) |
| 39 | `<iswc-select>` | `src/components/forms/select.ts:121-128` | `radius→--iswc-select-border-radius`, `border-color→--iswc-select-border` (color), `bg→--iswc-select-bg` (color), `text-color→--iswc-select-text` (color), `focus-color→--iswc-select-focus` (color), `danger-color→--iswc-select-danger` (color) |
| 40 | `<iswc-slider>` | `src/components/forms/slider.ts:98-106` | `track-size→--iswc-slider-track-size`, `thumb-size→--iswc-slider-thumb-size`, `length→--iswc-slider-length`, `rail-color→--iswc-slider-rail` (color), `fill-color→--iswc-slider-fill` (color), `thumb-color→--iswc-slider-thumb-bg` (color), `focus-color→--iswc-slider-focus` (color) |
| 41 | `<iswc-switch>` | `src/components/forms/switch.ts:70-78` | `height→--iswc-switch-height`, `width→--iswc-switch-width`, `bg→--iswc-switch-bg` (color), `accent→--iswc-switch-accent` (color), `thumb-color→--iswc-switch-thumb` (color), `focus-color→--iswc-switch-focus` (color), `halo→--iswc-switch-halo` |
| 42 | `<iswc-textarea>` | `src/components/forms/textarea.ts:59-66` | `radius→--iswc-textarea-border-radius`, `border-color→--iswc-textarea-border` (color), `bg→--iswc-textarea-bg` (color), `text-color→--iswc-textarea-text` (color), `focus-color→--iswc-textarea-focus` (color), `danger-color→--iswc-textarea-danger` (color) |
| 43 | `<iswc-time-clock>` | `src/components/forms/time-clock.ts:57-60` | `size→--iswc-clock-size`, `face-color→--iswc-clock-face` (color) |
| 44 | `<iswc-floating>` | `src/components/helpers/floating.ts:70-74` | `arrow-size→--iswc-floating-arrow-size`, `show-duration→--iswc-floating-show-duration`, `hide-duration→--iswc-floating-hide-duration` |
| 45 | `<iswc-md-editor>` | `src/components/helpers/md-editor.ts:281-283` | `preview-max-height→--iswc-md-editor-preview-max-height` |
| 46 | `<iswc-popover>` | `src/components/helpers/popover.ts:89-94` | `max-width→--iswc-popover-max-width`, `arrow-size→--iswc-popover-arrow-size`, `show-duration→--iswc-popover-show-duration`, `hide-duration→--iswc-popover-hide-duration` |
| 47 | `<iswc-confirm-delete>` | `src/components/isp/confirm-delete.ts:95-97` | `accent→--iswc-confirm-delete-accent` (color) |
| 48 | `<iswc-heading>` | `src/components/isp/heading.ts:31-35` | `mix-with→--iswc-heading-mix-with` (color) |
| 49 | `<iswc-loading-overlay>` | `src/components/isp/loading-overlay.ts:48-51` | `backdrop-color→--iswc-loading-backdrop` (color), `indicator-color→--iswc-loading-indicator` (color) |
| 50 | `<iswc-modal-verificacion>` | `src/components/isp/modal-verificacion.ts:130-132` | `accent→--iswc-modal-verificacion-accent` (color) |
| 51 | `<iswc-text>` | `src/components/isp/text.ts:31-33` | `mix-with→--iswc-text-mix-with` (color) |
| 52 | `<iswc-callout>` | `src/components/layout/callout.ts:68-74` | `bg→--iswc-callout-bg` (color), `border-color→--iswc-callout-border` (color), `text-color→--iswc-callout-text` (color), `accent→--iswc-callout-accent` (color), `spacing→--iswc-callout-spacing` |
| 53 | `<iswc-card>` | `src/components/layout/card.ts:73-75` | `spacing→--iswc-card-spacing` |
| 54 | `<iswc-details>` | `src/components/layout/details.ts:75-79` | `spacing→--iswc-details-spacing`, `show-duration→--iswc-details-show-duration`, `hide-duration→--iswc-details-hide-duration` |
| 55 | `<iswc-dialog>` | `src/components/layout/dialog.ts:90-96` | `spacing→--iswc-dialog-spacing`, `width→--iswc-dialog-width`, `backdrop-color→--iswc-dialog-backdrop-color` (color), `show-duration→--iswc-dialog-show-duration`, `hide-duration→--iswc-dialog-hide-duration` |
| 56 | `<iswc-divider>` | `src/components/layout/divider.ts:30-34` | `color→--iswc-divider-color` (color), `spacing→--iswc-divider-spacing`, `width→--iswc-divider-width` |
| 57 | `<iswc-dock>` | `src/components/layout/dock.ts:33-35` | `scale-unit→--iswc-dock-scale-unit` |
| 58 | `<iswc-drawer>` | `src/components/layout/drawer.ts:85-91` | `size→--iswc-drawer-size`, `spacing→--iswc-drawer-spacing`, `backdrop-color→--iswc-drawer-backdrop-color` (color), `show-duration→--iswc-drawer-show-duration`, `hide-duration→--iswc-drawer-hide-duration` |
| 59 | `<iswc-preview-component>` | `src/components/layout/preview-component.ts:50-53` | `size→--iswc-preview-size`, `spacing→--iswc-preview-spacing` |
| 60 | `<iswc-split-panel>` | `src/components/layout/split-panel.ts:74-77` | `min-size→--iswc-split-panel-min`, `max-size→--iswc-split-panel-max` |
| 61 | `<iswc-theme-img>` | `src/components/media/theme-img.ts:63-65` | `fit→--iswc-theme-img-fit` |
| 62 | `<iswc-video-playlist>` | `src/components/media/video-playlist.ts:200-206` | `radius→--iswc-video-playlist-radius`, `bg→--iswc-video-playlist-bg` (color), `border-color→--iswc-video-playlist-border` (color), `stripe-color→--iswc-video-playlist-stripe` (color), `accent→--iswc-video-playlist-accent` (color) |
| 63 | `<iswc-video>` | `src/components/media/video.ts:154-156` | `accent→--iswc-video-accent` (color) |
| 64 | `<iswc-carousel>` | `src/components/navigation/carousel.ts:73-79` | `control-bg→--iswc-carousel-control-bg` (color), `control-color→--iswc-carousel-control-text` (color), `control-border→--iswc-carousel-control-border` (color), `indicator-color→--iswc-carousel-indicator` (color), `indicator-active→--iswc-carousel-indicator-active` (color) |
| 65 | `<iswc-scroller>` | `src/components/navigation/scroller.ts:53-57` | `button-size→--iswc-scroller-button-size`, `button-bg→--iswc-scroller-button-bg` (color), `button-color→--iswc-scroller-button-text` (color) |
| 66 | `<iswc-stepper>` | `src/components/navigation/stepper.ts:57-62` | `accent→--iswc-stepper-accent` (color), `text-color→--iswc-stepper-text` (color), `muted-color→--iswc-stepper-muted` (color), `border-color→--iswc-stepper-border` (color) |
| 67 | `<iswc-tab-group>` | `src/components/navigation/tab-group.ts:89-93` | `track-color→--iswc-tab-group-track-color` (color), `track-width→--iswc-tab-group-track-width`, `indicator-color→--iswc-tab-group-indicator-color` (color) |
| 68 | `<iswc-tree>` | `src/components/navigation/tree.ts:60-66` | `indent→--iswc-tree-indent`, `row-padding-y→--iswc-tree-row-padding-y`, `row-padding-x→--iswc-tree-row-padding-x`, `row-hover→--iswc-tree-row-hover` (color), `row-selected-bg→--iswc-tree-row-selected-bg` (color) |
| 69 | `<iswc-command-palette>` | `src/components/overlays/command-palette.ts:64-68` | `radius→--iswc-popover-radius`, `shadow→--iswc-popover-shadow`, `bar-gap→--iswc-surface-bar-gap` |
| 70 | `<iswc-pdf-viewer>` | `src/components/overlays/pdf-viewer.ts:38-41` | `shadow→--iswc-popover-shadow`, `bar-gap→--iswc-surface-bar-gap` |
| 71 | `<iswc-window>` | `src/components/overlays/window.ts:55-59` | `shadow→--iswc-popover-shadow`, `bar-gap→--iswc-surface-bar-gap`, `bar-padding→--iswc-surface-bar-padding` |
| 72 | Pickers (factory) | `src/components/_shared/picker-element.ts:81` | `panel-height→--iswc-clock-height` (extiende cada `definePickerInput({…})`) — afecta a `<iswc-date-input>`, `<iswc-time-input>`, `<iswc-date-time-input>`, `<iswc-date-range-input>` |

> **Total componentes afectados por `styleAttrs`:** 75 instancias (72 archivos + 1 factory que cubre 4 pickers + duplicados `radio`/`radio-group` que comparten `--iswc-radio-accent`).
> Cada instancia representa ≥1 atributo mapeado a ≥1 `--iswc-*-X`. Aproximadamente **250+ pares `attr → var` totales**.

---

## 6. Otros mecanismos

### A. `syncIspColor` (M4) — `color` / `mix` / `mix-with` → vars tipográficas

`src/components/_shared/isp-color.ts:86-125` toma los attrs `color`, `mix`,
`mix-with` de un componente y los vuelca a `--iswc-*-color/mix/mix-with` en
el host:

- **`<iswc-heading>`** (`src/components/isp/heading.ts:67-72`):
  - `color` → `--iswc-heading-color` (cuando es CSS literal o `current`).
    Semánticos (`brand|neutral|info|success|warning|danger`) los resuelve
    el CSS con `:host([color=…])` — no se considera anti-pattern.
  - `mix` → `--iswc-heading-mix`.
  - `mix-with` → `--iswc-heading-mix-with`.
- **`<iswc-text>`** (`src/components/isp/text.ts:56-67`): mismas tres vars,
  prefijo `--iswc-text-*`.

### B. `applyToneRamp` (M5) — `color` literal → rampa de roles

Sólo `<iswc-button>` (`src/components/actions/button.ts:179`) usa
`applyToneRamp(this, isCssColorValue(raw) ? raw : null)`. Cuando el
usuario escribe `color="#ae3ec9"`, el componente escribe internamente
9 vars `--_tone*`. Es el mismo anti-pattern, con un prefijo distinto
para reservar la frontera con `--iswc-*` del kit global.

### C. Borderline — `style.setProperty` desde código de medición, no prop

- `<iswc-data-grid>` línea 1290 setea `--iswc-grid-head-total` con
  `this.#head.offsetHeight` tras layout. Es coordinación layout↔CSS
  var interna al componente (no viene de una prop del usuario). **No**
  es el anti-pattern del brief; anotado solo por completitud.

### D. Borderline — `style.setProperty` defensivo sin prop

- `<iswc-tooltip>` línea 155 reescribe `--iswc-tooltip-arrow-color` con
  `var(--iswc-tooltip-bg, …)` sobre un `<iswc-floating>` hijo. Es un
  re-set defensivo para que la flecha herede el bg del tooltip. No
  viene de una prop, pero **reescribe** una `--iswc-*` interna. Anotar
  para revisión futura.

---

## 7. Resumen de cuentas

| Categoría | Componentes / archivos | Pares `prop → --iswc-*` (aprox.) |
|----------|------------------------|----------------------------------|
| `styleAttrs` (M1/M2) | 72 archivos + 1 factory (4 pickers) | 250+ |
| `style.setProperty` ad-hoc (M3) | 9 archivos, 12 componentes distintos (≈19 setProperty calls desde props) | 19 |
| `syncIspColor` (M4) | 2 componentes (`heading`, `text`) | 6 |
| `applyToneRamp` (M5) | 1 componente (`button`) | 9 |
| Borderline (no prop, no brief) | 2 (`data-grid` medición, `tooltip` defensivo) | 2 |

**Total de casos prop→`--iswc-*` (anti-pattern del brief):**
- **~77 archivos** con al menos un `attr → --iswc-*` o `prop → --iswc-*`
- **~75+ componentes web** afectados (algunos comparten)
- **~280+ pares `prop / attr → --iswc-*` internos**

> El brief pide reportar **N casos**. El conteo "una fila en la tabla
> `styleAttrs`" cuenta como 1 caso por componente‑attr, no por archivo.
> Si se pide por **componente afectado**: **~75**.
> Si se pide por **par `prop → --iswc-*`**: **~280+**.
> Si se pide por **archivo fuente con al menos un caso**: **~80**.

---

## 8. Recomendaciones (ordenadas por coste/impacto)

1. **Auditar `styleAttrs` como bloque.** Es el mecanismo prevalente
   (250+ pares). Una sola decisión arquitectónica:
   (a) eliminar `styleAttrs` por completo y exigir al consumer que
       defina los `--iswc-*-X` por su cuenta (vía CSS class o inline
       style — exactamente lo que dice la regla del usuario); o
   (b) mantener `styleAttrs` como atajo *explícitamente documentado*
       como mecanismo "common helper" del brief, marcando esta excepción
       en AGENTS.md / docs para que no se confunda con el anti-pattern.
   La opción (a) es la coherente con la regla; la (b) es pragmática.

2. **Eliminar duplicados `styleAttrs` + `style.setProperty` en el mismo componente:**
   - `<iswc-button>` (styleAttrs + `applyToneRamp` + `setProperty` de hue).
   - `<iswc-code>` (styleAttrs `min-height` + `setProperty` línea 210).
   - `<iswc-data-grid>` (styleAttrs `height/padding` + `setProperty`
     de `rowHeight/headerHeight`).
   - `<iswc-tooltip>` (styleAttrs `arrow-color` + setProperty defensivo).
   Consolidar en un único mecanismo.

3. **`<iswc-palette-selector>`:** el caso más grave del M3. Setea
   6 vars `--iswc-brand-*` y `--iswc-logo-*` desde el `value`
   (paleta activa). Recomendación: el selector debería limitarse a
   emitir el `data-palette` attr y dejar que `palettes.css` pinte las
   vars (igual que `<iswc-button>` con familias semánticas). El
   caso de los `<li>` del menú (líneas 473-477) es la mayor sorpresa
   — se setean vars en cada item en lugar de usar CSS de menú.

4. **Eliminar los sets desde `<iswc-txt-edit>` / `-view` (height).** El
   atributo `height` ya controla el alto vía `:host([height])`
   + `var(--iswc-file-height, 70vh)`. El setter escribiendo la var es
   redundante; debería bastar con el atributo y que el CSS use el
   fallback. Hoy el setProperty es lo que hace que el atributo tenga
   efecto.

5. **`<iswc-data-grid>` `--iswc-grid-row-h` / `--iswc-grid-head-h`**
   (líneas 1241-1242): vienen de los atributos `row-height` /
   `header-height`. Estos SÍ son props razonables de exponer (alto
   exacto en px). Sin embargo, hoy duplican el canal `styleAttrs` para
   `height`. Recomendación: si `height` del `styleAttrs` se mantiene,
   unificar el contrato: o se eliminan los `setProperty` ad-hoc, o se
   elimina el attr `height` del `styleAttrs`.

6. **`<iswc-heading>` y `<iswc-text>`:** reconsiderar `syncIspColor`
   para los casos de literal CSS. La parte semántica (`brand`,
   `neutral`, etc.) NO es anti-pattern porque lo resuelve el CSS con
   `:host([color=…])`. Pero `color="#ff0000"` (literal) sí vuelca a
   `--iswc-text-color` (línea 110 de `isp-color.ts`). Mantener el set
   semántico y exponer `--iswc-text-color` / `--iswc-heading-color`
   solo cuando el consumer quiere sobrescribir.

7. **`<iswc-catalogo-gen>` `qRowsHeader` (línea 401):** idem. Es un
   prop razonable, pero su mapeo a `--iswc-cat-rows` puede vivir en
   un `styleAttrs` para consistencia.

8. **Documentar la decisión arquitectónica sobre `styleAttrs` en
   `AGENTS.md`** (§8.5–§9) para que un futuro refactor no la confunda
   con un anti-pattern casual.

---

## 9. Archivos que **NO** son anti-pattern (verificados)

Para mantener el scope honesto, se confirma que los siguientes patrones
**no** entran en el brief:

- `<iswc-button>` con `color="brand|neutral|info|...|warning|danger"` —
  es semántico, lo resuelve el CSS con `:host([color=…])`.
- `<iswc-icon>` (no usa `--iswc-*` desde props; consume `--iswc-color` del
  consumidor vía `currentColor`).
- Diagramas (`-editor-base`, `_editor-nesting`, etc.) — leen
  `--iswc-*` del kit, no los setean.
- Cualquier `*.preview.ts` o `*.*.selfcheck.ts` — no son componentes,
  son utilidades de preview/test.

---

## 10. Resumen ejecutivo

- **N archivos con anti-pattern:** ≈80 (72 con `styleAttrs` + 9 con
  `setProperty` ad-hoc + algunos con ambos).
- **N componentes web afectados:** ≈75–77.
- **N pares `prop → --iswc-*-X`:** ≈280+ (≈250 vía `styleAttrs` + ≈19
  vía `setProperty` + ≈6 vía `syncIspColor` + ≈9 vía `applyToneRamp`).
- **Recomendación #1:** decidir el destino de `styleAttrs` (eliminar
  vs. documentar como excepción del brief).
- **Recomendación #2:** unificar duplicados `styleAttrs` +
  `setProperty` en los 4–5 componentes que tienen ambos.
- **Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\anti-pattern-internal-vars.md`