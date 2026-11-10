# Spec — Componentes `is-*`

Forma de los custom elements, `_shared/` y convenciones de API.

Diario completo (errores, entorno): [`lessons.md`](lessons.md).
Inventario por tag: [`manifest.ts`](../src/manifest.ts) + `<categoría>/*.md`. Convenciones por grupo: §Convenciones por grupo, abajo.

## Contexto

Cada tag es un Custom Element con Shadow DOM. El inventario y rutas de build salen de [`src/manifest.ts`](../src/manifest.ts).

## S-K1 Nomenclatura y categorías

- Prefijo obligatorio: `is-`.
- Categorías del manifest: `actions`, `feedback`, `forms`, `data`, `charts`, `diagrams`, `layout`, `navigation`, `helpers`, `media`, `isp`, `code`, …
- Sub-tags (p. ej. `iswc-tab-panel`) comparten `page` con el padre en nav; no son tabs propios.
- La categoría **lógica** puede diferir de la carpeta: seguir el `script` de `src/manifest.ts`, no el nombre de la categoría. `data-viz` es el caso típico (la mayoría de gráficas vive en `charts/`).

## S-K2 Shadow DOM y estilos

- Tokens `--iswc-*` desde light DOM (`is-base.css` / paletas). Default paleta: `delfin`. 25 paletas generales (`src/styles/palettes.json` → `scripts/gen-palettes.mjs` escribe `palettes.scss`) con main, contraste, bright, superficies y textos tintados; `data-panda` junto a `data-theme` invierte las superficies. Contrato AA 25 × claro/oscuro × panda: `tests/gobernanza/palettes-contrast.test.ts`.
- **Forma canónica (molde reactivo, F8 — [`paridad-webawesome.md`](paridad-webawesome.md)).** Todo componente nuevo o migrado:
  1. **Base.** Extiende `IswcReactive` (`src/core/iswc-reactive.ts`); si es control de formulario, `IswcFormControl` (`src/core/iswc-form-control.ts`, que ya es `IswcReactive`). `IswcElement` (`src/core/iswc-element.ts`) solo cuando el cierre lo exige: `iswc-button` volvió al molde con sus `internals` y estados propios para no pesar más que antes de F8. Las subclases del molde siguen valiendo (`PropsElement` ya es `IswcReactive`, `ModalBase`, `DiagramElementBase`, `BreakpointHost`, `withStyleAttrs(IswcReactive)`). Se registra con `define(Clase)`.
  2. **Propiedades con `@prop`** (`type: 'str' | 'bool' | 'num' | 'json'`, `enum`, `attr`, `reflect: false`, `vacio: true`); estado interno con `@state()`; reacciones con `@watch('prop')` `(anterior, nuevo)` antes de pintar. **Nunca** un par get/set que refleja a mano (`set x(v) { this.setAttribute(…) }`), ni el mismo atributo en `static observed` y en `@prop` (lo suma `IswcReactive` a `observedAttributes`).
  3. **DOM.** Si depende del estado, `render()` devuelve `` html`…` `` de `core/plantilla.ts` (partes hijo, `a=${x}`, `?a=${x}`, `.p=${x}`, `@e=${fn}`, listas con `repetir(items, clave, plantilla)`, `` svg`…` ``); si no, `static template` + sincronización en `actualizado(cambios)`. Repintado agrupado por microtarea, primer pintado síncrono al conectar; `actualizarAhora()` y `await el.actualizacionCompleta` para quien lea el shadow tras escribir. `value`/`validity` se actualizan en el setter, no en el pintado.
  4. **Textos de interfaz por `this.t('clave', …args)`** (`core/localize.ts`): los términos propios se registran en español junto al código (`registrarTerminos('es', { … })` al cargar el módulo) y se traducen en `src/core/i18n/en.ts`; `lang`/`dir` se heredan de los ancestros. Ningún `aria-label` literal en las plantillas.
  5. **Eventos declarados en un tipo** de una línea `export type XEventos = { 'iswc-change': { value: string } };` en `schemas/<tag>.schemas.ts` (sumando el de la base: `IswcFormControlEventos`, `ModalBaseEventos`) y enlazado con `declare static events: XEventos;` (cero bytes). La ficha `.json` (`events`) y la tabla «Eventos» del `.md` las escribe `scripts/sondas/eventos.ts`, no se tocan a mano.
  6. **Overlays por la pila de capas** de `core/position.ts`: modales con `abrirCapaModal`/`cerrarCapaModal` (`inert` alrededor, trampa de Tab que cruza shadows, foco devuelto; `inertizar: false` para ventanas que conviven como `iswc-window`), flotantes con `createPopupDismiss` (se apilan: Escape y clic fuera solo para la capa de arriba, `esCapaSuperior`).
  7. **Estados CSS con `this.estado('nombre', activo)`** (`:state(nombre)`, respaldo `[data-nombre]`).

  ```ts
  import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
  import { IswcReactive, prop, state } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
  import { html } from '@jeff-aporta/iswc-base/core/plantilla.js';       // solo si pinta con render()
  import { registrarTerminos } from '@jeff-aporta/iswc-base/core/localize.js';
  import type { FooEventos } from './schemas/foo.schemas.js';
  import css from 'iswc:css';                // .css compilado hermano, lo incrusta el build (plugin cssVirtual)

  registrarTerminos('es', { quitarFiltro: 'Quitar filtro' });   // y `quitarFiltro: 'Remove filter'` en core/i18n/en.ts

  class IswcFoo extends IswcReactive {
    static override tag = 'iswc-foo';
    static override css = css;                        // el molde crea UNA CSSStyleSheet por clase y la adopta
    static override shadowInit: ShadowRootInit | null = { mode: 'open', delegatesFocus: true };  // null = light DOM
    static override deps = ['iswc-icon'];             // hijos que se piden a iswcLoader.ensure() al conectar
    declare static events: FooEventos;       // { 'iswc-clear': void }
    @prop() accessor label = '';             // ↔ atributo `label`, reflejado
    @prop({ type: 'bool' }) accessor clearable = false;
    @prop({ enum: ['filled', 'outlined'] }) accessor variant = 'outlined';
    @state() accessor abierto = false;       // interno: repinta, sin atributo
    render() {
      return html`<span part="label">${this.label}</span>
        <button part="clear" ?hidden=${!this.clearable} aria-label=${this.t('quitarFiltro')} @click=${this.#quitar}>×</button>`;
    }
    #quitar() { this.emit('iswc-clear'); }
    override actualizado() { this.estado('abierto', this.abierto); }
  }
  define(IswcFoo);
  ```

  Nada de `adoptCss(…, import.meta.url)`, `<link>` al `.css` hermano ni `static get observedAttributes` a mano. Las hojas adoptadas sobreviven a `shadow.innerHTML = …`. `static deps` solo para hijos que el padre pinta sin usar su API síncrona; si el padre necesita una clase o un helper del hijo, `import` normal. En Deno sin build, `ISWC:css` resuelve a `''` (`deno.json` → `core/iswc-css-vacio.ts`); `scripts/serve.mjs` lo sirve desde `.tmp-scss`. Quien sobrescriba `connectedCallback`/`attributeChangedCallback` **debe** llamar a `super` (si no, los `@prop` no siguen a los atributos); lo normal es `onConnected`/`onAttributeChanged`.

  Guardianes: `tests/gobernanza/molde-iswc-element.test.ts` (molde), `tests/gobernanza/reactivo.test.ts` (reflejo a mano, forms sobre `IswcFormControl`, `aria-label` literal, `@prop` + `observed`; trinquetes que solo bajan), `tests/gobernanza/eventos.test.ts` (emitidos = declarados, fichas al día con la sonda), `tests/gobernanza/a11y-patrones.test.ts` (roles y pares ARIA en plantillas), `tests/navegador/core-f8.test.ts` (reactivo, plantilla, form-control, localize, capas en Edge), `tests/navegador/textos-f8.test.ts` (es/en por `lang` heredado), `tests/navegador/overlays-f8.test.ts` (pila de capas), `tests/navegador/a11y-axe.test.ts` (axe-core, solo dev) y los topes de `tests/navegador/carga.test.ts` (unión base ≤ 14 500 B br; cierres de `iswc-button` ≤ 9 108 e `iswc-input` ≤ 14 971).
- Hojas base (`host-base`, `scrollbars`): las adopta el molde desde `core/iswc-element.ts` (`ISWC:css/host-base`, `ISWC:css/scrollbars`), compartidas por toda la página.
- Escala: preferir `em` / `font-size` en controles; no `size=` legacy, no `size` colors. Las bases se derivan de `import.meta.url`, no de `location.pathname`.

## S-K3 Enums y eventos

- Valores de atributos enum: constante del `.ts` (`VALID_*`, `INTENT`, `TONE` de `core/attrs.ts`) pasada a `@prop({ enum })`; fuera de la lista → el defecto, sin throw. Para normalizaciones que no son una lista (alias, `normalizeIntent`), un `@watch` o el `@prop` sin reflejo + getter, nunca un setter que reescribe el atributo a mano.
- Eventos custom: prefijo `iswc-` cuando son contrato público del tag, declarados en el tipo `XEventos` de `schemas/<tag>.schemas.ts` + `declare static events` (S-K2). No documentar un evento que nadie emite ni emitir uno sin declarar (`tests/gobernanza/eventos.test.ts`).
- `color` ≠ `variant`: `color` es la **familia semántica** (brand, neutral, info, success, warning, danger); `variant` es la **apariencia** (filled, outlined, plain, soft, ghost). Nunca meter color en `variant`.

## S-K4 `_shared/` y bases

- Reusar de `src/core/`: `iswc-element` (molde, `define`, `emit`), `iswc-reactive` (`IswcReactive`, `@prop`/`@state`/`@watch`), `plantilla` (`html`, `svg`, `repetir`), `iswc-form-control`, `localize` (`registrarTerminos`, `resolverLocale`, `formato`; `t()` es método de `IswcReactive`), `position` (`computePosition`, capas, `createPopupDismiss`), `attrs` (`INTENT`, `TONE`, `withStyleAttrs`, `normalizeIntent`), `dom`, `props-element`, `svg-chart-engine`, `tree-layout`, `icon-loader`, `prefs`; y de las categorías `layout/utils/modal-base`, `forms/utils/date-*`, `forms/utils/picker-element`, `data/utils/grid-*`, `charts/utils/chart-palette`, `diagrams/utils/diagram-layout`. Ya **no existen** `core/element-base`, `core/form-associated`, `core/form-control-mixin`, `core/resolve-locale` ni los decoradores `@attr*` de `core/attrs` (F8, [`cdn.md`](cdn.md) §Molde reactivo).
- Nuevo helper solo si ≥3 usos o lógica no trivial; si no, inline en el tag. Preferir `_shared/` a duplicar `escapeHtml`/`copyText` (había 9 copias de `escapeHtml`).
- `helpers/` públicos = manifest + preview JSON + MD.
- Barreras de alcance (CSS en shadow): NO `&[attr]` anidado dentro de `:host {}` (compila a `:host[attr]`, que nunca matchea el host — usar `:host([attr])` top-level en shadow root y hook de component). NO `mi-tag .algo` en la hoja adoptada por `mi-tag` (es CSS muerto: el host queda fuera del árbol; usar `:host(mi-tag) .algo` / `::slotted(mi-tag)`). NO estilar `otro-tag::part(x)` desde el shadow de un padre cuando el tag llega slotted.

## S-K5 Diagramas e ISP

- Diagramas: payload declarativo + kind registry; no registrar `specs/` internos como CE. Reusar `node-link-layout.js`, `tree-layout.js`, `path-turtle.js`, `diagram-kinds.js`, `diagram-grid.js`, `tk-*.js`.
- `isp/`: ports de ISP-SvelteComponents (`iswc-tree-view`, `iswc-form`, layouts…). Medición por contenedor vía `BreakpointHost` (`block-layout.js`).

## Convenciones por grupo

> Cada grupo lista sus convenciones de dominio y los errores que NO deben repetirse. El inventario de tags de cada grupo está en `manifest.ts` y `<grupo>/*.md`; aquí solo las reglas transversales y las trampas específicas.

### S-K6 actions

- **`color` × `variant` son dimensiones ortogonales.** `color` → roles `--_tone-*` (tokens relativos de `is-base`/`palettes`); `variant` → consume `--_tone-*`. Añadir un color = una regla de enlace `:host([color="nuevo"])`; añadir una apariencia = una regla de variant genérica. **No** reabrir la matriz N×M `:host([color=X][variant=Y])`. **No** pedir `--iswc-color-*-600/-500` (el tema ya no los define → filled/outlined transparentes sin error). Fallback `var(--iswc-color-X-strong, #hex)` en el sitio de uso, **nunca** un bloque `--iswc-color-X-600:` en `:host` (marca invisible al desajustar con el tema).
- **Escala em real.** Controles nativos (`<button>`/`<input>`) dentro del shadow DEBEN `font: inherit`/`font-size: inherit`; el host debe `font-size: inherit`. Sin eso la escala `em` miente (UA fija ~16px). Tono en JS → `this.color`, **no** `this.variant`.
- **Context menu + scroll:** no reposicionar el panel en cada scroll; cerrar al `scroll` (capture en `window`) salvo scroll interno; `scroll-lock` → `documentElement.overflow = hidden` mientras está abierto (patrón de `iswc-loading-overlay`). **No** bloquear scroll por defecto.
- **Submit de forms:** un `<iswc-button type="submit">` dentro de un form light-DOM **no** envía el form por sí solo (el `<button>` real está en shadow). Usar `requestSubmit`/`reset` cableados en `button.js`, o `onclick` que dispare el submit.
- **Reusar:** `<iswc-copy-button>` (feedback de éxito/error), `<iswc-share-button>` (Web Share nativo, fallback copiar), `<iswc-tooltip>`/`<iswc-popover>`. **No** reimplementar clipboard ni overlays.

### S-K7 charts

- **Comparten `svg-chart-engine.js` + `chart-palette.js`; marks** (`marks-cartesian.js`, `marks-radial.js`), `path-turtle.js`. **No** duplicar engine ni asumir config idéntica entre wrappers.
- **`viewBox` 1:1 con píxeles** — el SVG NO escala: al crecer se re-maqueta. El `font-size` base del SVG se ata a su propia geometría con exponente < 1 (crecer lineal lo dispara). La leyenda es HTML fuera del SVG: hay que escalarla aparte y reaplicar `--chart-legend-size` (0.75).
- **Hit-test de hover por proximidad a un punto deja zonas muertas en marks grandes.** Primero la geometría real (`e.target.closest('.mark')`, sin retargeting porque el listener vive en el mismo shadow root); la proximidad queda de respaldo (para line/scatter sí es el modelo correcto).
- **`@import` a hermanos se resuelve contra el CSS publicado:** el navegador lo resuelve contra la ruta del `.css` en `dist`, no el bundler. Reescribir a nombre publicado (`./chart.css` → `chart.min.css`); si el archivo no se emite, el import da 404 en silencio. `tests/css-imports.test.ts`.
- **Rampa de intensidad** (heatmap, data-viz) = valores de dato, **no** tokens `--iswc-*`.

### S-K8 code

- **Tag canónico `iswc-code`.** **No existe** `iswc-code-editor` (rename histórico). URLs/bookmarks viejos con `component:'iswc-code-editor'` abren preview vacío. Preview en `?s={"component":"iswc-code"}`.
- **Motor de resaltado NATIVO** (`_shared/code-highlight.ts` → tokens `.tok-*` ↔ `--iswc-code-*`, tema `code-theme.js`). **No** CodeMirror (ni 5 ni 6), **no** themes `cm-s-*`, **no** CSS CDN. `highlight-code.js` pinta `<pre class="code">` → `<iswc-code readonly compact>` (marcador `data-cm` = ya montado).
- **Snippets de demos HTML:** `lang="html"` explícito **o** dejar que `inferLanguage` corra. **No** marcar `data-cm="1"` prematuro: sin `lang` el default es `javascript` y `<` se pinta como operador (cian). Snippets docs: `readonly` + `compact` + `softFormat`.
- **Galería — fuentes (`view-sources.js`, `demo-file-meta.js`, `component-sources.js`):**
  - Barra `.file-meta-page` **una sola vez** tras el título del preview (botones JS/CSS/MD + chips path `.min` + `<iswc-format-bytes autofit>`). **No** repetir bajo cada `h2`/`iswc-demo`; **no** `.vs-page-bar` con hints; **no** `position: sticky` (fluye con el scroll).
  - Paths CDN en `.file-meta`: `<code class="file-meta__path">` (no `<iswc-code>` — con CM movía `iswc-main`; el editor nativo no hace scrollIntoView).
  - `#vsPath` = **URL absoluta con host** (`<a class="vs-path">`), no el `repoPath` relativo.
  - Modal de fuentes = **full page** (`width="100vw"` `spacing="0"` + `::part(dialog)` stretch). **No** `min(96vw)` / `70vh`.
  - `refreshEditor` en `iswc-after-show` / `iswc-tab-show`; `paintOne` siempre `el.value = text`; si CM listo y `getValue()` vacío, `setValue(seed)`; chrome incluye `iswc-tab-group` (`GALLERY_CHROME_TAGS`). **No** fiarse de `value` lleno (= lienzo CM vacío).
- **Lenguajes nuevos:** `registerLanguage` (campo `heavy` + `load`), no un segundo editor.
- **Roadmap LaTeX (aún no existe):** `<iswc-latex>` (ecuaciones) y `<iswc-latex-doc>` (IDE `.tex`: TOC, BibTeX `\cite`, `\label`/`\ref`, autocomplete, auto-`\end{}`). **Reutilizar** `<iswc-code>` + `registerLanguage('latex')` + `iswc-dialog`/`layout`; motor math por CDN (KaTeX preferido). No implementar sin diseño aprobado; no "todo de una vez".
- **`all.min.js` importa módulos en orden:** un fallo de evaluación en un entry anterior impide registrar los posteriores. **Nunca** dejar un `import` dentro de un bloque de comentario JSDoc.
- Guardianes: `tests/code-infer-lang.test.ts`, `tests/code-theme-native.test.ts`, `tests/gallery-sources-meta.test.ts`.

### S-K9 data

- **`iswc-data-grid` toolbar:** `toolbar-tools` (bool) oculta Columnas/Filtros/Densidad/Exportar; `quick-filter` solo la búsqueda; `show-toolbar` fuerza la barra. Sin search y sin tools → la toolbar no se pinta. Para tablas de solo lectura (documentos embebidos, matrices, previews estáticas) pasar `toolbar-tools="false"` y **no** activar `quick-filter`/`show-toolbar`.
  - Prop JS: `el.toolbarTools = false` ↔ attr `toolbar-tools="false"`.
  - **No** ocultar con CSS del host (el shadow no es contrato estable). **No** inventar un segundo flag (`hide-tools`, `chrome=false`) — canónico `toolbar-tools`. `disable-column-menu` solo afecta al menú de columna.
- **`iswc-ag-grid`:** núcleo `datagrid-core/` (port de mimicus-react) separado del render; `createGridModel({rows,columns})` ⇒ `GridApi` (store observable). Atributos: `get-row-id`, `density`, `group-by`, `remember-state`, `storage-key`, `toolbar`. Columnas: `flex`, `rowGroup`, `enableRowGroup`, `aggFunc`, `filterType`, `minWidth`, `maxWidth`, pinned. Eventos: `iswc-state-loaded`, `iswc-column-reorder/resize/pin/hide`.
  - `#readData()` auto-corrige cols/rows (primer `<script type="application/json">` = columnas; segundo = filas; si el primero es claramente rows, se corrige). **No** usar `getAttribute('rows')` directo. **No** hardcodear `DENSITY_ROW_HEIGHT` (usar `#rowHeight()` que respeta `--iswc-grid-row-h`). **No** overrides `--iswc-*` de scrollbar dentro del shadow.
- **Persistencia:** un solo `localStorage['iswc:root'][tag][storage-key]` (todo lo del kit lleva prefijo `ISWC:`, core/iswc-storage) vía `_shared/prefs.js`. Opt-in (`remember-state`/`remember-scroll`). **No** keys planas / `sessionStorage`.
- Guardianes: `prefs-contract`, `data-grid-toolbar`.

### S-K10 data-viz

- La categoría lógica `data-viz` del manifest se reparte en **dos carpetas**: la mayoría de las gráficas vive en `charts/`; aquí solo `iswc-heatmap` y `iswc-maps`/`iswc-map-marker`. Al buscar la doc de un tag, seguir su `script` en `src/manifest.ts`, **no** el nombre de la categoría.
- **Rampa de intensidad de heatmap** = valores de dato, no de tema: no sustituir por tokens `--iswc-*`.
- `<iswc-map-marker>` solo tiene sentido dentro de `<iswc-maps>`: el padre proyecta los marcadores y los posiciona. `maps.js` registra ambos tags (un módulo, un doc).

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
- **Sequence:** `<iswc-sequence-diagram>` pinta el SVG en su shadow (selector `shadowRoot.querySelector('svg')`, no `#d svg`). Leyenda en grid **máx 3 filas × N cols** (`legendMaxRows:3`), arranca **pasada la caja del último actor** (`baseW + boxW[n-1]/2 + 16`), no en `W - legendW - 8`. **Self-loop a mano** 4 esquinas (`M→out→up→back`); **no** delegar al A* con waypoints (`collapseJogs`/`collapseColinear` colapsan el 3er segmento a 1 celda → línea vertical con banderín).
- **Component-diagram:** 3 primitivas — `packages` (folder con pestaña), `components` (rect con estereotipo `«name»`), `interfaces` (lollipop, `provided` = círculo lleno, `required` = semicírculo). Posiciones **explícitas** en el payload. Aristas: `dependency` dashed, `realization` con flecha hueca. `layout.mode` = `pack` | `triptych` | `manual`; attrs `minGap`, `ungroup`, `sources`, `sourceSides`, `sourceGap`, `colGutter`, `pkgCorridor`, `rowGap`. **`ifaceById` se rellena DESPUÉS** de calcular `cx`/`cy` (si no, aristas caen a `(0,0)` sin error). Sin `edges`/`links` sale solo con cajas.
- **`iswc-org-chart` es el outlier:** no extiende `DiagramElementBase`, su slot JSON es el arreglo de nodos, usa `name`/`title` (no `label`) y pinta en `foreignObject` (no sobrevive a screenshot headless). **No** usarlo cuando el entregable sea una imagen exportada; `iswc-mindmap` con `layout:"tree"` cubre el caso.
- Guardianes: `tests/er-clusters.test.ts`, `tests/sequence-legend-grid.test.ts`, `tests/sequence-self-loop.test.ts`, `tests/component-diagram-ifaces.test.ts`.

### S-K12 feedback

- **Snippets CDN (`iswc-cdn-snippet`) ≠ snippets de demo (`demo-code.js`).** El primero es **loader copy-paste** (`script src` + `load(tag|cat|all)`); el segundo serializa el ejemplo y **debe** incluir tema/paleta activos (`withSnippetContext`/`stampContext`).
- **Galería `cdn-panel.js`:** importar `dist/cdn/feedback/cdn-snippet.min.mjs`, **no** `src/.../cdn-snippet.js` (arrastra `md-editor` y cuelga el boot). Ver error #43.
- **Reusar:** `_shared/prefs.js`, `helpers/floating.js`. **No** duplicar overlays/position; no emitir señales redundantes.
- Tema/paleta: default `delfin`; snippet de demo sella `data-theme`+`data-palette`. **No** `color-scheme` en `:root`; **no** background de página en `is-base`/`palettes`.
- **`<iswc-tooltip>` `iswc-hide` no burbujea** (`bubbles:false`, `composed:true`): un tooltip en un `iswc-dialog` no debe cerrar al ancestro; escuchar en el propio tooltip, no en `document`.
- El bloque "Consumo por CDN" lo pinta **solo** `<iswc-cdn-snippet>` (auto-inyectado por `preview-chrome.js`); nunca duplicar un callout CDN a mano.

### S-K13 forms

- **Form association:** extender `IswcFormControl` (`core/iswc-form-control.ts`): da `formAssociated`, `name`/`disabled`/`required`/`readonly`/`label`/`hint`/`errorText`/`error`, validez con espejo del control nativo, estados `user-invalid`/`user-valid` (solo tras interactuar), `required`/`optional`, callbacks de form y `iswc-invalid`. El control sobrescribe `valorFormulario()` (lo que entra en `FormData`), `restablecer()` (`formResetCallback`), `validar()` si tiene reglas propias y `get controlNativo()`. **No** manejar el value solo visualmente (rompe form association). Guardián: `tests/gobernanza/reactivo.test.ts` (R2: todo `forms/*` con `formAssociated` extiende `IswcFormControl`, salvo los pendientes).
- **Validación:** escuchar el evento `invalid` nativo (cubre call explícita y submit; `checkValidity()` solo no avisa al enviar el form). **No** envolver `checkValidity()`. `ElementInternals` dispara `invalid` nativo.
- **Helper de fecha:** reutilizar `_shared/date-field-core.js`, `date-utils.js`, `picker-element.js`, `date-field-element.js`. **No** reimplementar.
- **Lectura de valor:** usar la propiedad `.value` del WC, no el form nativo (`FormData` no siempre refleja el WC).
- **Escala em y `font:inherit`** en controles nativos (ver actions). Slider: `format="{v}px"` es plantilla; rating/slider usan `tidy`/`clampTo` de `misc-utils.js`.

### S-K14 helpers

- **`iswc-floating`** = building block interno de posicionamiento; **no es API pública** (usar `<iswc-popover>` / `<iswc-tooltip>`).
- **`response-cache`** — IndexedDB SWR (`createResponseCache`).
- **Markdown:** `helpers/md-lite.js` (`mdToHtml()`) — markdown ligero sin deps npm (usar antes de `marked`/otra lib). `_shared/prompt-md.js` — variables `{{nombre}}` + render MD/HTML híbrido con chips de tono determinista (usado por `iswc-md-render`/`iswc-md-editor`).
- **`IswcUi.adoptCss`** en apps (mismo contrato que `_shared/adopt-css.js`, sin embeber CSS en el JS).
- **No** crear wrappers nuevos sobre `Intl`/`Observer`/`position`: elegir el helper existente. `iswc-observer` unifica intersection/mutation/resize.
- **Formatting de bytes:** `iswc-format-bytes autofit` — unidad más alta con valor ≥ 1 (`204800` → `200 KB`, no `0.2 MB`).

### S-K15 isp

- **Ports de ISP-SvelteComponents (Acme).** `block-layout.js` exporta `BreakpointHost` + helpers (`sizewFor`, `flagsFor`, `lerpFor`, `BREAKPOINTS`, `BREAKPOINT_W`). Los tres layouts heredan de ahí: reflejan `data-sizew`/`data-szw-*`, escriben `--clientw`/`--lerpw` y emiten `iswc-breakpoint`.
- **Slot props de Svelte** (`sizew`, `boolszw`, `lerpw`) **no existen** en Web Components: su equivalente exacto está documentado en `block-layout.md`.
- **Fallbacks de custom properties SIEMPRE a tokens del tema** (`--iswc-text`, `--iswc-accent`, …), **nunca** a un color literal. Verificar contra ISP con `data-palette="delfin"`.
- **ISP no define tokens** (no tiene `app.css`/`:root`, ni tipografía, ni tema oscuro). Al portar, la fuente de verdad son los **fallbacks dentro de los `var()`** de cada `.svelte`, no un archivo de tema.
- **No** `&[attr]` dentro de `:host`; **no** crear `size` colors ni un módulo por nivel de heading; **no** duplicar la maquinaria de breakpoints en cada layout.

### S-K16 layout

- **`<iswc-preview-component>`** es chrome del sistema de preview; se publica en `dist/cdn/preview/preview-component.min.mjs`. **No está en el catálogo del loader** (`L.load('iswc-preview-component')` no resuelve; no figura en `categories.layout`). Importar desde `dist/` (nunca desde `src/`: Pages 404 lucide). Ver errores #42–#43.
- **Full-page dialog:** `width="100vw"` + `spacing="0"`; en light DOM `::part(dialog) { width/height:100%; align-self/justify-self: stretch; border-radius:0; box-shadow:none }`. Ver `presentation.css` + clase `.iswc-view-sources`.
- **Style-attrs de `<iswc-dialog>`:** `width → --iswc-dialog-width`, `spacing → --iswc-dialog-spacing`; padding del host = `var(--iswc-dialog-spacing)`.
- **No** `iswc-split-panel` con % alto como sidebar fijo (deja hueco enorme): grid CSS con ancho fijo (`14.5rem`) o `position-in-pixels`.
- **ModalBase** (`layout/utils/modal-base.ts`) centraliza el ciclo de vida de `iswc-dialog`/`iswc-drawer` sobre la pila de capas de `core/position.ts` (`abrirCapaModal`/`cerrarCapaModal`: `inert` alrededor, trampa de Tab con shadows, foco devuelto), Escape y light-dismiss por el mismo cierre, `iswc-hide` cancelable, `role="dialog"` + `aria-modal` + `aria-labelledby`/`aria-label`, eventos `iswc-show`/`iswc-hide`/`iswc-after-show`/`iswc-after-hide` (`ModalBaseEventos`). Subclase define `__TEMPLATE`, `modalClass`, `closeAttr`, `animateOpen/Close`, hooks; refs vía `$modal`/`$backdrop`.
- **No** dejar un dialog "casi fullscreen" cuando el requisito es full page (padding del host + `max-height` del panel lo dejan a medias).
- **Armazón de app** (barra + vista con scroll propio, pestañas, acceso y sesión): `<iswc-app-shell>` + `<iswc-app-nav>` + `<iswc-session-menu>`/`<iswc-login-dropdown>`. Su WHAT vive en [`app-shell/spec.md`](app-shell/spec.md). **No** reescribir ese armazón por app ni meter fetch/tokens dentro de los tags: emiten eventos y la app resuelve.

### S-K17 media

- **Iconos:** `<iswc-icon icon="prefix:name">`; sistema propio (`core/icon-loader`): los íconos que usa el kit en `assets/iconify/` (`deno task icons`), el resto desde la API de Iconify; ninguna colección completa viaja en el repo (4-nov-2026). `iswc-icon` inyecta el SVG **inline** (no `<img>`) para que `currentColor` funcione.
- **Host de `iswc-icon`** es caja cuadrada 1em con `line-height:1`. Sin tamaño explícito la línea lo estira. `#normalizeInlineSvg()` fuerza `fill`/`stroke: currentColor` en hijos.
- **Iconos con paleta propia** (banderas, logos, emoji) **no** se normalizan a `currentColor` (paths sin `fill` heredarían el color del host → a medio pintar). Detección **por icono, no por colección** (`logos` es mixta).
- **Grid por colección:** el grid nativo no siempre es 24. el catálogo de la API (`/collections`, `height`) y el JSON del set traen el tamaño real (academicons 32, fa 512); un SVG local debe declarar `viewBox` con esas dimensiones (`deno task icons` lo conserva). **No** normalizar todos a `24`.
- **No** forzar `stroke: currentColor` a nivel `<svg>` en iconos de relleno (se contornean/engrosan). Solo pisar `stroke` en elementos que ya lo traen.
- **Bases derivadas de `import.meta.url`**, no de `location.pathname` (el bundle publicado encuentra sus assets). Si un SVG sale del DOM (PNG rasterizado, data-URI), materializar el color al exportar (no hereda `currentColor`).
- **No** usar `api.iconify.design` en runtime (el sistema es propio y se sirve con el bundle); **no** `<iconify-icon>`.

### S-K18 navigation

- **Tag children** (`iswc-tab-panel`, `iswc-carousel-item`, `iswc-tree-item`, `iswc-stepper-step`, `iswc-breadcrumb-item`) comparten `page` con el padre; no son tabs propios. Mantener parent-child; **no** separar tags children ni crear MD por child multi-tag.
- **Preservar teclado/ARIA** en tab-group, tree, carousel, stepper. Eventos `is-*` (no nativos `input`/`change`).
- En el CSS del módulo, no estilar `iswc-tab`/`iswc-tree-item` desde el padre con `mi-tag .algo`/`::slotted` mal usado (ver S-K4): dejar el estilo en el shadow del propio elemento.

### S-K19 overlays

- **Pila de capas única** (`core/position.ts`, sección «capas»): todo modal entra con `abrirCapaModal(host, { cerrar, inicial? })` y sale con `cerrarCapaModal(host)`; todo flotante (select, combobox, picker, dropdown, menú) con `createPopupDismiss`, que se apila sin `inert`. Escape y clic fuera son solo de la capa de arriba (`esCapaSuperior`): un `select` abierto dentro de un `dialog` se cierra primero. **No** trampas de foco ni listeners de Escape propios por componente. Una ventana no modal que convive con otras (`iswc-window`) pasa `inertizar: false`: no inertiza la página. Guardián `tests/navegador/overlays-f8.test.ts`.
- **Listeners de `document`/`window`** en `connectedCallback`/`disconnectedCallback` (handler guardado en campo privado); **nunca** en el constructor (fuga, bug en 11 componentes). Un overlay que monta/desmonta seguido es donde más se notan.
- **No** `will-change: transform` en superficies con zoom por `scale()`: el navegador rasteriza a escala 1 y el contenido SVG se ve borroso (`iswc-lightbox`).
- **No** animar propiedades de layout (padding/width/height) en transiciones; usar `transform`/`translate`.
- **No** `animation: both` en overlays (deja matriz identidad aplicada → el elemento se vuelve containing block y un `position: fixed` interno se desplaza). Usar `backwards`.
- Overlay colocado por JS con `left`/`top`/`transform`: **debe** ser `position: absolute|fixed` en su CSS (si no, ocupa espacio y desplaza el layout).

## Contratos

| Pieza | Contrato |
|---|---|
| Registro | entrada en `src/manifest.ts` |
| Fuente | `src/components/<cat>/<name>.ts` |
| Doc tag | `src/components/<cat>/<name>.md` |
| Preview | `src/previews/<cat>/<tag>.json` |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| Manifest coherente | page/script/style existen | `tests/gobernanza/manifest-paths.test.ts` |
| Enums en previews | solo valores válidos | `tests/componentes/attr-enums.test.ts` |
| Tokens `--iswc-color-*` | vocabulario estable | `tests/componentes/token-vocabulary.test.ts` |
| Botones eventos/color | contrato UI | `tests/componentes/button-events.test.ts`, `tests/componentes/button-color-appearance.test.ts` |
| Escala em en controles | herencia font-size | `tests/componentes/em-scale-font-inherit.test.ts` |
| Helpers homogéneos | tab + json + md | `tests/gobernanza/helpers-homogeneity.test.ts` |
| Molde reactivo | `@prop` sin reflejo a mano; forms sobre `IswcFormControl`; sin `aria-label` literal | `tests/gobernanza/reactivo.test.ts`, `tests/navegador/core-f8.test.ts` |
| Eventos tipados | emitidos = declarados; `events` y tabla «Eventos» generados | `tests/gobernanza/eventos.test.ts` |
| Textos por `t()` | es/en según `lang` heredado | `tests/navegador/textos-f8.test.ts` |
| Pila de capas | Escape/clic fuera solo arriba, `inert`, foco devuelto | `tests/navegador/overlays-f8.test.ts` |
| Accesibilidad | roles/pares ARIA en plantillas; axe en navegador | `tests/gobernanza/a11y-patrones.test.ts`, `tests/navegador/a11y-axe.test.ts` |
| Peso del molde | unión base ≤ 14 500 B br; button ≤ 9 108; input ≤ 14 971 | `tests/navegador/carga.test.ts` |
