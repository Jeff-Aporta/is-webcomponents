# Auditoría de Testing — Categoría `media` (12 testables)

**Proyecto:** `C:\ContaPyme\Personal\apps\is-webcomponents`
**Alcance:** 12 componentes en `src/components/media/`
**Modo:** PROPUESTAS (no se escribe código de tests)
**Existentes analizados:**
- Tests unitarios ad-hoc: `none found` para los 12 archivos `*.test.ts` en `src/components/media/`.
- Tests estáticos (regex/readFileSync) en `src/utils/testing/domain/`:
  - `icon-explorer.test.ts` — invariantes del HTML/JS del explorador (scroll propio, buscador global, formulario completo).
  - `icon-currentcolor.test.ts` — verifica inline SVG + propagación de `currentColor`.
  - `icon-render.test.ts` — anti-caché (`force-cache`) y respeto a paleta multicolor.
  - `icon-prefetch.test.ts` — restringe prefetch a `mdi` + `tabler` en git.
- Tests Tier A (estructura/contrato) en `src/utils/health/exhaustive/media/`:
  - `media-recorder.test.ts` — 12 aserciones (módulo, CSS, JSON, OBSERVED, eventos, métodos, partes).
  - `video.test.ts` — 12 aserciones análogas.

> **Conclusión rápida:** los testables de media tienen **cobertura Tier A (contrato) y Tier B (estática de iconos)**, pero carecen de tests **funcionales / de comportamiento** (JSDOM, Playwright, happy-dom). Las propuestas de abajo apuntan específicamente a esos huecos.

---

## 1. `<is-avatar>` — `src/components/media/avatar.ts` (146 LOC)

**Atributos observados:** `image`, `initials`, `label`, `loading`, `shape`. **Slots:** `icon` (fallback). **Eventos:** `is-error` (bubbles, composed). **CSS Parts:** `::part(avatar)`, `::part(image)`, `::part(initials)`, `::part(icon)`. **Estados internos:** `#imgFailed`, sincronización condicional imagen / iniciales / icono. Default: `shape="circle"`, `loading="eager"`. Roles: `role="img"`, `aria-label` derivado.

### Tests propuestos

1. **Foco del fallback cuando `image` falla** — [categoría: edge-case]
   - **Setup:** jsdom + `<img>` mockeado para disparar `error` cuando reciba `src="https://broken.example/x.jpg"`. Cargar `<is-avatar image="https://broken.example/x.jpg" label="Ana" initials="AN"></is-avatar>`.
   - **Acción:** Esperar a `load` del componente y disparar el evento `error` sobre `#img`. Repetir cambio `image → "" → image rota`.
   - **Assertion:** Tras el error, la sombra muestra `part="image"` con `hidden=true`, `part="initials"` con `hidden=false` y `textContent="AN"`; se emite `is-error` exactamente una vez; `aria-label` se mantiene como `"Ana"`. Un segundo `setAttribute('image', mismoUrl)` reintenta (resetea `#imgFailed`).
   - **Coverage:** ramas de `#onImgError` (incluye la guarda `if (!src) return` cuando el `src` se vacía).

2. **`image` con esquema `javascript:` se rechaza en SSR** — [categoría: xss]
   - **Setup:** jsdom + atributo `image="javascript:alert(1)"`.
   - **Acción:** Insertar el elemento en DOM.
   - **Assertion:** `#img.src` queda vacío (la rama `showImage = Boolean(image) && !#imgFailed` falla por `trim()` o el filtro interno), no se ejecuta nada. Alternativa: si `image` se asigna tal cual, verificar que el `alt` no contiene HTML interpretado (sólo `textContent`).
   - **Coverage:** sanitización implícita + rama de URL peligrosa.

3. **`initials` se trunca a 2 caracteres en mayúsculas** — [categoría: ui/ux]
   - **Setup:** `<is-avatar initials="juan">`, `<is-avatar initials="abcd">`, `<is-avatar initials="">`.
   - **Acción:** Conectar al DOM.
   - **Assertion:** `initials.textContent` === `"JU"` para "juan", `"AB"` para "abcd", `hidden=true` para vacío. La rama "icono" se activa al final cuando `initials=""`.
   - **Coverage:** `slice(0,2)` + `toUpperCase` + prioridad sobre icono.

4. **`label` controla `alt` y `aria-label`** — [categoría: a11y]
   - **Setup:** `<is-avatar image="a.jpg" label="Foto de Bea"></is-avatar>` y `<is-avatar image="a.jpg" initials="BE"></is-avatar>` y `<is-avatar image="a.jpg"></is-avatar>`.
   - **Acción:** Observar cambios en `attributeChangedCallback`.
   - **Assertion:** `aria-label` del host y `alt` del `<img>` interno son `"Foto de Bea"` en el primer caso, `"BE"` en el segundo (cuando no hay label) y `"Avatar"` por defecto en el tercero.
   - **Coverage:** orden de prioridad `label || initials || 'Avatar'`.

5. **`shape="invalid"` se normaliza a `circle`** — [categoría: edge-case]
   - **Setup:** `<is-avatar shape="oval">` y `<is-avatar shape="">`.
   - **Acción:** Asignar y leer `shape` (getter).
   - **Assertion:** `host.shape === 'circle'`; `dataset.shape === 'circle'`; el atributo DOM queda como `oval` (no se reescribe porque está cubierto por getter). Tras `el.shape = 'rounded'`, atributo normalizado.
   - **Coverage:** ramas del getter/setter con `VALID_SHAPE`.

6. **`loading="lazy"` se aplica al `<img>` interno** — [categoría: performance]
   - **Setup:** `<is-avatar image="a.jpg" loading="lazy">`.
   - **Acción:** Verificar tras `connectedCallback`.
   - **Assertion:** `shadowRoot.querySelector('.image').loading === 'lazy'`.
   - **Coverage:** delegación del atributo.

7. **`slotchange` en `slot[name="icon"]` re-pinta la vista** — [categoría: integration]
   - **Setup:** `<is-avatar><is-icon slot="icon" icon="mdi:user"></is-icon></is-avatar>` y `image=""`, `initials=""`.
   - **Acción:** Tras conectar, reemplazar el icono slotted por otro `<is-icon icon="mdi:bell">`.
   - **Assertion:** `#syncView()` se invoca; el slot muestra el nuevo icono; `#icon.hidden === false`.
   - **Coverage:** listener `slotchange`.

8. **Evento `is-error` se emite una sola vez por fallo** — [categoría: edge-case]
   - **Setup:** `<is-avatar image="a.jpg">` con `img.error` que dispara varias veces.
   - **Acción:** Disparar `error` 3 veces consecutivas.
   - **Assertion:** El evento `is-error` sólo se emite una vez (la guarda `if (!this.#img.getAttribute('src')) return` puede proteger; verificar comportamiento real).
   - **Coverage:** idempotencia del handler.

9. **Imagen válida con `crossorigin` se acepta** — [categoría: browser-api]
   - **Setup:** jsdom + `<img>` con `src="https://cdn/avatar.png"`.
   - **Acción:** `onload` se dispara.
   - **Assertion:** `host.image` getter devuelve el mismo URL; no se emite `is-error`; `#img.hidden === false`.
   - **Coverage:** rama feliz de `#load`.

10. **Renderiza el fallback icon en ausencia total de props** — [categoría: edge-case]
    - **Setup:** `<is-avatar></is-avatar>`.
    - **Acción:** Conectar al DOM.
    - **Assertion:** `aria-label === 'Avatar'`; `part="icon"` visible con `<is-icon icon="mdi:account">`; `part="initials"` y `part="image"` ocultos.
    - **Coverage:** rama final de `#syncView`.

11. **CSS Parts `image` / `initials` / `icon` son estilizables** — [categoría: ui/ux]
    - **Setup:** cargar `<style>:host::part(initials) { background: red }</style>` en el documento y un avatar con `initials="AB"`.
    - **Acción:** Inspeccionar `getComputedStyle` del elemento slotted al part.
    - **Assertion:** `background-color` aplicado vía part.
    - **Coverage:** export de parts.

12. **`loading="auto"` se rechaza y cae a `eager`** — [categoría: edge-case]
    - **Setup:** `setAttribute('loading', 'auto')`.
    - **Acción:** Leer `host.loading`.
    - **Assertion:** devuelve `'eager'`; el atributo DOM permanece hasta que se reasigne con valor válido.
    - **Coverage:** validación contra lista `VALID_LOADING`.

---

## 2. `<is-barcode-scanner>` — `src/components/media/barcode-scanner.ts` (115 LOC)

**Atributos:** `formats` (CSV), `disabled`. **Métodos:** `start()`, `stop()`, `detect(source)`. **Eventos:** `is-detect { rawValue, format, barcodes }`, `is-error`. **Browser APIs:** `BarcodeDetector`, `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`. **Video preview** interno + `<is-button>` de control.

### Tests propuestos

1. **Permiso de cámara denegado (`NotAllowedError`)** — [categoría: browser-api]
   - **Setup:** mockear `navigator.mediaDevices.getUserMedia` para que rechace con `Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })`.
   - **Acción:** Llamar `start()` en `<is-barcode-scanner>`.
   - **Assertion:** Se emite `is-error` con `detail.message` que contiene `'Permission denied'`; `#stream` queda `null`; `#go.textContent` permanece en `"Escanear"`; el botón no queda en estado "Detener".
   - **Coverage:** rama `catch (err)` del bloque getUserMedia.

2. **`BarcodeDetector` no disponible (Safari)** — [categoría: browser-api]
   - **Setup:** borrar `globalThis.BarcodeDetector` antes de cargar el módulo (jsdom).
   - **Acción:** Llamar `start()` y `detect(imgMock)`.
   - **Assertion:** `detect()` emite `is-error { message: 'BarcodeDetector no disponible' }` y devuelve `[]`; `start()` también emite `is-error` y muestra `"BarcodeDetector no está en este navegador"` en `.hint`.
   - **Coverage:** guarda `typeof BarcodeDetector !== 'function'`.

3. **`disabled` desactiva `start()` y re-aplica el atributo al botón** — [categoría: a11y]
   - **Setup:** `<is-barcode-scanner disabled>`.
   - **Acción:** Llamar `start()` manualmente; alternar `removeAttribute('disabled')` luego `setAttribute('disabled', '')`.
   - **Assertion:** `start()` retorna sin tocar cámara cuando `disabled` está presente; el `<is-button>` interno refleja el atributo (atributo `disabled` propagado).
   - **Coverage:** `attributeChangedCallback` para `disabled`.

4. **Cambio de `formats` en vivo reinicia el scanner** — [categoría: edge-case]
   - **Setup:** Mock getUserMedia + BarcodeDetector con spy. Arrancar el scanner, luego `setAttribute('formats', 'qr_code,code_128,ean_13')`.
   - **Acción:** Disparar el `attributeChangedCallback` simulando cambio.
   - **Assertion:** Se invoca `stop()` y luego `start()`; el `BarcodeDetector` se reconstruye con la nueva lista.
   - **Coverage:** rama `if (name === 'formats' && this.#stream)` (cubierta por comentario "2026-Q1 fix").

5. **`detect()` con `<img>` válido emite `is-detect` y devuelve barcodes** — [categoría: browser-api]
   - **Setup:** mockear `BarcodeDetector` para devolver `[{ rawValue: '7701234567897', format: 'ean_13' }]` desde `detect()`.
   - **Acción:** Llamar `detect(blobImg)`.
   - **Assertion:** se emite `is-detect { rawValue: '7701234567897', format: 'ean_13', barcodes: [...] }`; la promesa resuelve con la lista.
   - **Coverage:** rama feliz de `#detect`.

6. **`detect()` sin resultados emite promesa vacía sin `is-detect`** — [categoría: edge-case]
   - **Setup:** Mock `BarcodeDetector.detect` → `[]`.
   - **Acción:** Llamar `detect()`.
   - **Assertion:** devuelve `[]`, no se emite `is-detect`.
   - **Coverage:** guarda `if (barcodes.length)`.

7. **`stop()` libera tracks y limpia `srcObject`** — [categoría: browser-api]
   - **Setup:** spy sobre `MediaStreamTrack.stop()`.
   - **Acción:** Llamar `start()` (mock OK), después `stop()`.
   - **Assertion:** cada `getTracks()` invocado con `.stop()`; `video.srcObject === null`; `#timer` se limpia; `go.textContent === 'Escanear'`.
   - **Coverage:** `#stop`.

8. **`stop()` al desconectar (`disconnectedCallback`)** — [categoría: integration]
   - **Setup:** arrancar scanner, después `el.remove()`.
   - **Acción:** DOM removal.
   - **Assertion:** la pista se detiene, sin leaks.
   - **Coverage:** cleanup hook.

9. **Bucle de polling: 3 detecciones en 1.2 s** — [categoría: performance]
   - **Setup:** Mock getUserMedia + BarcodeDetector; usar `jest.useFakeTimers()`.
   - **Acción:** Llamar `start()`, avanzar el reloj 1200 ms.
   - **Assertion:** `detect()` se invoca 3 veces (`setTimeout` 400 ms), `state` no se rompe.
   - **Coverage:** bucle `#tick`.

10. **`formats` setter acepta array y string** — [categoría: ui/ux]
    - **Setup:** `<is-barcode-scanner></is-barcode-scanner>`.
    - **Acción:** `el.formats = ['qr_code', 'code_128']`; `el.formats = ''`; `el.formats = null`.
    - **Assertion:** el atributo `formats` queda `"qr_code,code_128"`; `null/""` lo elimina.
    - **Coverage:** setter y `setStringAttr`.

11. **Sin HTTPS / sin contexto seguro: el navegador bloquea `getUserMedia`** — [categoría: browser-api]
    - **Setup:** jsdom con `window.isSecureContext = false` y mock que rechaza `SecurityError`.
    - **Acción:** Llamar `start()`.
    - **Assertion:** `is-error` emitido con mensaje; el `video.srcObject` nunca se asigna.
    - **Coverage:** requisito de contexto seguro documentado.

12. **Detección con `canvas` (uso programático)** — [categoría: integration]
    - **Setup:** `detect(canvasEl)` con `BarcodeDetector` mock devolviendo resultados.
    - **Acción:** Pasar un `<canvas>` directamente (uso fuera del preview).
    - **Assertion:** Se emite `is-detect` con el `rawValue`.
    - **Coverage:** API pública `detect()`.

13. **Cambio de `disabled` tras mount no dispara `start()`** — [categoría: edge-case]
    - **Setup:** arrancar scanner; luego `setAttribute('disabled', '')`.
    - **Acción:** Click sobre el `<is-button>` interno.
    - **Assertion:** `start()` retorna sin invocar getUserMedia.
    - **Coverage:** rama inicial de `start()`.

---

## 3. `<is-barcode>` — `src/components/media/barcode.ts` (199 LOC)

**Atributos:** `value`, `type` (ean13|code128), `height`, `fg`, `bg`, `show-text`, `quiet`. **Eventos:** `is-render { svg }`. **Algoritmo:** Code128B (tabla de patrones) + EAN-13 con check digit GS1. **Salida:** `<svg>` con `<rect>` por barra + zona quiet. **API:** el detalle incluye el nodo SVG.

### Tests propuestos

1. **EAN-13 con 12 dígitos calcula correctamente el check digit** — [categoría: edge-case]
   - **Setup:** `<is-barcode type="ean13" value="770123456789"></is-barcode>` (Colombia).
   - **Acción:** Conectar al DOM, esperar `is-render`.
   - **Assertion:** `detail.label` es `"7701234567897"` (verificador 7); el `<text>` interno muestra el dígito 13; el `<svg>` contiene patrón `L/G/R` correcto (95 módulos + quiet).
   - **Coverage:** rama EAN13 + `ean13Check()`.

2. **EAN-13 con menos de 12 dígitos se rechaza** — [categoría: edge-case]
   - **Setup:** `value="12345"`, `type="ean13"`.
   - **Acción:** Render.
   - **Assertion:** `#text.hidden === true`, `#svg.innerHTML === ''`, no se emite `is-render`.
   - **Coverage:** `if (digits.length !== 12) return null`.

3. **EAN-13 con caracteres no numéricos los descarta** — [categoría: edge-case]
   - **Setup:** `value="770-123-456-789"` o `value="abc770123456789def"`.
   - **Acción:** Render.
   - **Assertion:** `digits` se filtra con `replace(/\D/g, '')` y se queda con 12 → calcula dígito correctamente.
   - **Coverage:** sanitización del input.

4. **Code128 con caracteres no ASCII los salta** — [categoría: edge-case]
   - **Setup:** `value="ABC€XYZ"` (€ = char 8364, fuera de 32–127).
   - **Acción:** Render.
   - **Assertion:** El carácter € se omite en la codificación (el `continue` dentro del bucle); el resto se codifica; check digit válido.
   - **Coverage:** guarda `if (code < 32 || code > 127) continue`.

5. **Code128 vacío produce SVG vacío y oculta texto** — [categoría: edge-case]
   - **Setup:** `<is-barcode value=""></is-barcode>`.
   - **Acción:** Render.
   - **Assertion:** `#svg.innerHTML === ''`, `#text.hidden === true`. La guarda `if (!bits) { ... return }` se activa.
   - **Coverage:** value vacío.

6. **Tipo no soportado (`qr` u otro) muestra mensaje** — [categoría: ui/ux]
   - **Setup:** `<is-barcode type="qr" value="hola"></is-barcode>`.
   - **Acción:** Render.
   - **Assertion:** `#text.textContent` contiene `'Tipo "qr" no soportado'`; SVG vacío.
   - **Coverage:** rama `else` del switch de tipos.

7. **Quiet zones de EAN13 (`quiet="9"`) añaden padding** — [categoría: edge-case]
   - **Setup:** `<is-barcode type="ean13" value="770123456789" quiet="20"></is-barcode>`.
   - **Acción:** Render.
   - **Assertion:** El `moduleCount` de `<rect>`s visibles equivale a `bits.length` + 40 (20 a cada lado).
   - **Coverage:** `'0'.repeat(quiet) + bits + '0'.repeat(quiet)`.

8. **`fg` y `bg` personalizan colores** — [categoría: ui/ux]
   - **Setup:** `<is-barcode type="ean13" value="770123456789" fg="#ff0000" bg="#ffff00"></is-barcode>`.
   - **Acción:** Render.
   - **Assertion:** Primer `<rect>` con `fill="#ffff00"` y altura completa; resto con `fill="#ff0000"`.
   - **Coverage:** ramas condicionales `if (bg !== 'transparent')`.

9. **`show-text="false"` oculta la etiqueta** — [categoría: ui/ux]
   - **Setup:** `<is-barcode type="ean13" value="770123456789" show-text="false"></is-barcode>`.
   - **Acción:** Render.
   - **Assertion:** `#text.hidden === true` aunque `type === 'ean13'` (corta la regla por defecto).
   - **Coverage:** short-circuit `showText = hasAttribute('show-text') || type === 'ean13'` (verificar que `false` no se interpreta falsy aquí — el atributo booleano funciona por presencia).

10. **Cambio de atributo re-renderiza el SVG** — [categoría: edge-case]
    - **Setup:** `<is-barcode type="ean13" value="750103131130"></is-barcode>`; cambiar a `value="400638133393"`.
    - **Acción:** Modificar atributo.
    - **Assertion:** Se emite un nuevo `is-render`; el SVG cambia (número de `<rect>`s puede diferir si las barras difieren).
    - **Coverage:** `attributeChangedCallback` y `#render`.

11. **Code128 largo (200 caracteres) sin bloquear UI** — [categoría: performance]
    - **Setup:** `<is-barcode type="code128" value="A".repeat(200)></is-barcode>`.
    - **Acción:** Render y medir tiempo.
    - **Assertion:** El bucle se ejecuta en menos de N ms (umbral empírico); no hay `requestAnimationFrame` recursivo.
    - **Coverage:** path lineal del algoritmo.

12. **`is-render` expone el nodo `<svg>` para integración** — [categoría: integration]
    - **Setup:** escuchar `is-render`.
    - **Acción:** Conectar un barcode.
    - **Assertion:** `detail.svg` es el mismo nodo del shadow; se puede `appendChild` fuera sin perderlo.
    - **Coverage:** detalle del evento.

13. **XSS en `value` no rompe el SVG** — [categoría: xss]
    - **Setup:** `<is-barcode type="code128" value='<script>alert(1)</script>'></is-barcode>`.
    - **Acción:** Render.
    - **Assertion:** El texto se trata como `textContent` (Code128B sólo mira `charCode`), `<text>` interno muestra la cadena sin inyectar HTML.
    - **Coverage:** no interpretación HTML del input.

14. **EAN13 verificador con todos los dígitos `0`** — [categoría: edge-case]
    - **Setup:** `value="000000000000"` (12 ceros).
    - **Acción:** Render.
    - **Assertion:** Check digit = 0; bits EAN13 producidos (todos L o R según parity `LLLLLL`); SVG válido.
    - **Coverage:** caso límite del algoritmo GS1.

---

## 4. `icon-explorer` (preview) — `src/components/media/icon-explorer.preview.ts` (614 LOC)

**Función `mount(ctx)`** que orquesta un explorador de iconos. **Browser APIs:** `fetch`, `IntersectionObserver`, `URL`, `Image`, `Blob`, `URL.createObjectURL`. **Storage en memoria:** `jsonCache`, `svgCache`. **Estado:** `state = { prefix, name, list, pos, svg }`. **Sin auth real, pero `saveBlob` y `toaster.toast` lo simulan. Sin tests previos más allá del invariante estático.**

### Tests propuestos

1. **Carga del `index.json` y render inicial** — [categoría: integration]
   - **Setup:** Mock `fetch` para `index.json` con `{ families: [{prefix:'mdi', count:5}, {prefix:'tabler', count:3}], total: 8 }`; mock `collections.json`.
   - **Acción:** Llamar `mount({ main })` con `location.search=''` y `document.getElementById` mockeado para `app`, `scroller`, `toaster`.
   - **Assertion:** `app.innerHTML` contiene el `<div class="xp-head">`, el badge de conteo muestra "2 familias · 8 iconos"; `paint()` se invoca sin error.
   - **Coverage:** flujo principal `loadMeta → renderIndex`.

2. **`renderFamily` con familia inexistente muestra callout de error** — [categoría: edge-case]
   - **Setup:** `location.search='?f=does-not-exist'`; mock `fetch` que rechaza.
   - **Acción:** `mount()`.
   - **Assertion:** `app.innerHTML` contiene un `<is-callout color="danger">` con el prefijo escapado en `esc(prefix)`.
   - **Coverage:** `catch` de `renderFamily`.

3. **Búsqueda global con debounce (220 ms en modo "icon")** — [categoría: ui/ux]
   - **Setup:** Mock `fetch` que devuelve índices de 2 familias con iconos.
   - **Acción:** Llamar `mount()`, click en `scope` para pasar a `icon`, escribir en `#q` "home", avanzar 250 ms.
   - **Assertion:** `paintIcons` corre; resultados ≤ 600; se muestra el conteo.
   - **Coverage:** debounce 220 ms + LIMIT 600.

4. **`ensureIcons` con concurrencia 8 y progreso** — [categoría: performance]
   - **Setup:** 231 índices mockeados; spy de `onProgress`.
   - **Acción:** Disparar `ensureIcons(p => counter(p))`.
   - **Assertion:** El callback se invoca 231 veces; `loadingIcons` se completa una vez aunque se llame 5 veces concurrentes.
   - **Coverage:** `if (loadingIcons) return loadingIcons`.

5. **`filtersMarkup` filtra por categoría / paleta / license** — [categoría: edge-case]
   - **Setup:** `collectionsMeta` con 3 familias: 2 con `palette:true`, 1 sin.
   - **Acción:** Llamar `filterFamilies(families, { palette: 'mono' })`.
   - **Assertion:** devuelve sólo la familia sin paleta.
   - **Coverage:** ramas `f.palette === 'mono'`.

6. **`sync()` valida tamaño y color, marca `error` en `<is-input>`** — [categoría: a11y]
   - **Setup:** Estado `state.svg` poblado; `sizeVal=5000` (fuera de 4096); `color='not-a-color'`.
   - **Acción:** Llamar `sync()`.
   - **Assertion:** `F.sizeVal.toggleAttribute('error', true)`; `error-text` contiene "Entre 1 y 4096"; `F.code.textContent` muestra el mensaje "Corrige los valores…"; no se genera código.
   - **Coverage:** `validate()` y rama de fallo.

7. **`buildSvg()` con `color='currentColor'` deja el path intacto** — [categoría: edge-case]
   - **Setup:** `state.svg.body = '<path fill="currentColor" d="..."/>'`.
   - **Acción:** `buildSvg()`.
   - **Assertion:** el body NO contiene reemplazo (`if (color && color !== 'currentColor')`).
   - **Coverage:** preservación de tokens `currentColor`.

8. **XSS en nombre de familia — `esc()` escapa `<`, `>`, `&`, `"`** — [categoría: xss]
   - **Setup:** `families=[{prefix:'<script>alert(1)</script>', count:1}]`.
   - **Acción:** Llamar `renderIndex` con esto.
   - **Assertion:** El HTML resultante NO contiene `<script>` literal; sólo texto escapado.
   - **Coverage:** helper `esc`.

9. **`downloadPng` produce Blob PNG y dispara `<a download>`** — [categoría: integration]
   - **Setup:** Mock `Image` con `onload` inmediato, mock `canvas.toBlob(cb, 'image/png')` que invoca `cb` con un Blob real.
   - **Acción:** Click en `#fDownload` con formato PNG.
   - **Assertion:** `URL.createObjectURL` se llama con un Blob SVG; el `<a>` simulado se clickea; `toast('PNG descargado', 'success')` se invoca.
   - **Coverage:** flujo de exportación PNG.

10. **`validate()` con `unit='auto'` ignora tamaño** — [categoría: edge-case]
    - **Setup:** `F.unit.value='auto'`, `sizeVal=''`.
    - **Acción:** `validate()`.
    - **Assertion:** `okSize === true` (porque `F.unit.value === 'auto'`); `okColor` independiente.
    - **Coverage:** cortocircuito de auto.

11. **`fDownload` con valores inválidos no descarga y muestra toast danger** — [categoría: edge-case]
    - **Setup:** `validate()` → false.
    - **Acción:** Click en `#fDownload`.
    - **Assertion:** `saveBlob` no se llama; `toast('Corrige los valores inválidos', 'danger')` invocado.
    - **Coverage:** guarda inicial.

12. **`paintIcons` cancela tokens obsoletos (`searchToken`)** — [categoría: performance]
    - **Setup:** Spy de `searchToken` global; escribir en `#q` rápido: "a", "ab", "abc".
    - **Acción:** Esperar debounces.
    - **Assertion:** sólo el último token emite resultados.
    - **Coverage:** `if (token !== searchToken) return`.

13. **Captura de errores en `IntersectionObserver`** — [categoría: edge-case]
    - **Setup:** Mock de fetch que rechaza para `${prefix}.json`.
    - **Acción:** scroll que active el IO.
    - **Assertion:** No se rompe el árbol; `e.target.appendChild(ic)` no se ejecuta.
    - **Coverage:** `.catch(() => {})` del observer.

14. **`renderIndex` con familias vacías muestra callout** — [categoría: edge-case]
    - **Setup:** `index.json` con `families:[]`.
    - **Acción:** `renderIndex()`.
    - **Assertion:** el callout "Ninguna familia coincide…" NO aparece porque la lista no está vacía en filtro; en cambio muestra "0 familias · 0 iconos" en el header.
    - **Coverage:** rama sin familias.

15. **`fColorPick` actualiza `color` y dispara `sync`** — [categoría: integration]
    - **Setup:** Spy `sync`.
    - **Acción:** `F.colorPick.dispatchEvent(new CustomEvent('is-input', { detail: { value: '#abcdef' } }))`.
    - **Assertion:** `F.color.value === '#abcdef'`; `sync()` llamado.
    - **Coverage:** listener de picker.

---

## 5. `<is-icon>` — `src/components/media/icon.ts` (245 LOC)

**Atributos:** `icon` (Iconify id), `name`, `library`, `label`, `src`. **Browser APIs:** `fetch`, `AbortController`. **Estados:** `data-loading`, `data-missing`. **Slots:** ninguno. **CSS Part:** `::part(icon)`. **Detección multicolor** para respetar paletas propias. **Cache interno:** `rawCache` en `icon-loader.ts` (módulo compartido).

### Tests propuestos

1. **`icon="mdi:home"` resuelve y pinta SVG inline** — [categoría: browser-api]
   - **Setup:** Mock `fetch` que devuelve `<svg xmlns="..." viewBox="0 0 24 24"><path d="..."/></svg>`.
   - **Acción:** `<is-icon icon="mdi:home">` conectar.
   - **Assertion:** `data-loading` removido; `data-missing` ausente; `shadow.querySelector('svg')` presente; `width="1em" height="1em"`; `fill="currentColor"` aplicado.
   - **Coverage:** flujo principal `#render`.

2. **`src` propio gana sobre `icon`** — [categoría: integration]
   - **Setup:** `icon="mdi:home" src="https://cdn/mi.svg"`. Mock fetch devuelve SVG distinto por URL.
   - **Acción:** Conectar.
   - **Assertion:** `fetch` se llama UNA sola vez con la URL de `src`; el SVG inlineado coincide con la respuesta de `src`.
   - **Coverage:** prioridad `src > icon`.

3. **`icon` vacío → `data-missing` ausente, sin pintar** — [categoría: edge-case]
   - **Setup:** `<is-icon></is-icon>`.
   - **Acción:** Conectar.
   - **Assertion:** `shadow.querySelector('svg')` es null; sin `data-loading`, sin `data-missing`.
   - **Coverage:** `if (!icon) { #clear; removeAttribute('data-missing'); }`.

4. **Cambio de atributo durante carga aborta fetch previo** — [categoría: performance]
   - **Setup:** Spy de `AbortController.abort`.
   - **Acción:** `setAttribute('icon', 'mdi:home')`; inmediatamente `setAttribute('icon', 'mdi:star')`.
   - **Assertion:** El primer fetch fue abortado; sólo el segundo pinta; `#renderGen` incrementa.
   - **Coverage:** `#abort()` + `#renderGen`.

5. **`fetch` 404 → `data-missing`** — [categoría: browser-api]
   - **Setup:** Mock `fetch` con `Response.ok=false, status=404`.
   - **Acción:** Conectar.
   - **Assertion:** `data-missing` presente; `.inline` vacío y `hidden`.
   - **Coverage:** `if (!res.ok) return null`.

6. **SVG sin etiqueta `<svg>` se descarta** — [categoría: edge-case]
   - **Setup:** Mock `fetch` con texto `"404 page not found"`.
   - **Acción:** Conectar.
   - **Assertion:** `data-missing`; no hay SVG inyectado.
   - **Coverage:** `text.includes('<svg') ? text : null`.

7. **`label=""` aplica `aria-hidden="true"`** — [categoría: aria]
   - **Setup:** `<is-icon icon="mdi:home">`.
   - **Acción:** luego `setAttribute('label', 'Inicio')` y luego `removeAttribute('label')`.
   - **Assertion:** secuencia: `aria-hidden="true"`, luego `role="img" aria-label="Inicio"`, luego de nuevo `aria-hidden="true"` sin `role`.
   - **Coverage:** `#syncA11y()`.

8. **Icono multicolor (linearGradient) NO se aplana a `currentColor`** — [categoría: edge-case]
   - **Setup:** `<svg><linearGradient/><path fill="#ff0000"/></svg>`.
   - **Acción:** Pintar.
   - **Assertion:** `.inline` tiene clase `is-multicolor`; `style.fill` del path NO es `currentColor`.
   - **Coverage:** `IsIcon.#isMulticolor()` + bypass.

9. **Icono monocromo se aplana a `currentColor`** — [categoría: edge-case]
   - **Setup:** `<svg><path fill="#000"/></svg>`.
   - **Acción:** Pintar.
   - **Assertion:** `style.fill === 'currentColor'`; sin clase `is-multicolor`.
   - **Coverage:** `#NEUTRAL` set + normalización.

10. **`name="home"` con `library="mdi"` se compone a `mdi:home`** — [categoría: ui/ux]
    - **Setup:** `<is-icon name="home" library="mdi">`.
    - **Acción:** Conectar.
    - **Assertion:** `host.icon === 'mdi:home'`; fetch se invoca con esa ruta.
    - **Coverage:** getter de `icon`.

11. **`name="mdi:home"` con `:` se respeta literal** — [categoría: ui/ux]
    - **Setup:** `<is-icon name="mdi:home">` sin `library`.
    - **Acción:** Conectar.
    - **Assertion:** `host.icon === 'mdi:home'`.
    - **Coverage:** rama `if (name.includes(':'))`.

12. **`src` con CORS falla → `data-missing`** — [categoría: browser-api]
    - **Setup:** Mock fetch rechazando por CORS.
    - **Acción:** Conectar.
    - **Assertion:** `data-missing`; no se rompe.
    - **Coverage:** `catch { return null }` en `#fetchSvg`.

13. **`disconnectedCallback` aborta el fetch pendiente** — [categoría: integration]
    - **Setup:** Conectar; spy `abort`.
    - **Acción:** `el.remove()` antes de que resuelva fetch.
    - **Assertion:** `AbortController.abort()` invocado.
    - **Coverage:** `#abort()` en `disconnectedCallback`.

14. **Cache: segundo `icon` igual no vuelve a fetchear** — [categoría: performance]
    - **Setup:** Mock fetch con contador.
    - **Acción:** Crear dos `<is-icon icon="mdi:home">`.
    - **Assertion:** sólo 1 fetch (porque `rawCache` en `icon-loader`).
    - **Coverage:** cache compartido.

15. **Reducción de movimiento: el cambio de `loading` no anima** — [categoría: reduced-motion]
    - **Setup:** `prefers-reduced-motion: reduce`.
    - **Acción:** Cambio rápido de `icon`.
    - **Assertion:** No hay transitions CSS que disparen (no hay tests DOM aquí, pero se puede inspeccionar `getComputedStyle` para `transition-property: none`).
    - **Coverage:** accesibilidad de movimiento (a confirmar en CSS).

---

## 6. `<is-image-editor>` — `src/components/media/image-editor.ts` (330 LOC)

**Atributos:** `src`, `zoom`, `rotation`, `aspect`. **Slot:** `toolbar` con botones `data-action`. **API:** `image`, `crop()`, `cropped()`, `applyZoom()`, `applyRotation()`. **Eventos:** `is-load`, `is-change`, `is-crop`. **Browser APIs:** `<canvas>`, `ResizeObserver`. **Pointer events** sobre `#canvas`.

### Tests propuestos

1. **Carga de imagen y emisión de `is-load`** — [categoría: browser-api]
   - **Setup:** jsdom con mock `Image` que dispara `onload` con `naturalWidth=1600, naturalHeight=1000`.
   - **Acción:** `el.setAttribute('src', 'a.jpg')`.
   - **Assertion:** `is-load { image }` se emite una vez; `cropRect` inicial = `{x:160, y:100, width:1280, height:800}` (80% centrado).
   - **Coverage:** `#load()` + inicialización del crop.

2. **`src` inválido muestra mensaje en `#status`** — [categoría: edge-case]
   - **Setup:** Mock `Image` con `onerror`.
   - **Acción:** `setAttribute('src', 'broken.jpg')`.
   - **Assertion:** `#status.textContent === 'No se pudo cargar la imagen'`; no se emite `is-load`.
   - **Coverage:** `img.onerror`.

3. **`crop()` devuelve dataURL con dimensiones correctas** — [categoría: browser-api]
   - **Setup:** imagen cargada; crop manual `{x:100, y:50, width:300, height:200}`.
   - **Acción:** `el.cropped()`.
   - **Assertion:** dataURL empieza con `data:image/png;base64,`; canvas.width===300; `is-crop` con `crop` igual al definido.
   - **Coverage:** `#cropped()`.

4. **`zoom` setter clamp entre 0.1 y 8** — [categoría: edge-case]
   - **Setup:** `<is-image-editor src="a.jpg">`.
   - **Acción:** `zoom = 0.05`; `zoom = 100`; `zoom = 2.5`.
   - **Assertion:** atributo refleja `0.1`, `8`, `2.5`.
   - **Coverage:** setter `Math.max(0.1, Math.min(8, v))`.

5. **`rotation` setter normaliza a [0, 360)** — [categoría: edge-case]
   - **Setup:** `rotation = 450`; `rotation = -90`.
   - **Acción:** Asignar.
   - **Assertion:** atributo = `90` (450-360) y `270` (-90 mod 360).
   - **Coverage:** `((n % 360) + 360) % 360`.

6. **`aspect="16/9"` mantiene proporción al arrastrar esquina** — [categoría: integration]
   - **Setup:** imagen cargada, `aspect="16/9"`. Spy de `#drag.handle='se'`.
   - **Acción:** `pointerdown` en canvas + `pointermove` con dx=200, dy=200.
   - **Assertion:** `cropRect.width / cropRect.height ≈ 1.777` (±0.01).
   - **Coverage:** rama aspect-lock.

7. **`aspect` inválido (`"foo"`) se evalúa como `null`** — [categoría: edge-case]
   - **Setup:** `<is-image-editor aspect="foo">`.
   - **Acción:** `pointermove`.
   - **Assertion:** no aplica lock de aspecto (proporción libre).
   - **Coverage:** `evalAspect`.

8. **Pointer drag mueve el crop dentro de los bordes** — [categoría: ui/ux]
   - **Setup:** imagen 1000×800; cropRect inicial centrado.
   - **Acción:** `pointerdown` + `pointermove` dx=100, dy=50.
   - **Assertion:** `cropRect.x` crece; clamped a `img.width - 8`.
   - **Coverage:** `#onMove` rama `case 'move'`.

9. **`cropped()` sin imagen cargada devuelve `null`** — [categoría: edge-case]
   - **Setup:** `<is-image-editor>` sin `src`; sin carga.
   - **Acción:** Llamar `cropped()`.
   - **Assertion:** `null`; no emite `is-crop`.
   - **Coverage:** `if (!this.#img || !this.#cropRect.width) return null`.

10. **`is-change` se emite en cada `pointermove`** — [categoría: performance]
    - **Setup:** imagen cargada.
    - **Acción:** simular 5 pointermove consecutivos.
    - **Assertion:** 5 eventos `is-change` con `crop` consistente.
    - **Coverage:** bucle de drag.

11. **`without-controls` no aplica pero este componente no lo tiene** — [categoría: integration]
    - **Setup:** insertar editor; `window.dispatchEvent(new Event('resize'))` con `ResizeObserver` mock disparando.
    - **Acción:** Redimensionar viewport.
    - **Assertion:** `#draw()` se invoca; el canvas se redimensiona con `dpr`.
    - **Coverage:** `ResizeObserver`.

12. **XSS vía `src` que retorna SVG con script** — [categoría: xss]
    - **Setup:** Mock `Image.onload` con un SVG que contiene `<script>alert(1)</script>` (no se renderiza porque es un `<img>`, pero verificar que no se evalúa).
    - **Acción:** Cargar.
    - **Assertion:** `cropped()` produce un PNG puro (el script no se ejecuta en canvas).
    - **Coverage:** aislamiento `<canvas>`.

13. **Reducción de movimiento: el resize se re-pinta sin animación** — [categoría: reduced-motion]
    - **Setup:** `prefers-reduced-motion: reduce`.
    - **Acción:** Disparar ResizeObserver.
    - **Assertion:** el canvas se redibuja sin CSS transitions activas.
    - **Coverage:** accesibilidad (a confirmar en CSS).

14. **`cropped()` con crop vacío (width=0) → null** — [categoría: edge-case]
    - **Setup:** imagen pero cropRect con `width=0`.
    - **Acción:** Llamar `cropped()`.
    - **Assertion:** `null`.
    - **Coverage:** guarda.

15. **`applyRotation(-90)` desde rotation=0 → 270** — [categoría: edge-case]
    - **Setup:** `<is-image-editor rotation="0">`.
    - **Acción:** `applyRotation(-90)`.
    - **Assertion:** atributo `rotation="270"`; `is-change`/`is-crop` no se emite (no emite eventos en `applyRotation`).
    - **Coverage:** setter.

---

## 7. `<is-media-recorder>` — `src/components/media/media-recorder.ts` (137 LOC)

**Atributos:** `source` (camera|mic|display), `disabled`. **Métodos:** `start()`, `stop()`. **Eventos:** `is-start`, `is-stop { blob, url, type }`, `is-error`. **Browser APIs:** `getUserMedia`, `getDisplayMedia`, `MediaRecorder`. **MimeType negotiation** según soporte.

### Tests propuestos

1. **Permiso de micrófono denegado (`NotAllowedError`)** — [categoría: browser-api]
   - **Setup:** mock `getUserMedia` que rechaza con `NotAllowedError`.
   - **Acción:** `start()`.
   - **Assertion:** `is-error { message }` emitido; `#rec === null`; botón texto sigue "Grabar".
   - **Coverage:** rama `catch (err)` de start.

2. **`source="mic"` con `MediaRecorder` no soportado** — [categoría: browser-api]
   - **Setup:** Mock getUserMedia OK; borrar `MediaRecorder`.
   - **Acción:** `start()`.
   - **Assertion:** `is-error { message: 'MediaRecorder no disponible' }`; `#rec === null`.
   - **Coverage:** guarda `typeof MediaRecorder !== 'function'`.

3. **`source="display"` invoca `getDisplayMedia`** — [categoría: browser-api]
   - **Setup:** spy en `getDisplayMedia`.
   - **Acción:** `start()` con `source="display"`.
   - **Assertion:** `getDisplayMedia` se llama con `{ video: true, audio: true }`.
   - **Coverage:** rama `display`.

4. **`source="camera"` con audio+video** — [categoría: browser-api]
   - **Setup:** spy.
   - **Acción:** `start()`.
   - **Assertion:** `getUserMedia({ video: true, audio: true })`.
   - **Coverage:** default camera.

5. **`stop()` revoca URL previa y emite `is-stop`** — [categoría: browser-api]
   - **Setup:** Mock MediaRecorder que dispara `onstop`; mock `URL.revokeObjectURL`.
   - **Acción:** `start()`, esperar a `dataavailable`, `stop()`.
   - **Assertion:** `dl.href` apunta al nuevo `URL.createObjectURL(blob)`; `URL.revokeObjectURL` se llama sobre el anterior; `is-stop` con `blob` y `url`.
   - **Coverage:** `#finish` + `#revoke`.

6. **`is-stop` contiene `blob.type='video/webm;codecs=vp9'` cuando hay soporte** — [categoría: browser-api]
   - **Setup:** `MediaRecorder.isTypeSupported('video/webm;codecs=vp9') === true`.
   - **Acción:** `start()` → stop.
   - **Assertion:** `detail.type === 'video/webm;codecs=vp9'`.
   - **Coverage:** branch mime preferida.

7. **`disabled` evita `start()`** — [categoría: a11y]
   - **Setup:** `<is-media-recorder disabled>`.
   - **Acción:** Click en botón o `start()` manual.
   - **Assertion:** `start()` retorna sin llamar getUserMedia.
   - **Coverage:** guarda inicial.

8. **`source` setter acepta valores no listados (`audio`)** — [categoría: edge-case]
   - **Setup:** `<is-media-recorder source="audio">`.
   - **Acción:** Leer getter.
   - **Assertion:** `host.source === 'camera'` (default). El atributo DOM se queda con `audio` pero el getter lo ignora.
   - **Coverage:** `return v === 'mic' || v === 'display' ? v : 'camera'`.

9. **Cambio de `source` en vivo para la grabación** — [categoría: integration]
   - **Setup:** Mock `getUserMedia` OK y `MediaRecorder` simulando grabación activa.
   - **Acción:** `setAttribute('source', 'mic')` mientras graba.
   - **Assertion:** `stop()` se invoca; `getUserMedia` se llama de nuevo con `audio:true`.
   - **Coverage:** `attributeChangedCallback` para `source`.

10. **`is-stop` payload en modo `mic`** — [categoría: ui/ux]
    - **Setup:** source="mic", MIME `audio/webm` soportado.
    - **Acción:** start/stop.
    - **Assertion:** `dl.download === 'audio.webm'`; `blob.type === 'audio/webm'`.
    - **Coverage:** `#finish` rama mic.

11. **`disconnectedCallback` libera recursos** — [categoría: integration]
    - **Setup:** grabación en curso; spy de `MediaStreamTrack.stop`.
    - **Acción:** `el.remove()`.
    - **Assertion:** track.stop llamado; URL.revokeObjectURL invocado; `srcObject` null.
    - **Coverage:** cleanup.

12. **Blob vacío (0 chunks) produce `is-stop` válido** — [categoría: edge-case]
    - **Setup:** MediaRecorder sin `dataavailable`.
    - **Acción:** start/stop inmediato.
    - **Assertion:** Blob con 0 bytes; sin crash; `is-stop` emitido.
    - **Coverage:** `#chunks = []` antes de empezar.

13. **`MediaRecorder.isTypeSupported` falso → fallback a `video/webm` simple** — [categoría: browser-api]
    - **Setup:** `isTypeSupported('video/webm;codecs=vp9')===false`; `isTypeSupported('video/webm')===true`.
    - **Acción:** start.
    - **Assertion:** `MediaRecorder` se construye con `video/webm`.
    - **Coverage:** ternario.

14. **Reducción de movimiento: la animación del botón "Detener"** — [categoría: reduced-motion]
    - **Setup:** `prefers-reduced-motion: reduce`.
    - **Acción:** Click.
    - **Assertion:** El cambio `Grabar → Detener` no tiene transición CSS.
    - **Coverage:** accesibilidad de movimiento.

---

## 8. `<is-qrcode>` — `src/components/media/qrcode.ts` (148 LOC)

**Atributos:** `value`, `level` (L|M|Q|H), `cell`, `margin`, `fg`, `bg`. **Eventos:** `is-render`. **API:** `svg` (getter), `dataURL()`. **Dependencia externa:** `import('https://esm.sh/qrcode-generator@1.4.4')`. **Niveles EC** (corrección de errores).

### Tests propuestos

1. **`value="hola"` genera QR válido** — [categoría: browser-api]
   - **Setup:** Mock `import` de `qrcode-generator` con spy. O permitir fetch real a esm.sh en CI (skip si offline).
   - **Acción:** `<is-qrcode value="hola">` conectar.
   - **Assertion:** `shadow.querySelector('svg')` presente; `<path d="...">` no vacío; `is-render` con `svg`.
   - **Coverage:** rama feliz.

2. **`value` cambia el QR** — [categoría: integration]
   - **Setup:** `<is-qrcode value="a">`.
   - **Acción:** `setAttribute('value', 'bbbbb')`.
   - **Assertion:** Se emite `is-render` nuevo; path `d` cambia.
   - **Coverage:** `attributeChangedCallback`.

3. **`value` vacío no produce SVG** — [categoría: edge-case]
   - **Setup:** `<is-qrcode></is-qrcode>` (sin value).
   - **Acción:** Conectar.
   - **Assertion:** `#canvas.innerHTML === ''`.
   - **Coverage:** `if (!value) return;`.

4. **`level` inválido (`Z`) cae al default `L`** — [categoría: edge-case]
   - **Setup:** `<is-qrcode value="x" level="Z">`.
   - **Acción:** Conectar.
   - **Assertion:** la librería se invoca con `'L'` (default `this.getAttribute('level') || 'L'`); sin error.
   - **Coverage:** fallback `|| 'L'`.

5. **`fg` y `bg` se aplican al path** — [categoría: ui/ux]
   - **Setup:** `<is-qrcode value="x" fg="#ff0" bg="#000">`.
   - **Acción:** Render.
   - **Assertion:** `<rect fill="#000">` presente; `<path fill="#ff0">` presente.
   - **Coverage:** ramas condicionales.

6. **`cell` y `margin` afectan dimensiones** — [categoría: ui/ux]
   - **Setup:** `cell="10" margin="4"`.
   - **Acción:** Render.
   - **Assertion:** `svg.width === (size + 8) * 10`; `viewBox` coherente.
   - **Coverage:** cálculo de `side`.

7. **`dataURL()` devuelve PNG** — [categoría: browser-api]
   - **Setup:** QR ya renderizado.
   - **Acción:** `host.dataURL()` (esperar promesa).
   - **Assertion:** resuelve con `data:image/png;base64,...`.
   - **Coverage:** `<canvas>` + `toDataURL`.

8. **`dataURL()` sin SVG previo devuelve `null`** — [categoría: edge-case]
    - **Setup:** Sin value; sin render.
    - **Acción:** `dataURL()`.
    - **Assertion:** `null`.
    - **Coverage:** `if (!svg) return null`.

9. **Fallo de carga de `qrcode-generator` (offline)** — [categoría: browser-api]
    - **Setup:** Mockear `import` que rechaza con `Error`; el componente carga en modo offline.
    - **Acción:** Conectar.
    - **Assertion:** `#status.textContent === 'No se pudo cargar qrcode-generator (offline?)'`; `attributeChangedCallback` se aborta con `throw err`; no se renderiza nada.
    - **Coverage:** `try/catch` de `#ensureLib`.

10. **`value` con caracteres Unicode (emoji, chino) genera QR válido** — [categoría: edge-case]
    - **Setup:** `value="日本語テスト🎌"`.
    - **Acción:** Render.
    - **Assertion:** sin error; `qr.getModuleCount()` > 21.
    - **Coverage:** branch UTF-8 de la librería.

11. **`value` extremadamente largo (2000 chars) → QR complejo** — [categoría: performance]
    - **Setup:** 2000 caracteres.
    - **Acción:** Render.
    - **Assertion:** no bloquea; el path tiene > 5000 `M…h…v…z` comandos; sin stack overflow.
    - **Coverage:** bucle `for y/for x`.

12. **XSS vía `value` con `<script>`** — [categoría: xss]
    - **Setup:** `value="<script>alert(1)</script>"`.
    - **Acción:** Render.
    - **Assertion:** El SVG contiene el path de los módulos QR pero NO se inyecta `<script>` ejecutable en el shadow (QR usa `addData` que trata el string como bytes).
    - **Coverage:** aislamiento QR vs DOM.

13. **`bg="transparent"` omite el `<rect>` de fondo** — [categoría: edge-case]
    - **Setup:** `<is-qrcode value="x" bg="transparent">`.
    - **Acción:** Render.
    - **Assertion:** sólo 1 `<rect>` (no aplica bg) o 0.
    - **Coverage:** `if (bg !== 'transparent')`.

14. **Reducción de movimiento: cambios rápidos de `value` no animan** — [categoría: reduced-motion]
    - **Setup:** `prefers-reduced-motion: reduce`.
    - **Acción:** Cambiar `value` 5 veces.
    - **Assertion:** No hay transitions CSS disparadas (inspeccionar `getComputedStyle`).
    - **Coverage:** accesibilidad.

---

## 9. `<is-speech>` — `src/components/media/speech.ts` (145 LOC)

**Atributos:** `lang`, `text`. **Métodos:** `listen()`, `stop()`, `speak()`, `cancel()`. **Eventos:** `is-result { transcript, isFinal }`, `is-speak-end`, `is-error { message }`. **Browser APIs:** `SpeechRecognition` / `webkitSpeechRecognition`, `SpeechSynthesisUtterance`. **UI:** dos `<is-button>` con `aria-pressed`.

### Tests propuestos

1. **`SpeechRecognition` no disponible (Firefox)** — [categoría: browser-api]
   - **Setup:** borrar `window.SpeechRecognition` y `webkitSpeechRecognition`.
   - **Acción:** `listen()`.
   - **Assertion:** `is-error { message: 'SpeechRecognition no disponible' }`; `#listening === false`; `aria-pressed="false"`.
   - **Coverage:** guarda `if (!Ctor)`.

2. **`listen()` emite `is-result` con `transcript` final** — [categoría: browser-api]
   - **Setup:** Mock SpeechRecognition; `onresult` con resultados `isFinal=true` ("hola mundo").
   - **Acción:** `listen()` y disparar `onresult`.
   - **Assertion:** `#out.textContent === 'hola mundo'`; `is-result { transcript: 'hola mundo', isFinal: true }`.
   - **Coverage:** handler `onresult`.

3. **`is-result` distingue final de interim** — [categoría: edge-case]
   - **Setup:** Mock con `[{ transcript: 'h', isFinal: false }, { transcript: 'o', isFinal: true }]`.
   - **Acción:** `onresult`.
   - **Assertion:** `transcript === 'ho'`; `isFinal === true` (por la presencia de `finals`).
   - **Coverage:** rama `if (ev.results[i].isFinal) finals += t; else inter += t;`.

4. **Error `no-speech` se ignora silenciosamente** — [categoría: edge-case]
   - **Setup:** Mock onerror con `error='no-speech'`.
   - **Acción:** Disparar.
   - **Assertion:** NO se emite `is-error`.
   - **Coverage:** guarda `if (ev.error === 'no-speech' || ev.error === 'aborted') return`.

5. **`lang` cambia en sesión activa re-aplica al `rec.lang`** — [categoría: integration]
   - **Setup:** Mock SpeechRecognition con `lang` getter/setter spy.
   - **Acción:** `listen()`, luego `setAttribute('lang', 'en-US')`.
   - **Assertion:** spy del setter llamado con `'en-US'`.
   - **Coverage:** `attributeChangedCallback`.

6. **`text` cambia → `speak()` automático** — [categoría: integration]
   - **Setup:** Mock SpeechSynthesis con `speak` spy.
   - **Acción:** `setAttribute('text', 'Hola')`.
   - **Assertion:** `SpeechSynthesisUtterance('Hola')` creado y `speak(u)` llamado.
   - **Coverage:** branch `text`.

7. **`speak()` con `speechSynthesis` ausente** — [categoría: browser-api]
   - **Setup:** borrar `window.speechSynthesis`.
   - **Acción:** `speak()`.
   - **Assertion:** `is-error { message: 'speechSynthesis no disponible' }`.
   - **Coverage:** guarda `if (!window.speechSynthesis)`.

8. **`stop()` limpia sesión y desactiva `aria-pressed`** — [categoría: a11y]
   - **Setup:** Mock SpeechRecognition con `stop` spy.
   - **Acción:** `listen()`, luego `stop()`.
   - **Assertion:** spy invocado; `aria-pressed="false"`; atributo `listening` removido.
   - **Coverage:** `#syncListen`.

9. **`onend` re-arranca si `#listening` sigue activo** — [categoría: edge-case]
   - **Setup:** Mock onend; spy de `rec.start`.
   - **Acción:** Disparar onend.
   - **Assertion:** `rec.start()` llamado de nuevo.
   - **Coverage:** `if (this.#listening) try { rec.start(); }`.

10. **`cancel()` aborta utterance pendiente** — [categoría: browser-api]
    - **Setup:** Spy `window.speechSynthesis.cancel`.
    - **Acción:** `cancel()`.
    - **Assertion:** spy llamado; sin emitir eventos.
    - **Coverage:** `#cancel`.

11. **`speak()` con `is-speak-end`** — [categoría: integration]
    - **Setup:** Mock SpeechSynthesis con `onend` invocable.
    - **Acción:** `speak()`; disparar onend.
    - **Assertion:** `is-speak-end` emitido.
    - **Coverage:** `u.onend`.

12. **`text` getter toma `textContent` si no hay atributo** — [categoría: edge-case]
    - **Setup:** `<is-speech><slot>Hola slot</slot></is-speech>`.
    - **Acción:** Leer getter.
    - **Assertion:** `host.text === 'Hola slot'` (trim).
    - **Coverage:** fallback `this.textContent`.

13. **Reducción de movimiento: nada que animar (no UI animada)** — [categoría: reduced-motion]
    - **Setup:** N/A
    - **Acción:** N/A
    - **Assertion:** Documentar explícitamente que `<is-speech>` no tiene animaciones a respetar.
    - **Coverage:** confirmar accesibilidad.

14. **XSS vía `text` con HTML** — [categoría: xss]
    - **Setup:** `text="<img src=x onerror=alert(1)>"`.
    - **Acción:** `speak()`.
    - **Assertion:** El utterance se pasa como String, no como HTML (SpeechSynthesisUtterance usa `.text`); no se ejecuta el script.
    - **Coverage:** no interpretación HTML.

---

## 10. `<is-theme-img>` — `src/components/media/theme-img.ts` (154 LOC)

**Atributos:** `src-dark`, `src-light`, `alt`, `shape` (circle|rounded|square), `fit` (contain|cover), `theme` (dark|light forzado), `loading`. **CSS Part:** `::part(image)`. **Watcher de tema** via `theme-scope.js` (`findThemeContainer`, `readTheme`, `watchThemeContainer`).

### Tests propuestos

1. **Cambio de tema del contenedor dispara `data-active-theme`** — [categoría: integration]
   - **Setup:** Mock `findThemeContainer` y `watchThemeContainer` (devolver fake con `dataset.theme='dark'`).
   - **Acción:** Insertar `<is-theme-img src-dark="d.svg" src-light="l.svg">`; luego cambiar `container.dataset.theme='light'`.
   - **Assertion:** `#img.src` cambia a `'l.svg'`; `host.dataset.activeTheme === 'light'`.
   - **Coverage:** `#watch` + `#sync`.

2. **`theme="dark"` fuerza la imagen dark incluso si el contenedor está en light** — [categoría: edge-case]
   - **Setup:** `theme="dark"`, `src-dark="d.svg"`, contenedor en light.
   - **Acción:** Conectar.
   - **Assertion:** `#img.src === 'd.svg'`; `activeTheme === 'dark'`.
   - **Coverage:** `this.theme || readTheme(...)`.

3. **`src-light` ausente cae a `src-dark`** — [categoría: edge-case]
   - **Setup:** Sólo `src-dark="d.svg"`, contenedor en light.
   - **Acción:** Conectar.
   - **Assertion:** `#img.src === 'd.svg'`.
   - **Coverage:** `theme === 'light' ? light || dark : dark || light`.

4. **`alt` se aplica al `<img>` interno** — [categoría: a11y]
   - **Setup:** `<is-theme-img src-dark="d.svg" alt="Logo">`.
   - **Acción:** Conectar.
   - **Assertion:** `img.alt === 'Logo'`.
   - **Coverage:** `this.#img.alt = this.alt`.

5. **`shape` inválido se ignora** — [categoría: edge-case]
   - **Setup:** `<is-theme-img shape="oval">`.
   - **Acción:** Leer getter.
   - **Assertion:** `host.shape === null`; atributo DOM queda vacío (setter).
   - **Coverage:** `VALID_SHAPE.has`.

6. **`fit="cover"` aplica `object-fit: cover`** — [categoría: ui/ux]
   - **Setup:** `fit="cover"`.
   - **Acción:** Leer.
   - **Assertion:** `--is-theme-img-fit === 'cover'` (styleAttrs) y `getComputedStyle` del `<img>` devuelve `cover`.
   - **Coverage:** styleAttrs binding.

7. **`loading="eager"` se aplica al `<img>` interno** — [categoría: performance]
   - **Setup:** `loading="eager"`.
   - **Acción:** Conectar.
   - **Assertion:** `img.loading === 'eager'`.
   - **Coverage:** `#sync`.

8. **`loading="async"` se ignora (no se aplica)** — [categoría: edge-case]
   - **Setup:** `loading="async"`.
   - **Acción:** Conectar.
   - **Assertion:** `img.removeAttribute('loading')` ejecutado por la rama `else`.
   - **Coverage:** guarda `if (loading === 'lazy' || loading === 'eager')`.

9. **Watcher se desuscribe en `disconnectedCallback`** — [categoría: integration]
   - **Setup:** Spy `unwatch`.
   - **Acción:** Insertar y luego `remove()`.
   - **Assertion:** spy llamado.
   - **Coverage:** `#unwatch?.()` en onDisconnected.

10. **Tema cambia en runtime — sin recarga** — [categoría: integration]
    - **Setup:** `<is-theme-img src-dark="d.svg" src-light="l.svg">` con watchThemeContainer fake que ejecuta callback.
    - **Acción:** invocar manualmente `callback({ theme: 'light' })`.
    - **Assertion:** `#img.src` actualizado.
    - **Coverage:** rama watch.

11. **`data-active-theme` no entra en `THEME_SCOPE`** — [categoría: edge-case]
    - **Setup:** Mock `themeContainer` con `closest('[data-theme]')` que apunte al propio host.
    - **Acción:** Conectar.
    - **Assertion:** `themeContainer !== this` (el componente usa `data-active-theme`, NO `data-theme`).
    - **Coverage:** nota del comentario L137-138.

12. **XSS en `src-dark` con `javascript:`** — [categoría: xss]
    - **Setup:** `src-dark="javascript:alert(1)"`.
    - **Acción:** Conectar.
    - **Assertion:** `#img.src` se asigna; el navegador puede no ejecutar (depende del browser); el `alt` no se interpreta.
    - **Coverage:** no sanitización explícita — riesgo documentado.

13. **Reducción de movimiento: `prefers-reduced-motion`** — [categoría: reduced-motion]
    - **Setup:** `prefers-reduced-motion: reduce`.
    - **Acción:** Cambio de tema.
    - **Assertion:** El cambio de `src` no dispara transition (verificar CSS).
    - **Coverage:** accesibilidad de movimiento.

---

## 11. `<is-video-playlist>` — `src/components/media/video-playlist.ts` (780 LOC)

**Atributos:** `autoplay-next`, `placement` (left|right|bottom), `channel`, `accordion` (auto|open|closed). **Slots:** default, `tools-left`, `tools-right`, `config`. **CSS Parts:** `playlist`, `playlist-items`, `playlist-item`, `playlist-title`, `playlist-duration`, `channel`, `title`, `header`, `header-actions`, `player-toolbar`, `tools-left`, `tools-right`, `play-button`, `seek`, `time`, `mute-button`, `volume-slider`, `status`, `base`, `playlist-head`, `playlist-toggle`, `playlist-thumbnail`. **Métodos:** `goTo(i)`, `next()`, `previous()`, `play(i)`. **Eventos:** `is-video-change`, `is-change`. **Browser APIs:** `<video>` nativo, `IntersectionObserver` (no), `MediaQueryList` (matchMedia), `MutationObserver`, `canvas.toDataURL` (poster).

### Tests propuestos

1. **Slot con `<is-video>` actualiza la lista al `slotchange`** — [categoría: integration]
   - **Setup:** `<is-video-playlist><is-video src="a.mp4"></is-video><is-video src="b.mp4"></is-video></is-video-playlist>`.
   - **Acción:** Insertar en DOM.
   - **Assertion:** `playlist-items` contiene 2 elementos con `data-index` 0 y 1; primer item `aria-selected="true"`.
   - **Coverage:** `#refresh`.

2. **`goTo(1)` cambia `is-video-change` con `previousIndex=0, currentIndex=1`** — [categoría: integration]
   - **Setup:** Playlist con 3 videos; spy de eventos.
   - **Acción:** `el.goTo(1)`.
   - **Assertion:** `is-video-change { previousIndex: 0, currentIndex: 1, video: videos[1] }`; `is-change { index: 1 }`.
   - **Coverage:** `#activate({ emit: true })`.

3. **`goTo(-1)` se clampa a 0** — [categoría: edge-case]
   - **Setup:** Playlist con 2 videos.
   - **Acción:** `goTo(-5)`.
   - **Assertion:** `index === 0`.
   - **Coverage:** `Math.max(0, Math.min(list.length - 1, ...))`.

4. **`goTo(99)` se clampa al último** — [categoría: edge-case]
   - **Setup:** 2 videos.
   - **Acción:** `goTo(99)`.
   - **Assertion:** `index === 1`.
   - **Coverage:** clamp superior.

5. **`autoplay-next=true` y evento `is-ended` → `next()` automático** — [categoría: integration]
   - **Setup:** Playlist con 2 videos; `autoplay-next` activo.
   - **Acción:** Disparar `is-ended` sobre `videos[0]`.
   - **Assertion:** `goTo(1)` llamado; `videos[1]` activo.
   - **Coverage:** `#boundEnded`.

6. **`is-ended` sin `autoplay-next` no avanza** — [categoría: edge-case]
   - **Setup:** Sin atributo.
   - **Acción:** Disparar `is-ended`.
   - **Assertion:** `index` no cambia.
   - **Coverage:** guarda `if (!this.autoplayNext) return`.

7. **Teclado en lista: ArrowDown mueve selección y llama `goTo`** — [categoría: keyboard]
   - **Setup:** Playlist con 3 videos; foco en `[data-index="0"]`.
   - **Acción:** `keydown { key: 'ArrowDown' }` en `#listEl`.
   - **Assertion:** foco pasa a `[data-index="1"]`; `goTo(1)` llamado.
   - **Coverage:** `#onListKeydown`.

8. **Teclado: Enter en item activo llama `goTo`** — [categoría: keyboard]
   - **Setup:** foco en item activo.
   - **Acción:** `keydown { key: 'Enter' }`.
   - **Assertion:** `goTo(activeIndex)` llamado.
   - **Coverage:** rama `Enter || ' '`.

9. **Teclado: flecha arriba en primer item no hace nada** — [categoría: edge-case]
   - **Setup:** foco en `[data-index="0"]`.
   - **Acción:** `ArrowUp`.
   - **Assertion:** `index` no cambia; foco no se mueve.
   - **Coverage:** guarda `if (current <= 0) return`.

10. **Click en item llama `goTo`** — [categoría: ui/ux]
    - **Setup:** Playlist con 3 videos.
    - **Acción:** click en `[data-index="2"]`.
    - **Assertion:** `goTo(2)` llamado; item 2 con `.active`.
    - **Coverage:** `#onListClick`.

11. **`placement="left"` aplica dataset** — [categoría: ui/ux]
    - **Setup:** `placement="left"`.
    - **Acción:** Conectar.
    - **Assertion:** `dataset.placement === 'left'`.
    - **Coverage:** `#syncPlacement`.

12. **`placement="top"` se ignora (cae a bottom)** — [categoría: edge-case]
    - **Setup:** `placement="top"`.
    - **Acción:** Conectar.
    - **Assertion:** `host.placement === 'bottom'`; `dataset.placement === 'bottom'`.
    - **Coverage:** PLACEMENTS set.

13. **`accordion="auto"` con viewport >720px abierto, <720 cerrado** — [categoría: ui/ux]
    - **Setup:** Mock `matchMedia('(max-width: 720px)')` con `matches=false`; luego cambiar a `true`.
    - **Acción:** Conectar; disparar change.
    - **Assertion:** `data-accordion='open'`; tras change, `data-accordion='closed'`.
    - **Coverage:** `#syncAccordion` + mediaObs.

14. **Click en playlist-toggle alterna cuando `accordion='open'`** — [categoría: ui/ux]
    - **Setup:** `accordion="open"`.
    - **Acción:** Click en toggle.
    - **Assertion:** `data-accordion` alterna; `aria-expanded` sincroniza.
    - **Coverage:** `#toggleAccordion`.

15. **Volumen y mute del video activo se sincronizan al slider** — [categoría: integration]
    - **Setup:** Playlist con 1 video; `media.volume = 0.4, media.muted = false`.
    - **Acción:** Insertar.
    - **Assertion:** `vp-volume.value === '40'`; icono mute = `mdi:volume-medium`.
    - **Coverage:** `#syncVolumeUi`.

16. **Seek input actualiza `vp-time`** — [categoría: integration]
    - **Setup:** video con `duration=100, currentTime=20`.
    - **Acción:** setear `vp-seek.value = '500'`; disparar `input`.
    - **Assertion:** `vp-time.textContent` muestra preview 0:50 / 1:40.
    - **Coverage:** `#previewSeek`.

17. **Seek `pointerup` aplica `currentTime` real** — [categoría: integration]
    - **Setup:** `duration=100`.
    - **Acción:** `pointerdown`; `input value=750`; `pointerup`.
    - **Assertion:** `media.currentTime === 75`.
    - **Coverage:** `#applySeek`.

18. **`goTo` emite `is-change` y `is-video-change` sólo cuando cambia** — [categoría: edge-case]
    - **Setup:** `index=2`.
    - **Acción:** `goTo(2)`.
    - **Assertion:** NO se emite `is-change` (changed=false). Sólo se emite si `i !== this.#index`.
    - **Coverage:** `const changed = i !== this.#index`.

19. **Poster del video activo se muestra en miniatura** — [categoría: integration]
    - **Setup:** video con `poster="x.jpg"`.
    - **Acción:** Insertar en playlist.
    - **Assertion:** `<img class="playlist-thumbnail" src="x.jpg">` en el item activo.
    - **Coverage:** `videoPoster()` rama atributo.

20. **Captura de poster automática si `poster` ausente y `readyState >= 2`** — [categoría: browser-api]
    - **Setup:** video sin `poster`; `media.videoWidth=1920, videoHeight=1080, currentTime<0.05, duration>0.2`.
    - **Acción:** Insertar; esperar `loadedmetadata`.
    - **Assertion:** Se llama `capturePoster`; el item muestra `<img>` con `data:image/jpeg;base64,…`; duración > 0.
    - **Coverage:** `#bindVideos.onMeta`.

21. **`MutationObserver` actualiza la lista si cambia `title` o `poster`** — [categoría: integration]
    - **Setup:** Playlist con 1 video; spy de `#rebuildList`.
    - **Acción:** `videos[0].setAttribute('title', 'Nuevo')`.
    - **Assertion:** spy llamado.
    - **Coverage:** `#watchAttrs`.

22. **Foco inicial al item activo tras mount** — [categoría: focus]
    - **Setup:** Playlist con 3 videos.
    - **Acción:** Insertar.
    - **Assertion:** Item 0 con `tabindex="0"`, resto `tabindex="-1"`.
    - **Coverage:** `#rebuildList`.

23. **ARIA: `role="listbox"` y `role="option"` con `aria-selected`** — [categoría: aria]
    - **Setup:** Playlist.
    - **Acción:** Insertar.
    - **Assertion:** `#listEl.role === 'listbox'`; cada item `role="option"`; `aria-selected` correcto.
    - **Coverage:** template.

24. **XSS vía `title="<img onerror=alert(1)>"`** — [categoría: xss]
    - **Setup:** `<is-video title='<img src=x onerror=alert(1)>'>`.
    - **Acción:** Insertar en playlist.
    - **Assertion:** El título se asigna vía `textContent` (no innerHTML), no se renderiza la etiqueta.
    - **Coverage:** `videoTitle()` + `textContent`.

25. **`is-video` activo se marca con `data-active`** — [categoría: integration]
    - **Setup:** Playlist con 2 videos.
    - **Acción:** `goTo(1)`.
    - **Assertion:** `videos[1].hasAttribute('data-active')`; `videos[0]` sin él.
    - **Coverage:** `#applyActive`.

26. **`#unbindVideos` en `disconnectedCallback`** — [categoría: integration]
    - **Setup:** Playlist con 2 videos.
    - **Acción:** `el.remove()`.
    - **Assertion:** `videos[0]` ya no tiene listener `is-ended`; `attrObs.disconnect()`.
    - **Coverage:** cleanup.

27. **`channel` attribute actualiza la cabecera** — [categoría: ui/ux]
    - **Setup:** `channel="Mi canal"`.
    - **Acción:** Conectar.
    - **Assertion:** `part="channel"` con `textContent="Mi canal"` y `hidden=false`.
    - **Coverage:** `#syncChannel`.

---

## 12. `<is-video>` — `src/components/media/video.ts` (588 LOC)

**Atributos:** `src`, `poster`, `without-controls`, `muted`, `loop`, `autoplay`, `playsinline`. **Slots:** default (sources/tracks). **Eventos:** `is-play`, `is-pause`, `is-ended`, nativos reenviados (bubbles, composed). **CSS Parts:** `base`, `video`, `controls`, `play-button`, `mute-button`, `volume`, `volume-slider`, `time`, `seek`, `progress`, `big-play`, `fullscreen-button`, `pip-button`, `settings-button`. **Métodos:** `play()`, `pause()`, `toggleFullscreen()`, `togglePictureInPicture()`, `toggleMenu()`. **Teclado:** espacio/k, m, f, ←/→ ±5s, j/l ±10s, ↑/↓ ±5%, 0–9 saltos por decenas. **Browser APIs:** `requestFullscreen`, `pictureInPicture`, `MediaQuery`, `document.fullscreenchange`, `enterpictureinpicture`, `leavepictureinpicture`, `<video>` nativo, `IntersectionObserver` no, `MutationObserver` no. **No usa IndexedDB directamente** (sólo mencionado en tags del audit; verificar). **Auto-hide chrome** tras 2600 ms idle.

> Nota sobre `database` en tags: el componente no usa IndexedDB ni APIs de DB directamente. Probable confusión de tagging en el audit.

### Tests propuestos

1. **Reproducir / pausar con `space` y `k`** — [categoría: keyboard]
   - **Setup:** `<is-video src="a.mp4" tabindex="0">` con `controls`; foco en el host.
   - **Acción:** `keydown { key: ' ' }` y luego `keydown { key: 'k' }`.
   - **Assertion:** `media.play()` llamado tras space; `media.pause()` tras k.
   - **Coverage:** `#onKeydown`.

2. **Mute con `m`** — [categoría: keyboard]
   - **Setup:** video cargado, `volume=0.5`.
   - **Acción:** `keydown { key: 'm' }`.
   - **Assertion:** `media.muted === true`.
   - **Coverage:** `m` shortcut.

3. **Seek +5s con ArrowRight** — [categoría: keyboard]
   - **Setup:** `currentTime=10, duration=60`.
   - **Acción:** `keydown { key: 'ArrowRight' }`.
   - **Assertion:** `currentTime === 15`.
   - **Coverage:** `#seekBy(5)`.

4. **Seek -10s con `j`** — [categoría: keyboard]
   - **Setup:** `currentTime=20, duration=60`.
   - **Acción:** `keydown { key: 'j' }`.
   - **Assertion:** `currentTime === 10`.
   - **Coverage:** `#seekBy(-10)`.

5. **Volumen +5% con ArrowUp** — [categoría: keyboard]
   - **Setup:** `volume=0.5`.
   - **Acción:** `keydown { key: 'ArrowUp' }`.
   - **Assertion:** `volume ≈ 0.55`.
   - **Coverage:** `#volumeBy(0.05)`.

6. **Salto a 50% con tecla "5"** — [categoría: keyboard]
   - **Setup:** `duration=120`.
   - **Acción:** `keydown { key: '5' }`.
   - **Assertion:** `currentTime === 60` (50%).
   - **Coverage:** `Number(key) / 10`.

7. **Pantalla completa con `f`** — [categoría: keyboard]
   - **Setup:** Spy `requestFullscreen`.
   - **Acción:** `keydown { key: 'f' }`.
   - **Assertion:** spy llamado.
   - **Coverage:** atajo `f`.

8. **Atajos no se disparan con `ctrl/meta/alt`** — [categoría: keyboard]
   - **Setup:** Foco en host.
   - **Acción:** `keydown { key: ' ', ctrlKey: true }`.
   - **Assertion:** sin cambio de estado.
   - **Coverage:** guarda `if (e.altKey || e.ctrlKey || e.metaKey) return`.

9. **Auto-hide chrome tras 2.6s de inactividad** — [categoría: reduced-motion]
   - **Setup:** video reproduciendo; `controls` activo.
   - **Acción:** Disparar `pointerleave`; avanzar 2700 ms.
   - **Assertion:** `data-idle` presente; chrome visualmente oculto.
   - **Coverage:** `#goIdle`.

10. **`pointermove` despierta el chrome** — [categoría: ui/ux]
    - **Setup:** video pausado o playing; chrome oculto.
    - **Acción:** `pointermove`.
    - **Assertion:** `data-idle` removido; chrome visible.
    - **Coverage:** `#wake`.

11. **`#distributeSlot` mueve `<source>` y `<track>` al `<video>` interno** — [categoría: integration]
    - **Setup:** `<is-video><source src="hd.mp4" type="video/mp4"></is-video>`.
    - **Acción:** Conectar.
    - **Assertion:** el `<video>` interno tiene un `<source data-is-injected>`.
    - **Coverage:** `#distributeSlot`.

12. **Sin `src` y sin slotted sources → `#video.removeAttribute('src')`** — [categoría: edge-case]
    - **Setup:** `<is-video>` sin src ni slot.
    - **Acción:** Conectar.
    - **Assertion:** `video.src === ''`.
    - **Coverage:** `#syncAttrs`.

13. **`without-controls` oculta la chrome y el scrim** — [categoría: ui/ux]
    - **Setup:** `without-controls`.
    - **Acción:** Conectar.
    - **Assertion:** `controls.hidden === true`; `data-no-controls` presente.
    - **Coverage:** `#syncControlsVisibility`.

14. **`pip-button` se oculta si `document.pictureInPictureEnabled === false`** — [categoría: browser-api]
    - **Setup:** jsdom con `pictureInPictureEnabled=false`.
    - **Acción:** Conectar.
    - **Assertion:** `pipBtn.hidden === true`.
    - **Coverage:** guarda en `connectedCallback`.

15. **`ratechange` actualiza menú de velocidad** — [categoría: browser-api]
    - **Setup:** `<is-video src="a.mp4">`.
    - **Acción:** `media.playbackRate = 1.5`; disparar `ratechange`.
    - **Assertion:** botón 1.5x con `aria-checked="true"`; icono = `mdi:play-speed`.
    - **Coverage:** `#syncMenuUi`.

16. **Menú de velocidad: click fuera cierra** — [categoría: ui/ux]
    - **Setup:** menú abierto.
    - **Acción:** `pointerdown` en `#wrap` con target fuera del menú y del botón.
    - **Assertion:** `menu.hidden === true`.
    - **Coverage:** listener `wrap.pointerdown`.

17. **Click en `#big-play` llama `togglePlay()`** — [categoría: ui/ux]
    - **Setup:** `<is-video>`.
    - **Acción:** click en big-play.
    - **Assertion:** `play()` o `pause()` invocado según estado.
    - **Coverage:** listener.

18. **Doble click en `<video>` entra pantalla completa** — [categoría: ui/ux]
    - **Setup:** dblclick.
    - **Acción:** Disparar.
    - **Assertion:** `requestFullscreen` llamado.
    - **Coverage:** `dblclick` listener.

19. **`muted` setter actualiza `video.muted`** — [categoría: ui/ux]
    - **Setup:** `<is-video muted>`.
    - **Acción:** Conectar.
    - **Assertion:** `video.muted === true`; atributo `muted` presente.
    - **Coverage:** `#syncAttrs`.

20. **`autoplay` con `play()` rechazado silencia error** — [categoría: browser-api]
    - **Setup:** mock `media.play()` → `Promise.reject(NotAllowedError)`.
    - **Acción:** `play()` desde `togglePlay`.
    - **Assertion:** `playBtn.checked` vuelve a false.
    - **Coverage:** `p.catch(() => { this.#playBtn.checked = false; })`.

21. **Fullscreen: rechazo no rompe UI** — [categoría: browser-api]
    - **Setup:** mock `requestFullscreen()` rechaza.
    - **Acción:** `toggleFullscreen()`.
    - **Assertion:** sin throw; `fsBtn.checked` se actualiza vía `fullscreenchange`.
    - **Coverage:** `.catch(() => {})`.

22. **`tabindex` se establece en connectedCallback** — [categoría: a11y]
    - **Setup:** `<is-video>`.
    - **Acción:** Conectar.
    - **Assertion:** `host.tabindex === '0'`.
    - **Coverage:** `if (!this.hasAttribute('tabindex'))`.

23. **Sliders manejan sus propias flechas (no se duplican)** — [categoría: keyboard]
    - **Setup:** foco en `#seek` (range).
    - **Acción:** `keydown { key: 'ArrowRight' }` con `e.target === #seek`.
    - **Assertion:** no se invoca `#seekBy(5)` (la guarda `onSlider`).
    - **Coverage:** `onSlider` early-out.

24. **Tiempo formateado: `1:02:03`** — [categoría: edge-case]
    - **Setup:** `duration = 3723`.
    - **Acción:** Disparar `timeupdate`.
    - **Assertion:** `#time.textContent` incluye `1:02:03`.
    - **Coverage:** `fmtTime()` con horas.

25. **Buffer se pinta en barra `--buffered`** — [categoría: ui/ux]
    - **Setup:** `duration=100, buffered.end(0)=30`.
    - **Acción:** Disparar `progress`.
    - **Assertion:** `style.getPropertyValue('--buffered') === '30%'`.
    - **Coverage:** `#onBuffer`.

26. **Pip: `enterpictureinpicture` actualiza `pipBtn.checked`** — [categoría: browser-api]
    - **Setup:** Disparar `enterpictureinpicture`.
    - **Acción:** Set `document.pictureInPictureElement = #video`.
    - **Assertion:** `pipBtn.checked === true`.
    - **Coverage:** `#syncPipUi`.

27. **Disconnected limpia `fullscreenchange` listener** — [categoría: integration]
    - **Setup:** Spy `document.removeEventListener`.
    - **Acción:** `el.remove()`.
    - **Assertion:** spy llamado con `'fullscreenchange'`.
    - **Coverage:** `disconnectedCallback`.

28. **Sin `controls`, atajos de teclado no funcionan** — [categoría: keyboard]
    - **Setup:** `without-controls`.
    - **Acción:** `keydown { key: ' ' }`.
    - **Assertion:** sin cambio de estado.
    - **Coverage:** `if (!this.controls || ...)`.

29. **Reducción de movimiento: `prefers-reduced-motion`** — [categoría: reduced-motion]
    - **Setup:** `prefers-reduced-motion: reduce`.
    - **Acción:** Inspeccionar CSS del componente (scrim, idle transitions).
    - **Assertion:** transitions con `transition-property: none`.
    - **Coverage:** accesibilidad.

30. **`is-play`/`is-pause`/`is-ended` burbujean y composed** — [categoría: integration]
    - **Setup:** Listener en `document.body`.
    - **Acción:** Disparar play/pause/ended en `media`.
    - **Assertion:** los 3 eventos llegan al listener fuera del shadow.
    - **Coverage:** `dispatchEvent({ bubbles: true, composed: true })` + `emit()`.

31. **`poster` se aplica al `<video>.poster`** — [categoría: ui/ux]
    - **Setup:** `<is-video poster="x.jpg">`.
    - **Acción:** Conectar.
    - **Assertion:** `media.poster === 'x.jpg'`.
    - **Coverage:** `#syncAttrs`.

32. **`src` setter actualiza `video.src`** — [categoría: integration]
    - **Setup:** `<is-video>`.
    - **Acción:** `el.src = 'a.mp4'`.
    - **Assertion:** atributo `src="a.mp4"`; `media.src === 'a.mp4'`.
    - **Coverage:** setter + `#syncAttrs`.

---

## Resumen — Tabla Maestra

| # | Testable | LOC | Atributos clave | Browser APIs | Eventos | CSS Parts | Tests propuestos | Categorías cubiertas |
|---|----------|-----|-----------------|--------------|---------|-----------|------------------|----------------------|
| 1 | `<is-avatar>` | 146 | `image`, `initials`, `label`, `loading`, `shape` | `<img>`, slot, error event | `is-error` | `avatar`, `image`, `initials`, `icon` | 12 | a11y, edge-case, ui/ux, xss, integration |
| 2 | `<is-barcode-scanner>` | 115 | `formats`, `disabled` | `BarcodeDetector`, `getUserMedia` | `is-detect`, `is-error` | `preview`, `hint` | 13 | browser-api, a11y, edge-case, integration, performance |
| 3 | `<is-barcode>` | 199 | `value`, `type`, `height`, `fg`, `bg`, `show-text`, `quiet` | `<svg>`, Code128 + EAN13 GS1 | `is-render` | `root`, `canvas`, `text` | 14 | edge-case, ui/ux, performance, integration, xss |
| 4 | `icon-explorer` (preview) | 614 | (sin atributos propios; consume `index.json`, `collections.json`) | `fetch`, `IntersectionObserver`, `URL.createObjectURL`, `canvas.toBlob` | (no propios) | (no propios) | 15 | integration, edge-case, ui/ux, performance, xss |
| 5 | `<is-icon>` | 245 | `icon`, `name`, `library`, `label`, `src` | `fetch`, `AbortController`, `resolveIconRaw` | (no propios) | `icon` | 15 | browser-api, integration, a11y, edge-case, performance, reduced-motion |
| 6 | `<is-image-editor>` | 330 | `src`, `zoom`, `rotation`, `aspect` | `<canvas>`, `ResizeObserver`, `Image` | `is-load`, `is-change`, `is-crop` | `root`, `viewport`, `canvas`, `selection`, `toolbar`, `status` | 15 | browser-api, edge-case, integration, performance, xss, reduced-motion |
| 7 | `<is-media-recorder>` | 137 | `source`, `disabled` | `getUserMedia`, `getDisplayMedia`, `MediaRecorder` | `is-start`, `is-stop`, `is-error` | `preview`, `download` | 14 | browser-api, a11y, integration, edge-case, reduced-motion |
| 8 | `<is-qrcode>` | 148 | `value`, `level`, `cell`, `margin`, `fg`, `bg` | `import('https://esm.sh/...')`, `<svg>`, `canvas.toDataURL` | `is-render` | `root`, `canvas`, `status` | 14 | browser-api, integration, edge-case, performance, xss, reduced-motion |
| 9 | `<is-speech>` | 145 | `lang`, `text` | `SpeechRecognition`, `SpeechSynthesisUtterance` | `is-result`, `is-speak-end`, `is-error` | `bar`, `transcript` | 14 | browser-api, a11y, integration, edge-case, xss, reduced-motion |
| 10 | `<is-theme-img>` | 154 | `src-dark`, `src-light`, `alt`, `shape`, `fit`, `theme`, `loading` | `<img>`, theme watcher | (no propios) | `image` | 13 | integration, edge-case, a11y, performance, ui/ux, xss, reduced-motion |
| 11 | `<is-video-playlist>` | 780 | `autoplay-next`, `placement`, `channel`, `accordion` | `<video>` (vía `<is-video>`), `matchMedia`, `MutationObserver`, `canvas.toDataURL` (poster) | `is-video-change`, `is-change` | 14 parts (`playlist*`, `player-*`, `tools-*`, `seek`, `time`, etc.) | 27 | integration, keyboard, ui/ux, edge-case, focus, aria, xss, browser-api |
| 12 | `<is-video>` | 588 | `src`, `poster`, `without-controls`, `muted`, `loop`, `autoplay`, `playsinline` | `<video>`, `requestFullscreen`, `pictureInPicture`, `MediaQuery`, `document.fullscreenchange`, `enterpictureinpicture`, `leavepictureinpicture` | `is-play`, `is-pause`, `is-ended` + nativos | 13 parts (`base`, `video`, `controls`, `play-button`, `mute-button`, `volume`, `seek`, `progress`, `big-play`, `fullscreen-button`, `pip-button`, `settings-button`, `time`, `volume-slider`) | 32 | keyboard, browser-api, ui/ux, edge-case, integration, a11y, reduced-motion |

**Total propuestas: 196 tests** distribuidos entre los 12 testables.

---

## Gaps transversales

1. **Permisos denegados — UX de fallback**
   - Patrón repetido en `barcode-scanner`, `media-recorder`, `speech`, `image-editor`: cuando el navegador rechaza `getUserMedia` / `SpeechRecognition` / `BarcodeDetector`, ¿hay un fallback visual claro? Las propuestas verifican que el `is-error` se emite, pero **falta validar el mensaje user-facing** (toast, callout, hint visible). Cubierto parcialmente en `barcode-scanner` con `.hint`, **ausente** en `media-recorder` (no hay `<output>` ni `<p class="hint">`), `speech` (sólo emite `is-error`) y `image-editor` (sólo `#status.textContent`).

2. **`prefers-reduced-motion`**
   - Sólo mencionado en `avatar.css` y `video.css` (scrim + idle). Propuestas de tests verifican que el cambio de tema, el cambio de `icon` y el autohide no disparen transitions, pero **no hay un test transversal** que confirme cumplimiento sistemático. Recomendación: crear una suite que itere sobre los 12 y verifique `getComputedStyle(...).transitionDuration === '0s'` cuando el media query está activo.

3. **XSS en atributos `src` / `value` / `name`**
   - Patrón crítico: cualquier atributo que termine en `src` o URL es vector XSS si el navegador lo ejecuta como `javascript:`. Propuestas cubren `avatar.image`, `icon.src`, `theme-img.src-dark/light`, `qrcode.value`. **Falta validar que `image-editor.src` rechace `javascript:`** antes de `img.src = src`. Misma historia para `video.src`.

4. **Token expiry / auth** (menc. en tags `icon-explorer`)
   - El explorador no implementa auth real, pero **descarga de assets remotos** (Pages, jsDelivr) sí está expuesta a fallos de red o 403. Propuestas para `icon-explorer` cubren `fetch` 404 pero **no 401/403** (token ausente / expirado). Recomendación: añadir mock con `Response.ok=false, status=401` y verificar que el callout "No se pudo cargar el SVG" sigue apareciendo con mensaje genérico (sin filtrar detalles de auth al usuario).

5. **Quota exceeded en `MediaRecorder`**
   - Patrón `chunks.push(e.data)` sin límite. Propuestas cubren flujo normal, pero **ningún test verifica `QuotaExceededError` o rechazo de `MediaRecorder` por memoria**. Recomendación: test con mock que dispare `error` con `name='QuotaExceededError'`.

6. **`AbortController` cleanup**
   - `icon.ts` y `video.ts` registran listeners globales (`window.pointermove`, `document.fullscreenchange`) y crean `AbortController`. Las propuestas verifican cleanup individual, pero **falta un test transversal de memory leaks** que cuente listeners después de 50 mount/unmount cycles.

7. **Permisos revocados en runtime**
   - Si el usuario revoca el permiso de cámara desde el browser después de iniciar, `MediaStreamTrack.stop()` puede dispararse. Cubierto en `disconnectedCallback` pero **no hay test del caso "permission revoked mid-recording"** (evento `track.onended`). Recomendación: añadir mock que dispare `track.dispatchEvent(new Event('ended'))` y verificar que `media-recorder` emite `is-stop` con los chunks acumulados hasta el momento.

8. **CSS Part coverage**
   - `video-playlist` declara 14 parts, `video` declara 13, pero **no hay tests que verifiquen la accesibilidad visual de cada uno** (foco, hover, contraste). Las propuestas verifican estructura DOM pero no estilo.

9. **Reduced-motion vs autohide de `<is-video>`**
   - El chrome se oculta tras 2.6s. Si el usuario tiene `prefers-reduced-motion: reduce`, ¿debería seguir ocultándose? La propuesta #29 de `<is-video>` verifica transitions CSS, pero no la lógica JS. **Decisión de diseño abierta**: o se respeta el setting (chrome siempre visible) o se ignora (UX YouTube-like).

10. **IndexedDB — tagging posiblemente incorrecto**
    - El audit taggea `<is-video>` con `database`, pero el componente **no usa IndexedDB**. Sugerencia: revisar el audit pipeline o documentar que `<is-video>` no tiene persistencia local. Si se necesita historial de progreso, sería un candidato para IndexedDB (futuro feature).

11. **Aria-live para `<is-speech>`**
    - `aria-live="polite"` está bien aplicado. Falta validar que **no se re-emita el mismo transcript** en cada `onresult` con `isFinal` parcial (screen reader bombardment). Las propuestas cubren el evento pero no el ritmo.

12. **Teclado en `<is-video>` vs sliders**
    - Documentado: `<input type="range">` ya consume flechas. Pero **no se testea el caso de doble handler** cuando el usuario hace focus en `#seek` y luego presiona `m` (mute): debería disparar mute. Las propuestas #23 cubren `ArrowRight` pero no otras teclas fuera de los sliders.

---

### Recomendación final

1. **Cobertura mínima viable**: implementar los **tests de browser-api mocking** (permisos denegados, BarcodeDetector no disponible, SpeechRecognition ausente) — son los más impactantes y los menos cubiertos por los Tier A existentes.
2. **Prioridad 2**: **keyboard tests de `<is-video>` y `<is-video-playlist>`** — el reproductor es el componente con más superficie de teclado.
3. **Prioridad 3**: **XSS / sanitization transversal** en atributos `src` / `value`.
4. **Prioridad 4**: **reduced-motion** transversal (una suite con `emulateMediaFeatures`).
