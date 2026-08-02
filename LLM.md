# LLM.md — IS Web Components

Reglas del proyecto. Lo de abajo se respeta. Lo que rompe esto se revierte.

## Proyecto

- Web Components vanilla (`is-*`), shadow DOM, tokens `--is-*`.
- `previews/*.html` = demos. Cada preview es self-contained: importa componentes por `<script type="module src="../components/...">`.
- Tema/paleta por URL: `?s=<base64 {"theme":"dark|light","palette":"insoft|..."}>`. `scripts/preview-boot.js` lo decodifica y setea `data-theme` / `data-palette` en `<html>`. **`prefers-color-scheme` NO se usa** — el tema es explícito.
- Build: esbuild → `dist/cdn/`. Dev: `node scripts/serve.mjs`. Sin TS, sin framework, sin test runner por defecto.

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

### JS en previews
- Inyectar UI repetitiva con JS (`document.createElement` + `setAttribute`), no escribirla 30 veces en HTML.
- Custom elements: `createElement('is-icon')` + `setAttribute('icon', 'mdi:...')`. `innerHTML` con custom tags no garantiza upgrade.
- Navegar al demo del componente: `parent.postMessage({ type: 'is-select', tag }, location.origin)`. Mismo shape que usan los CTA del hero (`#ctaExplore` etc.).
- Gatear la inyección: si la card no tiene un `is-*` compatible, no inyectar el botón. Whitelist explícita de tags demoable.

### Parallax + hover coexisten
- JS escribe `--px/--py/--pz/--pry/--prx` (custom props), nunca `style.transform` inline. Inline mata el `:hover`.
- Transform compuesto en CSS: `translate3d(var(--px), var(--py), calc(var(--pz) + var(--lift))) rotateY(...) rotateX(...)`.

---

## DON'T

- **No rotar el grupo entero.** `transform: rotateY/X` en `.home-stage__grid` / `.home-lab__grid` / `.home-collage__track` = todas las cards se mueven juntas, pierde el efecto individual. El usuario lo lee como "no hay efecto hover" aunque la card sí se levante.
- **No hardcodear `#fff` en shadows/text-shadows sin override light.** En dark es un highlight sutil, en light es invisible (blanco sobre claro). En light, subir a 70-90%.
- **No hardcodear `rgb(0 0 0 / X%)` en shadows sin override light.** En dark queda bien, en light es una mancha negra. Bajar a 9-13% en light.
- **No usar `innerHTML` para custom elements** que no estén ya upgraded. Riesgo de que el elemento quede como HTMLElement sin shadow DOM.
- **No usar `prefers-color-scheme`** como selector de tema. El tema es por `data-theme` en `<html>`. Si el OS cambia, el preview no se entera — y eso es lo que se quiere (la preview es determinista por URL).
- **No meter `style.transform` inline** en elementos con `:hover` 3D. El inline gana al `:hover` y el tilt desaparece.
- **No olvidarse del reset responsive/reduced-motion.** Si el 3D se queda en móvil o con reduced-motion, la página se rompe visualmente.

---

## Errores aprendidos (no repetir)

1. **"No debe girar todo el grupo"** → el grupo tenía `transform: rotateY(-6deg) rotateX(3deg)` + `:hover` que reducía la rotación. Las cards se levantaban (`translateZ`) pero el usuario no percibía hover porque el grupo se movía como bloque. Fix: quitar rotación del grupo, mover el tilt a la card individual.

2. **Shadows invisibles en light mode** → `color-mix(in srgb, #fff 7%, transparent)` en inset = highlight que en light mode es blanco sobre claro = nada. Idem `rgb(0 0 0 / 26%)` que en light es sombra demasiado negra. Fix: override `[data-theme="light"]` que sube el blanco a 75-92% y baja el negro a 9-13%.

3. **Halos y orbes como manchas en light** → `opacity: 0.5` con hues oscuros (que en light son colores de marca oscuros) = mancha oscura sobre fondo claro. Fix: bajar opacity a 0.28-0.55 explícitamente en light, o el `::after/::before` queda invisible en dark y overwhelming en light.

4. **JS parallax matando el hover** → primera versión hacía `c.style.transform = '...'`, eso gana al `:hover` y la card no se levantaba al pasar el mouse. Fix: JS escribe custom props, CSS compone el transform.

5. **`<is-icon>` inyectado como innerHTML** → no se upgradeaba el shadow DOM, salía el tag vacío o con fallback roto. Fix: `document.createElement('is-icon')` + `setAttribute('icon', 'mdi:...')` y append. Upgrade garantizado porque el script del componente ya cargó.

6. **Cards sin icono de demo** → el usuario no podía navegar al demo del componente desde la card. Fix: JS inyecta un `<button class="card-demo"><is-icon icon="mdi:open-in-new"></button>` en cada `.tile/.collage-card/.lab-card` que tenga un `is-*` de la whitelist. Click → `postMessage('is-select', tag)`.

---

## Sistema de iconos

### DO
- El grid nativo de cada colección **no es 24**. `assets/icons/collections.json` guarda el `height` real por prefijo (academicons 32, fa 512, logos variable). Un SVG local tiene que declarar `viewBox="<left> <top> <w> <h>"` con **esas** dimensiones.
- Metadatos de colección (nombre, categoría, autor, licencia, paleta, grid) → `node scripts/sync-icon-collections.mjs`. Se consultan **offline**: el explorador no puede pegarle a `api.iconify.design` en runtime.
- Si una familia "no muestra iconos": `node scripts/fix-icon-viewbox.mjs --detect --only <prefix>` y luego sin `--detect` para reparar.
- Tras reparar/descargar iconos hay que **re-sincronizar `dist/cdn/assets/icons/`**: GitHub Pages sirve desde ahí, no desde `assets/`.

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

---

## Testing

- `node --test tests/` — corre los invariantes del CSS de `previews/home.html` (sin test runner externo, sin TS).
- Si en el futuro se agrega TS al proyecto, los `*.test.mjs` se migran a `*.test.ts` con `tsx --test`.
- `tests/` **no está** en `.gitignore` → tracked. Si algún día se mueve a gitignore, respetarlo: los tests no se commitean.

### Invariantes cubiertos
- Grid containers (`.home-stage__grid`, `.home-lab__grid`) no tienen `transform: rotate*` en su bloque base.
- Existe bloque `[data-theme="light"]` con overrides de shadow.
- Existe `.card-demo` CSS + script que inyecta el botón.
- `:hover` de `.tile` y `.lab-card` incluye `rotateY/X` (tilt 3D).
- `:hover` de `.collage-card` setea `--tilt-y` y `--tilt-x`.

### Tests de iconos / explorador
- `tests/icon-viewbox.test.mjs` — muestrea SVGs de cada colección y exige que el alto del `viewBox` coincida con el grid declarado en `collections.json`. Es el guardián del bug "la familia X no muestra iconos". También exige que `collections.json` cubra todas las familias de `index.json`.
- `tests/icon-explorer.test.mjs` — congela los tres fallos del explorador: (1) scroll propio, (2) buscador con ámbito **Iconos** además de Familias + los cinco filtros, (3) formulario de personalización completo (formato, tamaño+unidad, color, opciones de código, validación, acciones).

### Cómo extender
Si se agrega un nuevo tipo de card o un nuevo invariante:
1. Card nueva con efecto 3D → agregar test que verifique el `rotateY/X` en su `:hover`.
2. Nuevo shadow hardcodeado → agregar test que verifique que existe override en `[data-theme="light"]`.
3. Nuevo componente demoable → agregar a la whitelist del JS de inyección y al test correspondiente.
