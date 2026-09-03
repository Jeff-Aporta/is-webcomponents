# AGENTS.md — Cerebro de agentes para IS Web Components

> **Lee este archivo ANTES de tocar nada.** Resume lo que ya descubrimos a base
> de errores. Si haces algo que está en "Errores a NO repetir" y lo rompes de
> nuevo, te vas a ganar un commit revertido.

## 1. ¿Qué es este repo?

Galería de Web Components vanilla de InSoft (`is-*`). Todo escrito a mano con
Custom Elements + Shadow DOM, sin frameworks, empaquetado con esbuild.

**Contrato SDD:** [`specs/README.md`](specs/README.md) — spec → tasks → código →
`node tests/run-all.ts`. Diario: este archivo. Antes de un cambio de
comportamiento, leer el dominio en `specs/<área>/spec.md`.

- Demo publicada: <https://jeff-aporta.github.io/is-webcomponents/>
- Repo: `Jeff-Aporta/is-webcomponents`
- Sirve por CDN jsDelivr: `https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/...`

## 2. Estructura — no inventar, sigue esto

```
c:\ContaPyme\Personal\apps\AppWebcomponents\
├── src/
│   ├── components/             # fuentes por categoría
│   │   ├── _shared/            # adopt-css, iconify-loader, prefs, …
│   │   ├── actions/            # button, fab, dropdown, …
│   │   ├── feedback/           # badge, toast, cdn-snippet, …
│   │   ├── forms/ · data/ · charts/ · diagrams/ · layout/ · …
│   │   ├── helpers/            # popover, IsUi (ui.js), observers, …
│   │   └── media/              # icon, avatar, video, …
│   ├── previews/
│   │   ├── home.html           # landing (profundidad 1)
│   │   └── <category>/is-<name>.html
│   ├── styles/                 # is-base, palettes, presentation, shell
│   ├── assets/icons/           # SVGs Iconify (+ .json índices)
│   ├── skills/is-webcomponents/
│   └── utils/                  # health/e2e (Stagehand) + system (toons, dev)
├── scripts/                    # build, serve, preview-chrome, …
├── dist/cdn/                   # artefactos CDN (jsDelivr / Pages)
├── tests/                      # *.test.mjs (commiteados; no ignorar la carpeta)
├── src/manifest.js             # SINGLE SOURCE OF TRUTH (inventario tags + previews)
├── index.html
├── robots.txt                  # crawl Pages; Allow: / (sin Disallow)
├── AGENTS.md · README.md
└── package.json
```

**NO** vuelvas a crear `components/`, `styles/`, `previews/` o `skills/` en la raíz.
`docs/` en la raíz **sí** existe: HTML SEO generado (`
`src/docs/`, `.superpowers/`, `.impeccable/` y partes de `dist/` **se regeneran o son notas
personales, no los toques a menos que sea explícito.**

## 3. Comandos importantes

```bash
# instalar devDeps (esbuild)
npm install

# levantar dev server (puerto 8391)
node scripts/serve.mjs

# build para CDN (tag.min.js + CSS + loader.min.js; SIN all.min.js ni category.*.min.js)
npm run build

# descargar iconos de Iconify (~300 MB si haces TODAS las colecciones, ~5 MB si solo mdi + tabler)
node scripts/download-icons.ts --only=mdi --only=tabler   # re-entrar varias veces si quieres más sets
node scripts/download-icons.ts --no-skip                  # fuerza redescarga
npm run icons:download                                     # todas las 231 colecciones

# escanear un proyecto consumidor y bajar solo los iconos usados
# (cascada: CDN propio del kit → api.iconify.design)
node scripts/download-iconify.ts --projectRoot=../mi-app --outputDir=assets/icons
npm run icons:from-project -- --projectRoot=. --outputDir=assets/icons

# verificaciones
node tests/theme-contract.test.ts         # 2 temas + 3 paletas + tokens --is-*
node tests/palette-and-snippet-contract.test.ts  # default contapyme + canvas + snippets
node scripts/verify-page.py                # requiere servidor corriendo en :8765 + playwright instalado
```

## 4. Convenciones del repo

### 4.1 Nombres y categorías

- Cada componente es `<is-{nombre}>` (siempre prefijo `is-`).
- Categorías válidas (en `manifest.js`): `actions`, `feedback`, `forms`, `data`,
  `charts`, `diagrams`, `layout`, `navigation`, `helpers`, `media`. **No existe
  `data-viz`**; los charts viven en `charts/`. Si ves `data-viz` en algún
  preview, es carpeta de los previews (`previews/data-viz/`) pero la categoría
  lógica sigue siendo `charts`.
- Los sub-componentes (p.ej. `is-kanban-card`, `is-tab-panel`) no aparecen en el
  sidebar de navegación; el manifest los lista pero comparten `page` con su
  padre.

### 4.2 Paths en previews

**Trampa mortal tras el move a `src/`.** Todo vive en `src/previews/…`, pero
`scripts/` y `dist/` siguen en la **raíz**. `styles/` y `components/` están
en `src/`. Las profundidades **no son iguales**:

```html
<!-- src/previews/actions/is-button.html (categoría = profundidad 2) -->
<script src="../../../scripts/preview-boot.js"></script>
<link rel="stylesheet" href="../../styles/is-base.css" />
<script type="module" src="../../../dist/cdn/core/loader.min.js"></script>
<!-- L.load(['is-button']) — no all.min.js -->
<!-- manifest script: ../../components/actions/button.js → src/components/... -->

<!-- src/previews/home.html (profundidad 1) -->
<script src="../../scripts/preview-boot.js"></script>
<link rel="stylesheet" href="../styles/is-base.css" />
<script type="module" src="../../dist/cdn/core/loader.min.js"></script>
```

> Si usas `../../dist` desde una categoría, resuelve a `src/dist` (404) y la
> página queda en blanco. Guardián: `tests/src-layout.test.ts` +
> `tests/preview-paths.test.ts`.

Si haces un folderize o rename masivo de previews, **corre `scripts/fix-preview-paths.ts`**
(ajustado a `src/previews`) o revisa profundidades a mano.

### 4.3 Tema y paleta

- `data-theme="light|dark"` en `<html>` (+ clase `.theme-dark` / `.theme-light`).
- `data-palette="contapyme|insoft|agrowin"` en `<html>` (**default = `contapyme`**).
- Tokens: `--is-bg`, `--is-text`, `--is-border`, `--is-color-brand`, etc.
  El prefijo `--is-*` es el canónico. **No uses `--pg-*`** (legacy).
- `is-base.css` / `palettes.css` = **solo variables**. No pintan el canvas.
  `color-scheme` solo en `.theme-dark` / `.theme-light`, nunca en `:root`.
- Snippets de demo (`demo-code.js`): la raíz del markup lleva `data-theme` +
  `data-palette` + `.theme-*` del preview, y se actualiza al cambiarlos.
- API de tamaño en componentes: escala por `font-size` / `em` — **nunca**
  `size=` ni `pgSize=`. Si encuentras `pgSize` es deuda, elimínalo.
- Guardián: `tests/palette-and-snippet-contract.test.ts` +
  `tests/theme-contract.test.ts`.

### 4.4 Estilo de iconos

Solo se usa `<is-icon icon="mdi:home">` (con prefijo Iconify) o
`<is-icon src="...">` (SVG/imagen custom). **Nunca uses `<iconify-icon>`
directamente en light DOM** — es API interna del componente.

### 4.5 Estilo de commits

Conventional commits en español. Autor **solo Jeff-Aporta**. **Nunca**
`Co-authored-by` ni firmas de herramienta.

```
feat(icons): 13k iconos locales + loader local-first
chore(previews): ajustar paths un nivel arriba + build copia icons
refactor(previews): folderizar por categoria
build(cdn): regenerar bundles despues de folderize
```

**No mezcles cambios no relacionados en un commit.** Si encuentras un ajuste
3D en `home.html` mientras folderizas previews, lo correcto es partirlo.

## 5. Sistema de iconos (la pieza más frágil)

### 5.1 Resolución en cadena

`src/components/_shared/iconify-loader.js` resuelve cada `<is-icon icon="X:Y">` así:

```
1. assets/icons/X.json          → ¿está Y en la lista?    (local index)
2. {base}/assets/icons/X/Y.svg → <img src> local          (local SVG)
3. https://cdn.jsdelivr.net/... → mirror jsDelivr         (CDN público)
4. https://api.iconify.design/... → API oficial           (CDN con latencia)
5. <iconify-icon> iconify.min.js → web component fallback
```

Si tocas el loader y rompes la cadena, **todos los iconos se quedan en
blanco** sin error de consola. Verifica con `tests/icons.test.mjs` (ver §7).

### 5.2 Trampas que ya nos mordieron

- **Hardcodear paths absolutos** tipo `/assets/icons/mdi.json` solo funciona
  en producción con `base href` correcto. Para dev local con previews en
  `previews/<cat>/`, hay que usar `rootFromBaseURI()` o un `<base href>`.
- **No confiar en `cache: 'force-cache'` para SVG**: el `<img>` no respeta los
  headers de Cache-Control del fetch programático. El loader pre-resuelve
  URLs, no el `<img>`, así que esta trampa está mitigada, pero no la
  reintroduzcas en otras partes.
- **El `<iconify-icon>` de Iconify** carga un web component JS de ~50 KB solo
  para ser fallback. Si te toca añadir un SVG, **primero intenta el `<img>`
  local**, no el `<iconify-icon>`.
- **`index.json` por colección**: si borras `assets/icons/mdi.json`, el
  índice cachea `null` y todos los iconos `mdi:*` caen al fallback hasta
  recargar la página. El `inflight` map evita fetches concurrentes, pero
  también cachea el `null`.

### 5.3 Descarga de iconos

```bash
# descargar SOLO las colecciones que vas a usar (rápido, ~5 MB para mdi+tabler)
node scripts/download-icons.ts --only=mdi --only=tabler

# descargar todas las 231 colecciones (~218 s, ~723 MB)
node scripts/download-icons.ts
```

El script es idempotente: si la colección ya está completa (matchea el total
de la API), la salta. Si solo faltan algunos iconos, los baja sueltos.


## Carta de leyes (léela primero)

**Reusar antes de inventar.** Si el kit ya tiene `is-*`, `IsUi`, `_shared/*` o un preview controlado, úsalo. No rehacer la rueda.

| Hacer | No hacer |
| --- | --- |
| Fuente bajo `src/` (`components`, `styles`, `previews`, `skills`, `assets`, `docs`) | Recrear `components/` `styles/` `previews/` `skills/` en la raíz. No recrear un `docs/` en la raíz: el HTML SEO se retiro el 31-ago-2026 |
| Consumir por CDN (`dist/cdn/`) + MD raw bajo `…/main/src/components/` | `npx skills add` / npm del kit (aún no hay paquete); artefactos sueltos en `dist/*.js` |
| Wrappers `app-*`/`tk-*` = datos → `is-*` + `.css` hermano + `IsUi.adoptCss` | CSS gigante en string dentro del `.ts`; reinventar button/dialog/table/toast/icon |
| Preview: JSON `is-preview/v1` + `<is-preview-component>` + `behaviors/<tag>.js` opcional | HTML por tag; lógica en `eval` / strings de listeners; iframe legado |
| Utilería pública en `helpers/`: `manifest.page` (`.json`) + MD | Módulo público sin tab en Utilerías (`is-floating` es la excepción: internal) |
| Enums/API solo del MD / `VALID_*` del `.js` | Inventar `variant="ghost"` / colores / eventos “porque se parece a otro DS” |
| Tema: `data-theme` + `data-palette`; default paleta `contapyme` | `prefers-color-scheme`; `color-scheme` en `:root`; default `insoft` |
| Estado de UI en URL: **solo** `?s=<b64url JSON>` (`url-key` = key dentro de `s`) | Query params sueltos (`?docs=`, `?cdnTab=`, `?theme=`) para nav de tabs/espejos |
| Pesos de archivo: `<is-format-bytes autofit>` | Inventar `0.2 MB`; inventar un `all.min.js` “de peso” |
| Publicación: solo `dist/cdn/<cat>/<tag>.min.js` (+ `loader.min.js`) | Emitir o commitear `all.min.js` / `category.*.min.js`; bundles huérfanos en `dist/` raíz |
| Commitear `tests/*.test.ts` | Meter `tests/` entero en gitignore (solo `*.tmp` / coverage / `.cache`); dejar `.mjs` sueltos |
| Refactor mecánico de tokens → commit atómico + `token-vocabulary` | Dejar el rename a medias en el working tree y rebasear encima |
| Galería: `.file-meta` (fuentes + pesos `.min`) + modal fuentes full-page con URL absoluta | `.vs-page-bar` con hints; `#vsPath` = path relativo; dialog a `96vw`/`70vh` |
| Diagramas con grupos: cajón por grupo + `ratio` guía (`er-spec.js`) | Layout plano con todos los nodos revueltos cuando el payload declara `groups[]` |
| Editor de código / snippets = `<is-code>` (`mode=block\|inline`, `readonly compact` en docs) | Tag `is-code-editor`; segundo motor CM; pintar docs con runMode suelto |
| Snippets HTML: `lang="html"` o dejar que `inferLanguage` / softFormat corran | Marcar `data-cm="1"` antes de paint; asumir default `javascript` con markup `<…>` |
| Consumo selectivo: `loader.min.js` + `L.load(tags\|cats)`; anti-redundancia | Volver a `load('is-button')` tras la categoría; publicar o documentar `all.min.js` / bundles de categoría |
| Docs LLM en artefactos: banner `/*! … */` + `dist/cdn/loader.md` | Minificar sin rutas MD; reinventar un segundo loader |
| **Galería boot:** CSS en `<link>` + shell tags + `preview-component` desde `dist/cdn`; deps de preview on-demand (`GALLERY_CHROME_TAGS` + tags del JSON) | `await loadCSS*` en path crítico; `await load('all')` en el shell; `await` de `cdn-panel`/`md-editor`; asignar `.preview` antes del upgrade del CE |
| Dev local galería: `node scripts/serve.mjs` (Cache-Control no-store) | Live Server desde carpeta padre como “servidor oficial” (más lento; OK solo para mirar) |

Guardianes: `tests/specs-sdd` · `tests/er-clusters` · `tests/src-layout` · `tests/robots-sitemap` · `helpers-homogeneity` · `preview-controller` · `preview-json-contract` · `preview-paths` · `dist-cdn-layout` · `attr-enums` · `token-vocabulary` · `button-events` · `button-color-appearance` · `palette-and-snippet-contract` · `llm-contract` · `url-nav` · `format-bytes-autofit` · `ux-gallery-invariants` · `gallery-sources-meta` · `gallery-boot` · `cdn-loader` · `cdn-folders` · `load-plan` · `code-infer-lang` · `demo-equiv`.

---

## Proyecto

- Web Components vanilla (`is-*`), shadow DOM, tokens `--is-*`.
- **Toda la fuente vive bajo `src/`**: `src/components`, `src/styles`, `src/previews`, `src/skills`, `src/utils` (health/e2e + system), `src/manifest.js`. En la raíz: `scripts/`, `dist/`, `tests/`, `specs/` (**contrato SDD**), `index.html`, `robots.txt`, `AGENTS.md`, `README.md`.
- Guardián: `tests/src-layout.test.ts` — falla si reaparecen `components/` / `styles/` / `previews/` / `skills/` en la raíz. **No hay carpetas `docs/` ni `src/docs/`** (se eliminaron los planes/specs de superpowers el 03-sep-2026; las lecciones viven en `LLM.md`).
- **Previews = JSON homogéneo**, no HTML por tag:
  - Archivo: `src/previews/<cat>/<tag>.json` con `$schema: "is-preview/v1"` (misma interface para todos).
  - Chrome: `<is-preview-component>` (galería in-app + `_shell.html?tag=` fullscreen).
  - Comportamiento: `src/previews/behaviors/<tag>.js` con `mount`/`unmount` reales — **nunca** en el JSON.
  - Índice: `src/previews/catalog.ts` (generado / mantenido) + `registry.loadPreview(tag)`.
  - Manifest `page:` apunta a `.json` (p. ej. `actions/is-button.json`).
  - **Único HTML permitido bajo previews:** `src/previews/_shell.html`.
  - Guía: `src/docs/preview-controller.md`. Guardianes: `preview-json-contract` + `preview-controller` + `preview-paths`.
- Docs LLM crudos (GitHub): base `…/main/src/` + `components/...`. `LLM_BASE` en `preview-chrome.js` termina en `/src`.
- **Utilerías (`helpers/`)**: cada módulo público tiene **tab** (`manifest.page` → JSON) + MD. Guardián: `tests/helpers-homogeneity.test.ts`. `is-floating` = internal (sin tab).
- Build: esbuild → **solo** `dist/cdn/`. Dev galería: **`node scripts/serve.mjs`** (puerto 8391; `Cache-Control: no-store`). Live Server desde `Personal/` funciona pero es más lento. Todo el kit es TypeScript: tests en `*.test.ts` (`node --import ./scripts/ts-resolve-hook.ts --test`), sin paso de compilación.
- **Boot de `index.html` (galería):** ver carta + error **#43**. Resumen: CSS estático; `await` solo shell mínimo; resto en background; `setHostPreview` borra own-property antes de asignar.
- Artefactos CDN: `dist/cdn/<cat>/<tag>.min.js` (+ `.min.css`). Guardián: `tests/dist-cdn-layout.test.ts` (nada suelto en `dist/` raíz salvo `.gitignore`).
- Tema/paleta por URL: `?s=<b64url({ theme, palette, embed?, component?, … })>`. **`prefers-color-scheme` NO se usa**.
- **Un solo query de estado: `s`.** Tabs (`url-key="docs"`), espejo CDN (`cdnTab`), componente de galería, etc. viven **dentro** del JSON de `?s=`. Módulo: `src/components/_shared/url-nav.js` (`readUrlNav` / `writeUrlNav`). La galería al cambiar `component` **mergea** el resto de keys (no borra `docs`/`cdnTab`).
- **No** añadir `?docs=api` ni `?cdnTab=enlaces`: eso se limpia al escribir y está prohibido en la carta.
- **No existen** `all.min.js` / `category.*.min.js` en dist. UI de bytes: `<is-format-bytes autofit>` solo donde haya tamaño conocido (p. ej. fuente TS).
- QA UX de demos: `node scripts/ux-audit.ts` (Playwright; report en `.tmp/ux-audit/`, ignorado). Artefactos locales `.tmp/` no se commitean.
- **Paleta default = `contapyme`**. Marca tipográfica `InSoft`; id de paleta `insoft` en minúsculas (API).

---

## Atributos de enum: valores inventados NO fallan

`<is-button variant="ghost">` cuando el componente solo aceptaba `filled | outlined | plain` **no lanza error, no avisa en consola y no se ve en el DOM**: el atributo no casa con ninguna regla CSS y el elemento se pinta con los valores por defecto. Se coló en 4 sitios sin que nada lo detectara.

- Antes de usar un valor de enum, **verificarlo en el componente**: `const VALID_<ATTR>` en el `.js`, o la línea de JSDoc `*  variant   filled | outlined | plain`.
- No inventar nombres por analogía con otros design systems (`text`, `ghost`, `info`, `subtle`). Lo que existe está declarado.
- `tests/attr-enums.test.ts` recorre las 147 previews y compara cada atributo de enum contra la fuente de verdad del componente. Encontró además `<is-callout color="info">` (callout no tiene `info`) y `<is-button variant="text">`.

---

## DO

### 3D en cards
- Rotación 3D **per-card** en `:hover`, nunca en el contenedor del grupo.
- Stack: `perspective` en el abuelo (`.home-stage`, `.home-showcase`) + `transform-style: preserve-3d` en el padre (`.home-*__grid`) + `transform: translateZ + rotateY/X` en cada card.
- Tilt como CSS vars (`--tilt-y`, `--tilt-x`, default `0deg`) sumadas al transform base, para que el JS de parallax pueda escribir `--pry/--prx` y el `:hover` solo **sume** sin pisar.
- Reset a `transform: none` en `@media (max-width: 960px)` y `@media (prefers-reduced-motion: reduce)` con `!important`.

### Theming (dark/light)
- Tokens `--is-bg`, `--is-text`, `--is-border`, `--is-accent`, `--hue-a..e` ya se adaptan al `data-theme`. Usarlos.
- Shadows complejas (multi-layer) y halos: definirlas como **CSS vars en `.home`** (`.home { --shadow-lift: ... }`) y override en `[data-theme="light"] .home`. Custom props cascadean, specificity gana.
- Auroras, orbes, halos con `opacity` explícito en light mode (en dark se ven al 100% por gradient, en light quedan como manchas).

### Color × appearance (botones y semánticos)
- **Dos dimensiones ortogonales.** `color` solo enlaza la familia a roles `--_tone-*` (`--_tone`, `-strong`, `-stronger`, `-text`, `-soft`, `-on`, …). `variant` solo consume esos roles (`filled` / `outlined` / `plain` / `ghost` / `soft` / `text`).
- **Añadir un color** = una regla `:host([color="nuevo"])` que mapee a `--_tone-*` desde tokens relativos de `is-base` / `palettes` (`--is-color-X`, `-strong`, `-stronger`, `-pale`, `-paler` + `--is-X-text` / `-soft`).
- **Añadir una apariencia** = una regla `:host([color][variant="…"])` genérica. **No** reabrir la matriz N×M.
- Vocabulario del tema = **relativo** (`strong`/`pale`), no numérico (`-600`/`-50`). Fallback en el sitio de uso: `var(--is-color-info-strong, #1c7ed6)`, nunca un bloque `--is-color-info-600:` en el `:host`.
- Guardián: `tests/button-color-appearance.test.ts`.
### Paleta default + canvas de la app (CDN)
- **Default = `contapyme`.** En `src/styles/palettes.css` va primero y se aplica a `:root, [data-palette="contapyme"]`. Fallbacks JS (`preview-boot`, `preview-chrome`, `chart-palette`, `palette-selector` primera entrada, `index.html`) → `'contapyme'`.
- Bootstrap consumidor:
  ```html
  <html lang="es" class="theme-dark" data-theme="dark" data-palette="contapyme">
  <link rel="stylesheet" href="…/is-base.min.css">
  <link rel="stylesheet" href="…/palettes.min.css">
  ```
- `is-base.css` / `palettes.css` **solo declaran tokens**. No pintan `html`/`body`. El canvas (`background`) lo define la app (`presentation.css` / `shell.css` son chrome de la galería, no van en el snippet CDN).
- `color-scheme` **solo** en `.theme-dark` / `.theme-light`, **nunca** en `:root` a secas. Si vuelve a `:root`, cargar el CDN oscurece apps claras sin que lo pidan.
- Guardián: `tests/palette-and-snippet-contract.test.ts`.

### Snippets de demo (`scripts/demo-code.js`)
- El markup pegable debe llevar en su raíz `data-theme`, `data-palette` y clase `.theme-dark|.theme-light` del preview actual:
  ```html
  <div class="matrix theme-dark" data-theme="dark" data-palette="contapyme">
    <div></div>
    …
  </div>
  ```
- Eso lo hace `withSnippetContext` / `stampContext`. **No reimplementar** a mano en cada preview.
- Reactivo: al cambiar tema/paleta (`is-theme-change`, `is-palette-change`, MutationObserver en `<html>`) se invalida el cache; si el panel está abierto, se regenera.
- El snippet CDN es fragmento mínimo (`<link>` + `<script>` + markup), **no** un HTML completo con `body { background }`.

### Texto con degradado recortado (`background-clip: text`)
- Ese texto **no tiene color propio**: lo pinta el degradado, y `-webkit-text-fill-color: transparent` lo deja invisible si el degradado falla. Todo selector así necesita override `[data-theme="light"]`.
- Los `--hue-a..e` se derivan de `--is-accent` con la **misma luminosidad en ambos temas**, y varias paradas se mezclan hacia `#fff`. Sobre el blanco del tema light eso es texto ilegible.
- El tope de luminosidad debe ser **absoluto** (`min(l, 0.42)`), no un porcentaje (`calc(l * 0.78)`): las semillas parten de luminosidades muy distintas (insoft `#e03131` → L .59; agrowin `yellowgreen` → L .79), así que un multiplicador uniforme deja una paleta en 3.5:1 mientras hunde otra. Con tope absoluto el peor caso de las tres paletas es 7.6:1.
- **El fallback va fuera de `@supports`, no detrás en orden de declaración.** `min()` dentro de `oklch(from …)` es reciente; si no se soporta, la declaración se descarta **entera** y el texto vuelve a quedar transparente. El fallback plano debe devolver `-webkit-text-fill-color: currentColor`.
- Vigilado por `tests/home-invariants.test.ts`.

### JS en previews
- Inyectar UI repetitiva con JS (`document.createElement` + `setAttribute`), no escribirla 30 veces en HTML.
- Custom elements: `createElement('is-icon')` + `setAttribute('icon', 'mdi:...')`. `innerHTML` con custom tags no garantiza upgrade.
- Navegar al demo del componente: `parent.postMessage({ type: 'is-select', tag }, location.origin)`. Mismo shape que usan los CTA del hero (`#ctaExplore` etc.).
- Gatear la inyección: si la card no tiene un `is-*` compatible, no inyectar el botón. Whitelist explícita de tags demoable.

### Parallax + hover coexisten
- JS escribe `--px/--py/--pz/--pry/--prx` (custom props), nunca `style.transform` inline. Inline mata el `:hover`.
- Transform compuesto en CSS: `translate3d(var(--px), var(--py), calc(var(--pz) + var(--lift))) rotateY(...) rotateX(...)`.

### Persistencia de WC (`_shared/prefs.js`)
- Un solo JSON: `localStorage['is-webcomponents'][tag][storage-key]`.
- Opt-in del consumidor (`remember-state` / `remember-scroll` + `storage-key`).
- Snapshot de grid → `replaceComponentPrefs`. Patch layout → `setComponentPrefs`. Reset → `removeComponentPrefs`.
- Scroll compartido: `_shared/scroll-memory.js` → `is-main` (policy `reload`) y block/flex/grid vía `BreakpointHost` (policy `always`).
- Geometría en layouts: `getWidth()`, `getHeight()`, `rect()` / `getRect()`, CSS `--clientw` / `--clienth`.
- Docs: `src/components/data/ag-grid.md`, `isp/block-layout.md`. Tests: `prefs-contract`, `main-scroll`, `layout-geometry-scroll`.

### Layout `src/` (post-move)
- Build: `compRoot = src/components`, estilos en `src/styles`, iconos en `src/assets/icons`.
- Único HTML de preview: `_shell.html` en `src/previews/` → scripts/dist `../../`, styles `../`.
- Raw GitHub LLM: `LLM_BASE` termina en `/src` → URLs `…/main/src/components/…`.
- Guardián: `tests/src-layout.test.ts` + `tests/preview-paths.test.ts` + `tests/dist-cdn-layout.test.ts`.

### Utilerías (`helpers/`)
- Nav label: **Utilerías**. Cada `.js` público tiene `manifest.page` → `helpers/<tag>.json` + MD.
- `is-ui` (módulo `IsUi`, no es CE) también tiene tab y presentador JSON.
- `is-floating` = internal → sin tab. Apps usan `<is-popover>` / `<is-tooltip>`.
- Guardián: `tests/helpers-homogeneity.test.ts`.

### Previews (`is-preview/v1` + `is-preview-component`)
- Guía: `src/docs/preview-controller.md`.
- Interface única: `PreviewDefinition` en `src/previews/_kit/types.d.ts` (`$schema: "is-preview/v1"`).
- Datos: `src/previews/<cat>/<tag>.json` — sections/blocks (`demo|callout|code|html|table|lede`).
  `equivHtml` / `equivNote` / `equivFlow` son opcionales en el schema pero **ya no se pintan**
  en demos (retirado el bloque «HTML puro equivalente»).
- Snippets `kind: "code"`: preferir `lang` explícito; si falta, `<is-code>` infiere (HTML vs JS).
- Runtime: `JsonPreview` + `registry.js` + `catalog.js`.
- Behavior opcional: `src/previews/behaviors/<tag>.js` exporta `mount(ctx)` / `unmount(ctx)`.
- Galería: siempre `loadPreview(tag)` in-app. Fullscreen: `_shell.html?tag=`.
- Migrar / regenerar: `node scripts/migrate-previews-to-json.ts` (si reaparecen HTML).
- **String OK en JSON:** markup de demos, snippets, CSS local, tablas, ledes.
- **String NO:** listeners, `whenDefined`, toggles de API — van en `behaviors/`.
- **No** volver a crear `*.html` por tag. Guardián: `tests/preview-json-contract.test.ts`.

### Apps consumidoras (CDN)
- Bootstrap: **solo** `loader.min.js` + `L.load(tags de la vista)` (o categoría, que **expande a tags**). CSS: `loadCSSBase` + `loadCSSPalettesDefault` o `<link>` a `is-base.min.css` / `palettes.min.css`.
- Docs loader: `src/cdn/loader.md` (+ `src/cdn/AGENTS.md`) · publicado `dist/cdn/loader.md` / `loader.min.js`.
- **Anti-redundancia:** `load('actions')` cubre `is-button`; un `load('is-button')` posterior **no** re-fetch (`has` / `skipped`). **No** hay archivo `all.min.js`; `load('all')` (si se usa) son jobs por tag.
- Cada `.min.js` empieza con comentario `/*! IS Web Components - docs (LLM) */` y URLs raw de MD (componente, categoría, kit, loader, skill).
- Preview «Ecosistema JS»: get started + playground del loader + catálogo `_shared/`.
- Docs: `components/AGENTS.md` → categoría → módulo (raw bajo `…/main/src/components/`).
- Dominio: `app-*`/`tk-*` traducen payload → `is-*`. CSS hermano + `IsUi.adoptCss(shadow, import.meta.url)`.
- Tras vaciar el shadow, volver a `adoptCss` (los `<link>` se borran).
- Forms: `.value` del WC; submit via cableado del kit (`requestSubmit`), no confiar solo en Shadow `type=submit`.
- Shells: grid CSS / `position-in-pixels`, no `is-split-panel` al 20% como aside fijo.

### `<is-code>` en demos / snippets
- Default de `lang` sin atributo = `javascript`. Markup `<is-button…>` **sin** `lang` se pinta mal (`<` = operador cian).
- **Hacer:** `lang="html"` en el JSON, o no marcar `data-cm` hasta que `paint` / bootstrap de `is-code` corran `inferLanguage` + `softFormat`.
- Vista docs: `readonly` + `compact` + softFormat (pretty HTML en pocas líneas).
- Tema propio: custom properties `--is-code-*` (`code-theme.js`) → tokens `.tok-*` nativos. No depender de CSS CDN (era CM: `cm-s-is-code`/`material-darker`).
- Guardián: `tests/code-infer-lang.test.ts`.

### Behaviors de preview (hosts DOM)
- Si el `mount` llama `document.getElementById('toaster').create(…)`, el host **debe existir** o crearse en el mismo `mount`. El JSON de demos a menudo solo trae botones.
- `ISComponentPreview.on(target, …)` tolera `target == null` (no crashea). Preferir `root.querySelector` acotado al `ctx.main`.
- Reusar `_shared/url-nav.js`; no reinventar b64url.

### `is-format-bytes autofit`
- Unidad más alta con valor **≥ 1** (`204800` → `200 KB`, no `0.2 MB`; desde `1 MiB` sí `MB`).

### Galería: fuentes del módulo + pesos CDN (ago/2026)
- Scripts: `demo-file-meta.js` (barra **única** `.file-meta-page`), `view-sources.js` (modal), `component-sources.js` (paths + fetch).
- **Una sola vez** arriba del preview (hijo de `is-main.main`): botones JS/CSS/MD + chips `<code>` de path `.min` + `<is-format-bytes autofit>`.
- Paths **sin** `<is-code>` (CM hacía scrollIntoView y en F5 el docs iba al final).
- Al montar la barra: preservar scroll de `is-main` (+ re-`restoreScroll`). `<is-code>` usa `#withOuterScroll`.
- **No** bajo cada `h2` de sección ni dentro de cada paper/`is-demo`.
- Opt-out de página: no montar si el tag no está en manifest (o retirar el script).
- Modal `#is-view-sources-dialog`: `<is-dialog class="is-view-sources">` full page (`width="100vw"` `spacing="0"`; CSS `::part(dialog)` stretch). Contenido en `<is-code readonly compact>`.
- **Pintar de verdad:** `value`/`data-cm-source` llenos **no** equivalen a CM visible. Abrir el dialog **antes** de `loadKind`; `refreshEditor` en `is-after-show` y `is-tab-show`; `paintOne` siempre hace `el.value = text`; si `#cm.getValue()` está vacío, volcar el seed. Chrome: `GALLERY_CHROME_TAGS` incluye `is-tab-group`.
- `#vsPath` = `<a>` con **URL absoluta** (`localSourceUrl` / fetch `result.url`), clickeable. Header “Abrir” igual.
- Barra de página = solo `.file-meta-page`, **sin sticky** (scrollea con el contenido). **Sin** textos tipo “sin minificar / auditoría / GH Pages”.
- Tag de editor: **`is-code`** (preview `component: "is-code"`). Docs categoría: `src/components/code/AGENTS.md`.
- Guardián estático: `tests/gallery-sources-meta.test.ts`. Audit Playwright opcional: `scripts/audit-file-meta.ts`.

### Roadmap LaTeX (categoría `code`, sin scaffold aún)
- Futuro `<is-latex>` (ecuaciones + export SVG/PNG) y `<is-latex-doc>` (IDE `.tex`: TOC, BibTeX, `\ref`, autocomplete, auto-`\end{}`).
- **Reusar** `<is-code>` + `registerLanguage` + `is-dialog` / layout; motor math por CDN. No CodeMirror 6 ni segundo editor.
- Detalle y fases: `src/components/code/AGENTS.md` → sección Roadmap.

---

## DON'T

- **No rotar el grupo entero.** `transform: rotateY/X` en `.home-stage__grid` / `.home-lab__grid` / `.home-collage__track` = todas las cards se mueven juntas, pierde el efecto individual. El usuario lo lee como "no hay efecto hover" aunque la card sí se levante.
- **No hardcodear `#fff` en shadows/text-shadows sin override light.** En dark es un highlight sutil, en light es invisible (blanco sobre claro). En light, subir a 70-90%.
- **No hardcodear `rgb(0 0 0 / X%)` en shadows sin override light.** En dark queda bien, en light es una mancha negra. Bajar a 9-13% en light.
- **No usar `innerHTML` para custom elements** que no estén ya upgraded. Riesgo de que el elemento quede como HTMLElement sin shadow DOM.
- **No usar `prefers-color-scheme`** como selector de tema. El tema es por `data-theme` en `<html>`. Si el OS cambia, el preview no se entera — y eso es lo que se quiere (la preview es determinista por URL).
- **No poner `color-scheme` en `:root` de `is-base.css`.** Solo en `.theme-dark` / `.theme-light`. En `:root` oscurece el canvas del browser al pegar el CDN en una app clara.
- **No pintar `html`/`body { background }` en `is-base.css` ni `palettes.css`.** El canvas es de la app. El chrome de la galería (`presentation.css`, `shell.css`) sí puede; el snippet CDN no los incluye.
- **No dejar el default de paleta en `insoft`.** Default = `contapyme`. No revertir fallbacks JS/HTML/CSS a `'insoft'` “porque historicamente era así”.
- **No emitir snippets de demo sin `data-theme` + `data-palette` (+ `.theme-*`) en la raíz del markup.** Sin eso el ejemplo no hereda el contexto al pegarlo; no inventar otro wrapper — usar `withSnippetContext`.
- **No meter `style.transform` inline** en elementos con `:hover` 3D. El inline gana al `:hover` y el tilt desaparece.
- **No olvidarse del reset responsive/reduced-motion.** Si el 3D se queda en móvil o con reduced-motion, la página se rompe visualmente.
- **No `localStorage.setItem(keyPlana)`** para estado de WC con `storage-key`. Tampoco `sessionStorage` canónico ni root `is-components` (solo migración). Un solo store: `prefs.js` → `is-webcomponents[tag][key]`.
- **No dejar UI de columnas “en el HTML del shadow” sin cablear** (sidebar `hidden` sin handlers): bug real de `is-ag-grid`.
- **No meter lógica de preview en strings/`eval`.** Markup de demos sí puede ser HTML string en el JSON; listeners y API live van en `behaviors/<tag>.js` (`mount` con funciones reales).
- **No recrear HTML por componente bajo `src/previews/`.** Solo `_shell.html`. Datos = JSON `is-preview/v1`; chrome = `<is-preview-component>`.
- **No dejar bundles sueltos en `dist/`** (p. ej. `dist/ag-grid.js`). La publicación es **solo** `dist/cdn/…`. El build actual no limpia basura vieja: si aparece un `.js` en la raíz de `dist/`, bórralo.
- **No usar la misma profundidad de `../` para `styles` y para `scripts`/`dist` en `_shell.html`.** Shell en `src/previews/` → styles `../`, scripts/dist `../../`.
- **No reinventar botones/forms/tables/dialogs/toasts/icons** si el kit ya tiene `is-*`. Apps: wrappers `app-*`/`tk-*` que traducen datos al kit + CSS hermano + `IsUi.adoptCss`.
- **No crear query params sueltos para estado de UI** (`?docs=`, `?cdnTab=`, `?theme=` live). Todo va en `?s=`. `url-key` es la **clave dentro** del JSON, no el nombre del param.
- **No formatear pesos como `0.2 MB`.** Usar `<is-format-bytes autofit>` (o la misma regla ≥ 1 unidad).
- **No asumir que `#toaster` / `#grid` existen** en el JSON de demos. El behavior los crea o falla el UX en silencio/`TypeError`.
- **No sumar un archivo `all.min.js` / `category.*.min.js`.** Ya no se emiten. `load('all')` / categoría = jobs por tag (`load-plan.js`).
- **No commitear `.tmp/` ni reports de `ux-audit`.** Sí commitear `scripts/ux-audit.ts` y `tests/*.test.ts`.
- **No poner CSS de dominio como string gigante en el `.ts`.** Archivo `.css` hermano + `adoptCss(shadow, import.meta.url)`. Tras `innerHTML = ''` del shadow, volver a llamar `adoptCss`.
- **No asumir que `type="submit"` en `<is-button>` envía un `<form>` light-DOM.** El `<button>` real está en Shadow DOM; usar `requestSubmit` cableado en el kit o `onclick` que dispare submit del form.
- **No usar `is-split-panel` con `%` alto como “sidebar fijo”** (p. ej. 20%): deja un hueco enorme. Shells de app: grid CSS con ancho fijo (`14.5rem`) o `position-in-pixels`.
- **No instalar skills con `npx skills add` en el panel CDN.** Consumo = CDN + MD raw; el snippet ya no ofrece instalar skills por npm.
- **No duplicar la rampa de color en el `:host` del componente.** Ese bloque de fallbacks (`--is-color-danger-600: #e03131` dentro de `button.css`) es lo que hace que un desajuste de vocabulario con `is-base.css` sea **invisible**: el componente resuelve contra su propia copia y el tema deja de alcanzarlo, sin error. Fallback sí, pero en el `var(--x, #hex)` del sitio de uso, no como bloque paralelo.
- **No volver a la matriz color×variant N×M en `button.css`.** Cada combinación hardcodeada (`:host([color="info"][variant="outlined"])`) vuelve a acoplar dimensiones: un color nuevo o una apariencia nueva obliga a tocar todas las celdas y se olvida la mitad ( exactamente lo que pasó con `info`/`error` filled/outlined).
- **No pedir `--is-color-*-600` / `-500` / `-50` en componentes** cuando el tema solo define relativos. El CSS “vale”, el `var()` inválido se traga el valor y filled/outlined salen transparentes **sin error de consola**.
- **No hardcodear un hex de marca en filled** (`#228be6`) mientras outlined usa `--is-brand-text`: filled queda azul y outlined rojo (o al revés según paleta). Ambas apariencias deben pasar por `--_tone-*` de la misma familia.
- **No renombrar tokens sin pasar por `tests/token-vocabulary.test.ts`.** Un rebase o un merge parcial deja mitad de los archivos en cada convención y **nada falla**.
- **No documentar un evento que nadie emite.** `is-invalid` estuvo en la cabecera de `button.js`, en `button.md` y hasta en el vídeo del componente sin que existiera un solo `#emit("is-invalid")`. El consumidor pone su listener y no salta nunca.
- **No reemplazar el nodo interno sin volver a cablear sus listeners.** `#syncTag()` cambia `<button>` por `<a>` al aparecer `href`; los listeners vivían en el nodo viejo y `#wired` seguía en `true`, así que no se reponían. Poner `href` en caliente dejaba el botón mudo.
- **No enganchar la validación a `checkValidity()`.** `ElementInternals` dispara el evento `invalid` nativo tanto en la llamada explícita como al enviar el `<form>`; envolver solo los métodos deja el submit sin avisar. Escuchar `invalid`, no envolver.
- **No dejar que el preview enseñe menos de lo que el componente acepta.** `button.css` tenía las reglas completas de `info` y `error` mientras la matriz del preview mostraba cinco colores. Nadie lo nota: lo que falta no da error.
- **No confiar en que `<button>`/`<input>` hereden `font-size` del host.** Sin
  `font: inherit` (o `font-size: inherit`) la escala em del componente miente:
  todos los demos 0.75/1/1.25em salen iguales (`is-fab`, ago/2026).
- **No usar `this.variant` para el tono semántico** cuando la API es `color`
  (`fab`, `dropdown-item`, `toast` → `toast-item`). `variant` = apariencia
  (filled/outlined); `color` = familia.
- **No montar `.vs-page-bar` con hints** ni dejar comentarios de auditoría en el
  chrome de preview. Meta = `.file-meta*`.
- **No poner path relativo en `#vsPath`** del visor de fuentes: siempre URL con host.
- **No dejar el modal de fuentes a tamaño “casi viewport”** (`96vw` / `70vh`): full page.
- **No abrir la galería con `component: "is-code-editor"`** ni documentar ese tag.
- **Los tests son `.test.ts`**: Node 22 los ejecuta sin compilar; no quedan `.mjs` en `tests/`
  (artifacts `tests/*.tmp` / `coverage` / `.cache` sí van en gitignore; la carpeta no).
- **No volver a pintar «HTML puro equivalente»** bajo demos (`renderDemoEquiv` /
  `.demo-equiv`). `equivHtml` puede vivir en el JSON; el chrome **no** lo muestra.
- **No marcar `data-cm="1"` al crear snippets** en `render.js` antes de que corra
  `paint` / bootstrap: se salta `inferLanguage` + `softFormat` y el HTML queda
  en una línea con coloreado JS.
- **No asumir que `lang` default sirve para HTML.** Sin `lang` o inferencia,
  CodeMirror trata `<` como operador (cian) — se ve “mal pintado” sin error.
- **No re-descargar un tag ya cubierto por su categoría** vía loader: es
  anti-patrón; el planificador debe devolver `skipped`. **No** emitir ni
  documentar `all.min.js` / `category.*.min.js`. `load('all')` (API) = jobs por tag.
- **No minificar sin banner MD** en `scripts/build.mjs`: cada `.min.js` lleva
  rutas raw para LLMs; `loader.md` se copia a `dist/cdn/`.
- **No reimportar `src/components/layout/preview-component.js` en la galería
  Pages** tras cargar layout/preview desde `dist/cdn`: re-arrastra `icon-loader`
  desde fuente y 404-ea JSON de iconos gitignoreados.
- **No hacer el primer paint de la galería depender de `await L.loadCSS*` /
  `await L.load('all')` / `await L.loadPageModules(...)`.** CSS = `<link>`.
  Shell = tags mínimos + `import('./dist/cdn/layout/preview-component.min.js')`.
  Resto on-demand (`ensurePreviewDeps` / `GALLERY_CHROME_TAGS`), sin bloquear `kitShell`.
- **No poner `cdn-panel.js` (ni nada que importe `cdn-snippet` desde `src/`) en el
  path crítico del boot.** `cdn-snippet` → `md-editor` cuelga el `Promise.all`
  varios segundos. El panel se carga en background; el CE ya viene de
  `dist/cdn/feedback/cdn-snippet.min.js` o de `L.load('feedback')`.
- **No asignar `previewHost.preview = …` antes de que el tag esté defined.**
  Top-level await del `<head>` **no** bloquea el módulo del `<body>`: el body
  puede correr mientras el loader sigue. Eso crea una **own property** que
  tapa el setter de `<is-preview-component>` → main vacío, demos invisibles,
  sin error de consola. Siempre `whenDefined` + `delete host.preview` (own) antes
  de asignar (`setHostPreview` en `index.html`).
- **No asumir que `is-preview-component` está en el catálogo del loader.** No está
  en `categories.layout`; entra por `import` de
  `dist/cdn/layout/preview-component.min.js`.
- **No declarar listo el visor de fuentes porque `value` / `data-cm-source` tienen texto.**
  El getter de `is-code` puede devolver el seed con CodeMirror vacío. Ver error **#44**.

## Errores aprendidos (no repetir)

1. **"No debe girar todo el grupo"** → el grupo tenía `transform: rotateY(-6deg) rotateX(3deg)` + `:hover` que reducía la rotación. Las cards se levantaban (`translateZ`) pero el usuario no percibía hover porque el grupo se movía como bloque. Fix: quitar rotación del grupo, mover el tilt a la card individual.

2. **Shadows invisibles en light mode** → `color-mix(in srgb, #fff 7%, transparent)` en inset = highlight que en light mode es blanco sobre claro = nada. Idem `rgb(0 0 0 / 26%)` que en light es sombra demasiado negra. Fix: override `[data-theme="light"]` que sube el blanco a 75-92% y baja el negro a 9-13%.

3. **Halos y orbes como manchas en light** → `opacity: 0.5` con hues oscuros (que en light son colores de marca oscuros) = mancha oscura sobre fondo claro. Fix: bajar opacity a 0.28-0.55 explícitamente en light, o el `::after/::before` queda invisible en dark y overwhelming en light.

4. **JS parallax matando el hover** → primera versión hacía `c.style.transform = '...'`, eso gana al `:hover` y la card no se levantaba al pasar el mouse. Fix: JS escribe custom props, CSS compone el transform.

5. **`<is-icon>` inyectado como innerHTML** → no se upgradeaba el shadow DOM, salía el tag vacío o con fallback roto. Fix: `document.createElement('is-icon')` + `setAttribute('icon', 'mdi:...')` y append. Upgrade garantizado porque el script del componente ya cargó.

6. **`variant="ghost"` inventado** → se usó en 4 sitios del explorador cuando `is-button` solo aceptaba `filled | outlined | plain`. Ningún síntoma: los botones se pintaban con el default. Hoy `ghost` **sí existe** (reposo = outlined, hover = filled) y necesita `--_text-hover` / `--_border-hover`, porque al pasar a filled tienen que cambiar también el texto y el borde, no solo el fondo. No confundir con `plain`, que no tiene borde en ningún estado. Fix del error: verificar el enum antes de usarlo + `tests/attr-enums.test.ts`.

7. **Dos grafías de la marca conviviendo** → `index.html` componía el wordmark con `accent: 'Soft'` (correcto) mientras `is-palette-selector` usaba `accentLabel: 'soft'`. La misma página mostraba «inSoft» arriba e «insoft» en el selector de paleta. Fix: unificar a `InSoft` en texto visible (83 ocurrencias), **sin** tocar el identificador `insoft`.

8. **Heredoc de bash comiéndose el escapado de una regex** → escribir un test con `cat >> file << 'EOF'` convirtió `\\[` en `\[` y `\${base}` dejó de interpolar, así que la regex del test comparaba contra el literal `${base}` y fallaba por un motivo falso. Fix: escribir archivos con la herramienta de edición, no con heredoc, cuando el contenido lleva backslashes o `${}`.

9. **Cards sin icono de demo** → el usuario no podía navegar al demo del componente desde la card. Fix: JS inyecta un `<button class="card-demo"><is-icon icon="mdi:open-in-new"></button>` en cada `.tile/.collage-card/.lab-card` que tenga un `is-*` de la whitelist. Click → `postMessage('is-select', tag)`.

10. **Persistencia de WC fragmentada** → keys planas / `sessionStorage` / root `is-components` / sidebar de columnas en template sin cablear. Fix: un solo `localStorage['is-webcomponents'][tag][storage-key]` vía `_shared/prefs.js`; `is-ag-grid` con panel de checks + `resetPersistedState`. Guardián: `tests/prefs-contract.test.ts`. Docs: `src/components/data/ag-grid.md`.

11. **Paleta default = insoft** → el kit vivía en rojo InSoft; ContaPyme/ISP es el producto real. Quien pegaba el CDN sin `data-palette` (o con fallbacks JS en `'insoft'`) veía marca incorrecta. Fix: default `contapyme` en CSS (`:root`), HTML, fallbacks y `DEFAULT_PALETTES[0]`. Guardián: `tests/palette-and-snippet-contract.test.ts`.

12. **`color-scheme: dark` en `:root`** → cargar `is-base.min.css` hacía que el browser pintara el canvas oscuro aunque la app fuera clara. El kit no debe decidir el fondo de página. Fix: `color-scheme` solo en `.theme-dark` / `.theme-light`; sin `html,body { background }` en base/palettes.

13. **Snippets de demo sin tema/paleta** → el markup copiado (`<div class="matrix">…`) no llevaba `data-theme`/`data-palette`; al pegarlo en otra app no heredaba el contexto del preview. Fix: `withSnippetContext` en `demo-code.js` sella la raíz y se actualiza al cambiar tema/paleta.

14. **Move a `src/` a medias** → carpetas en `src/` pero `build.mjs` / tests / previews seguían apuntando a la raíz: build vacío, previews en blanco (`../../dist` → `src/dist` inexistente), LLM raw 404. Fix: `compRoot`/`styles`/`icons` bajo `src/`; previews categoría `../../../scripts|dist` + `../../styles|components`; `LLM_BASE` …`/main/src`; guardián `tests/src-layout.test.ts` + `tests/preview-paths.test.ts`.

15. **CSS embebido en apps consumidoras** → `_ui.ts` / `app-*.ts` con CSS en template strings: imposible minificar aparte, divergía del kit. Fix: `helpers/ui` → `IsUi.adoptCss` + `.css` hermano (mismo contrato que `_shared/adopt-css.js`).

16. **Login / forms que “no hacen submit”** → `<is-button type="submit">` dentro de form light-DOM: el click no bidirecciona al form. Fix en kit: `requestSubmit`/`reset` en `button.js`; apps: no depender solo del type nativo sin el cableado.

17. **Sidebar con `is-split-panel` al 20%** → nav estrecho + vacío enorme. Fix: layout grid fijo, no porcentaje de split como “aside”.

18. **FormData vs `.value` en `is-input`** → leer el form nativo no siempre refleja el valor del WC; usar la propiedad `.value` del custom element (o el contrato documentado en el MD del módulo).

19. **Refactor de tokens a medias tras un rebase — el error más caro de la lista** → se renombró la escala de color de numérica a relativa (`--is-color-danger-600` → `--is-color-danger-strong`, `-50` → `-paler`, `-700` → `-stronger`, `-800` → `-strongest`). El cambio tocaba 603 ocurrencias en 107 archivos y quedó **sin commitear**; un `pull --rebase` posterior más el move a `src/` lo dejaron aplicado solo en `is-base.css` y `palettes.css`, con 48 CSS de componente todavía en la convención vieja.
    **No falló nada.** Ni el build, ni el navegador, ni una vista. Porque cada componente define su propia rampa en el `:host`: al no encontrar el token del tema resolvía contra su copia local y seguía pintando. El síntoma real era mudo — `color="danger"` se quedaba en el rojo viejo y **cambiar de paleta dejaba de afectar al componente**.
    Fix: `tests/token-vocabulary.test.ts`, que exige que todo `--is-color-*` consumido por un componente esté definido en la capa de tema, y que el tema no mezcle las dos convenciones. Detectó 35 tokens huérfanos en 48 archivos a la primera.
    **Lección de proceso, no de CSS:** un refactor mecánico que abarca todo el repo se commitea antes de tocar otra cosa. Mientras vive solo en el working tree, cualquier rebase lo parte por la mitad y la mitad rota es indistinguible de la sana.

20. **Evento documentado que nadie emitía** → `is-invalid` aparecía en la cabecera de `button.js`, en `button.md` y en el vídeo del componente, pero `#emit` solo se llamaba para `is-focus`, `is-blur` e `is-click`. Un evento prometido y ausente no rompe nada: el consumidor registra su listener y espera para siempre. Fix: escuchar el evento `invalid` nativo (cubre la llamada explícita **y** el submit del form, cosa que envolver `checkValidity()` no haría) y reemitir. Guardián: `tests/button-events.test.ts`, que cruza los eventos documentados con los `#emit` reales.

21. **Listeners perdidos al mutar el nodo interno** → `#syncTag()` sustituye el `<button>` por un `<a>` cuando aparece `href`. Los listeners de `focus`/`blur`/`click` estaban en el nodo reemplazado y `#wired` seguía en `true`, así que `#wireEvents()` no los reponía: asignar `href` en caliente dejaba de emitir `is-click` sin que nada lo delatara — el enlace navegaba igual. Fix: re-enganchar los tres tras el `replaceWith`, usando los campos `#bound*` (referencias estables, re-añadir nunca duplica).

22. **El preview enseñaba cinco colores de siete** → `button.css` tenía las 18 reglas de `info` y `error` en todas las variantes, pero la matriz del preview y las filas de apariencia se habían quedado en `brand · neutral · success · warning · danger`. Lo que falta no da error, así que sobrevivió a varias revisiones. De paso el lede decía «el atributo `variant` define el color semántico, default `neutral`»: dos afirmaciones falsas (es `color`, y el default es `brand`).

23. **`danger` y `error` con el mismo rojo** → los dos existían pero eran casi indistinguibles, lo que anulaba la razón de tenerlos separados. Hoy: `danger: crimson` (acción destructiva, «voy a borrar esto») y `error: red` (estado de fallo, «esto se rompió»). Los fallbacks de `button.css` hay que moverlos **a la vez**; si se queda el hex viejo, el mismo botón se ve de dos rojos distintos según si el consumidor carga `is-base.css` o no.

24. **HTML gordo + lógica mezclada en previews** → 400+ líneas por tag, imposible homogeneizar. Fix: JSON `is-preview/v1` + `<is-preview-component>` + `behaviors/`. Guardián: `tests/preview-json-contract.test.ts` + `preview-controller`.

25. **Utilería sin tab** → `IsUi` existía en CDN/MD pero no en el nav: nadie lo descubría desde la galería. Fix: `is-ui` en manifest + presentador JSON; homogeneidad de helpers. Guardián: `tests/helpers-homogeneity.test.ts`.

26. **Lógica de preview como string** → tentación de meter handlers en JSON/`eval` “para serializar todo”. Rompe tipado, debug y seguridad. Fix: solo markup/CSS/código de muestra en el JSON; listeners = `behaviors/<tag>.js`.

27. **Migración HTML→JSON que pierde el body** → páginas sin `<section class="section">` (p. ej. `icon-explorer`) caían a un JSON vacío/casi vacío si el migrador no volcaba el body entero. Fix: sin sections → un bloque `html` con el body (menos scripts); verificar tamaños y `tests/icon-explorer` / contenido clave. Script: `scripts/migrate-previews-to-json.ts`.

28. **`dist/ag-grid.js` huérfano** → bundle viejo (sin minificar, paths pre-`src/`) commiteado fuera de `dist/cdn/`. Confundía: “¿por qué no está en CDN?”. No lo genera el build actual. Fix: borrar; publicar solo `dist/cdn/data/ag-grid.min.js`. Guardián: `tests/dist-cdn-layout.test.ts`.

29. **PowerShell `git show … > file` en UTF-16** → el archivo “existe” pero Node lo lee basura / sin matches (`fId` “desaparece”). Fix: escribir desde Node `execSync('git show …', { encoding: 'utf8' })` o `Out-File -Encoding utf8`.

30. **`info`/`error` filled y outlined rotos + brand filled de otro color** (5-ago-2026) → la matriz del preview mostraba `info`/`error` filled sin fondo y outlined sin borde; `brand` filled azul con outlined/plain rojos (paleta insoft). **Causa:** `button.css` seguía la escala numérica (`--is-color-info-600`, `-500`) que `is-base` ya no define (ahora `strong`/`pale`), y la matriz N×M hacía que solo las familias con fallbacks locales en `:host` (success/warning/danger) se vieran bien. Brand filled caía al hex azul del 2º `var()`; outlined usaba `--is-brand-text` de la paleta. **Nada fallaba en build ni consola.**
    **Hacer:** color → roles `--_tone-*`; variant → consume `--_tone-*`. Tokens relativos del tema. Fallback solo `var(--token, #hex)`.
    **No hacer:** reabrir `:host([color=X][variant=Y])` por cada celda; pedir `-600`/`-500`; hex de marca distinto del token de texto.
    Fix + guardián: `button.css` ortogonal + `tests/button-color-appearance.test.ts`.

31. **Escala em que no escala (`is-fab`)** (6-ago-2026) → el preview prometía tres
    tamaños (`font-size: 0.75em | 1em | 1.25em`) y los tres FABs salían idénticos.
    **Causa:** `--size: 3.5em` estaba bien, pero el `<button class="fab">` no
    declara `font: inherit` / el host no declara `font-size: inherit`. El UA del
    button fija ~16px y todos los `em` se resuelven contra ese valor. Mismo
    patrón en `pin-input` (`.cell` input), botones remove/close de tag/toast.
    De paso: `fab.js` escribía `this.variant` tras rename a `color` →
    `data-color="undefined"`. **Nada fallaba en build.**
    **Hacer:** `:host { font-size: inherit }` + control nativo `font: inherit`;
    tono con `this.color`; demos que cambien `font-size` en el host.
    **No hacer:** confiar en herencia UA de `button`/`input`; documentar escala
    sin guardián; mezclar `variant` (apariencia) con `color` (tono) en JS.
    Fix + guardián: `fab.css`/`fab.js` + `tests/em-scale-font-inherit.test.ts`.

32. **`?docs=` / `?cdnTab=` como params sueltos** (6-ago-2026) → `url-key` escribía
    `searchParams.set(key, value)` y convivía mal con `?s=` de la galería. Al
    cambiar de componente, `updateUrl()` reescribía solo `{ component }` y
    borraba el resto… o dejaba basura en la query.
    **Hacer:** `url-nav.js` lee/escribe keys **dentro** de `?s=` (b64url JSON);
    la galería mergea al actualizar `component`.
    **No hacer:** nuevos query params por feature; localStorage para tabs de docs.
    Guardián: `tests/url-nav.test.ts`.

33. **Toast demos sin host** (6-ago-2026) → JSON solo tenía botones; el behavior
    hacía `document.getElementById('toaster').create(…)` → `Cannot read
    properties of null (reading 'create')`. Los botones “funcionaban” (click OK)
    pero **no salía ningún toast**. UX mentía.
    **Hacer:** en `behaviors/is-toast.ts` crear `<is-toast id="toaster">` si falta;
    o incluirlo en el markup del demo.
    **No hacer:** documentar `toaster.create` sin garantizar el nodo en mount.
    Guardián: `tests/ux-gallery-invariants.test.ts`.

34. **Pesos CDN al revés** → sumar el tamaño de `all.min.js` (~lista de imports)
    hacía creer que “todo el kit” era lo más liviano. Fix histórico: expandir a
    `.min.js` reales + UI con `autofit` (nunca `0.2 MB`). Ya no hay `sizes.json`
    en dist; la galería no estima bytes del CDN.
    Guardián: `tests/format-bytes-autofit.test.ts` + checks en
    `ux-gallery-invariants`.

35. **QA UX: pageerrors reales vs ruido de clicks** (6-ago-2026) → un barrido
    Playwright (`scripts/ux-audit.ts`) marcó 17/158 “fail”. Parte era ruido
    (clicks al chrome «Ver código» CDN). Parte era bug real (`toast`, grids ISP
    `getState` null, `data-grid` `options` not iterable, `CodeMirror is not
    defined` en mutation-observer, 404 `diagram-lightbox.css` sin `.min`).
    **Hacer:** clasificar pageerror/console vs click timeout; arreglar hosts
    faltantes primero; report en `.tmp/ux-audit/` (no commit).
    **No hacer:** dar por roto un componente solo porque falló un click al
    icono `<>` del demo-code.

36. **`ISComponentPreview.on(null, …)`** → `this.on(main.querySelector('#x'), …)`
    con `#x` ausente tiraba al montar. Fix: no-op si no hay target.
    Guardián: `ux-gallery-invariants` (fuente contiene la guarda).

37. **Chrome de fuentes con comentarios + path relativo + modal chico** (10-ago-2026)
    → `.vs-page-bar` decía «Fuentes JS · CSS · MD Archivos del repo sin minificar
    (auditoría / GH Pages)»; el usuario pidió quitar esos comentarios. `#vsPath`
    mostraba `src/components/actions/button.js` sin host (imposible abrir el
    archivo real en Live Server). El dialog usaba `min(96vw)` / altura limitada.
    **Hacer:** solo `.file-meta-page`; `#vsPath` = `<a>` con URL absoluta;
    dialog `width="100vw"` `spacing="0"` + stretch; migrar instancia DOM vieja.
    **No hacer:** hints en chrome; `repoPath` crudo en la UI; segundo modal
    nativo; reintroducir `.vs-page-bar` “por compatibilidad”.
    Guardián: `tests/gallery-sources-meta.test.ts`. Docs: `code/AGENTS.md`.

38. **Preview vacío por tag renombrado** → bookmarks/audits con
    `is-code-editor` tras el rename a `is-code`. Nada “falla”: la galería no
    encuentra el componente. Fix: tag canónico `is-code` en manifest, behaviors,
    audits y docs. Guardián: `gallery-sources-meta` (manifest no contiene
    `is-code-editor`).

39. **Snippets HTML “mal pintados” (cian en tags)** (11-ago-2026)
    → `kind: "code"` en previews creaba `<is-code>` **sin** `lang` y con
    `data-cm="1"` prematuro. Default `lang=javascript` → `<` = operador
    (`--is-code-operator` cian); softFormat no corría. El usuario veía tags
    y brackets del mismo color, attrs apagados.
    **Hacer:** `lang` explícito o `inferLanguage` en bootstrap; no pre-marcar
    `data-cm`; softFormat en `compact`+`readonly`; tema nativo `--is-code-*`.
    **No hacer:** segundo highlighter; reintroducir CM ni `material-darker` CDN; asumir
    que “ya tiene data-cm así que está pintado”.
    Guardianes: `tests/code-infer-lang.test.ts`, `tests/demo-equiv.test.ts`.

40. **Bloque «HTML puro equivalente» en demos** → ruido documental bajo cada
    `is-demo` (`equivHtml` / flowchart). El usuario pidió quitarlo.
    **Hacer:** no llamar `renderDemoEquiv`; demos = solo el componente.
    **No hacer:** reintroducir el título/sección; exigir `equivHtml` en tests
    de piloto. Campos opcionales en types OK; pintar = no.
    Guardián: `tests/demo-equiv.test.ts`.

41. **Loader: recargas redundantes y docs invisibles** → pedir `actions` y
    luego `is-button` volvía a la red; `all.min.js` por defecto hincha.
    Minificados sin rutas MD dejaban a los LLM sin contexto.
    **Hacer:** `planLoads` + registro `has`/`skipped`; preferir categoría/tags;
    banner `/*! … docs (LLM) */` + copiar `loader.md` al dist.
    **No hacer:** reinventar un segundo entry CDN; VP9/WebM para overlays;
    OpenAI en este kit (Groq/ElevenLabs/MiniMax en otros proyectos).
    Guardianes: `tests/load-plan.test.ts`, `tests/cdn-loader.test.ts`.

42. **404 lucide/heroicons en GitHub Pages** (11-ago-2026)
    → En [jeff-aporta.github.io/is-webcomponents](https://jeff-aporta.github.io/is-webcomponents/?s=eyJjb21wb25lbnQiOiJpcy1idXR0b24ifQ)
    la galería hacía `load('all')` **y** `loadPageModules('src/…/preview-component.js')`.
    El `.js` de fuente reimporta `../media/icon.js` → `_shared/icon-loader.js`.
    Ese módulo resuelve bases con `import.meta.url` bajo `/src/components/` →
    `src/assets/icons/lucide.json` (y heroicons / material-symbols). Esos
    JSON **no van en git** (`.gitignore` solo deja mdi/tabler); en dist sí
    existen, pero el primer intento a `src/` ya deja 404 en consola.
    **Hacer:** no reimportar `preview-component` desde `src/` si `load('all'|'layout')`
    ya lo registró desde `dist/cdn/`; prefetch idle solo `mdi`+`tabler`; saltar
    base `src/assets` para prefijos no shipped.
    **No hacer:** precargar colecciones gitignoreadas; asumir que Pages sirve
    todo lo que tienes en el disco local bajo `src/assets/icons/`.
    Guardianes: `tests/cdn-loader.test.ts`, `tests/icon-prefetch.test.ts`.

43. **Galería FOUC + demos vacíos + boot de 6–10 s** (11-ago-2026)
    → Tras meter el loader, `index.html` hizo en serie:
    `await loadCSSBase` → `await loadCSSPalettes` → `await loadPageStyles` →
    `await load('all')` → `await loadPageModules` (incl. `cdn-panel` →
    `src/…/cdn-snippet.js` → `md-editor`). Síntomas:
    1. **FOUC blanco** ~0.8–2 s: cero CSS hasta que el módulo del head corría.
    2. **Tags crudos** 6–10 s: nav nativo sin estilo de shell mientras bajaba
       forms/data/diagrams vía `all`.
    3. **Demos invisibles** con shell ya oscuro: el módulo del **body** asignaba
       `previewHost.preview = JsonPreview` **antes** de que
       `is-preview-component` estuviera defined (TLA del head **no** bloquea
       siblings). Quedaba own property → el setter nunca pintaba →
       `is-main` vacío. **Sin error de consola.**
    4. **`cdn-panel` en el `Promise.all` crítico** colgaba el shell aunque las
       categorías ya estuvieran listas.
    **Hacer (contrato actual de `index.html`):**
    - `<link>` a `is-base` / `palettes` / `shell` / `presentation` /
      `preview-component.css` (+ CSS crítico inline de fondo).
    - `await` solo: tags shell (`split-panel`, `main`, `drawer`, `demo`,
      `scrollspy`, `button`, `icon`, `theme-toggle`, `code`) +
      `import('./dist/cdn/layout/preview-component.min.js')`.
    - Luego `dataset.kitShell = '1'`; `loadPageModules` y `load('all')` **sin**
      await en el path crítico.
    - `setHostPreview`: `delete` own property + `whenDefined` antes de asignar;
      `ensurePreviewDeps(tag)` carga on-demand si el kit completo aún no llegó.
    - `cdn-panel.js` importa `dist/cdn/feedback/cdn-snippet.min.js`, no `src/`.
    - Dev preferido: `node scripts/serve.mjs`.
    **No hacer:** volver a `await loadCSS*` como primer paint; meter `all` o
    `cdn-panel`/`md-editor` en el await del shell; reimportar preview desde
    `src/`; asignar `.preview` sin `whenDefined`/borrado de own property;
    inventar un segundo bootstrap distinto de este contrato.
    Guardián: `tests/gallery-boot.test.ts` (+ `cdn-loader` coherente).

44. **Visor de fuentes “vacío” con el archivo ya en el DOM** (20-ago-2026)
    → En Pages, `#is-view-sources-dialog` tenía JS/CSS/MD en `value` y
    `data-cm-source` (Copiar/Abrir iban bien) y el editor se veía en blanco.
    **Causa:** (1) getter de `is-code` devolvía el seed si `#cm.getValue()` era
    `''` → `paintOne` hacía `if (el.value !== text)` y **no** llamaba setter;
    (2) CM montaba con el panel `hidden` / dialog aún sin layout → altura 0 y
    sin `refresh` al mostrar o al cambiar de tab; (3) chrome lazy sin
    `is-tab-group` en `GALLERY_CHROME_TAGS`.
    **Hacer:** `dlg.show()` antes de `loadKind`; `refreshEditor` en
    `is-after-show` y `is-tab-show`; `paintOne` siempre `el.value = text`; si
    CM listo y `getValue()` vacío, `setValue(seed)`; chrome incluye
    `is-tab-group`.
    **No hacer:** fiarse del inspector (`value` lleno ≠ lienzo CM); pintar CM
    solo en paneles `hidden` sin refresh al mostrar; omitir tabs del chrome.
    Guardián: `tests/gallery-sources-meta.test.ts`. Docs: `code/AGENTS.md`.

---

## Errores aprendidos fuera de este repo (mismo tipo de trampa)

Del vídeo `<is-button>` del kit de edición. No es código de la librería, pero el patrón es el mismo — **el artefacto sale bien y el contenido está mal**, así que ningún proceso falla:

- **Consumir la CDN `@main` para renderizar material que documenta el repo.** El vídeo cargaba `is-base.min.css` desde jsDelivr y pintó `info` y `error` en gris: la versión publicada solo traía cinco colores. El MP4 salió correcto, con los botones mal. Para renderizar documentación del propio kit, leer el `dist/` local — reproducible y siempre igual al commit que se está a punto de publicar.
- **Dos relojes para el mismo evento.** El mezclador de efectos calculaba sus tiempos con su propia fórmula (`dur*0.62/pasos`) mientras la animación usaba `data-delay` por elemento: la imagen revelaba una fila cada 0,20 s y el sonido daba un golpe cada 2,35 s. Fix: el generador vuelca los retardos reales a un JSON y el mezclador los consume. Una sola fuente de verdad.
- **Guardas silenciosas.** El mapa de efectos apuntaba a un índice de escena; al quitar una escena, el `if (idx < len)` lo ignoraba sin decir nada y el golpe del cierre desaparecía. Una guarda que tapa un desajuste tiene que **avisar**, no continuar.
- **Cifras exactas en material que envejece.** El guion decía «cinco colores»; al añadir `info` y `error` el vídeo quedó mintiendo y hubo que resintetizar voz. Enumerar sí, contar no.

---

## Sistema de iconos

### DO
- El grid nativo de cada colección **no es 24**. `src/assets/icons/collections.json` guarda el `height` real por prefijo (academicons 32, fa 512, logos variable). Un SVG local tiene que declarar `viewBox="<left> <top> <w> <h>"` con **esas** dimensiones.
- Metadatos de colección (nombre, categoría, autor, licencia, paleta, grid) → `node scripts/sync-icon-collections.ts`. Se consultan **offline**: el explorador no puede pegarle a `api.iconify.design` en runtime.
- Si una familia "no muestra iconos": `node scripts/fix-icon-viewbox.ts --detect --only <prefix>` y luego sin `--detect` para reparar.
- Tras reparar/descargar iconos hay que **re-sincronizar `dist/assets/icons/`**: GitHub Pages sirve desde ahí, no desde `src/assets/`.

### DON'T
- **No "normalizar" todos los SVG a `width="24" height="24" viewBox="0 0 24 24"`.** Es el bug que dejó familias enteras en blanco: el path se dibuja fuera del viewBox y el icono se renderiza vacío. Solo se veía en colecciones con grid ≠ 24, por eso pasó desapercibido (mdi y tabler seguían bien).
- **No detectar ese bug con heurísticas de coordenadas.** "coordenada mayor que el viewBox" da miles de falsos positivos: hay paths mdi válidos con números > 90 (radios de arco). La única fuente de verdad es el metadato de Iconify.
- **No pedir iconos con `fetch(..., { cache: 'force-cache' })`.** Sirve la copia cacheada *sin revalidar nunca*, aunque el servidor mande `cache-control: no-cache`. Tras reparar 166k SVG, los navegadores que ya habían visitado el sitio siguieron pintando los rotos de forma permanente: "academicons no muestra iconos, solo los nombres". El `rawCache` en memoria ya evita requests repetidos; usar `cache: 'default'`.
- **No aplastar todos los `fill`/`stroke` a `currentColor`.** Correcto para sets monocromos, desastroso para banderas, logos y emoji: los convierte en siluetas sólidas ("CoreUI Flags se ven como bloques oscuros en la rejilla, pero al abrir el icono sí se ve" — el formulario inyecta el SVG crudo y por eso se salvaba). `is-icon` detecta la paleta propia por icono y la respeta. Ojo: la detección es **por icono, no por colección** — `logos` es mixta (`logos/game-analytics-icon` es una silueta negra sin ningún `fill`, y teñirla es lo correcto).
- **No dejar `currentColor` en un SVG que sale del DOM** (PNG rasterizado, data-URI de CSS): fuera del documento no hereda nada y el icono sale negro o invisible. Materializar el color al exportar.

---

## Las previews se construyen con los `is-*`, no con controles a mano

La preview de un componente es la vitrina del design system. Reimplementar a
mano lo que ya existe como `is-*` es deuda doble: se ve distinto y hay que
mantenerlo aparte.

### Equivalencias obligatorias
| A mano | Componente |
|---|---|
| `<aside>` deslizante | `<is-drawer>` (backdrop, foco atrapado, Esc, `data-drawer="close"`) |
| `<select>` | `<is-select>` + `<is-option>` |
| `<input type="text\|number\|search">` | `<is-input>` (`error` / `error-text` para validar) |
| `<input type="checkbox">` | `<is-checkbox>` |
| `<input type="color">` | `<is-color-picker>` |
| `<input type="range">` | `<is-slider>` (`format="{v}px"`, es plantilla) |
| `navigator.clipboard.writeText` | `<is-copy-button>` (`value` o `from="id.prop"`) |
| `div.toast` propio | `<is-toast>` + `toaster.create(msg, { variant })` |
| `span.chip` | `<is-tag>` |
| estado vacío / error a mano | `<is-callout icon="…">` |
| barra de progreso propia | `<is-progress-bar value="0..100">` |
| `<a>← volver` | `<is-breadcrumb>` + `<is-breadcrumb-item>` |

### DON'T
- **No reimplementar la validación** con un `<p class="warn">`: `is-input` ya
  tiene `error` + `error-text` y los pinta con el token correcto.
- **No cablear un botón de cerrar**: `data-drawer="close"` dentro de `is-drawer`.
- **No cablear un botón de copiar**: `is-copy-button` ya da feedback de éxito/error.
- Eventos: los `is-*` emiten **`is-input` / `is-change`**, no los nativos.
  Escuchar `input`/`change` a secas no recibe nada.

---

## Previews que no usan el shell de docs

- `presentation.css` fija `html, body { height:100%; overflow:hidden }` porque el shell (`is-split-panel` + `.main`) scrollea internamente.
- Una preview que **no** monta ese shell (p. ej. `icon-explorer.html`) tiene que aportar su propio scroll: `is-main { display:flex; flex-direction:column; height:100%; min-height:0 }` + un hijo con `flex:1; min-height:0; overflow-y:auto`.
- **Sin `min-height: 0`** el hijo flex no se encoge y el `overflow-y:auto` no hace nada: se ve todo cortado y sin barra.
- `IntersectionObserver` para lazy-loading dentro de esa preview necesita `{ root: <el scrollable> }`. Con el root por defecto (viewport) nunca dispara, porque el que scrollea es el div, no la página.

---

## Layout radial (speed-dial) y medición de elementos

### DO
- El trigger tiene que ser **cuadrado**: si el host mide 34×45 y el botón visible 45×45, el centro que calculás no es el centro que se ve, y los radios salen asimétricos (los de un lado más cerca que los del otro).
- **Un arco por anillo**, no un arco único para todos. El arco que cabe a radio 52 no es el que cabe a radio 100; calcular uno solo obliga a rendirse o a apretar ítems.
- Si un anillo no cabe, **buscar un radio mayor** en vez de cortar al primer fallo: un radio algo mayor admite un arco más ancho.
- Marcar las acciones como radiales (`data-radial`) **antes** de medirlas.

### DON'T
- **No medir un elemento antes de aplicarle la clase/atributo que cambia su forma.** Medir la píldora (55×39) en vez del círculo (36×36) infla el tamaño, el arco "no cabe" y el layout cae a un modo de emergencia. Síntoma delator: *se ve mal al cargar y se arregla al hacer scroll* — el reflow tardío vuelve a medir, ya con la forma correcta.
- **No caer a un grid centrado en el wrapper** cuando el anillo no cabe. Los ítems tienen que quedar siempre pegados al trigger y en anillo; el fallback correcto es apretar en el último anillo válido.
- **No usar `Number.isFinite(Number(x))` para "¿tiene valor este atributo?".** `Number(null)` es `0` y `0` es finito, así que un atributo ausente devuelve `0` en vez de `null`. Con `start-angle` eso significaba "ángulo 0 = a la derecha" siempre, y nunca se calculaba el ángulo hacia el espacio libre. Chequear `x == null || x === ''` **antes** de convertir.

---

## Resaltado nativo de snippets (era CodeMirror)

- El coloreado de snippets/docs lo hace **`<is-code>` con su motor nativo** (`_shared/code-highlight.ts` → tokens `.tok-*`). `paint()` de `_shared/highlight-code.ts` monta `<is-code readonly compact>`; no hay core de CodeMirror, ni modos, ni CDN que cargar.
- Histórico (era CodeMirror): `runMode` sin el modo cargado producía 0 tokens (`conTema > 0`, `conTokens === 0`); faltaba el core → `ReferenceError: CodeMirror is not defined` dentro de `paint()`. Esos síntomas ya no aplican: no queda CM.
- Los `<is-cdn-snippet>` **auto-inyectados** se crean *después* del evento `load`: el observer/encolado de `highlight-code` los pilla (paint idempotente por el marcador `data-cm`).
- El valor semilla vive en el atributo `value`/dataset; el bootstrap nativo pinta siempre (no hay "CM montado vacío"). Ver error **#44** (histórico).

---

## Testing

- `node --test tests/` o `node tests/run-all.ts` — invariantes sin runner externo.
- Extensión canónica: **`*.test.ts`**. Node 22 borra los tipos al cargar, así que no hay build de tests: `npm test` los corre directo. El único añadido es `--import ./scripts/ts-resolve-hook.ts`, que resuelve los `./x.js` de los imports al `.ts` real.
- Guardián del contrato SDD: `tests/specs-sdd.test.ts`.
- `tests/` **no** está gitignoreado completo: se **commitean** los `*.test.ts`. Solo se ignoran artefactos (`tests/*.tmp`, `tests/coverage/`, `tests/.cache/`). Si algún día `tests/` pasa a gitignore, respetarlo y no forzar commit.

### Carta de guardianes (avisan solos)

| Test | Caza |
| --- | --- |
| `llm-contract.test.ts` | Secciones DO/DON'T/errores de este AGENTS.md + guardianes en disco |
| `src-layout.test.ts` | Fuente en `src/`; sin carpetas raíz prohibidas |
| `robots-sitemap.test.ts` | `robots.txt` Allow `/`; comprueba que no se anuncie un sitemap inexistente |
| `dist-cdn-layout.test.ts` | Solo `cdn/` bajo `dist/` (nada tipo `dist/ag-grid.js`) |
| `preview-json-contract.test.ts` | Todos los JSON `is-preview/v1` + catalog ↔ manifest; cero HTML residual |
| `preview-controller.test.ts` | Kit JsonPreview + shell único `_shell.html` |
| `preview-paths.test.ts` | Refs de `_shell.html` resuelven |
| `helpers-homogeneity.test.ts` | Utilerías públicas = manifest.page `.json` + MD |
| `attr-enums.test.ts` | Enums en JSON de previews vs `VALID_*` |
| `token-vocabulary.test.ts` | Tokens `--is-color-*` coherentes tema ↔ componentes |
| `button-events.test.ts` | Eventos documentados = `#emit` reales; `#syncTag` re-cablea |
| `button-color-appearance.test.ts` | Color×appearance ortogonal (`--_tone-*`); sin matriz N×M ni `-600` |
| `em-scale-font-inherit.test.ts` | Escala em real: controles nativos con `font: inherit`; fab `color` |
| `palette-and-snippet-contract.test.ts` | Default contapyme; canvas libre; snippets con contexto |
| `prefs-contract.test.ts` | Un solo store `is-webcomponents[tag][key]` |
| `manifest-paths.test.ts` / `llm-links.test.ts` | Manifest y LLM raw coherentes |
| `url-nav.test.ts` | Estado UI solo en `?s=`; sin params sueltos |
| `format-bytes-autofit.test.ts` | `autofit` en `is-format-bytes`; panel CDN sin pesos inventados |
| `ux-gallery-invariants.test.ts` | Toast host, `on(null)` seguro, no params sueltos |
| `gallery-sources-meta.test.ts` | `.file-meta-page`, `#vsPath` absoluto, visor CM (`refreshEditor`, seed vacío) |
| `cdn-folders.test.ts` | Sin `all.min.js` ni `category.*.min.js` en `dist/cdn/` |
| `gallery-boot.test.ts` | FOUC: CSS `<link>`; shell sin `await all`; `setHostPreview`; cdn-panel vía dist |
| `cdn-loader.test.ts` | Entry `loader.min.js`, banner MD, sin `all.min` suelto en head |
| `load-plan.test.ts` | Anti-redundancia categoría → tag / `all` / mismo lote |
| `code-infer-lang.test.ts` | HTML de demos ≠ javascript; softFormat separa tags |
| `demo-equiv.test.ts` | No pintar «HTML puro equivalente» / no `data-cm` prematuro |

### Cómo extender
1. Nuevo error silencioso → test que falle si vuelve (`*.test.ts`).
2. Nuevo preview → `*.json` + entrada en `catalog.js` (+ `behaviors/` si hay lógica) → `preview-json-contract` verde.
3. Nuevo token de color → `token-vocabulary` antes de merge.
4. Actualizar la **Carta de leyes** + bitácora de errores + esta tabla.
5. Familia de color nueva → solo en `is-base.css`/`palettes.css`.
6. Evento nuevo → documentar y emitir en el mismo commit.
7. Cambio de loader / plan de carga → `load-plan` + `cdn-loader` + `gallery-boot` verdes + `src/cdn/loader.md`.
8. Cambio de coloreado `is-code` → `code-infer-lang` + no reintroducir `renderDemoEquiv`.
9. Nuevo estado de UI en URL → key dentro de `?s=` vía `url-nav.js`, nunca param suelto + actualizar `url-nav.test.ts`.
10. Behavior que llama APIs sobre un nodo del demo → garantizar el nodo en `mount` + entrada en `ux-gallery-invariants` si es trampa repetible.
11. Cambio del boot de `index.html` (orden CSS/JS, loader, preview setter) → **obligatorio** `gallery-boot` verde.
12. Visor de fuentes / `is-code` en dialog → `gallery-sources-meta` verde (no basta `value` en el DOM).

### Diagramas: agrupadores, ratio y ruteo (`er-spec.js`, ago/2026)

Lo aprendido montando el DER de dos bases de datos (20 tablas, 17 relaciones).
Aplica a cualquier diagrama node-link del kit, no solo a ER.

**Hacer:**

- **Un grupo = un sub-diagrama.** Cada `groups[]` se resuelve con su propio
  `layoutNodeLink` (solo con sus aristas internas) y se pinta como cajón con
  título. Es lo que hace legible "esto es de la base A, esto de la base B".
- **Ratio guía, no restricción.** `ratio` (default `1.4`) alimenta un
  empaquetado que prueba cada número de columnas y se queda con el reparto de
  score `|log(ratio/guía)|` mínimo. Nunca recorta ni deforma una caja.
- **Escala logarítmica para comparar ratios.** Con distancia lineal, "el doble
  de ancho" y "el doble de alto" no pesan igual y el packer se sesga a tiras.
- **Nodos aislados aparte.** Los que no tienen aristas dentro de su grupo no
  pasan por el motor de capas: se empaquetan en rejilla con el mismo ratio.
- **Rutear de la arista más corta a la más larga** y cobrar peaje
  (`applyRectCost(..., add=true)`) sobre el corredor recién usado y sobre el
  interior de cajones ajenos. Peaje, no bloqueo: cruzar sigue siendo posible
  cuando es la única salida, solo deja de ser lo barato.
- **Confinar la etiqueta al lienzo** (`labelX/labelY` con `clamp`): una arista
  que rodea por el borde deja su punto medio en el canto y el texto sale
  cortado por el `viewBox`.

**No hacer:**

- **No** dejar que el motor de capas vea las aristas entre grupos: arrastra
  entidades fuera de su cajón y los cajones acaban solapándose.
- **No** confiar en que "todos los nodos tienen aristas". Con 14 tablas sueltas
  el layering las apiló todas en la capa 0 y el diagrama salió como una tira
  vertical de 4.700 px. Nada falla; solo es ilegible.
- **No** bloquear (`blockRect`) el interior de un cajón para forzar rodeos: las
  aristas internas de ese mismo cajón se quedan sin ruta y el A* devuelve
  diagonales.
- **No** dar por buena una captura sin mirarla. El bug de la tira vertical, las
  etiquetas cortadas y el ratio desbocado pasaron los tests y el build.

Guardián: `tests/er-clusters.test.ts` — cajón por grupo, entidades dentro de su
cajón, cajones sin solape, el ratio guía cambia la forma, sueltas en rejilla y
etiquetas dentro del lienzo.

### Diagramas — invariantes a respetar

**Hacer:**

- `<is-sequence-diagram>` lee `spec.sequence` y pinta el SVG en su shadow
  root. Si algo espera el SVG como hijo directo de `#d`, el selector es
  `document.querySelector('is-sequence-diagram')?.shadowRoot?.querySelector('svg')`,
  no `document.querySelector('#d svg')`.
- La leyenda del sequence se acomoda en grid de **máx 3 filas × N columnas**
  (`legendMaxRows: 3`) y arranca **pasada la caja del último actor**
  (`baseW + boxW[n-1]/2 + 16`), no en `W - legendW - 8` (eso solapaba con
  "Clasificador" en diagramas con 5+ grupos).
- El self-loop del sequence se traza a mano con 4 esquinas
  (`M→out→up→back`). **No delegar al A* con waypoints**: `collapseJogs`/
  `collapseColinear` colapsaban el tercer segmento a 1 celda y el resultado
  era una línea vertical con banderín, no la herradura UML. La punta
  (`arrowTip`) cae en la lifeline, el último punto del path queda por
  encima; el `svgArrowHead` cierra la herradura con la flecha.
- `<is-component-diagram>` (nuevo): tres primitivas — `packages` (folder
  con pestaña), `components` (rect con estereotipo `«name»`), `interfaces`
  (lollipop `provided` = círculo lleno, `required` = semicírculo). Las
  posiciones son EXPLÍCITAS en el payload (mapa mental, no grafo a
  auto-layout). Aristas: `dependency` dashed, `realization` con flecha hueca.
- En `<is-component-diagram>`, `ifaceById` se rellena **DESPUÉS** de
  calcular `cx`/`cy` de cada interfaz. Si se construye sobre
  `spec.interfaces` (sin geometría), las aristas caen a `(0, 0)` sin error
  visible y el PNG sale sin conexiones.

**No hacer:**

- **No** reusar el A* genérico para self-loop: la ruta es siempre la
  misma forma (out, up, back, down). Construirla a mano en
  `routeSequenceSelf` y dejar el A* para aristas entre lifelines.
- **No** medir layout de leyenda sobre el centro del último actor:
  `baseW` mide hasta el centro, hay que sumar `boxW[n-1]/2` para que la
  leyenda quede visualmente a la derecha de la caja.
- **No** poblar `ifaceById` antes de calcular geometría en ningún diagrama
  cuyo render dependa de coordenadas por nodo. La regla general: el mapa
  auxiliar se construye DESPUÉS del map que rellena la geometría.

Guardianes:
- `tests/sequence-legend-grid.test.ts` — leyenda max 3 filas × N cols,
  `legendX` > borde derecho del último actor.
- `tests/sequence-self-loop.test.ts` — 4 segmentos (M + 3 L), 4 esquinas
  distintas, última esquina por encima de la lifeline.
- `tests/component-diagram-ifaces.test.ts` — interfaces con `cx`/`cy`
  finitos, aristas con `fromX`/`toX` ≠ `(0, 0)`.

### Qué clase de test merece la pena aquí
El patrón que se repite en casi todos los errores de la lista de arriba: **el artefacto se genera bien y el contenido está mal**. Build verde, navegador contento, vista que pinta — y el tema no llega, o el evento no salta, o el preview enseña de menos.

Por eso los tests que valen en este repo no comprueban que algo *funcione*, sino que **dos fuentes que deberían decir lo mismo no se hayan separado**:

- lo que el componente acepta ↔ lo que la preview usa (`attr-enums`)
- lo que la documentación promete ↔ lo que el código emite (`button-events`)
- lo que el tema define ↔ lo que el componente consume (`token-vocabulary`)
- lo que `color` enlaza ↔ lo que `variant` pinta (`button-color-appearance`)
- dónde viven los archivos ↔ a dónde apuntan los paths (`src-layout`, `preview-paths`)

Antes de escribir un test nuevo, la pregunta útil es: *¿qué par de cosas puede desincronizarse aquí sin que nada se rompa?* Si la respuesta es "ninguna", probablemente no hace falta el test.


## Entorno local (PowerShell, git, jsDelivr)

### 6.1 PowerShell interpreta `<` y `>` como redirecciones

`git commit -m "$(cat <<'EOF' ... EOF)"` con `<carácter>` en el mensaje → falla
con "The '<' operator is reserved for future use".

**Fix:** Escribe el mensaje en un archivo temporal y usa `git commit -F
archivo.txt`.

### 6.2 `&&` no funciona en PowerShell

```bash
node build.mjs && node verify.cjs   # FALLA con "token && no es separador"
```

**Fix:** usa `;` o `cmd /c "node build.mjs && node verify.cjs"`.

### 6.3 `wc -l` no existe en PowerShell

```bash
git status --short -- previews/ | wc -l   # FALLA con "wc: command not found"
```

**Fix:** `(git status --short -- previews/).Count` (PowerShell mide arrays).

### 6.4 `ls -la` no existe en PowerShell

**Fix:** `Get-ChildItem . -File | Select-Object Name | Format-Table
-HideTableHeaders`.

### 6.5 `rm -rf` no existe en PowerShell

**Fix:** `Remove-Item -Recurse -Force`.

### 6.6 CSS warning `Expected identifier but found "stepper("`

El bundler de esbuild protesta con `:state(without-line)` cuando el selector
se mete dentro de un nesting de Shadow DOM. La regla
`.stepper(:state(without-line))` **no compila**.

**Fix:** usa clases planas: `.stepper--without-line` o
`.stepper.without-line` (sin nesting).

### 6.7 `browser_cdp` falla con "Invalid parameters" en Cursor

`browser_cdp` con métodos complejos o muchos argumentos revienta con
`Error: Invalid parameters` sin dar más detalle.

**Workaround:** usa `browser_navigate` directamente a la URL del preview y
verifica visualmente con `browser_take_screenshot`. Para inspeccionar el DOM
usa `browser_cdp Runtime.evaluate` con expresiones pequeñas.

### 6.8 `git add` con 13k archivos tarda ~60 segundos

No es un error, pero si ves `git add assets/icons/` "colgado", **espera**.
PowerShell no muestra progreso pero el comando está corriendo. Hecho: tarda
~1 minuto en añadir 13.6k SVGs.

### 6.9 Re-descargar 723 MB cuando ya están descargados

Si corres `download-icons.ts` sin `--only`, **se baja todo otra vez** porque
al inicio el script borra el `.state/` y empieza de cero. Antes de re-correr
"para estar seguros", **comprueba el `manifest.json`**.

### 6.10 `previews/is-scrollspy.html` no existe

`is-scrollspy` no tiene preview propio; vive dentro de otros. Si un script
de folderize asume que sí existe, se quejará con "no existe, saltando". **Es
correcto**, no lo crees de cero sin pedir.

### 6.11 Crar un `*.selfcheck.mjs` nuevo pero sin patrón `PASS`

Los selfchecks del repo terminan con `console.log('X self-check: PASS')` para
que `npm run` pueda parsearlo. Si tu test no termina así, el runner se
queda sin saber si pasó o falló.

### 6.12 `<base href>` cambia la resolución de URLs

Si añades `<base href="/foo/">` a un preview, **todas las rutas relativas del
preview** se resuelven contra `/foo/`. Los iconos locales requieren que
`rootFromBaseURI()` siga viendo el `pathname` correcto, no el `baseURI`.

### 6.13 `git mv` cuando hay uncommitted changes dentro

Si un archivo tiene cambios sin commitear y haces `git mv`, git conserva los
cambios pero el archivo aparece como `R` (renamed) en el diff, no como `A+M`.
Eso confunde a herramientas que cuentan `M`. **Antes de folderizar, haz
commit de lo pendiente** aunque sea un chore vacío.

### 6.14 jsDelivr cachea 24 h después del push

jsDelivr tarda entre 1 y 5 minutos en servir un nuevo commit la primera vez,
pero el cache puede quedar pegado. Si el icono nuevo no aparece, prueba con
`?v={timestamp}` o espera. **No** asumas que el push rompió la distribución
solo porque el primer `Invoke-WebRequest` dio 404.

### 6.14b Fijar un SHA en jsDelivr NO funciona en este repo: 403 "Package size exceeded"

Consumir el kit desde un consumidor externo (los videos de `VideosYT`) apuntando
a un commit concreto —lo natural para que un render sea reproducible— devuelve
**403** en la mayoria de archivos:

```
Package size exceeded the configured limit of 50 MB.
```

El repo pasa de 50 MB por `dist/assets/icons` (~318k archivos), y jsDelivr
aplica ese limite al resolver una version que aun no tiene cacheada. `@main` si
responde 200 porque ya esta caliente de antes. Conclusion practica: **usar
`@main`**, y asumir que un consumidor externo no puede pinear version mientras
los iconos vivan dentro de `dist/`.

Corolario que costo una tarde: con `@main` cacheado 24 h (§6.14), `all.min.js`
servido puede ser **anterior** a que un componente existiera, asi que el
componente nuevo no queda definido aunque su propio archivo si se sirva fresco
(los archivos nuevos no tienen cache viejo que los tape). Sintoma exacto:
`customElements.get('is-button')` da `true` y `customElements.get('is-code')`
da `false`, sin un solo error en consola. **Solucion**: en el consumidor, pedir
el componente por su ruta propia
(`dist/cdn/<categoria>/<comp>.min.js`) ademas de `all.min.js`. No depende del
cache del agregado y de paso carga solo lo que se usa.

### 6.15 Los 308k iconos de Iconify son 723 MB

Si commiteas todas las colecciones, **inflas el repo** y rompes `git clone`.
Solo commiteamos `mdi/` (7447) y `tabler/` (6184) → 5 MB. El resto se
regenera con `npm run icons:download`. El `.gitignore` ya lo deja claro; **no
lo desanotes**.

### 6.16 Scrollbars consistentes en todos los `is-*` y secciones de demos

El look del scrollbar está centralizado en dos archivos:

- `src/components/_shared/scrollbars.css` — inyectado por `adopt-css.js` en
  el shadow DOM de cada `is-*`. Aplica `scrollbar-color` y los pseudo
  elementos WebKit a `:host` y a todos sus descendientes.
- `styles/is-base.css` (`* { scrollbar-color: ... }`) — light DOM del
  documento.
- `styles/presentation.css` (reglas adicionales para `.main`,
  `is-main.main`, `.sidebar`, `.section`, `.demo`, `html`, `body`) —
  refuerza el estilo WebKit en las superficies del docs/playground.

**Tokens**: `--is-scrollbar-size`, `--is-scrollbar-radius`,
`--is-scrollbar-track`, `--is-scrollbar-thumb`,
`--is-scrollbar-thumb-hover`. Todos viven en `:root`/`.theme-dark`/
`.theme-light` dentro de `is-base.css`. Las paletas (`palettes.css`)
pueden sobreescribirlos si quieren un thumb de marca.

**Fallbacks en shadow**: si el consumidor monta un `is-*` sin cargar
`is-base.css`, las CSS custom properties no llegan al shadow. Para esos
casos, `scrollbars.css` define `--is-scrollbar-*-fallback` en `:host`
para que el thumb sea visible (gris neutro derivado de `--is-control-border`
y hover con tinte de acento rojo). El `var(..., fallback)` en cada
propiedad garantiza que nunca se quede sin color.

**Si añades un componente nuevo**: basta con llamar a `adoptCss(this.shadowRoot,
import.meta.url)` en el constructor (patrón ya documentado). No hace falta
importar `scrollbars.css` manualmente.

### 6.17 Helpers de reuso centralizados en `_shared/`

Para evitar el copia-y-pega que se acumuló en 82 componentes, los siguientes
helpers viven en `src/components/_shared/`:

| Helper | Reemplaza |
|---|---|
| `_shared/intent.js` (`INTENT`, `DEFAULT_INTENT`, `normalizeIntent`, `setEnumAttr`) | `VALID_VARIANT = ['brand', 'neutral', ...]` repetido en 13 archivos |
| `_shared/tone.js` (`TONE`, `DEFAULT_TONE`, `normalizeTone`) | `VALID_APPEARANCE = ['accent', 'filled', ...]` repetido en 5 archivos |
| `_shared/upgrade-properties.js` (`upgradeProperties`) | `#upgradeProperties()` inline en 15 archivos |
| `_shared/dom-utils.js` (`hasSlotted`, `assignedNodes`, `assignedElements`) | `function hasSlotted(slot)` repetido 6 veces |
| `_shared/misc-utils.js` (`tidy`, `clampTo`, `isValidNumber`) | `tidy(n, unit)` + `clampTo(n, min, max)` repetidos en 3 archivos |
| `_shared/modal-base.js` (`ModalBase`) | ciclo de vida del modal duplicado en `dialog.js` (372) y `drawer.js` (378) |
| `_shared/element-base.js` (`ElementBase`) | boilerplate de Shadow DOM (initShadow, mounted flag, lifecycle hooks) |
| `_shared/form-control-mixin.js` (`MixinFormControl`, `formControlTemplate`) | label + hint + error-text repetidos en form controls |

**Cuándo usar cada uno**:

- Componente con atributo `variant` semántico → `intent.js`. Importa
  `INTENT`, `DEFAULT_INTENT`, `normalizeIntent`. Default: `DEFAULT_INTENT`
  (`'brand'`). Si el componente debe tener `'neutral'` como default,
  mantenlo como literal en su `connectedCallback`.
- Componente con atributo `appearance` (relleno) → `tone.js`.
- Custom element que recibe atributos antes de `connectedCallback` →
  `upgradeProperties(this, [...attrs])`. NO re-implementes el `#upgradeProperties`
  inline.
- Componente con slots que pueden recibir contenido del consumidor
  (`<is-checkbox>`, `<is-switch>`, `<is-input>`, `<is-textarea>`, etc.) →
  `hasSlotted(slot)` de `dom-utils.js`.
- Componente numérico (`<is-slider>`, `<is-rating>`, `<is-format>`) →
  `tidy(n, unit)` y `clampTo(n, min, max)` de `misc-utils.js`.
- Modal (`<is-dialog>`, `<is-drawer>`, futuros) → `extends ModalBase`.
- Componente sin lógica especial (`<is-callout>`, `<is-button>`) →
  `extends ElementBase` para evitar boilerplate.

**Patrón canónico de setter con enum** (componente con `variant`):

```js
import { INTENT, DEFAULT_INTENT, normalizeIntent, setEnumAttr } from '../_shared/intent.js';

// En connectedCallback:
if (!this.hasAttribute('variant')) this.setAttribute('variant', DEFAULT_INTENT);

// En attributeChangedCallback, red de seguridad para valores inválidos:
if (name === 'variant' && newVal && !INTENT.includes(newVal)) {
  this.setAttribute('variant', DEFAULT_INTENT);
}

// Setter:
get variant() { return this.getAttribute('variant') ?? DEFAULT_INTENT; }
set variant(v) { setEnumAttr(this, 'variant', normalizeIntent(v)); }
```

`setEnumAttr(this, 'variant', normalizeIntent(v))` rechaza valores fuera
de la enum sin lanzar error: `'patata'` se traduce a `'brand'`. Esto evita
que la API rompa el componente si el consumer le pasa un valor raro.

**Regla**: si tu componente repite un patrón que ya tiene un helper,
úsalo. Si el patrón no existe, **primero** crea el helper en `_shared/` y
luego migra los archivos existentes antes de añadir lógica nueva.

### 6.18 ModalBase — el bug del `#mounted` huérfano

Cuando se extrajo `ModalBase` para centralizar el ciclo de vida de
modales, **`<is-dialog>` y `<is-drawer>` quedaron sin migrar** y
siguieron implementando toda la lógica a mano (focus trap, keydown,
animaciones, light-dismiss, data-attribute de close). El bug sintomático
era el `#mounted = false` declarado en el cuerpo de la clase de
`dialog.js` — un campo privado de bookkeeping que solo servía para
ignorar `attributeChangedCallback` antes del mount.

**Síntoma**: 372 líneas en `dialog.js`, 378 en `drawer.js`, ~80%
idénticas. Riesgo alto de divergencia (un bugfix en uno se olvidaba en
el otro).

**Fix**: ambos ahora extienden `ModalBase`. La subclase solo define:

- `static __TEMPLATE` (mismo HTML que ya tenían).
- `get modalClass()` — selector del contenedor dentro del shadow
  (`'.dialog'` o `'.drawer'`).
- `get closeAttr()` — atributo data-* para close declarativo
  (`'data-dialog'` o `'data-drawer'`).
- `animateOpen()` / `animateClose()` — devuelven `Promise<void>` con
  las keyframes específicas de cada componente.
- Atributos adicionales (`placement` en drawer).
- `onConnected()` / `onAttributeChanged()` — hooks opcionales del
  ciclo de vida.

**Acceso a refs desde subclases**: `ModalBase` declara `#modal` y
`#backdrop` como campos privados. Como JS no permite acceso cross-class
a privados, expone dos getters públicos:

```js
get $modal()    { return this.#modal; }
get $backdrop() { return this.shadowRoot.querySelector('.backdrop'); }
```

Las subclases usan `this.$modal` y `this.$backdrop` en sus
`animateOpen()` / `animateClose()` para no tener que re-querySelector
cada vez.

**Resultado**: `dialog.js` pasó de 372 a ~120 líneas, `drawer.js` de
378 a ~150. La lógica de focus trap, Escape, light-dismiss,
`is-show`/`is-hide`/`is-after-show`/`is-after-hide` y pulse de
"preventDefault" viven en un solo sitio.

### 6.18b `<is-tooltip>` — `is-hide` no burbujea

Los eventos de ciclo de vida del tooltip (`is-show`, `is-hide`,
`is-after-show`, `is-after-hide`) se disparan con **`bubbles: false`**
(aunque siguen siendo `composed: true`). Un tooltip anidado dentro de un
`is-dialog` o panel flotante no debe cerrar al ancestro cuando el puntero
sale del botón «Copiar»: antes el `is-hide` burbujeaba y el host modal lo
interpretaba como cierre del panel padre.

Si un consumidor necesita escuchar el cierre del tooltip, escucha en el
propio `<is-tooltip>`, no en `document`.

### 6.19 `<is-ag-grid>` — motor `datagrid-core` + mimicus-react

El data-grid se reescribió desde cero separando el **núcleo de datos**
del **render**. El núcleo vive en `src/components/data/datagrid-core/` y
proviene del port del repo
[mimicus-react/src/datagrid/core](https://github.com/Jeff-Aporta/mimicus-react/tree/main/src/datagrid/core).
El componente `<is-ag-grid>` es la capa de presentación que consume ese
núcleo.

**`datagrid-core/` (10 módulos):**

| Archivo                       | Responsabilidad |
| ---                           | --- |
| `types.js`                    | Enums `ColumnType`, `Density`, `SelectionMode`, `PinSide`, `FilterType`, `AggFunc`. JSDoc typedefs. |
| `value-formatter.js`          | `getCellValue`, `formatCellValue`, `cellText`. |
| `column-state.js`             | `resolveColumns`, `setColumnWidth`, `setColumnPinned`, `setColumnHidden`, `moveColumn`, `autosizeColumn`. |
| `viewport.js`                 | `rowWindow`, `columnLayout`, `colWindow`, `applyFlex`. |
| `selection.js`                | `toggleRowSelection`, `selectAll`, `clearSelection`, `headerCheckboxState`. |
| `csv-export.js`               | `rowsToCsv` (con BOM, sólo seleccionadas opcional). |
| `pipeline-filtering.js`       | Filtros: text, number, date, set. |
| `pipeline-sorting.js`         | `sortRows`, `cycleSort`. |
| `pipeline-grouping.js`        | `buildDisplayRows`, `aggregateGroup`. |
| `grid-model.js`               | `createGridModel({rows, columns, …})` ⇒ `GridApi` (store observable con `subscribe`). |
| `index.js`                    | Barrel de re-exports. |

**El wrapper `is-ag-grid`** (`src/components/data/ag-grid.js`) hace:

1. Lee filas/columnas desde atributo `rows` / `columns` o desde
   `<script type="application/json">` (acepta `src=...` con fetch).
2. Construye el modelo con `createGridModel` y se suscribe.
3. Renderiza cabecera (con sort icons, filtros activos, drag handle para
   resize, pin left/right, ⋮ menu), body (con virtual scroll por filas),
   footer (pager + count + selected), group panel y toolbar.
4. Gestiona HeaderMenu, FilterPopover, drag-reorder, drag-resize.
5. Persistencia opcional con `remember-state` + `storage-key`.
6. API retrocompatible legacy: `g.api.goToPage(n)`,
   `g.api.setFilter(field, op, value)`, `g.api.refresh()`, etc. La nueva
   firma de `setFilter(colId, filterObj | null)` se detecta por tipo del
   segundo argumento.

**Atributos nuevos respecto a la versión vieja:**

- `get-row-id`, `density`, `group-by`, `remember-state`, `storage-key`,
  `toolbar`.

**Columnas nuevas:**

- `flex`, `rowGroup`, `enableRowGroup`, `aggFunc`, `cellStyle`,
  `filterType` (`text`/`number`/`date`/`set`), `minWidth`, `maxWidth`,
  pinned (`left`/`right`).

**Eventos nuevos:**

- `is-state-loaded`, `is-column-reorder`, `is-column-resize`,
  `is-column-pin`, `is-column-hide`.

**Patrón de detección de datos en `#readData()`**: el primer
`<script type="application/json">` son columnas, el segundo son filas.
Si el primer script es claramente rows (no tiene `field`), se corrige
automáticamente. Esto evita el bug histórico que hacía que las columnas
se rellenaran con `col-N` autogenerados.

**Anti-patterns NO usar:**

- No usar `getAttribute('rows')` directamente — el helper hace auto-fix
  inteligente entre cols y rows.
- No hardcodear `DENSITY_ROW_HEIGHT` en subclases; usar siempre
  `this.#rowHeight()` que respeta `--is-grid-row-h`.
- No insertar overrides de `--is-...` para el color del scrollbar dentro
  del shadow — heredan del light DOM via custom property cascades.


## 8. Convenciones de tests (para añadir más)

1. Nombre: `tests/<area>.test.mjs`. Sin `.cjs`, todo ES modules.
2. Estructura:
   ```js
   // tests/<area>.test.mjs — <una línea de lo que verifica>
   import assert from 'node:assert/strict';
   import { readFile, readdir } from 'node:fs/promises';
   import { join } from 'node:path';
   import { fileURLToPath } from 'node:url';

   const here = dirname(fileURLToPath(import.meta.url));
   const root = dirname(here);

   // ... asserts ...

   console.log('<area>.test.mjs: PASS — <resumen>');
   process.exit(0); // exit code 0 si todo OK
   ```
3. Exit code != 0 en el primer fallo. Usar `assert.throws` / `assert.ok` /
   `assert.strictEqual` con mensajes útiles (incluye el archivo + ruta).
4. Si necesitas un servidor, **arranca uno efímero en `await using` o
   `try/finally`** con `node:http`. No asumas que `scripts/serve.mjs` está
   corriendo.
5. **No** crees snapshots binarios pesados (traces Playwright, coverage HTML)
   bajo `tests/` sin añadirlos al gitignore de artefactos. Los `*.test.mjs`
   **sí se commitean**.

## 8.5 Highlighter de `<pre class="code">` (scripts/highlight-pre.js)

Esta rutina monta `<is-code readonly compact>` sobre cada `<pre class="code">`
de los previews (`paint()` de `_shared/highlight-code.ts`). **El theme lo
resuelve el propio `<is-code>` con su motor nativo** (custom properties
`--is-code-*` vía `code-theme.ts`), reactivo al `data-theme` de `<html>`:
no hay themes de CodeMirror (`cm-s-*`) ni CSS de CDN que cargar.

El switch ocurre dentro de `<is-code>`:

1. En el bootstrap: `#pageTheme()` lee `document.documentElement.dataset.theme`
   y `#syncThemeFromPage()` aplica el preset (dark/light).
2. En tiempo de ejecución: `<is-code>` escucha en `document`:
   - `is-theme-change` (el evento que emite `<is-theme-toggle>` al alternar).
   - (La clase `cm-s-*` previa se limpiaba en la era CM; hoy no hay clases de
     theme que rotar: solo cambian las custom properties.)

No queda `reapplyTheme()`, ni `is-codemirror-theme-changed`, ni
`window.__isReapplyCodeTheme()`: se eliminaron con CodeMirror.

**Errores a NO repetir (históricos de la era CodeMirror):**

- ❌ **NO** reintroduzcas themes CM (`cm-s-material-darker`, `cm-s-mdn-like`)
  ni su CSS de CDN: el motor es nativo (`.tok-*` ↔ `--is-code-*`).
- ❌ **NO** cargues CodeMirror (core/modos/runMode) para colorear `<pre>`.
- ❌ **NO** asumas que `pre.code` llega pintado: `paint()` lo convierte a
  `<is-code>` (marcador `data-cm` = ya montado, para no repintar en bucle).

El test `tests/code-theme-native.test.ts` protege este contrato.

## 9. Reglas de oro (resumen ejecutivo)

- Lee `AGENTS.md` (Carta de leyes) y este archivo antes de tocar el repo.
- Si vas a mover archivos en masa, **primero commit lo pendiente**, luego
  `git mv`, luego `scripts/fix-preview-paths.ts`.
- Si vas a tocar layout `src/` / paths de preview → `src-layout` + `preview-paths`.
- Si vas a añadir utilería en `helpers/` → `helpers-homogeneity`.
- Si vas a migrar un preview al sistema controlado → `preview-controller` + registry.
- Si vas a editar `AGENTS.md` → `llm-contract`.
- Si vas a descargar iconos, **usa `--only=mdi --only=tabler`** salvo que
  sepas que necesitas los 308k.
- Si vas a tocar `src/components/_shared/iconify-loader.js`, **corre
  `tests/icon-references.test.ts` y `tests/cdn-icons.test.ts` después**.
- Si vas a tocar `manifest.js`, **corre `tests/manifest-paths.test.ts`**.
- Si vas a tocar `styles/is-base.css` o `palettes.css`, **corre
  `tests/theme-contract.test.ts`**.
- Si vas a tocar `scripts/highlight-pre.js` (pinta `<pre class="code">` con
  `<is-code>` nativo), **corre `tests/code-theme-native.test.ts`**: no debe
  quedar carga de CodeMirror ni themes `cm-s-*`; el tema lo aplica `<is-code>`.
- Si vas a crear un componente nuevo, **asegúrate de que su preview existe
  en `src/previews/<category>/` con paths styles `../../` y scripts/dist
  `../../../`**.
- **No** uses `cd "..."; cmd1 && cmd2 && cmd3 && ...` en PowerShell. Usa `;`
  o un script `.mjs`.
- **No** declares "listo" sin haber corrido `tests/run-all.ts`.
- Si vas a tocar `scripts/preview-chrome.js` (inyecta `<is-cdn-snippet>` en
  cada preview), **corre `tests/cdn-snippet-match.test.ts`**. El matching
  debe tolerar `page` con prefijo de categoría (`'actions/is-button.html'`)
  porque así se guarda en `manifest.js` desde el folderize de previews.
  Comparar por basename (`(c.page || '').split('/').pop() === file`) para
  que matchee tanto si el page viene folderizado como si no.
- Si vas a tocar `src/components/media/icon.js` o `src/components/_shared/iconify-loader.js`,
  **corre `tests/icon-currentcolor.test.ts`**. `<is-icon>` **NO** debe
  cargar el SVG como `<img src>` (rompe `currentColor` y los iconos
  aparecen negros sobre fondos claros). El flujo correcto es:
  `resolveIconRaw()` trae el texto SVG por fetch y el componente lo
  inyecta **inline** con `innerHTML` en su Shadow DOM. Ademas, hay una
  funcion `#normalizeInlineSvg()` que fuerza `fill: currentColor` y
  `stroke: currentColor` en el `<svg>` y sus hijos, para que SVGs con
  `fill="#000"` del CDN hereden el color del host. Los fuentes del raw
  en orden son: local `assets/icons/`, jsDelivr CDN del repo, y
  `api.iconify.design` como último recurso.

## 10. Cuando algo falla y no sabes por qué

1. Lee el error literalmente — los mensajes de Node suelen ser buenos.
2. Busca en este archivo: ¿está en §6?
3. Busca en `tests/`: ¿alguno lo detectó?
4. Si nada aplica, añade un test que reproduzca el fallo **antes** de
   parcharlo — así no vuelve a colarse.
