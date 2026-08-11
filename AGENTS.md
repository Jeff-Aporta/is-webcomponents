# AGENTS.md — Cerebro de agentes para IS Web Components

> **Lee este archivo ANTES de tocar nada.** Resume lo que ya descubrimos a base
> de errores. Si haces algo que está en "Errores a NO repetir" y lo rompes de
> nuevo, te vas a ganar un commit revertido.
>
> **Complemento:** `LLM.md` cubre invariantes del home (rotación 3D de cards,
> parallax + hover, shadows, light mode). Si vas a tocar `src/previews/home.html`,
> léelo antes.

## 1. ¿Qué es este repo?

Galería de Web Components vanilla de InSoft (`is-*`). Todo escrito a mano con
Custom Elements + Shadow DOM, sin frameworks, empaquetado con esbuild.

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
│   └── docs/
├── scripts/                    # build, serve, preview-chrome, …
├── dist/cdn/                   # artefactos CDN (jsDelivr / Pages)
├── tests/                      # *.test.mjs (commiteados; no ignorar la carpeta)
├── manifest.js                 # SINGLE SOURCE OF TRUTH
├── index.html
├── LLM.md · AGENTS.md · README.md
└── package.json
```

**NO** vuelvas a crear `components/`, `styles/`, `previews/`, `skills/` o `docs/` en la raíz.

`src/docs/`, `.superpowers/`, `.impeccable/` y partes de `dist/` **se regeneran o son notas
personales, no los toques a menos que sea explícito.**

## 3. Comandos importantes

```bash
# instalar devDeps (esbuild)
npm install

# levantar dev server (puerto 8391)
node scripts/serve.mjs

# build para CDN (genera dist/cdn/{tag}.min.js + .min.css + is-base.min.css + bundles por categoría + all.min.js)
npm run build

# descargar iconos de Iconify (~300 MB si haces TODAS las colecciones, ~5 MB si solo mdi + tabler)
node scripts/download-icons.mjs --only=mdi --only=tabler   # re-entrar varias veces si quieres más sets
node scripts/download-icons.mjs --no-skip                  # fuerza redescarga
npm run icons:download                                     # todas las 231 colecciones

# escanear un proyecto consumidor y bajar solo los iconos usados
# (cascada: CDN propio del kit → api.iconify.design)
node scripts/download-iconify.mjs --projectRoot=../mi-app --outputDir=assets/icons
npm run icons:from-project -- --projectRoot=. --outputDir=assets/icons

# verificaciones
node tests/theme-contract.test.mjs         # 2 temas + 3 paletas + tokens --is-*
node tests/palette-and-snippet-contract.test.mjs  # default contapyme + canvas + snippets
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
<script type="module" src="../../../dist/cdn/all.min.js"></script>
<!-- manifest script: ../../components/actions/button.js → src/components/... -->

<!-- src/previews/home.html (profundidad 1) -->
<script src="../../scripts/preview-boot.js"></script>
<link rel="stylesheet" href="../styles/is-base.css" />
<script type="module" src="../../dist/cdn/all.min.js"></script>
```

> Si usas `../../dist` desde una categoría, resuelve a `src/dist` (404) y la
> página queda en blanco. Guardián: `tests/src-layout.test.mjs` +
> `tests/preview-paths.test.mjs`.

Si haces un folderize o rename masivo de previews, **corre `scripts/fix-preview-paths.mjs`**
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
- Guardián: `tests/palette-and-snippet-contract.test.mjs` +
  `tests/theme-contract.test.mjs`.

### 4.4 Estilo de iconos

Solo se usa `<is-icon icon="mdi:home">` (con prefijo Iconify) o
`<is-icon src="...">` (SVG/imagen custom). **Nunca uses `<iconify-icon>`
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
node scripts/download-icons.mjs --only=mdi --only=tabler

# descargar todas las 231 colecciones (~218 s, ~723 MB)
node scripts/download-icons.mjs
```

El script es idempotente: si la colección ya está completa (matchea el total
de la API), la salta. Si solo faltan algunos iconos, los baja sueltos.

## 6. Errores a NO repetir (bitácora de mierdas que ya nos pasaron)

### 6.0b Layout `src/`, Utilerías, previews controlados (2026-08)

- **Recrear `components/` en la raíz:** prohibido. Fuente = `src/…`. Guardián:
  `tests/src-layout.test.mjs`.
- **Misma profundidad `../` para styles y dist** en previews de categoría:
  styles/components → `../../`; scripts/dist → `../../../`. Si unificas,
  resuelves a `src/dist` (404). Guardián: `tests/preview-paths.test.mjs`.
- **Utilería pública sin tab:** toda `.js` en `helpers/` (salvo `floating.js`
  internal) necesita `manifest.page` + HTML + MD. Label del nav: **Utilerías**.
  Guardián: `tests/helpers-homogeneity.test.mjs`.
- **Previews JSON (`is-preview/v1`):** cero HTML por tag (solo `_shell.html`). Datos en
  `*.json`, lógica en `behaviors/`, chrome `<is-preview-component>`. Guardián:
  `tests/preview-json-contract.test.mjs`.
- **`dist/` solo `cdn/`:** nada suelto tipo `dist/ag-grid.js`. Guardián:
  `tests/dist-cdn-layout.test.mjs`.
- **LLM.md sin carta/DO/DON'T:** `tests/llm-contract.test.mjs` exige secciones
  y que los guardianes citados existan en disco.
- Detalle completo: `LLM.md` → Carta de leyes + errores 24–30.

### 6.0 Paleta / canvas / snippets (2026-08)

- **Default `insoft`:** incorrecto. Producto real = ContaPyme → default
  `contapyme` en CSS, HTML, fallbacks JS y `DEFAULT_PALETTES[0]`.
- **`color-scheme: dark` en `:root`:** el CDN oscurecía apps claras. Solo
  `.theme-dark` / `.theme-light`.
- **`html,body { background }` en base/palettes:** prohibido. Canvas = app.
- **Snippet sin `data-theme`/`data-palette`:** el ejemplo no hereda contexto
  al pegarlo. Usar `withSnippetContext` en `demo-code.js`, no wrappers a mano.
- Correr `node tests/palette-and-snippet-contract.test.mjs` si tocás estilos
  de tema/paleta o `demo-code.js`.

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

El repo pasa de 50 MB por `dist/cdn/assets/icons` (~318k archivos), y jsDelivr
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

## 7. Tests

Los `tests/*.test.mjs` **detectan errores de §6 / LLM.md antes de merge**.
Fuente de verdad narrativa: `LLM.md` (Carta de leyes + Testing). Guardián del
documento: `tests/llm-contract.test.mjs`.

**`tests/` no está gitignoreado entero** — se commitean los `*.test.mjs`. Solo
artefactos (`tests/*.tmp`, `coverage/`, `.cache/`). Extensión canónica: `.mjs`
(no `.ts` mientras el kit sea ESM vanilla).

### 7.1 Convención

- Patrón existente: `src/components/_shared/*.selfcheck.mjs` (asserts directos).
- Patrón nuevo: `tests/*.test.mjs` (más completos, pueden leer varios archivos).
- Si un test depende del servidor (`scripts/serve.mjs`), lo dice en su header
  y `await fetch(...)` con `AbortSignal.timeout` para no colgarse.

### 7.2 Guardianes prioritarios (carta de leyes)

| Test | Cubre |
|------|-------|
| `tests/llm-contract.test.mjs` | Secciones DO/DON'T/errores del LLM.md + guardianes en disco |
| `tests/src-layout.test.mjs` | Fuente bajo `src/`; sin carpetas raíz prohibidas |
| `tests/helpers-homogeneity.test.mjs` | Utilerías públicas = manifest.page + HTML + MD |
| `tests/preview-controller.test.mjs` | Kit `is-preview-component` + piloto sin eval |
| `tests/preview-paths.test.mjs` | `<script src>` / `<link href>` de previews resuelven |
| `tests/manifest-paths.test.mjs` | `page`/`script`/`style` del manifest existen |
| `tests/attr-enums.test.mjs` | Enums en previews vs `VALID_*` |
| `tests/token-vocabulary.test.mjs` | Tokens `--is-color-*` coherentes |
| `tests/palette-and-snippet-contract.test.mjs` | Default contapyme; canvas libre; snippets |
| `tests/icon-references.test.mjs` | `icon="X:Y"` existe o cae a CDN de forma aceptada |
| `tests/theme-contract.test.mjs` | Temas + paletas + tokens `--is-*` |
| `tests/cdn-icons.test.mjs` | Servidor arriba → iconos locales sin fallback iconify |

### 7.3 Cómo correrlos

```bash
# individuales (sin servidor)
node tests/manifest-paths.test.mjs
node tests/preview-paths.test.mjs
node tests/icon-references.test.mjs
node tests/theme-contract.test.mjs
node tests/palette-and-snippet-contract.test.mjs

# con servidor (levanta en otro terminal: node scripts/serve.mjs 8391)
node tests/cdn-icons.test.mjs

# todos (runner)
node tests/run-all.mjs
```

### 7.4 Estado esperado al pasar

```
manifest-paths.test.mjs: PASS — 110 componentes referenciados, 0 huérfanos
preview-paths.test.mjs:  PASS — 88 previews con paths correctos
icon-references.test.mjs: PASS — 412 iconos, 0 referencias rotas
theme-contract.test.mjs:  PASS — 2 temas + 3 paletas + tokens --is-*
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
5. **No** crees snapshots binarios pesados (traces Playwright, coverage HTML)
   bajo `tests/` sin añadirlos al gitignore de artefactos. Los `*.test.mjs`
   **sí se commitean**.

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
   - `is-theme-change` (el evento que emite `<is-theme-toggle>` al alternar).
   - `MutationObserver` sobre `data-theme` en `<html>` (por si alguien lo
     cambia directamente sin pasar por el toggle).

Al disparar, llama `reapplyTheme()` que:

- Re-pinta los `<pre.code[data-cm]>` ya pintados con el nuevo theme.
- Limpia la clase `cm-s-*` anterior antes de aplicar la nueva (no se
  acumulan).
- Emite `is-codemirror-theme-changed` en `document` para que otros modulos
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

## 9. Reglas de oro (resumen ejecutivo)

- Lee `LLM.md` (Carta de leyes) y este archivo antes de tocar el repo.
- Si vas a mover archivos en masa, **primero commit lo pendiente**, luego
  `git mv`, luego `scripts/fix-preview-paths.mjs`.
- Si vas a tocar layout `src/` / paths de preview → `src-layout` + `preview-paths`.
- Si vas a añadir utilería en `helpers/` → `helpers-homogeneity`.
- Si vas a migrar un preview al sistema controlado → `preview-controller` + registry.
- Si vas a editar `LLM.md` → `llm-contract`.
- Si vas a descargar iconos, **usa `--only=mdi --only=tabler`** salvo que
  sepas que necesitas los 308k.
- Si vas a tocar `src/components/_shared/iconify-loader.js`, **corre
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
  en `src/previews/<category>/` con paths styles `../../` y scripts/dist
  `../../../`**.
- **No** uses `cd "..."; cmd1 && cmd2 && cmd3 && ...` en PowerShell. Usa `;`
  o un script `.mjs`.
- **No** declares "listo" sin haber corrido `tests/run-all.mjs`.
- Si vas a tocar `scripts/preview-chrome.js` (inyecta `<is-cdn-snippet>` en
  cada preview), **corre `tests/cdn-snippet-match.test.mjs`**. El matching
  debe tolerar `page` con prefijo de categoría (`'actions/is-button.html'`)
  porque así se guarda en `manifest.js` desde el folderize de previews.
  Comparar por basename (`(c.page || '').split('/').pop() === file`) para
  que matchee tanto si el page viene folderizado como si no.
- Si vas a tocar `src/components/media/icon.js` o `src/components/_shared/iconify-loader.js`,
  **corre `tests/icon-currentcolor.test.mjs`**. `<is-icon>` **NO** debe
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