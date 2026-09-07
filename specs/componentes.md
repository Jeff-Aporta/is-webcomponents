# Spec — Componentes `is-*`

Forma de los custom elements, `_shared/` y convenciones de API.

Diario completo (errores, entorno): [`lessons.md`](lessons.md).
Inventario por tag: [`manifest.ts`](../src/manifest.ts) + `<categoría>/*.md`. Convenciones por grupo: §Convenciones por grupo, abajo.

## Contexto

Cada tag es un Custom Element con Shadow DOM. El inventario y rutas de build salen de [`manifest.js`](../src/manifest.ts).

## S-K1 Nomenclatura y categorías

- Prefijo obligatorio: `is-`.
- Categorías del manifest: `actions`, `feedback`, `forms`, `data`, `charts`, `diagrams`, `layout`, `navigation`, `helpers`, `media`, `isp`, `code`, …
- Sub-tags (p. ej. `is-tab-panel`) comparten `page` con el padre en nav; no son tabs propios.
- La categoría **lógica** puede diferir de la carpeta: seguir el `script` de `manifest.js`, no el nombre de la categoría. `data-viz` es el caso típico (la mayoría de gráficas vive en `charts/`).

## S-K2 Shadow DOM y estilos

- Tokens `--is-*` desde light DOM (`is-base.css` / paletas). Default paleta: `contapyme`.
- `adoptCss(shadowRoot, import.meta.url)` + CSS hermano `.css` cuando aplique. Tras `innerHTML=''` del shadow, volver a llamar `adoptCss` (los `<link>` se borran).
- Scrollbars: `src/components/_shared/scrollbars.css` vía adopt (no reimportar en cada tag).
- Escala: preferir `em` / `font-size` en controles; no `size=` legacy, no `size` colors. Las bases se derivan de `import.meta.url`, no de `location.pathname`.

## S-K3 Enums y eventos

- Valores de atributos enum: declarados en el `.js` (`VALID_*`) o MD del tag.
- Setters usan normalización (`intent.js`, `tone.js`) — valores inválidos → default, sin throw.
- Eventos custom: prefijo `is-` cuando son contrato público del tag. No documentar un evento que nadie emite.
- `color` ≠ `variant`: `color` es la **familia semántica** (brand, neutral, info, success, warning, danger); `variant` es la **apariencia** (filled, outlined, plain, soft, ghost). Nunca meter color en `variant`.

## S-K4 `_shared/` y bases

- Reusar: `element-base.js`, `modal-base.js`, `form-control-mixin.js`, `intent.js`, `tone.js`, `upgrade-properties.js`, `dom-utils.js`, `misc-utils.js`, `scrollbars.css`, `grid-*.js`, `date-*.js`, `picker-element.js`, `svg-chart-engine.js`, `chart-palette.js`, `node-link-layout.js`, `tree-layout.js`, `icon-loader.js`, `prefs.js`, `position.js`.
- Nuevo helper solo si ≥3 usos o lógica no trivial; si no, inline en el tag. Preferir `_shared/` a duplicar `escapeHtml`/`copyText` (había 9 copias de `escapeHtml`).
- `helpers/` públicos = manifest + preview JSON + MD.
- Barreras de alcance (CSS en shadow): NO `&[attr]` anidado dentro de `:host {}` (compila a `:host[attr]`, que nunca matchea el host — usar `:host([attr])` top-level en shadow root y hook de component). NO `mi-tag .algo` en la hoja adoptada por `mi-tag` (es CSS muerto: el host queda fuera del árbol; usar `:host(mi-tag) .algo` / `::slotted(mi-tag)`). NO estilar `otro-tag::part(x)` desde el shadow de un padre cuando el tag llega slotted.

## S-K5 Diagramas e ISP

- Diagramas: payload declarativo + kind registry; no registrar `specs/` internos como CE. Reusar `node-link-layout.js`, `tree-layout.js`, `path-turtle.js`, `diagram-kinds.js`, `diagram-grid.js`, `tk-*.js`.
- `isp/`: ports de ISP-SvelteComponents (`is-tree-view`, `is-form`, layouts…). Medición por contenedor vía `BreakpointHost` (`block-layout.js`).

## Convenciones por grupo

> Cada grupo lista sus convenciones de dominio y los errores que NO deben repetirse. El inventario de tags de cada grupo está en `manifest.ts` y `<grupo>/*.md`; aquí solo las reglas transversales y las trampas específicas.

### S-K6 actions

- **`color` × `variant` son dimensiones ortogonales.** `color` → roles `--_tone-*` (tokens relativos de `is-base`/`palettes`); `variant` → consume `--_tone-*`. Añadir un color = una regla de enlace `:host([color="nuevo"])`; añadir una apariencia = una regla de variant genérica. **No** reabrir la matriz N×M `:host([color=X][variant=Y])`. **No** pedir `--is-color-*-600/-500` (el tema ya no los define → filled/outlined transparentes sin error). Fallback `var(--is-color-X-strong, #hex)` en el sitio de uso, **nunca** un bloque `--is-color-X-600:` en `:host` (marca invisible al desajustar con el tema).
- **Escala em real.** Controles nativos (`<button>`/`<input>`) dentro del shadow DEBEN `font: inherit`/`font-size: inherit`; el host debe `font-size: inherit`. Sin eso la escala `em` miente (UA fija ~16px). Tono en JS → `this.color`, **no** `this.variant`.
- **Context menu + scroll:** no reposicionar el panel en cada scroll; cerrar al `scroll` (capture en `window`) salvo scroll interno; `scroll-lock` → `documentElement.overflow = hidden` mientras está abierto (patrón de `is-loading-overlay`). **No** bloquear scroll por defecto.
- **Submit de forms:** un `<is-button type="submit">` dentro de un form light-DOM **no** envía el form por sí solo (el `<button>` real está en shadow). Usar `requestSubmit`/`reset` cableados en `button.js`, o `onclick` que dispare el submit.
- **Reusar:** `<is-copy-button>` (feedback de éxito/error), `<is-share-button>` (Web Share nativo, fallback copiar), `<is-tooltip>`/`<is-popover>`. **No** reimplementar clipboard ni overlays.

### S-K7 charts

- **Comparten `svg-chart-engine.js` + `chart-palette.js`; marks** (`marks-cartesian.js`, `marks-radial.js`), `path-turtle.js`. **No** duplicar engine ni asumir config idéntica entre wrappers.
- **`viewBox` 1:1 con píxeles** — el SVG NO escala: al crecer se re-maqueta. El `font-size` base del SVG se ata a su propia geometría con exponente < 1 (crecer lineal lo dispara). La leyenda es HTML fuera del SVG: hay que escalarla aparte y reaplicar `--chart-legend-size` (0.75).
- **Hit-test de hover por proximidad a un punto deja zonas muertas en marks grandes.** Primero la geometría real (`e.target.closest('.mark')`, sin retargeting porque el listener vive en el mismo shadow root); la proximidad queda de respaldo (para line/scatter sí es el modelo correcto).
- **`@import` a hermanos se resuelve contra el CSS publicado:** el navegador lo resuelve contra la ruta del `.css` en `dist`, no el bundler. Reescribir a nombre publicado (`./chart.css` → `chart.min.css`); si el archivo no se emite, el import da 404 en silencio. `tests/css-imports.test.ts`.
- **Rampa de intensidad** (heatmap, data-viz) = valores de dato, **no** tokens `--is-*`.

### S-K8 code

- **Tag canónico `is-code`.** **No existe** `is-code-editor` (rename histórico). URLs/bookmarks viejos con `component:'is-code-editor'` abren preview vacío. Preview en `?s={"component":"is-code"}`.
- **Motor de resaltado NATIVO** (`_shared/code-highlight.ts` → tokens `.tok-*` ↔ `--is-code-*`, tema `code-theme.js`). **No** CodeMirror (ni 5 ni 6), **no** themes `cm-s-*`, **no** CSS CDN. `highlight-code.js` pinta `<pre class="code">` → `<is-code readonly compact>` (marcador `data-cm` = ya montado).
- **Snippets de demos HTML:** `lang="html"` explícito **o** dejar que `inferLanguage` corra. **No** marcar `data-cm="1"` prematuro: sin `lang` el default es `javascript` y `<` se pinta como operador (cian). Snippets docs: `readonly` + `compact` + `softFormat`.
- **Galería — fuentes (`view-sources.js`, `demo-file-meta.js`, `component-sources.js`):**
  - Barra `.file-meta-page` **una sola vez** tras el título del preview (botones JS/CSS/MD + chips path `.min` + `<is-format-bytes autofit>`). **No** repetir bajo cada `h2`/`is-demo`; **no** `.vs-page-bar` con hints; **no** `position: sticky` (fluye con el scroll).
  - Paths CDN en `.file-meta`: `<code class="file-meta__path">` (no `<is-code>` — con CM movía `is-main`; el editor nativo no hace scrollIntoView).
  - `#vsPath` = **URL absoluta con host** (`<a class="vs-path">`), no el `repoPath` relativo.
  - Modal de fuentes = **full page** (`width="100vw"` `spacing="0"` + `::part(dialog)` stretch). **No** `min(96vw)` / `70vh`.
  - `refreshEditor` en `is-after-show` / `is-tab-show`; `paintOne` siempre `el.value = text`; si CM listo y `getValue()` vacío, `setValue(seed)`; chrome incluye `is-tab-group` (`GALLERY_CHROME_TAGS`). **No** fiarse de `value` lleno (= lienzo CM vacío).
- **Lenguajes nuevos:** `registerLanguage` (campo `heavy` + `load`), no un segundo editor.
- **Roadmap LaTeX (aún no existe):** `<is-latex>` (ecuaciones) y `<is-latex-doc>` (IDE `.tex`: TOC, BibTeX `\cite`, `\label`/`\ref`, autocomplete, auto-`\end{}`). **Reutilizar** `<is-code>` + `registerLanguage('latex')` + `is-dialog`/`layout`; motor math por CDN (KaTeX preferido). No implementar sin diseño aprobado; no "todo de una vez".
- **`all.min.js` importa módulos en orden:** un fallo de evaluación en un entry anterior impide registrar los posteriores. **Nunca** dejar un `import` dentro de un bloque de comentario JSDoc.
- Guardianes: `tests/code-infer-lang.test.ts`, `tests/code-theme-native.test.ts`, `tests/gallery-sources-meta.test.ts`.

### S-K9 data

- **`is-data-grid` toolbar:** `toolbar-tools` (bool) oculta Columnas/Filtros/Densidad/Exportar; `quick-filter` solo la búsqueda; `show-toolbar` fuerza la barra. Sin search y sin tools → la toolbar no se pinta. Para tablas de solo lectura (documentos embebidos, matrices, previews estáticas) pasar `toolbar-tools="false"` y **no** activar `quick-filter`/`show-toolbar`.
  - Prop JS: `el.toolbarTools = false` ↔ attr `toolbar-tools="false"`.
  - **No** ocultar con CSS del host (el shadow no es contrato estable). **No** inventar un segundo flag (`hide-tools`, `chrome=false`) — canónico `toolbar-tools`. `disable-column-menu` solo afecta al menú de columna.
- **`is-ag-grid`:** núcleo `datagrid-core/` (port de mimicus-react) separado del render; `createGridModel({rows,columns})` ⇒ `GridApi` (store observable). Atributos: `get-row-id`, `density`, `group-by`, `remember-state`, `storage-key`, `toolbar`. Columnas: `flex`, `rowGroup`, `enableRowGroup`, `aggFunc`, `filterType`, `minWidth`, `maxWidth`, pinned. Eventos: `is-state-loaded`, `is-column-reorder/resize/pin/hide`.
  - `#readData()` auto-corrige cols/rows (primer `<script type="application/json">` = columnas; segundo = filas; si el primero es claramente rows, se corrige). **No** usar `getAttribute('rows')` directo. **No** hardcodear `DENSITY_ROW_HEIGHT` (usar `#rowHeight()` que respeta `--is-grid-row-h`). **No** overrides `--is-*` de scrollbar dentro del shadow.
- **Persistencia:** un solo `localStorage['is-webcomponents'][tag][storage-key]` vía `_shared/prefs.js`. Opt-in (`remember-state`/`remember-scroll`). **No** keys planas / `sessionStorage`.
- Guardianes: `prefs-contract`, `data-grid-toolbar`.

### S-K10 data-viz

- La categoría lógica `data-viz` del manifest se reparte en **dos carpetas**: la mayoría de las gráficas vive en `charts/`; aquí solo `is-heatmap` y `is-maps`/`is-map-marker`. Al buscar la doc de un tag, seguir su `script` en `manifest.js`, **no** el nombre de la categoría.
- **Rampa de intensidad de heatmap** = valores de dato, no de tema: no sustituir por tokens `--is-*`.
- `<is-map-marker>` solo tiene sentido dentro de `<is-maps>`: el padre proyecta los marcadores y los posiciona. `maps.js` registra ambos tags (un módulo, un doc).

### S-K11 diagrams

- **Payload declarativo + kind registry.** **No** registrar `specs/` internos (`layout`, `turtle`, `edit`, `kind`) ni `_shared/*` como custom elements públicos.
- **Legibilidad del render no se garantiza con un layout correcto.** Lo que se dibuja tiene que CABER (chequeado por `render-legibilidad.selfcheck.mjs`):
  - La **cabecera cuenta para el ancho** (título/subtítulo centrados en `width/2`; con diagrama estrecho se salen). Todo spec con cabecera pasa por `_shared/diagram-header.js`.
  - Etiquetas de arista usan `edgeChipFill`/`edgeChipText` (hue propio, alfa 0.5), asignado vía `assignEdgeHues`.
  - Etiquetas que viven **fuera** de la figura deben entrar en el lienzo (Venn — nombres de conjunto; Timeline — primera tarjeta).
  - Ante choque con la leyenda, **el contenido BAJA** (empujar la leyenda a la derecha desperdicia ancho).
  - Un miembro puede llegar como **objeto**: `readMember` de `class-spec` acepta `{name, type, visibility}` (antes `String(raw)` pintaba `[object Object]`).
  - El diagrama **ocupa el ancho que tiene** (Sankey repartía la separación con una constante y dejaba media lámina vacía: ahora reparte el ancho objetivo entre capas).
- **Agrupadores (ER) — `er-spec.js`:** un grupo = un sub-diagrama (`layoutNodeLink` solo con sus aristas internas, cajón con título). `ratio` (default 1.4) **guía, no restringe**: empaquetado que prueba cada nº de columnas y elige el reparto de score `|log(ratio/guía)|` mínimo. Escala **logarítmica** para comparar ratios (la lineal sesga a tiras). Nodos aislados aparte (rejilla con mismo ratio). Rutear de la arista más corta a la más larga con peaje (`applyRectCost(..., add=true)`) sobre el corredor usado y el interior de cajones ajenos. Confinar la etiqueta al lienzo (`labelX/labelY` con `clamp`).
  - **No** dejar que el motor de capas vea aristas entre grupos (arrastra entidades y solapa cajones). **No** bloquear (`blockRect`) el interior de un cajón (las aristas internas se quedan sin ruta). **No** confiar en "todos los nodos tienen aristas" (14 sueltas → pila vertical ilegible). **No** dar buena una captura sin mirarla.
- **Sequence:** `<is-sequence-diagram>` pinta el SVG en su shadow (selector `shadowRoot.querySelector('svg')`, no `#d svg`). Leyenda en grid **máx 3 filas × N cols** (`legendMaxRows:3`), arranca **pasada la caja del último actor** (`baseW + boxW[n-1]/2 + 16`), no en `W - legendW - 8`. **Self-loop a mano** 4 esquinas (`M→out→up→back`); **no** delegar al A* con waypoints (`collapseJogs`/`collapseColinear` colapsan el 3er segmento a 1 celda → línea vertical con banderín).
- **Component-diagram:** 3 primitivas — `packages` (folder con pestaña), `components` (rect con estereotipo `«name»`), `interfaces` (lollipop, `provided` = círculo lleno, `required` = semicírculo). Posiciones **explícitas** en el payload. Aristas: `dependency` dashed, `realization` con flecha hueca. `layout.mode` = `pack` | `triptych` | `manual`; attrs `minGap`, `ungroup`, `sources`, `sourceSides`, `sourceGap`, `colGutter`, `pkgCorridor`, `rowGap`. **`ifaceById` se rellena DESPUÉS** de calcular `cx`/`cy` (si no, aristas caen a `(0,0)` sin error). Sin `edges`/`links` sale solo con cajas.
- **`is-org-chart` es el outlier:** no extiende `DiagramElementBase`, su slot JSON es el arreglo de nodos, usa `name`/`title` (no `label`) y pinta en `foreignObject` (no sobrevive a screenshot headless). **No** usarlo cuando el entregable sea una imagen exportada; `is-mindmap` con `layout:"tree"` cubre el caso.
- Guardianes: `tests/er-clusters.test.ts`, `tests/sequence-legend-grid.test.ts`, `tests/sequence-self-loop.test.ts`, `tests/component-diagram-ifaces.test.ts`.

### S-K12 feedback

- **Snippets CDN (`is-cdn-snippet`) ≠ snippets de demo (`demo-code.js`).** El primero es **loader copy-paste** (`script src` + `load(tag|cat|all)`); el segundo serializa el ejemplo y **debe** incluir tema/paleta activos (`withSnippetContext`/`stampContext`).
- **Galería `cdn-panel.js`:** importar `dist/cdn/feedback/cdn-snippet.min.js`, **no** `src/.../cdn-snippet.js` (arrastra `md-editor` y cuelga el boot). Ver error #43.
- **Reusar:** `_shared/prefs.js`, `helpers/floating.js`. **No** duplicar overlays/position; no emitir señales redundantes.
- Tema/paleta: default `contapyme`; snippet de demo sella `data-theme`+`data-palette`. **No** `color-scheme` en `:root`; **no** background de página en `is-base`/`palettes`.
- **`<is-tooltip>` `is-hide` no burbujea** (`bubbles:false`, `composed:true`): un tooltip en un `is-dialog` no debe cerrar al ancestro; escuchar en el propio tooltip, no en `document`.
- El bloque "Consumo por CDN" lo pinta **solo** `<is-cdn-snippet>` (auto-inyectado por `preview-chrome.js`); nunca duplicar un callout CDN a mano.

### S-K13 forms

- **Form association:** usar `_shared/form-associated.js` + `MixinFormControl` (`formControlTemplate`: label + hint + error-text). **No** manejar el value solo visualmente (rompe form association); usar helpers/callbacks.
- **Validación:** escuchar el evento `invalid` nativo (cubre call explícita y submit; `checkValidity()` solo no avisa al enviar el form). **No** envolver `checkValidity()`. `ElementInternals` dispara `invalid` nativo.
- **Helper de fecha:** reutilizar `_shared/date-field-core.js`, `date-utils.js`, `picker-element.js`, `date-field-element.js`. **No** reimplementar.
- **Lectura de valor:** usar la propiedad `.value` del WC, no el form nativo (`FormData` no siempre refleja el WC).
- **Escala em y `font:inherit`** en controles nativos (ver actions). Slider: `format="{v}px"` es plantilla; rating/slider usan `tidy`/`clampTo` de `misc-utils.js`.

### S-K14 helpers

- **`is-floating`** = building block interno de posicionamiento; **no es API pública** (usar `<is-popover>` / `<is-tooltip>`).
- **`response-cache`** — IndexedDB SWR (`createResponseCache`).
- **Markdown:** `helpers/md-lite.js` (`mdToHtml()`) — markdown ligero sin deps npm (usar antes de `marked`/otra lib). `_shared/prompt-md.js` — variables `{{nombre}}` + render MD/HTML híbrido con chips de tono determinista (usado por `is-md-render`/`is-md-editor`).
- **`IsUi.adoptCss`** en apps (mismo contrato que `_shared/adopt-css.js`, sin embeber CSS en el JS).
- **No** crear wrappers nuevos sobre `Intl`/`Observer`/`position`: elegir el helper existente. `is-observer` unifica intersection/mutation/resize.
- **Formatting de bytes:** `is-format-bytes autofit` — unidad más alta con valor ≥ 1 (`204800` → `200 KB`, no `0.2 MB`).

### S-K15 isp

- **Ports de ISP-SvelteComponents (ContaPyme).** `block-layout.js` exporta `BreakpointHost` + helpers (`sizewFor`, `flagsFor`, `lerpFor`, `BREAKPOINTS`, `BREAKPOINT_W`). Los tres layouts heredan de ahí: reflejan `data-sizew`/`data-szw-*`, escriben `--clientw`/`--lerpw` y emiten `is-breakpoint`.
- **Slot props de Svelte** (`sizew`, `boolszw`, `lerpw`) **no existen** en Web Components: su equivalente exacto está documentado en `block-layout.md`.
- **Fallbacks de custom properties SIEMPRE a tokens del tema** (`--is-text`, `--is-accent`, …), **nunca** a un color literal. Verificar contra ISP con `data-palette="contapyme"`.
- **ISP no define tokens** (no tiene `app.css`/`:root`, ni tipografía, ni tema oscuro). Al portar, la fuente de verdad son los **fallbacks dentro de los `var()`** de cada `.svelte`, no un archivo de tema.
- **No** `&[attr]` dentro de `:host`; **no** crear `size` colors ni un módulo por nivel de heading; **no** duplicar la maquinaria de breakpoints en cada layout.

### S-K16 layout

- **`<is-preview-component>`** es chrome del sistema de preview; se publica en `dist/cdn/preview/preview-component.min.js`. **No está en el catálogo del loader** (`L.load('is-preview-component')` no resuelve; no figura en `categories.layout`). Importar desde `dist/` (nunca desde `src/`: Pages 404 lucide). Ver errores #42–#43.
- **Full-page dialog:** `width="100vw"` + `spacing="0"`; en light DOM `::part(dialog) { width/height:100%; align-self/justify-self: stretch; border-radius:0; box-shadow:none }`. Ver `presentation.css` + clase `.is-view-sources`.
- **Style-attrs de `<is-dialog>`:** `width → --is-dialog-width`, `spacing → --is-dialog-spacing`; padding del host = `var(--is-dialog-spacing)`.
- **No** `is-split-panel` con % alto como sidebar fijo (deja hueco enorme): grid CSS con ancho fijo (`14.5rem`) o `position-in-pixels`.
- **ModalBase** centraliza ciclo de vida de `is-dialog`/`is-drawer` (focus trap, Escape, light-dismiss, `is-show`/`is-hide`/`is-after-show`/`is-after-hide`). Subclase define `__TEMPLATE`, `modalClass`, `closeAttr`, `animateOpen/Close`, hooks; refs vía `$modal`/`$backdrop`.
- **No** dejar un dialog "casi fullscreen" cuando el requisito es full page (padding del host + `max-height` del panel lo dejan a medias).

### S-K17 media

- **Iconos:** `<is-icon icon="prefix:name">`; sistema propio (231 familias / ~317k SVG en `assets/icons/`, publicados en `dist/assets/icons/`). `is-icon` inyecta el SVG **inline** (no `<img>`) para que `currentColor` funcione.
- **Host de `is-icon`** es caja cuadrada 1em con `line-height:1`. Sin tamaño explícito la línea lo estira. `#normalizeInlineSvg()` fuerza `fill`/`stroke: currentColor` en hijos.
- **Iconos con paleta propia** (banderas, logos, emoji) **no** se normalizan a `currentColor` (paths sin `fill` heredarían el color del host → a medio pintar). Detección **por icono, no por colección** (`logos` es mixta).
- **Grid por colección:** el grid nativo no siempre es 24. `collections.json` guarda el `height` real por prefijo (academicons 32, fa 512); un SVG local debe declarar `viewBox` con esas dimensiones. **No** normalizar todos a `24`.
- **No** forzar `stroke: currentColor` a nivel `<svg>` en iconos de relleno (se contornean/engrosan). Solo pisar `stroke` en elementos que ya lo traen.
- **Bases derivadas de `import.meta.url`**, no de `location.pathname` (el bundle publicado encuentra sus assets). Si un SVG sale del DOM (PNG rasterizado, data-URI), materializar el color al exportar (no hereda `currentColor`).
- **No** usar `api.iconify.design` en runtime (el sistema es propio y se sirve con el bundle); **no** `<iconify-icon>`.

### S-K18 navigation

- **Tag children** (`is-tab-panel`, `is-carousel-item`, `is-tree-item`, `is-stepper-step`, `is-breadcrumb-item`) comparten `page` con el padre; no son tabs propios. Mantener parent-child; **no** separar tags children ni crear MD por child multi-tag.
- **Preservar teclado/ARIA** en tab-group, tree, carousel, stepper. Eventos `is-*` (no nativos `input`/`change`).
- En el CSS del módulo, no estilar `is-tab`/`is-tree-item` desde el padre con `mi-tag .algo`/`::slotted` mal usado (ver S-K4): dejar el estilo en el shadow del propio elemento.

### S-K19 overlays

- **Listeners de `document`/`window`** en `connectedCallback`/`disconnectedCallback` (handler guardado en campo privado); **nunca** en el constructor (fuga, bug en 11 componentes). Un overlay que monta/desmonta seguido es donde más se notan.
- **No** `will-change: transform` en superficies con zoom por `scale()`: el navegador rasteriza a escala 1 y el contenido SVG se ve borroso (`is-lightbox`).
- **No** animar propiedades de layout (padding/width/height) en transiciones; usar `transform`/`translate`.
- **No** `animation: both` en overlays (deja matriz identidad aplicada → el elemento se vuelve containing block y un `position: fixed` interno se desplaza). Usar `backwards`.
- Overlay colocado por JS con `left`/`top`/`transform`: **debe** ser `position: absolute|fixed` en su CSS (si no, ocupa espacio y desplaza el layout).

## Contratos

| Pieza | Contrato |
|---|---|
| Registro | entrada en `manifest.js` |
| Fuente | `src/components/<cat>/<name>.js` |
| Doc tag | `src/components/<cat>/<name>.md` |
| Preview | `src/previews/<cat>/<tag>.json` |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Manifest coherente | page/script/style existen | `src/utils/health/meta/manifest-paths.test.ts` |
| Enums en previews | solo valores válidos | `src/utils/health/domain/attr-enums.test.ts` |
| Tokens `--is-color-*` | vocabulario estable | `src/utils/health/domain/token-vocabulary.test.ts` |
| Botones eventos/color | contrato UI | `src/utils/health/domain/button-events.test.ts`, `src/utils/health/domain/button-color-appearance.test.ts` |
| Escala em en controles | herencia font-size | `src/utils/health/domain/em-scale-font-inherit.test.ts` |
| Helpers homogéneos | tab + json + md | `src/utils/health/meta/helpers-homogeneity.test.ts` |
