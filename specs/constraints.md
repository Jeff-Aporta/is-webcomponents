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
