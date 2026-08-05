# LLM.md — IS Web Components

Reglas del proyecto. Lo de abajo se respeta. Lo que rompe esto se revierte.

## Proyecto

- Web Components vanilla (`is-*`), shadow DOM, tokens `--is-*`.
- **Toda la fuente vive bajo `src/`**: `src/components`, `src/styles`, `src/previews`, `src/skills`, `src/assets`, `src/docs`. En la raíz solo quedan `scripts/`, `dist/`, `tests/`, `manifest.js`, `index.html`, docs de agente (`LLM.md`, `AGENTS.md`, `README.md`).
- Guardián: `tests/src-layout.test.mjs` — falla si reaparecen `components/` / `styles/` / `previews/` / `skills/` / `docs/` en la raíz, o si los previews apuntan mal a `scripts/` / `dist/`.
- `src/previews/**/*.html` = demos. Paths relativos:
  - Categoría (`src/previews/<cat>/is-x.html`): `../../styles|components` · `../../../scripts|dist`
  - Home (`src/previews/home.html`): `../styles` · `../../scripts|dist`
  - Manifest `script`/`style`: `../../components/...` (relativo al preview de categoría → resuelve a `src/components/...`)
- Docs LLM crudos (GitHub): base `…/main/src/` + `components/...` (p. ej. `…/main/src/components/LLM.md`). `LLM_BASE` en `preview-chrome.js` termina en `/src`.
- Tema/paleta por URL: `?s=<base64 {"theme":"dark|light","palette":"contapyme|insoft|agrowin"}>`. `scripts/preview-boot.js` lo decodifica y setea `data-theme` / `data-palette` en `<html>`. **`prefers-color-scheme` NO se usa** — el tema es explícito.
- Build: esbuild → `dist/cdn/` desde `src/components` + `src/styles`. Dev: `node scripts/serve.mjs` (previews en `/src/previews/`). Sin TS, sin framework, sin test runner por defecto (`node --test tests/`).
- **Paleta default del kit = `contapyme`** (azul ISP `#1a6eb0`). `insoft` y `agrowin` siguen disponibles; no son el default.
- **La marca tipográfica es `InSoft`** (S mayúscula: el logo la pinta en el color de marca, `in` + `Soft`). El identificador de paleta `insoft` va en minúsculas y **no se toca**: es API (`data-palette`, `value`, claves de objeto). Igual el dominio `insoft.com.co`.

---

## Atributos de enum: valores inventados NO fallan

`<is-button variant="ghost">` cuando el componente solo aceptaba `filled | outlined | plain` **no lanza error, no avisa en consola y no se ve en el DOM**: el atributo no casa con ninguna regla CSS y el elemento se pinta con los valores por defecto. Se coló en 4 sitios sin que nada lo detectara.

- Antes de usar un valor de enum, **verificarlo en el componente**: `const VALID_<ATTR>` en el `.js`, o la línea de JSDoc `*  variant   filled | outlined | plain`.
- No inventar nombres por analogía con otros design systems (`text`, `ghost`, `info`, `subtle`). Lo que existe está declarado.
- `tests/attr-enums.test.mjs` recorre las 147 previews y compara cada atributo de enum contra la fuente de verdad del componente. Encontró además `<is-callout color="info">` (callout no tiene `info`) y `<is-button variant="text">`.

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
- Guardián: `tests/palette-and-snippet-contract.test.mjs`.

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
- Vigilado por `tests/home-invariants.test.mjs`.

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
- Docs: `src/components/data/ag-grid.md`. Test: `tests/prefs-contract.test.mjs`.

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
- **No recrear `components/`, `styles/`, `previews/`, `skills/` o `docs/` en la raíz.** Fuente = `src/<eso>/`. Build y tests asumen `src/`.
- **No usar la misma profundidad de `../` para `styles` y para `scripts`/`dist` en previews de categoría.** Tras el move: styles/components viven en `src/` (`../../`), scripts/dist en la raíz (`../../../`).
- **No reinventar botones/forms/tables/dialogs/toasts/icons** si el kit ya tiene `is-*`. Apps: wrappers `app-*`/`tk-*` que traducen datos al kit + CSS hermano + `IsUi.adoptCss`.
- **No poner CSS de dominio como string gigante en el `.ts`.** Archivo `.css` hermano + `adoptCss(shadow, import.meta.url)`. Tras `innerHTML = ''` del shadow, volver a llamar `adoptCss`.
- **No asumir que `type="submit"` en `<is-button>` envía un `<form>` light-DOM.** El `<button>` real está en Shadow DOM; usar `requestSubmit` cableado en el kit o `onclick` que dispare submit del form.
- **No usar `is-split-panel` con `%` alto como “sidebar fijo”** (p. ej. 20%): deja un hueco enorme. Shells de app: grid CSS con ancho fijo (`14.5rem`) o `position-in-pixels`.
- **No instalar skills con `npx skills add` en el panel CDN.** Consumo = CDN + MD raw; el snippet ya no ofrece instalar skills por npm.

---

## Errores aprendidos (no repetir)

1. **"No debe girar todo el grupo"** → el grupo tenía `transform: rotateY(-6deg) rotateX(3deg)` + `:hover` que reducía la rotación. Las cards se levantaban (`translateZ`) pero el usuario no percibía hover porque el grupo se movía como bloque. Fix: quitar rotación del grupo, mover el tilt a la card individual.

2. **Shadows invisibles en light mode** → `color-mix(in srgb, #fff 7%, transparent)` en inset = highlight que en light mode es blanco sobre claro = nada. Idem `rgb(0 0 0 / 26%)` que en light es sombra demasiado negra. Fix: override `[data-theme="light"]` que sube el blanco a 75-92% y baja el negro a 9-13%.

3. **Halos y orbes como manchas en light** → `opacity: 0.5` con hues oscuros (que en light son colores de marca oscuros) = mancha oscura sobre fondo claro. Fix: bajar opacity a 0.28-0.55 explícitamente en light, o el `::after/::before` queda invisible en dark y overwhelming en light.

4. **JS parallax matando el hover** → primera versión hacía `c.style.transform = '...'`, eso gana al `:hover` y la card no se levantaba al pasar el mouse. Fix: JS escribe custom props, CSS compone el transform.

5. **`<is-icon>` inyectado como innerHTML** → no se upgradeaba el shadow DOM, salía el tag vacío o con fallback roto. Fix: `document.createElement('is-icon')` + `setAttribute('icon', 'mdi:...')` y append. Upgrade garantizado porque el script del componente ya cargó.

6. **`variant="ghost"` inventado** → se usó en 4 sitios del explorador cuando `is-button` solo aceptaba `filled | outlined | plain`. Ningún síntoma: los botones se pintaban con el default. Hoy `ghost` **sí existe** (reposo = outlined, hover = filled) y necesita `--_text-hover` / `--_border-hover`, porque al pasar a filled tienen que cambiar también el texto y el borde, no solo el fondo. No confundir con `plain`, que no tiene borde en ningún estado. Fix del error: verificar el enum antes de usarlo + `tests/attr-enums.test.mjs`.

7. **Dos grafías de la marca conviviendo** → `index.html` componía el wordmark con `accent: 'Soft'` (correcto) mientras `is-palette-selector` usaba `accentLabel: 'soft'`. La misma página mostraba «inSoft» arriba e «insoft» en el selector de paleta. Fix: unificar a `InSoft` en texto visible (83 ocurrencias), **sin** tocar el identificador `insoft`.

8. **Heredoc de bash comiéndose el escapado de una regex** → escribir un test con `cat >> file << 'EOF'` convirtió `\\[` en `\[` y `\${base}` dejó de interpolar, así que la regex del test comparaba contra el literal `${base}` y fallaba por un motivo falso. Fix: escribir archivos con la herramienta de edición, no con heredoc, cuando el contenido lleva backslashes o `${}`.

9. **Cards sin icono de demo** → el usuario no podía navegar al demo del componente desde la card. Fix: JS inyecta un `<button class="card-demo"><is-icon icon="mdi:open-in-new"></button>` en cada `.tile/.collage-card/.lab-card` que tenga un `is-*` de la whitelist. Click → `postMessage('is-select', tag)`.

10. **Persistencia de WC fragmentada** → keys planas / `sessionStorage` / root `is-components` / sidebar de columnas en template sin cablear. Fix: un solo `localStorage['is-webcomponents'][tag][storage-key]` vía `_shared/prefs.js`; `is-ag-grid` con panel de checks + `resetPersistedState`. Guardián: `tests/prefs-contract.test.mjs`. Docs: `src/components/data/ag-grid.md`.

11. **Paleta default = insoft** → el kit vivía en rojo InSoft; ContaPyme/ISP es el producto real. Quien pegaba el CDN sin `data-palette` (o con fallbacks JS en `'insoft'`) veía marca incorrecta. Fix: default `contapyme` en CSS (`:root`), HTML, fallbacks y `DEFAULT_PALETTES[0]`. Guardián: `tests/palette-and-snippet-contract.test.mjs`.

12. **`color-scheme: dark` en `:root`** → cargar `is-base.min.css` hacía que el browser pintara el canvas oscuro aunque la app fuera clara. El kit no debe decidir el fondo de página. Fix: `color-scheme` solo en `.theme-dark` / `.theme-light`; sin `html,body { background }` en base/palettes.

13. **Snippets de demo sin tema/paleta** → el markup copiado (`<div class="matrix">…`) no llevaba `data-theme`/`data-palette`; al pegarlo en otra app no heredaba el contexto del preview. Fix: `withSnippetContext` en `demo-code.js` sella la raíz y se actualiza al cambiar tema/paleta.

14. **Move a `src/` a medias** → carpetas en `src/` pero `build.mjs` / tests / previews seguían apuntando a la raíz: build vacío, previews en blanco (`../../dist` → `src/dist` inexistente), LLM raw 404. Fix: `compRoot`/`styles`/`icons` bajo `src/`; previews categoría `../../../scripts|dist` + `../../styles|components`; `LLM_BASE` …`/main/src`; guardián `tests/src-layout.test.mjs` + `tests/preview-paths.test.mjs`.

15. **CSS embebido en apps consumidoras** → `_ui.ts` / `app-*.ts` con CSS en template strings: imposible minificar aparte, divergía del kit. Fix: `helpers/ui` → `IsUi.adoptCss` + `.css` hermano (mismo contrato que `_shared/adopt-css.js`).

16. **Login / forms que “no hacen submit”** → `<is-button type="submit">` dentro de form light-DOM: el click no bidirecciona al form. Fix en kit: `requestSubmit`/`reset` en `button.js`; apps: no depender solo del type nativo sin el cableado.

17. **Sidebar con `is-split-panel` al 20%** → nav estrecho + vacío enorme. Fix: layout grid fijo, no porcentaje de split como “aside”.

18. **FormData vs `.value` en `is-input`** → leer el form nativo no siempre refleja el valor del WC; usar la propiedad `.value` del custom element (o el contrato documentado en el MD del módulo).

---

## Sistema de iconos

### DO
- El grid nativo de cada colección **no es 24**. `src/assets/icons/collections.json` guarda el `height` real por prefijo (academicons 32, fa 512, logos variable). Un SVG local tiene que declarar `viewBox="<left> <top> <w> <h>"` con **esas** dimensiones.
- Metadatos de colección (nombre, categoría, autor, licencia, paleta, grid) → `node scripts/sync-icon-collections.mjs`. Se consultan **offline**: el explorador no puede pegarle a `api.iconify.design` en runtime.
- Si una familia "no muestra iconos": `node scripts/fix-icon-viewbox.mjs --detect --only <prefix>` y luego sin `--detect` para reparar.
- Tras reparar/descargar iconos hay que **re-sincronizar `dist/cdn/assets/icons/`**: GitHub Pages sirve desde ahí, no desde `src/assets/`.

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

## CodeMirror en los snippets

- El coloreado necesita **tres** cosas cargadas: el pintor, el core de CodeMirror y **el modo** (`htmlmixed` y sus dependencias `xml`/`javascript`/`css`, que son scripts aparte del core).
- Síntoma de que falta el modo: `runMode` corre sin lanzar, pero produce **0 tokens** (`conTema > 0`, `conTokens === 0`).
- Síntoma de que falta el core: `ReferenceError: CodeMirror is not defined` dentro de `paint()`.
- Los `<is-cdn-snippet>` **auto-inyectados** se crean *después* del evento `load`, así que un reintento enganchado a `load` nunca dispara. Hace falta un reintento acotado que espere a que existan pintor + core + modo.
- El **contenido** del snippet de demo (markup) no es responsabilidad de CodeMirror: lo sella `demo-code.js` con tema/paleta. Ver sección «Snippets de demo» arriba.

---

## Testing

- `node --test tests/` — corre los invariantes (sin test runner externo, sin TS). Incluye layout `src/` (`src-layout`), paths de previews, enums, paleta, prefs, LLM links.
- `tests/` **no está en gitignore completo**: se commitean los `*.test.mjs`. Solo se ignoran artefactos (`tests/*.tmp`, `tests/coverage/`, `tests/.cache/`).
- Si en el futuro se agrega TS al proyecto, los `*.test.mjs` se migran a `*.test.ts` con `tsx --test`.
- `tests/` **no está** en `.gitignore` → tracked. Si algún día se mueve a gitignore, respetarlo: los tests no se commitean.

### Invariantes cubiertos
- Grid containers (`.home-stage__grid`, `.home-lab__grid`) no tienen `transform: rotate*` en su bloque base.
- Existe bloque `[data-theme="light"]` con overrides de shadow.
- Existe `.card-demo` CSS + script que inyecta el botón.
- `:hover` de `.tile` y `.lab-card` incluye `rotateY/X` (tilt 3D).
- `:hover` de `.collage-card` setea `--tilt-y` y `--tilt-x`.

### Detectores de inconsistencia (los que avisan solos)
- `tests/attr-enums.test.mjs` — atributos de enum en previews vs. lo que el componente acepta. **Este es el que caza los errores silenciosos**: valores que no rompen nada visible pero tampoco hacen nada.
- `tests/prefs-contract.test.mjs` — raíz `is-webcomponents`, API de `prefs.js`, consumidores (`is-ag-grid` / `is-main` / `is-split-panel`) no escriben keys planas ni `sessionStorage` canónico; sidebar de columnas cableado.
- `tests/brand-casing.test.mjs` — la marca se escribe `InSoft`; comprueba también que el wordmark compuesto lleve `'Soft'` en las dos implementaciones (`index.html` y `is-palette-selector`) y que el identificador `insoft` siga en minúsculas.
- `tests/palette-and-snippet-contract.test.mjs` — default `contapyme`; sin `color-scheme` en `:root`; sin `html/body{background}` en base/palettes; `demo-code.js` sella y reacciona a tema/paleta.
- `tests/icon-viewbox.test.mjs` — viewBox de los SVG contra `viewbox.snapshot.json`.
- `tests/icon-render.test.mjs` — sin `force-cache`, multicolor preservado, viewBox intacto.
- `tests/icon-explorer.test.mjs` — scroll propio, búsqueda global, filtros, formulario, uso de `is-*` y embed en `is-icon.html`.
- `tests/home-invariants.test.mjs` — incluye los invariantes de texto con degradado recortado en modo light.

### Tests de iconos / explorador
- `tests/icon-viewbox.test.mjs` — muestrea SVGs de cada colección y exige que el alto del `viewBox` coincida con el grid declarado en `collections.json`. Es el guardián del bug "la familia X no muestra iconos". También exige que `collections.json` cubra todas las familias de `index.json`.
- `tests/icon-explorer.test.mjs` — congela los tres fallos del explorador: (1) scroll propio, (2) buscador con ámbito **Iconos** además de Familias + los cinco filtros, (3) formulario de personalización completo (formato, tamaño+unidad, color, opciones de código, validación, acciones).

### Cómo extender
Si se agrega un nuevo tipo de card o un nuevo invariante:
1. Card nueva con efecto 3D → agregar test que verifique el `rotateY/X` en su `:hover`.
2. Nuevo shadow hardcodeado → agregar test que verifique que existe override en `[data-theme="light"]`.
3. Nuevo componente demoable → agregar a la whitelist del JS de inyección y al test correspondiente.
