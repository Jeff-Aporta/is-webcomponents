# Constraints — IS Web Components

Prohibiciones y reglas transversales ya pagadas. Detalle por dominio: [`componentes.md`](componentes.md), [`cdn.md`](cdn.md), [`iconos.md`](iconos.md). Historia de cada error: [`lessons.md`](lessons.md).

## Proceso

- No implementar comportamiento nuevo sin spec en `specs/` (o sección en el dominio).
- No cerrar un cambio sin `node tests/run-all.ts` verde (al menos tests sin servidor).
- No aflojar un guardián para "que pase": se arregla código o spec.
- No commitear `tests/` entero en gitignore — solo `*.tmp`, `coverage/`, `.cache/`.
- **Reusar antes de inventar.** Si el kit ya tiene `is-*`, `IsUi`, `_shared/*` o un preview controlado, úsalo. No rehacer la rueda (button/dialog/table/toast/icon).
- Fuente manda sobre preview; la ruta del preview sale de `manifest.js.page`. Preservar accesibilidad, validación y fallbacks. Leer callers antes de tocar un helper compartido.
- Preservar cambios concurrentes; el usuario gestiona commits.

## E2E (suite Stagehand)

- No importar fuentes `.ts` del kit desde la suite e2e con specifier `.js`:
  usar `.ts` explícito (`'../../system/toons.ts'`). Causa: la suite corre con
  `--experimental-strip-types`, que NO remapea `.js`→`.ts`, y el archivo muere
  con `ERR_MODULE_NOT_FOUND` al cargar (mató `01-is-code`).
- No re-escribir `.ts`/`.html` con literales acentuados desde PowerShell
  (`Set-Content`, redirección `>` u `Out-File` sin `-Encoding utf8`): re-encoda
  y corrompe UTF-8 (`ó`→`Ã³`); editar desde Node `writeFileSync(p, s, 'utf8')`
  o la herramienta de edición. Causa: literales del nav en `00-arranque` y el
  harness HTML de PatyIA quedaron con mojibake.

## Repo y estructura

- **Toda la fuente vive bajo `src/`**: `src/components`, `src/styles`, `src/previews`, `src/skills`, `src/utils` (health/e2e + system), `src/manifest.js`. En la raíz: `scripts/`, `dist/`, `tests/`, `specs/` (**contrato SDD**), `index.html`, `robots.txt`.
- No recrear carpetas de fuente en la raíz (`components/`, `styles/`, `previews/`, `skills/`); guardián `src-layout`.
- No hay `docs/` ni `src/docs/` (HTML SEO y planes de superpowers eliminados 31-ago y 03-sep-2026). El HTML SEO generado se retiró: no recrear un `docs/` en la raíz.
- **Previews = JSON homogéneo** `is-preview/v1` + `<is-preview-component>` + `behaviors/<tag>.js`. Único HTML permitido bajo previews: `src/previews/_shell.html`. **No** HTML por tag.
- **Utilerías (`helpers/`)**: cada módulo público tiene `manifest.page` (`.json`) + MD. `is-floating` = internal (sin tab). Guardián `helpers-homogeneity`.
- No mezclar profundidades en previews: desde categoría styles/components `../../`, scripts/dist `../../../`; desde `_shell.html` styles `../`, scripts/dist `../../`. `../../dist` desde categoría resuelve a `src/dist` (404, página en blanco).
- **No usar rutas root-absolute (`/...`)** en previews ni scripts: el sitio se publica en GH Pages bajo `/<repo>/`.

## Commits

- Conventional commits en español. Autor **solo Jeff-Aporta**; **nunca** `Co-authored-by` ni firmas de herramienta. Push solo con pedido explícito.
- No mezclar cambios no relacionados en un commit.
- Un refactor mecánico que abarca todo el repo se **commitea antes** de tocar otra cosa (mientras vive solo en el working tree, un rebase lo parte por la mitad y la mitad rota es indistinguible de la sana).
- **`git mv` con cambios sin commitear** el archivo aparece como `R` (no `A+M`) y confunde a herramientas que cuentan `M`; commitear lo pendiente antes de folderizar.

## Galería y URL

- No query params sueltos (`?docs=`, `?theme=`, `?cdnTab=`). Estado en **solo** `?s=<b64url JSON>` (`url-key` = key dentro del JSON, no el nombre del param). La galería mergea al cambiar `component`. Módulo `_shared/url-nav.js`.
- No `await load('all')` en boot de galería; deps on-demand (`GALLERY_CHROME_TAGS`).
- No asignar `.preview` como own-property antes del upgrade del CE (ver boot: `setHostPreview` = `delete` + `whenDefined`).
- No usar `prefers-color-scheme` como selector de tema; el tema es por `data-theme`/`data-palette` en `<html>` (default paleta `contapyme`).

## Boot (galería)

- CSS en `<link>` en el head; `await` solo shell tags mínimo + `import('./dist/cdn/layout/preview-component.min.js')`. No `await loadCSS*` / `await load('all')` / `await loadPageModules(cdn-panel)` como primer paint.
- `cdn-panel.js` importa `dist/cdn/feedback/cdn-snippet.min.js`, no `src/` (arrastra `md-editor` y cuelga el `Promise.all`).
- No reimportar `preview-component` desde `src/` si `load('all'|'layout')` ya lo registró desde `dist/cdn/`.

## CDN e iconos

- No emitir ni documentar `all.min.js` / bundles de categoría (solo listas de `import`; expandir a `.min.js` reales para estimar peso).
- No usar `<iconify-icon>` en light DOM del consumidor (API interna del componente).
- No cargar SVG de icono como `<img>` (rompe `currentColor`; inyectarlo inline).
- No commitear las 231 colecciones Iconify (~723 MB). Default: `mdi` + `tabler` (+ `--only` en `download-icons.ts`). No desanotar el `.gitignore`.
- No usar `api.iconify.design` en runtime (sistema propio, servido con el bundle).
- No hardcodear paths absolutos de iconos (`/assets/icons/...`) en dev (requiere `<base href>` correcto; usar `rootFromBaseURI()`).
- No pedir iconos con `fetch(..., { cache: 'force-cache' })` (sirve copia cacheada sin revalidar; usar `cache: 'default'`).
- No "normalizar" todos los SVG a `viewBox="0 0 24 24"` ni a `currentColor` (rompe familias con grid ≠ 24 y banderas/logos/emoji). Usar el metadato de Iconify (`collections.json`), no heurísticas de coordenadas.
- Bases de iconos derivadas de `import.meta.url`, no de `location.pathname`.

## Componentes

- No inventar valores de enum no declarados en el `.js` / MD del tag (`VALID_*`); no inventar por analogía con otros DS. Un enum inválido no lanza error: el elemento se pinta con el default.
- No hardcodear `color-scheme` en `:root` (solo `.theme-dark`/`.theme-light`); no `html,body { background }` en `is-base`/`palettes`; no default de paleta `insoft` (producto = `contapyme`).
- No presentar `marks-*`, engines internos ni `_shared/*` como custom elements públicos.
- No crear `size` colors; usar `font-size` contextual y `em`. Controles nativos en shadow con `font: inherit`.
- No CSS gigante en string dentro del `.ts`: archivo `.css` hermano + `adoptCss(shadow, import.meta.url)`. App/`tk-*` wrappers = datos → `is-*` + `.css` hermano + `IsUi.adoptCss`.
- No escribir `mi-tag .algo` en la hoja adoptada por `mi-tag` (CSS muerto; ver `::slotted`/`:host(mi-tag)`). No `&[attr]` dentro de `:host`.
- No duplicar `escapeHtml`/`copyText`/`tidy`/`clampTo` (ya en `_shared/`).
- No animar propiedades de layout (padding/width/height); usar `transform`/`translate`.

## Medición, posicionamiento y degradado

- **No medir un elemento antes de aplicarle la clase/atributo que cambia su forma** (medir la píldora en vez del círculo infla el tamaño y el layout "se arregla al scrollear"). Medir **contra un origen estable**, nunca contra el elemento que acabas de mover (delta converge a 0 en la 2ª pasada).
- El trigger debe medir lo mismo que su botón visible: un host 34×45 con círculo 45×45 da centros distintos y el abanico sale asimétrico.
- **`Number(null)`/`Number('')` es 0** y `Number.isFinite(0)` es true: un atributo **ausente** devuelve un valor válido. Comprobar `x == null || x === ''` **antes** de convertir un número.
- `document.querySelector(selector)` devuelve el primero del documento, no el que contiene al elemento: usar `closest(selector)`.
- Un overlay colocado con `left`/`top`/`transform` debe ser `position: absolute|fixed` (si no, ocupa espacio y desplaza el layout).
- **Texto con degradado recortado (`background-clip: text`):** necesita color plano de fallback antes y el degradado dentro de `@supports`; tope de luminosidad **absoluto** (`min(l, 0.42)`), no porcentaje; `text-shadow: none` (la sombra se ve a través del glifo); agrandar la caja pintada con `padding-block` + `margin-block` negativo (los descendentes que sobresalen quedan sin degradado). Cuando el valor computado dice una cosa y la captura otra, el problema es otra capa, no ese valor.
- **Contraste:** calcularlo (ratio WCAG, ≥3:1 texto grande, apuntar a 4.5:1), no juzgarlo a ojo. QA visual de verdad: captura + medición por CDP (a veces los números decían que estaba bien y la captura mostró lo contrario).
- Preview que **no** monta el shell de docs (`presentation.css` fija `html,body { height:100%; overflow:hidden }`) debe aportar su propio scroll: contenedor flex con `min-height:0` + hijo `flex:1; min-height:0; overflow-y:auto`. Un `IntersectionObserver` para lazy-load dentro de esa preview necesita `{ root: <el scrollable> }` (con viewport por defecto nunca dispara).

## Documentación

- No duplicar la carta de leyes en cada `*.md` de tag — enlazar `componentes.md` / categoría.
- Un MD por módulo JS/CSS; listar todos los tags (multi-tag = un solo doc). No crear MD por child multi-tag.
- Los `.md` **no se copian a `dist`**: se exponen desde el fuente. De las rutas, solo `raw.githubusercontent.com` los devuelve como `text/plain` (jsDelivr/Pages los mandan como `text/markdown` y el navegador los descarga).
- Los `<link>` del CSS de un componente NO van en los snippets: `adoptCss()` ya carga el `.min.css` hermano leyendo `import.meta.url`. En un snippet solo van `is-base.min.css` + `palettes.min.css`.

## Accesibilidad (a11y)

- **`prefers-reduced-motion: reduce` obligatorio** en cualquier CSS con `transition`/`animation` >100ms. Usar `@media (prefers-reduced-motion: reduce) { transition: none; animation: none; }` o equivalente. Aplica a: spinner, progress-bar, progress-ring, skeleton, toast-item, dock, scrollspy, split-panel, heatmap, inline-edit, input, mention, pin-input, color-picker, diagram-lightbox, etc. Guardián: `prefers-reduced-motion`.
- **Foco no restaurado al cerrar popups** → teclado perdido. `palette-selector`, `tooltip`, `popconfirm`, `confirm-modal`, `modal-verificacion`, `dialog`, `drawer`, `command-palette`: guardar `document.activeElement` al abrir y `focus()` al cerrar. Guardián: `popup-focus-restore`.
- **Listbox / menu sin roving tabindex** → Tab saca del widget sin explorar items. Para listbox/menu (palette-selector, autocomplete): `tabindex="-1"` en items, gestión de foco por Arrow keys + `aria-activedescendant`. Guardián: `roving-tabindex`.
- **Foco en `tabindex="-1"` sin `aria-activedescendant`** → lector de pantalla no anuncia el cambio. Combinar siempre: `tabindex="-1"` + `aria-activedescendant` en el contenedor activo. Guardián: `aria-activedescendant`.
- **`aria-modal` sin `aria-labelledby`** → modal sin título accesible. Confirmar siempre: `aria-modal="true"` ⇒ `aria-labelledby` apunta al título. Guardián: `aria-labelledby`.

## Seguridad

- **`innerHTML` con interpolación de datos** → XSS. Aplicar `escapeHtml()` (en `_shared/`) a TODO valor dinámico antes de asignar a `innerHTML`. Detectado en: `checkbox.preview.ts`, `input.preview.ts`, `maps.ts` (attribution + tileUrl), `treemap.ts`, `stat.ts`, `pages/ecosystem.ts`, `generate-templates.ts`, `fix-icon-viewbox.ts`. Guardián: `xss-escape`.
- **`esc()` no escapa backticks ni comillas** → XSS via template literals en atributo. Reemplazar con `escapeHtml()` que escapa `& < > " ' \``. Guardián: `xss-backtick`.
- **`allowHtml: true` en toast sin sanitización DOMPurify-like** → XSS. Si se permite HTML, sanitizar antes; por defecto `allowHtml: false`. Guardián: `toast-sanitize`.

## Lifecycle y cleanup

- **`unmount()` no-op en previews** → memory leak de listeners/timers. Cada `unmount()` debe limpiar:
  - `removeEventListener` de cualquier listener añadido en `mount()`
  - `clearInterval`/`clearTimeout` de cualquier timer activo
  - `AbortController.abort()` de cualquier fetch en curso
  - `disconnect()` de cualquier `IntersectionObserver`/`MutationObserver`/`ResizeObserver`
  Detectado en: `image-editor.preview.ts`, `video-playlist.preview.ts`, `video.preview.ts`, `dock.preview.ts`, `main.preview.ts`, `md-editor.preview.ts`, `popover.preview.ts`, `format.preview.ts`, `toast.preview.ts`, `gauge.preview.ts`, `dropdown.preview.ts`. Guardián: `unmount-cleanup`.
- **`customElements.whenDefined()` ausente en 14/16 previews** → race condition: el preview aplica cambios al elemento antes de que se haya upgraded. SIEMPRE `await customElements.whenDefined('is-X')` antes de cualquier manipulación. Guardián: `whenDefined-in-preview`.
- **`document.getElementById()` sin null guard** → `Cannot read properties of null`. SIEMPRE: `const el = document.getElementById('x'); if (!el) return;`. Detectado en 8+ previews. Guardián: `getElementById-null-guard`.
- **`setInterval` que sobrevive a `disconnectedCallback`** → timer zombie. Guardar el handle y `clearInterval` en `disconnectedCallback`. Detectado en: `relative-time.ts`, `format.ts`. Guardián: `setinterval-cleanup`.
- **`prefs.ts` traga `QuotaExceededError` con `try/catch { /* silent */ }`** → falla silenciosa de persistencia. Loggear warning + degradar gracefully (ej. usar `sessionStorage` o memoria). Guardián: `prefs-quota-error`.

## Determinismo

- **`Math.random()` en IDs de gradientes SVG (`sparkline.ts`)** → IDs cambian entre renders, refs se rompen. Usar `crypto.randomUUID()` o un counter determinista. Guardián: `deterministic-ids`.
- **Animaciones no-GPU en SVG: `transition: d` y `transition: r`** (org-chart.css, quadrant-chart.css) → animación costosa en main thread. Considerar `requestAnimationFrame` con `transform` o precomputar paths. Guardián: `gpu-animation`.

## Tipos y API

- **`DiagramTheme` no asignable a `TurtleTheme`** (diagramas): TurtleTheme tiene index signature `[key: string]: unknown` y DiagramTheme no. Usar `theme as unknown as TurtleTheme` en el call-site de `setData`. Guardián: `theme-cast`.
- **`TreeNode` local vs `TreeNode` imported** (tree-layout vs tree-view) → tipos estructuralmente distintos. Re-exportar `TreeNode` desde `_shared/tree-layout.ts` y usar ese. Guardián: `tree-node-unified`.
- **`WakeLockSentinel` declarado como `null`** (wake-lock.ts) → rechaza asignaciones. Cambiar tipo a `WakeLockSentinel | null`. Guardián: `wakelock-typing`.
- **`Array<T>` no asignable a `readonly T[]`** (layout-specs): arrays de layout no tienen readonly. Usar `as unknown as readonly T[]` en el call-site de `assignEdgeHues`. Guardián: `readonly-array-cast`.
- **`Event.detail` no existe** en `Event` → cast a `CustomEvent<{detail: T}>` siempre que uses `e.detail`. Detectado en 8+ previews. Guardián: `custom-event-detail`.
- **`Property 'checked' no existe en HTMLElement`** (speed-dial, etc.) → cast a `HTMLInputElement` cuando el host tiene un input interno. Guardián: `htmlinputelement-cast`.
- **`Node` vs `Element` vs `DocumentFragment`** (render.ts) → `getAttribute` no existe en `Node`. Narrow a `Element` o `DocumentFragment` según uso. Guardián: `node-narrow`.

## Testing y auditoría

- **`audit-components.ts` regex `\.js$` ignora todos los `.ts`** → falso negativo masivo en la auditoría de componentes. Cambiar a `\.[mc]?[jt]sx?$` o usar parser real. Guardián: `audit-extension`.
- **`download-iconify.{mjs,ts}` duplicados con defaults distintos** → drift silencioso entre CI y runtime. Mantener UNA versión; la otra es shim. Guardián: `no-duplicate-scripts`.
- **`parseDiagnostics` API inestable** (scripts TS) → TS 5.4+ lo movió a `internal`. Verificar API al actualizar TS. Guardián: `parse-diagnostics-version`.
- **`consistency.ts` regex `[:=]\s*\[` no soporta sintaxis TS `const X: TYPE = [...]`** → 0 atributos extraídos y 9 falsos 🟡 en `masked-input`/`inline-edit`/`mention` (todos con type annotation). El regex DEBE ser `(?:const|let|var)\s+NAME(?:\s*:\s*[A-Za-z_$<>\[|\], ]+)?\s*=\s*\[...\]`. Guardián: `observed-attrs-ts-type-annotation` (3 tests en `motor.test.ts`: masked-input, inline-edit, mention).
