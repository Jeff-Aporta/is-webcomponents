# AGENTS.md — Cerebro de agentes para ISWC

> **Lee este archivo ANTES de tocar nada.** Resume lo que ya descubrimos a base
> de errores. Si haces algo que está en "Errores a NO repetir" y lo rompes de
> nuevo, te vas a ganar un commit revertido.
>
> **Complemento:** `LLM.md` cubre invariantes del home (rotación 3D de cards,
> parallax + hover, shadows, light mode). Si vas a tocar `previews/home.html`,
> léelo antes.

## 1. ¿Qué es este repo?

Galería de Web Components vanilla de Insoft (`iswc-*`). Todo escrito a mano con
Custom Elements + Shadow DOM, sin frameworks, empaquetado con esbuild.

- Demo publicada: <https://jeff-aporta.github.io/iswc-root/>
- Repo: `Jeff-Aporta/iswc-root`
- Sirve por CDN jsDelivr: `https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@3c722aca9579cb2f764c026c6385685c1603e789/...`

## 2. Estructura — no inventar, sigue esto

Las fuentes viven en `src/components/`. La carpeta `components/` en la raíz del repo está prohibida: el guardián de layout la rechaza.

```
c:\ContaPyme\Personal\apps\AppWebcomponents\
├── components/                 # fuentes por categoría
│   ├── _shared/                # utilidades (adopt-css, iconify-loader, layout…)
│   ├── actions/                # button, fab, dropdown, copy-button, …
│   ├── feedback/               # badge, toast, tooltip, cdn-snippet, …
│   ├── forms/                  # input, select, combobox, date-picker, …
│   ├── data/                   # data-grid, kanban, stat, transfer, …
│   ├── charts/                 # bar-chart, line-chart, pie-chart, gauge, …
│   ├── data-viz/               # LEGACY alias de `charts/`; sólo heatmap + maps
│                                # (folder histórico, no aparece en nuevas features)
│   ├── diagrams/               # block-diagram, flowchart, mindmap, …
│   ├── layout/                 # card, dialog, split-panel, …
│   ├── navigation/             # tab-group, breadcrumb, stepper, …
│   ├── helpers/                # popover, format-date, resize-observer, …
│   └── media/                  # icon, avatar, video, video-playlist
├── previews/
│   ├── home.html               # landing de la galería (NO category)
│   └── <category>/iswc-<name>.html   # demo por componente (un nivel más adentro)
├── styles/
│   ├── is-base.css             # tokens + temas
│   ├── palettes.css            # insoft / contapyme / agrowin
│   ├── presentation.css        # chrome de los previews
│   └── shell.css               # barra lateral, iframe split-panel
├── assets/
│   └── icons/
│       ├── mdi/                # 7447 SVGs (commiteado)
│       ├── tabler/             # 6184 SVGs (commiteado)
│       ├── mdi.json            # índice por colección (commiteado)
│       ├── tabler.json         # id
│       ├── manifest.json       # resumen de TODAS las colecciones (commiteado)
│       └── .state/             # progreso del download (IGNORADO por git)
├── scripts/
│   ├── build.mjs               # genera dist/cdn/{tag}.min.js etc.
│   ├── build-phase8.mjs        # sub-build sin tocar video.js (legacy, no usar)
│   ├── download-icons.mjs      # descarga Iconify a assets/icons/
│   ├── generate-templates.mjs  # esqueleto de preview vacío
│   ├── serve.mjs               # dev server (no-store) en puerto 8391
│   ├── preview-chrome.js       # inyecta <iswc-cdn-snippet>, theme, palette
│   ├── docs-chrome.js          # TOC + scrollspy de los previews
│   ├── fix-preview-paths.mjs   # reescribe ../ a ../../ tras folderize
│   ├── migrate-scrollspy.mjs   # migración antigua del scrollspy
│   ├── home-cdn.js             # ejemplos de uso por CDN (en el home)
│   ├── verify-theme-contract.cjs   # asserts de tokens/temas
│   ├── verify-server.cjs       # servercito tonto en :8765
│   ├── verify-fetch.cjs        # hit URLs sobre verify-server
│   └── verify-page.py          # e2e con Playwright (requiere python + playwright)
├── src/manifest.ts             # SINGLE SOURCE OF TRUTH de los componentes (TS; el legacy `manifest.js` raíz quedó obsoleto)
├── index.html                  # landing con iframe de preview
├── deno.json                  # tareas y dependencias (esbuild, tsc, playwright)
└── .gitignore
```

`docs/`, `.superpowers/`, `.impeccable/` y `dist/` **se regeneran o son notas
personales, no los toques a menos que sea explícito.**

## 3. Comandos importantes

```bash
# instalar dependencias (esbuild, playwright, typescript)
deno install

# levantar dev server (puerto 8391, canónico)
deno task dev

# levantar dev server en modo Live Server (puerto 5505, ruta /apps/<repo>/)
# Necesario si el navegador apunta a `http://127.0.0.1:5505/apps/iswc-root/...`
# y NO usas `deno task dev`.
SERVE_ROOT=C:\ContaPyme\Personal deno run -A --no-check scripts/serve.mjs 5505

# build para CDN (genera dist/cdn/{tag}.min.js + .min.css + is-base.min.css + loader + gallery-app)
deno task build
```

> **NO uses VS Code Live Server en este proyecto.** No transpila TypeScript
> ni mapea specifiers `.js` → `.ts`, así que cualquier import de `*.ts`
> (p. ej. `icon-explorer.preview.ts` que vive en `src/`) da 404 → la
> galería se queda en loading eterno. La regresión está cubierta por
> `tests/smoke-page-load.stagehand.test.mjs`.

# descargar iconos de Iconify (~300 MB si haces TODAS las colecciones, ~5 MB si solo mdi + tabler)
deno run -A --no-check scripts/download-icons.ts --only=mdi --only=tabler
deno run -A --no-check scripts/download-icons.ts --no-skip
deno task icons:download

# verificaciones
deno run -A --no-check scripts/verify-theme-contract.cjs     # falla con "missing insoft palette" hasta arreglar estilos
python scripts/verify-page.py                # requiere servidor corriendo en :8765 + playwright instalado
```

## 4. Convenciones del repo

### 4.1 Nombres y categorías

- Cada componente es `<iswc-{nombre}>` (siempre prefijo `iswc-`).
- Categorías válidas (en `src/manifest.ts`): `actions`, `feedback`, `forms`, `data`,
  `charts`, `diagrams`, `layout`, `navigation`, `helpers`, `media`, `code`,
  `overlays`, `files`, `preview`. `data-viz` figura en el manifest como
  **legacy alias** de `charts/` (sólo conserva `heatmap` + `maps` por
  compatibilidad histórica; no se usa en features nuevas). Si ves `data-viz`
  en algún preview, la categoría lógica del componente sigue siendo `charts`
  (excepto los dos legacy que siguen en `data-viz/`).
- Los sub-componentes (p.ej. `iswc-kanban-card`, `iswc-tab-panel`) no aparecen en el
  sidebar de navegación; el manifest los lista pero comparten `page` con su
  padre.

### 4.2 Paths en previews

**Trampa mortal.** Los previews viven en `previews/<category>/iswc-foo.html` (un
nivel más adentro que el resto de `previews/iswc-foo.html`). Las rutas internas
deben ser **dos niveles arriba**, no uno:

```html
<!-- previews/actions/iswc-button.html -->
<script src="../../scripts/preview-boot.js"></script>
<link rel="stylesheet" href="../../styles/is-base.css" />
<script type="module" src="../../components/actions/button.js"></script>

<!-- previews/home.html -->
<script src="../scripts/preview-boot.js"></script>
<link rel="stylesheet" href="../styles/is-base.css" />
```

> **`home.html` está en `previews/` raíz** y solo necesita `../`. Cualquier
> preview bajo `previews/<category>/` necesita `../../`. Si te equivocas, el
> script de carga 404 y la página queda en blanco sin error visible.

Si haces un folderize o rename masivo de previews, **corre `scripts/fix-preview-paths.mjs`**
que reescribe los paths en bloque.

### 4.3 Tema y paleta

- `data-theme="light|dark"` en `<html>`.
- `data-palette="insoft|contapyme|agrowin"` en `<html>`.
- Tokens: `--iswc-bg`, `--iswc-text`, `--iswc-border`, `--iswc-color-brand-500`, etc.
  El prefijo `--iswc-*` es el canónico. **No uses `--pg-*`** (legacy).
- API de tamaño en componentes: `size="sm|md|lg"` o por CSS — **nunca mezcles
  `size=...` con `pgSize=...`**. Si encuentras `pgSize` es deuda, elimínalo.

### 4.4 Estilo de iconos

Solo se usa `<iswc-icon icon="mdi:home">` (con prefijo Iconify) o
`<iswc-icon src="...">` (SVG/imagen custom). **Nunca uses `<iconify-icon>`
directamente en light DOM** — es API interna del componente.

### 4.5 Estilo de commits

Conventional commits en español, scope corto, mensajes concisos:

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

`components/_shared/iconify-loader.js` resuelve cada `<iswc-icon icon="X:Y">` así:

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
deno task icons:download -- --only=mdi --only=tabler

# descargar todas las colecciones
deno run -A --no-check scripts/download-icons.ts --no-skip
```

El script es idempotente: si la colección ya está completa (matchea el total
de la API), la salta. Si solo faltan algunos iconos, los baja sueltos.

## 6. Errores a NO repetir (bitácora de mierdas que ya nos pasaron)

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

Si corres `download-icons.mjs` sin `--only`, **se baja todo otra vez** porque
al inicio el script borra el `.state/` y empieza de cero. Antes de re-correr
"para estar seguros", **comprueba el `manifest.json`**.

### 6.10 `previews/iswc-scrollspy.html` no existe

`iswc-scrollspy` no tiene preview propio; vive dentro de otros. Si un script
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

### 6.15 Los 308k iconos de Iconify son 723 MB

Si commiteas todas las colecciones, **inflas el repo** y rompes `git clone`.
Solo commiteamos `mdi/` (7447) y `tabler/` (6184) → 5 MB. El resto se
regenera con `deno task icons:download`. El `.gitignore` ya lo deja claro; **no
lo desanotes**.

## 7. Tests (lo nuevo de esta sesión)

Hemos creado tests en `tests/` que **detectan los errores de §6 antes de que
lleguen a producción**. Todos terminan con `console.log('... PASS')` para que
un runner sencillo los pueda enumerar.

### 7.1 Convención

- Patrón existente: `components/_shared/*.selfcheck.mjs` (asserts directos).
- Patrón nuevo: `tests/*.test.mjs` (más completos, pueden leer varios archivos).
- Si un test depende del servidor (`scripts/serve.mjs`), lo dice en su header
  y `await fetch(...)` con `AbortSignal.timeout` para no colgarse.

### 7.2 Lista actual

| Test | Cubre |
|------|-------|
| `tests/manifest-paths.test.mjs` | Cada `page:` en `src/manifest.ts` existe; `script:`/`style:` apuntan a archivos reales |
| `tests/preview-paths.test.mjs` | Los `<script src>` y `<link href>` de cada preview resuelven a archivos reales |
| `tests/icon-references.test.mjs` | Cada `icon="X:Y"` en previews/componentes existe en `assets/icons/X.json` (o se acepta caer a CDN) |
| `tests/theme-contract.test.mjs` | Reemplazo del antiguo `verify-theme-contract.cjs` |
| `tests/cdn-icons.test.mjs` | Servidor arriba → cada preview carga `<iswc-icon>` sin caer al fallback `<iconify-icon>` |

### 7.3 Cómo correrlos

```bash
# individuales (sin servidor)
node tests/manifest-paths.test.mjs
node tests/preview-paths.test.mjs
node tests/icon-references.test.mjs
node tests/theme-contract.test.mjs

# con servidor (levanta en otro terminal: deno task dev)
node tests/cdn-icons.test.mjs

# todos (runner)
node tests/run-all.mjs
```

### 7.4 Estado esperado al pasar

```
manifest-paths.test.mjs: PASS — 110 componentes referenciados, 0 huérfanos
preview-paths.test.mjs:  PASS — 88 previews con paths correctos
icon-references.test.mjs: PASS — 412 iconos, 0 referencias rotas
theme-contract.test.mjs:  PASS — 2 temas + 3 paletas + tokens --iswc-*
cdn-icons.test.mjs:       PASS — 8/8 iconos cargados como <img> local
run-all: 5/5 PASS
```

Si cualquier test falla, **primero mira si el cambio que hiciste justifica la
rotura**, y si no, vuelve a leer §6 antes de parchar.

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
5. **No** crees snapshots binarios (Playwright traces, etc.) — `tests/` está
   en `.gitignore` y no se commitea.

## 8.5 Highlighter de `<pre class="code">` (scripts/highlight-pre.js)

Esta rutina pinta con CodeMirror todos los `<pre class="code">` de los previews.
**El theme de CodeMirror es reactivo al `data-theme` de `<html>`**, no fijo:

| Tema de la app | Theme de CodeMirror aplicado | CSS cargada |
|---|---|---|
| `dark`  | `material-darker` (negro, texto claro) | `theme/material-darker.min.css` |
| `light` | `mdn-like` (blanco, alto contraste) | `theme/mdn-like.min.css` |

El switch ocurre:

1. En el boot: lee `document.documentElement.dataset.theme` y elige el theme
   correspondiente. Ademas carga el CSS del **otro** theme para que el cambio
   en vivo sea instantáneo (solo ~1 KB extra cada uno).
2. En tiempo de ejecución: escucha `document` para:
   - `iswc-theme-change` (el evento que emite `<iswc-theme-toggle>` al alternar).
   - `MutationObserver` sobre `data-theme` en `<html>` (por si alguien lo
     cambia directamente sin pasar por el toggle).

Al disparar, llama `reapplyTheme()` que:

- Re-pinta los `<pre.code[data-cm]>` ya pintados con el nuevo theme.
- Limpia la clase `cm-s-*` anterior antes de aplicar la nueva (no se
  acumulan).
- Emite `iswc-codemirror-theme-changed` en `document` para que otros modulos
  globales puedan reaccionar.

Tambien expone `window.__isReapplyCodeTheme()` para re-pintar manualmente
(test, hot-reload, integraciones).

**Errores a NO repetir:**

- ❌ **NO** hardcodees la clase `cm-s-material-darker` en `paintOne()`.
  Debes aplicar la que devuelve `resolveThemeId()` para cada `<pre>`.
- ❌ **NO** te olvides de `ensureCss(THEMES[target].css)` dentro de
  `reapplyTheme()` si el CSS del theme destino no se cargo en el boot
  (defensa por si alguien borra la precarga del boot).
- ❌ **NO** asumas que el selector `pre.code` te los da ya pintados.
  Usa `pre.code[data-cm]` para re-pintar solo los que ya pasaron por CM.

El test `tests/codemirror-theme.test.mjs` protege este contrato.

## 8.6 Sistema de reutilización y bases compartidas (Capas de composición)

El repo tiene una jerarquía clara de bases para evitar duplicación. Cada componente nuevo debe usar la capa más específica que le aplique.

### Capas (de más específicas a más generales)

| Capa | Ubicación | Aplica a | Qué te da |
|---|---|---|---|
| **1. Mixin puntual** | `components/_shared/form-control-mixin.js` | form-controls (input, select, checkbox, etc.) | `label`, `hint`, `error-text`, `disabled`, `readonly`, `required`, `aria-describedby`, `aria-invalid` |
| **2. Base de familia** | `components/_shared/modal-base.js` | `<iswc-dialog>`, `<iswc-drawer>` | open/close animado cancelable, focus trap, light-dismiss, slots label/footer, events `iswc-show`/`iswc-hide`/etc. |
| **3. Base genérica** | `components/_shared/element-base.js` | todos los demás | initShadow, `#mounted`, upgradeProperties, hooks `onConnected`/`onDisconnected`/`onAttributeChanged` |
| **4. Helpers sueltos** | `components/_shared/upgrade-properties.js`, `adopt-css.js`, `form-associated.js` | cuando aplica | Una sola cosa, importada bajo demanda |

### Cómo decidir qué usar

- **El componente es un form-control** (acepta `name`/`value`/`required`/`<form>` y
  debe mostrar label/hint/error) → usa `MixinFormControl(HTMLElement)` desde
  `form-control-mixin.js`. Ver `<iswc-input>` y `<iswc-checkbox>` para ejemplos.
- **El componente es un modal con focus management** (overlay, backdrop, escape
  cierra) → extiende `ModalBase` de `modal-base.js`. La subclase solo
  aporta template + animaciones.
- **El componente es un Web Component normal** con shadow + attributes
  observados → extiende `ElementBase` de `element-base.js`. Esto te quita
  ~30 líneas de boilerplate (`#mounted`, `upgradeProperties`, listener
  lifecycle, guard `oldVal === newVal`).
- **Necesitas un único helper** (p.ej. solo `upgradeProperties`) → impórtalo
  de `_shared/` directamente.

### Jerarquía de herencia correcta

```
HTMLElement
  ↑ extends
ElementBase              (shadow + lifecycle + observed + hooks)
  ↑ extends
MixinFormControl(ElementBase)  (form-control attributes + aria sync)
  ↑ extends
IsInput                  (props/attrs específicos del input: type, value, etc.)
```

```
HTMLElement
  ↑ extends
ModalBase                (open/close + focus + animations)
  ↑ extends
IsDialog                 (template + animaciones fade/scale)
IsDrawer                 (template + animaciones slide + placement)
```

### Wrappers de.backward compatibility

`<iswc-format>`, `<iswc-format-date>`, `<iswc-format-number>`, `<iswc-format-bytes>`,
`<iswc-relative-time>` son **el mismo componente** (uno general + tres thin
wrappers). El componente deprecado deja de tener lógica propia y se convierte
en:

```js
import { createFormatElement } from './format.js';
const FormatDateElement = createFormatElement('date');
if (!customElements.get('iswc-format-date')) {
  customElements.define('iswc-format-date', FormatDateElement);
}
```

Esto preserva la retro-compatibilidad: si un consumidor ya usa
`<iswc-format-date>`, sigue funcionando. Pero internamente todo vive en un solo
lugar. La migración futura (cambiar `iswc-format-date` por `iswc-format type="date"`)
es solo un cambio de tag.

### Red flags

Si estás escribiendo uno de estos, para y reconsidera:

- `el.hasAttribute('foo')` + `el.toggleAttribute('foo', v)` → usa
  `extend ElementBase` y sus properties.
- `#upgradeProperties() { for (const a of ...) ... }` → usa
  `upgradeProperties()` de `_shared/upgrade-properties.js`.
- `constructor() { super(); const shadow = this.attachShadow(...); ... }` →
  usa `ElementBase.initShadow({ mode: 'open', delegatesFocus: true })`.
- `connectedCallback() { this.#mounted = true; ... }` + guard en
  `attributeChangedCallback` → usa `ElementBase` y los hooks `onConnected` /
  `onAttributeChanged`.
- Repetir el shadow HTML de `<div class="form-control">` + hint + error-text
  en cada form-control → usa `formControlTemplate()` o `MixinFormControl`.

## 9. Reglas de oro (resumen ejecutivo)

- Lee este archivo entero antes de tocar el repo.
- Si vas a mover archivos en masa, **primero commit lo pendiente**, luego
  `git mv`, luego `scripts/fix-preview-paths.mjs`.
- Si vas a descargar iconos, **usa `--only=mdi --only=tabler`** salvo que
  sepas que necesitas los 308k.
- Si vas a tocar `components/_shared/iconify-loader.js`, **corre
  `tests/icon-references.test.mjs` y `tests/cdn-icons.test.mjs` después**.
- Si vas a tocar `manifest.js`, **corre `tests/manifest-paths.test.mjs`**.
- Si vas a tocar `styles/is-base.css` o `palettes.css`, **corre
  `tests/theme-contract.test.mjs`**.
- Si vas a tocar `scripts/highlight-pre.js` (theme de CodeMirror en
  `<pre class="code">`), **corre `tests/codemirror-theme.test.mjs`**. Cuando
  el documento está en `data-theme="light"` el highlighter **NO** debe
  aplicar `cm-s-material-darker` (eso da texto blanco sobre fondo gris y
  es ilegible). Aplica `cm-s-mdn-like` por defecto.
- Si vas a crear un componente nuevo, **asegúrate de que su preview existe
  en `previews/<category>/` con los paths `../../...` correctos**.
- **No** uses `cd "..."; cmd1 && cmd2 && cmd3 && ...` en PowerShell. Usa `;`
  o un script `.mjs`.
- **No** declares "listo" sin haber corrido `tests/run-all.mjs`.
- Si vas a tocar `scripts/preview-chrome.js` (inyecta `<iswc-cdn-snippet>` en
  cada preview), **corre `tests/cdn-snippet-match.test.mjs`**. El matching
  debe tolerar `page` con prefijo de categoría (`'actions/iswc-button.html'`)
  porque así se guarda en `manifest.js` desde el folderize de previews.
  Comparar por basename (`(c.page || '').split('/').pop() === file`) para
  que matchee tanto si el page viene folderizado como si no.
- Si vas a tocar `components/media/icon.js` o `components/_shared/iconify-loader.js`,
  **corre `tests/icon-currentcolor.test.mjs`**. `<iswc-icon>` **NO** debe
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