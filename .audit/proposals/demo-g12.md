# F0.3 propuesta UX/UI exhaustiva — media (5 demos)

> Categoría: **media**. Enfoque: carga de archivos, estados de error, scrubbing, controles de autoplay, captions/subtítulos, Fullscreen API, teclado, browser storage (IndexedDB / localStorage / Cache API).

---

### demo: icon

#### Tests existentes (resumen, brevísimo)
- Render básico del componente con un nombre de icono y un tamaño.
- Cambio de `size` prop y verificación del ancho/alto del SVG.

#### Propuestas nuevas

1. **Carga diferida del sprite SVG (lazy fetch del archivo de iconos)** — [media/file-loading]
   - Setup: abrir la página con DevTools en Network tab y throttling "Slow 3G".
   - Acción: navegar al demo por primera vez (cold cache) y medir tiempo a primer paint del icono.
   - Assertion: la request al sprite/JSON de iconos aparece una sola vez por sesión y entra a `disk cache` en la segunda navegación; el icono placeholder/skeleton se muestra mientras dura la carga.
   - Cobertura: cold cache vs warm cache; race condition si el usuario cambia de icono antes de que termine el fetch inicial.

2. **Fallback cuando el nombre de icono no existe en el set** — [media/error-state]
   - Setup: pasar `<is-icon name="does-not-exist">` mediante un input del demo.
   - Acción: teclear un nombre inválido y tabular fuera.
   - Assertion: el componente renderiza un fallback visual (cuadrado vacío, `?`, o `aria-hidden` icon genérico) y emite un warning `console.warn`; `aria-label` se actualiza a "Icon unavailable" o equivalente.
   - Cobertura: branch de error, mensaje a usuario, accesibilidad del fallback.

3. **Estado loading del SVG inline vs referencia externa** — [media/file-loading]
   - Setup: forzar el modo "sprite externo" si el demo lo soporta; desactivar la red con DevTools "Offline".
   - Acción: recargar la página.
   - Assertion: el icono no aparece; se muestra un estado skeleton/spinner y el componente expone `aria-busy="true"`; al volver online, aparece sin recargar la página.
   - Cobertura: red caída mid-session, recovery automático.

4. **Icono interactivo con `button` role y hover affordance** — [interaction/hover]
   - Setup: renderizar el icono dentro de un contexto clickable (toolbar).
   - Acción: pasar el cursor por encima y retirarlo.
   - Assertion: aparece un cambio visual (background, scale, sombra) gobernado por tokens `--is-*`; el cambio respeta `prefers-reduced-motion: reduce` (sin `transform`).
   - Cobertura: feedback hover, accesibilidad motriz.

5. **Navegación por teclado entre varios iconos focuseables** — [keyboard]
   - Setup: lista de 5 iconos renderizados como `<button>`.
   - Acción: presionar `Tab` desde el primero y `Shift+Tab` desde el último.
   - Assertion: el orden de focus sigue el orden visual (DOM order); el outline visible usa `:focus-visible`, no `:focus`; no hay `tabindex` mayor a 0.
   - Cobertura: orden lógico, foco visible solo con teclado.

6. **`aria-label` dinámico cuando el icono actúa como botón de acción** — [a11y]
   - Setup: pasar `aria-label="Delete"` o `accessibleName` al icono-boton.
   - Acción: leer con lector de pantalla simulado (o inspeccionar Accessibility tree en DevTools).
   - Assertion: el árbol de accesibilidad expone el `accessible name` provisto; los iconos decorativos llevan `aria-hidden="true"` y `role="presentation"`.
   - Cobertura: WCAG 1.1.1 (non-text content), 4.1.2 (name, role, value).

7. **Cambio de tamaño en tiempo real sin reflow brusco** — [interaction/visual]
   - Setup: input range "size" en el demo.
   - Acción: arrastrar el slider de 16 → 256 px en pasos de 8.
   - Assertion: el ancho/alto del SVG cambian en cada paso; no hay layout shift en hermanos (CLS = 0); `vector-effect="non-scaling-stroke"` si aplica.
   - Cobertura: rendimiento de repintado, escalado de stroke.

8. **Icono con `currentColor` hereda color del contexto** — [visual/theming]
   - Setup: demo con toggle dark/light.
   - Acción: cambiar `data-theme` del contenedor raíz.
   - Assertion: el `fill` del SVG pasa de negro a blanco automáticamente sin re-render; tokens `--is-color-icon-*` se aplican.
   - Cobertura: theming dinámico, herencia de `color`.

9. **Persistencia del último icono seleccionado en `localStorage`** — [media/browser-storage]
   - Setup: demo con selector de icono.
   - Acción: elegir un icono, recargar la página (F5).
   - Assertion: el icono elegido se restaura al montar el componente; la key usada es namespaced (`is-webcomponents:demo-icon:lastName`); `localStorage` falla (cuota) → fallback a valor por defecto sin romper la UI.
   - Cobertura: storage quota, namespace collisions.

10. **Carga de icono personalizado vía URL absoluta (sanitización)** — [media/file-loading]
    - Setup: input que acepta una URL de SVG.
    - Acción: pegar `https://evil.example/x.svg` y `data:image/svg+xml;base64,...<script>...`.
    - Assertion: el SVG externo se carga solo si el origin está en una allow-list (o si es same-origin); los payloads `<script>` y event handlers inline se sanitizan (DOMPurify o equivalente) antes de inyectarse; un toast/diálogo informa del rechazo si la URL es maliciosa.
    - Cobertura: XSS vía SVG, CSP `img-src`, sanitización.

11. **Icono como `mask-image` vs `background-image` (performance)** — [media/file-loading]
    - Setup: renderizar 50 iconos iguales en una grilla.
    - Acción: medir FPS al hacer scroll con DevTools Performance.
   - Assertion: el repintado usa compositor (`will-change: transform` o `contain: paint`); no hay layout al pasar el cursor; la cantidad de capas activas se mantiene estable.
    - Cobertura: scroll perf, layer promotion.

12. **Estado disabled con `aria-disabled` y pointer-events** — [visual/state]
    - Setup: icono envuelto en `<button disabled>`.
    - Acción: intentar click, focus con teclado, lector de pantalla.
    - Assertion: el click no emite evento; `aria-disabled="true"` está presente; el opacity baja a `var(--is-opacity-disabled)`; `:focus-visible` sigue mostrando outline (no se oculta al deshabilitar).
    - Cobertura: WCAG 4.1.2, disabled semantics vs HTML `disabled`.

---

### demo: icon-explorer

#### Tests existentes (resumen, brevísimo)
- Listado de iconos disponibles en el set.
- Búsqueda por texto y filtrado.

#### Propuestas nuevas

1. **Búsqueda fuzzy con resaltado de coincidencias** — [interaction/search]
   - Setup: campo de búsqueda con 200+ iconos cargados.
   - Acción: teclear "sett" esperando matches `settings`, `reset`, `set`; borrar y teclear "x" (sin coincidencias).
   - Assertion: los resultados se actualizan en <50 ms (búsqueda incremental); los términos coincidentes se envuelven en `<mark>` con tokens `--is-color-mark-bg`; estado vacío muestra "No matches" con un botón "Clear".
   - Cobertura: edge case 0 resultados, performance con dataset grande.

2. **Carga perezosa del catálogo completo de iconos (lazy chunks)** — [media/file-loading]
   - Setup: abrir Network panel; navegar al demo en cold cache.
   - Acción: observar las requests de los archivos JSON/SVG.
   - Assertion: la primera vista pide solo el manifest; los chunks de iconos se cargan al filtrar por categoría o al hacer scroll; no se descargan más de 50 KB en la carga inicial.
   - Cobertura: TTI, code-splitting, chunk strategy.

3. **Vista previa de icono con `dialog` modal accesible (focus trap)** — [a11y/focus]
   - Setup: click en un icono de la grilla.
   - Acción: tabular dentro del modal y presionar `Escape`.
   - Assertion: el foco entra al modal y queda atrapado (cycle Tab/Shift+Tab); `Escape` cierra y devuelve foco al botón de origen; el modal expone `role="dialog"` y `aria-modal="true"` con `aria-labelledby` apuntando al título.
   - Cobertura: WCAG 2.4.3 (focus order), 2.1.2 (no keyboard trap excepto el modal).

4. **Copiar nombre del icono al portapapeles con feedback** — [interaction/feedback]
   - Setup: click en el botón "Copy" de un icono en su preview.
   - Acción: pegar en otro input.
   - Assertion: el portapapeles recibe el string del nombre (`is-icon--name`); aparece un toast `aria-live="polite"` "Copied!" durante 2 s y luego desaparece; si el navegador no soporta `navigator.clipboard`, se usa un `<textarea>` legacy.
   - Cobertura: Clipboard API, fallback, accesibilidad del toast.

5. **Paginación o virtual scroll para miles de iconos** — [performance]
   - Setup: activar modo "all icons" si el demo lo permite.
   - Acción: hacer scroll hasta el final del listado.
   - Assertion: la lista usa virtual scroll (solo ~30 nodos en DOM a la vez); el scroll FPS se mantiene ≥50; aparece un botón "Back to top" al pasar de 500 px.
   - Cobertura: performance con dataset grande, scroll infinito.

6. **Filtro por categoría con `aria-pressed` en toggle group** — [a11y/toggle]
   - Setup: grupo de chips "Outline / Filled / Duotone".
   - Acción: tabular, activar con `Space`, navegar con flechas.
   - Acción: cada chip expone `aria-pressed="true|false"`; el patrón es radiogroup (flechas cambian selección); el cambio de filtro anuncia la nueva categoría vía `aria-live="polite"`.
   - Cobertura: ARIA pattern, navegación por flechas.

7. **Vista de iconos favoritos persistida en `localStorage`** — [media/browser-storage]
   - Setup: marcar 3 iconos como favoritos (estrella).
   - Acción: recargar la página.
   - Assertion: los favoritos se restauran en el orden en que se marcaron; la key `is-webcomponents:icon-explorer:favorites` contiene un JSON array; si la key está corrupta, se ignora y se loguea warning.
   - Cobertura: persistencia, JSON malformado.

8. **Búsqueda sin red (offline) usando Cache API** — [media/browser-storage]
   - Setup: instalar un Service Worker que cachea el manifest de iconos.
   - Acción: poner DevTools en "Offline" y buscar.
   - Assertion: el manifest cacheado se sirve desde la Cache API; la UI muestra un banner "Offline mode" via `aria-live="polite"`; las imágenes de iconos usan `stale-while-revalidate`.
   - Cobertura: PWA offline, SW lifecycle.

9. **Importar/Exportar selección de iconos como JSON** — [interaction/file-io]
   - Setup: seleccionar 5 iconos y click "Export".
   - Acción: el archivo `icons.json` se descarga; importarlo de vuelta.
   - Assertion: el JSON tiene schema `{ version, icons: [name, variant] }`; el import valida el schema y rechaza versiones desconocidas con un toast de error visible.
   - Cobertura: round-trip, validación de schema.

10. **Drag & drop de un SVG externo al catálogo** — [interaction/dnd]
    - Setup: arrastrar un archivo `icon.svg` desde el escritorio sobre la grilla.
    - Acción: soltar y verificar que aparece en una sección "Custom icons".
    - Assertion: el archivo se lee con `FileReader` como texto, se sanitiza (eliminar `<script>`, event handlers), y se guarda en `IndexedDB`; si el archivo no es SVG válido, se muestra error y el archivo se descarta.
    - Cobertura: File API, sanitización, IndexedDB.

11. **URL state sincronizada (filtros en query string)** — [interaction/url-state]
    - Setup: aplicar filtros `?category=filled&q=set`.
    - Acción: copiar la URL, abrirla en pestaña nueva.
    - Assertion: la nueva pestaña restaura los filtros; al cambiar un filtro, la URL se actualiza con `history.replaceState` (no recarga); los iconos filtrados son los mismos.
    - Cobertura: deep-linking, shareable state.

12. **Tema dark/light y `prefers-color-scheme` automático** — [visual/theming]
    - Setup: toggle manual + media query del sistema.
    - Acción: cambiar el tema del SO y recargar.
    - Assertion: el toggle refleja el `prefers-color-scheme` por defecto; sobreescribir manual se guarda en `localStorage` y tiene prioridad; los iconos cambian su `fill` con `currentColor`.
    - Cobertura: theming reactivo, storage del override.

13. **Errores de carga del manifest (404, 500, JSON inválido)** — [media/error-state]
    - Setup: interceptar la request del manifest con Playwright `route.fulfill({ status: 500 })`.
    - Acción: cargar el demo.
    - Assertion: aparece una UI de error con icono, mensaje y botón "Retry"; el botón dispara un nuevo fetch; el estado de error se anuncia con `role="alert"`; los iconos no se renderizan parcialmente.
    - Cobertura: HTTP error, retry, role=alert.

---

### demo: image-editor

#### Tests existentes (resumen, brevísimo)
- Carga de imagen desde URL o archivo local.
- Aplicación de filtros básicos (brightness, contrast, saturation).

#### Propuestas nuevas

1. **Carga de archivos pesados (>20 MB) con barra de progreso** — [media/file-loading]
   - Setup: imagen JPEG de 25 MB en disco local.
   - Acción: arrastrarla al área de drop.
   - Assertion: aparece una barra de progreso gobernada por `FileReader.onprogress`; el porcentaje va de 0 → 100 sin saltos; un `aria-valuenow` actualiza el `role="progressbar"`; al terminar, la imagen entra al canvas.
   - Cobertura: archivos grandes, progreso accesible.

2. **Validación de tipo MIME al cargar (`accept="image/*"`)** — [media/error-state]
   - Setup: arrastrar un `.pdf` o `.exe` al drop zone.
   - Acción: soltar.
   - Assertion: aparece un toast `role="alert"` "Unsupported file type"; el archivo no entra al editor; el input file vacío permite reintentar.
   - Cobertura: MIME validation, error UX.

3. **Deshacer/Rehacer con `Ctrl+Z` / `Ctrl+Shift+Z` y stack limitado** — [keyboard/history]
   - Setup: aplicar 5 filtros secuenciales.
   - Acción: presionar `Ctrl+Z` 6 veces, luego `Ctrl+Shift+Z` 3 veces.
   - Assertion: el stack de historial no excede 50 entradas (configurable); cada deshacer restaura el estado anterior; rehacer reaplica; el botón Undo/Redo expone `aria-disabled` cuando el stack está vacío.
   - Cobertura: history stack, atajos, deep state.

4. **Crop con selección rectangular arrastrable y teclado** — [interaction/dnd]
   - Setup: imagen cargada, activar herramienta "Crop".
   - Acción: dibujar rectángulo con mouse, mover con flechas (1 px) y Shift+flechas (10 px), escalar desde esquinas con `Alt+drag`.
   - Assertion: el rectángulo respeta aspect ratio si está bloqueado; el crop final no produce imagen vacía (min 1×1 px); `aria-valuetext` anuncia las dimensiones actuales.
   - Cobertura: DnD teclado+ratón, edge case 0×0.

5. **Exportar imagen editada a PNG/JPEG/WebP con calidad** — [media/file-io]
   - Setup: imagen editada con cambios.
   - Acción: click "Export" → elegir formato JPEG q=80, PNG, WebP q=90.
   - Assertion: el archivo descargado tiene el MIME correcto y dimensiones iguales al canvas; el slider de calidad afecta el peso (verificar tamaño > 0 bytes y dentro de un rango); WebP solo se ofrece si `canvas.toBlob` lo soporta.
   - Cobertura: Canvas API, formato condicional, file download.

6. **Auto-guardado del borrador en `IndexedDB` cada 5 segundos** — [media/browser-storage]
   - Setup: editar imagen durante 30 segundos.
   - Acción: cerrar la pestaña bruscamente; reabrir.
   - Assertion: al reabrir aparece un diálogo "Restore unsaved changes?"; al aceptar se restaura el canvas completo (filtros + crop); al rechazar, se borra el blob de IndexedDB; la cuota excedida (`QuotaExceededError`) se maneja con limpieza del draft más viejo.
   - Cobertura: persistencia offline, recovery, quota handling.

7. **Pipeta de color (eyedropper) con `EyeDropper API`** — [interaction/color]
   - Setup: imagen cargada, click "Pick color".
   - Acción: mover el cursor sobre la imagen y click.
   - Assertion: si el navegador soporta `EyeDropper` (Chromium 95+) se abre el sampler; el color hex se copia al portapapeles y se muestra en el panel de color; fallback a canvas `getImageData` si la API no existe.
   - Cobertura: feature detection, fallback manual.

8. **Atajos de teclado documentados (overlay `?`)** — [keyboard/help]
   - Setup: presionar `?` (o click en el icono de ayuda).
   - Acción: revisar overlay con lista de atajos.
   - Assertion: el overlay expone `role="dialog"` y `aria-modal="true"`; los atajos listados funcionan: `B` brush, `E` eraser, `V` move, `Ctrl+S` save, `Ctrl+Z` undo; `Escape` cierra.
   - Cobertura: discoverability, shortcuts.

9. **Rotación con pérdida de calidad (anti-aliasing por dirección)** — [media/transform]
   - Setup: imagen rotada 45° tres veces seguidas.
   - Acción: comparar con la original.
   - Assertion: las rotaciones múltiples no acumulan errores mayores a ±1 px; el botón "Reset rotation" existe; la rotación se aplica en CSS `transform` (preview) y solo se rasteriza al exportar.
   - Cobertura: transform vs raster, accumulation.

10. **Filtros con preview en tiempo real y debounce** — [interaction/debounce]
    - Setup: slider "Brightness" de 0 → 200.
    - Acción: arrastrar lentamente el slider.
    - Assertion: el filtro se aplica con debounce de ~16 ms (1 frame); el preview no se queda "congelado" más de 100 ms; el botón "Apply" confirma el cambio al historial; el indicador de "unsaved" aparece en el título de la pestaña.
    - Cobertura: raf throttle, performance.

11. **Accesibilidad del canvas (alternativa textual)** — [a11y/canvas]
    - Setup: imagen cargada con texto visible.
    - Acción: inspeccionar el árbol de accesibilidad.
    - Assertion: el `<canvas>` lleva `role="img"` y `aria-label="Edited image"` (o `aria-labelledby` con descripción); las herramientas de la barra tienen `aria-label`; el estado activo de cada herramienta se expone con `aria-pressed`.
    - Cobertura: WCAG 1.1.1, canvas semantics.

12. **Errores de canvas (Out-of-memory, tainted canvas)** — [media/error-state]
    - Setup: cargar una imagen cross-origin sin `crossorigin="anonymous"`.
    - Acción: intentar exportar.
    - Assertion: el intento de `toDataURL`/`toBlob` lanza `SecurityError`; el editor captura el error y muestra un mensaje "Cannot export cross-origin image without CORS"; ofrece recargar la imagen con `crossorigin` o usar proxy.
    - Cobertura: CORS, canvas tainting, graceful error.

13. **Pinch-zoom y pan en touch (Pointer Events)** — [interaction/touch]
    - Setup: con emulación touch en DevTools, hacer pinch con 2 dedos y pan con 1 dedo.
    - Acción: zoom in/out arrastrando dedos, doble-tap para reset.
    - Assertion: el zoom respeta límites (0.25x → 8x); el pan se desactiva con `pan-x pan-y` CSS cuando hay overflow; los gestos no interfieren con la selección de crop; `touch-action` está configurado correctamente.
    - Cobertura: Pointer Events, gesture conflicts.

---

### demo: video

#### Tests existentes (resumen, brevísimo)
- Reproducción básica con `controls`.
- Cambio de `src` y eventos `play`/`pause`.

#### Propuestas nuevas

1. **Reproducción con autoplay bloqueado por política del navegador** — [media/autoplay]
   - Setup: cargar la página con `autoplay muted` y sin interacción previa del usuario.
   - Acción: observar el primer frame.
   - Assertion: si el navegador bloquea autoplay con sonido, el video entra en `paused` con un overlay "Click to play"; el estado `autoplay` failed se anuncia con `aria-live="polite"`; no aparece error en consola por `NotAllowedError`.
   - Cobertura: autoplay policy, UX fallback.

2. **Controles nativos vs custom (toggle de UI)** — [interaction/controls]
   - Setup: video con y sin atributo `controls`.
   - Acción: tabular sobre los controles cuando están ocultos.
   - Assertion: con `controls`, los nativos del navegador son accesibles; sin ellos, los botones custom exponen `role="button"`, `aria-label="Play/Pause"`, `aria-pressed`; los atajos `Space`, `K`, `J`, `L` funcionan en ambos modos.
   - Cobertura: control layer, dual-mode.

3. **Scrubbing de la barra de progreso con teclado** — [media/scrubbing]
   - Setup: video pausado, focus en la barra de progreso.
   - Acción: `ArrowRight` mueve 5 s, `PageUp` 30 s, `Home`/`End` va al inicio/fin; `Shift+Arrow` mueve 1 s.
   - Assertion: el `aria-valuenow` del slider de progreso se actualiza en cada paso; el tiempo se muestra con formato mm:ss (>60 s) o hh:mm:ss; el video no se reproduce durante el scrubbing (frame preview al pasar).
   - Cobertura: scrubbing accesible, formato tiempo.

4. **Soporte de pistas de subtítulos (WebVTT) y captions** — [media/captions]
   - Setup: agregar `<track kind="captions" srclang="es" label="Español" default>` y otra en `en`.
   - Acción: activar/desactivar cada pista desde el menú CC.
   - Assertion: el menú expone `role="menu"` con items `role="menuitem"`; `aria-pressed` indica la pista activa; los subtítulos aparecen sincronizados; la pista por defecto se selecciona según el `lang` del navegador si coincide.
    - Cobertura: WebVTT, multi-track, captions pattern.

5. **Picture-in-Picture API (`requestPictureInPicture`)** — [media/fullscreen-api]
   - Setup: video reproduciendo.
   - Acción: click en el botón PiP; salir con el botón nativo o `document.exitPictureInPicture()`.
    - Assertion: si el navegador soporta PiP, la ventana flotante aparece y el botón cambia a "Exit PiP"; al salir, el foco vuelve al botón original; el evento `enterpictureinpicture`/`leavepictureinpicture` se emite y se loguea.
   - Cobertura: PiP API, foco.

6. **Fullscreen API con foco y escape** — [media/fullscreen-api]
   - Setup: click "Fullscreen".
   - Acción: tabular dentro del fullscreen, presionar `Escape`.
   - Assertion: `element.requestFullscreen()` se invoca; el foco queda atrapado dentro del contenedor; `Escape` sale y devuelve foco al botón; los controles se ocultan tras 3 s de inactividad (cursor-based).
   - Cobertura: Fullscreen API, focus management.

7. **Calidad adaptativa (`<source>` con `type="video/mp4; codecs=..."`)** — [media/streaming]
   - Setup: múltiples `<source>` (480p, 720p, 1080p) en el `<video>`.
   - Acción: cambiar de fuente desde un menú "Quality".
   - Assertion: la fuente cambia sin recargar; `currentTime` se preserva dentro de ±0.5 s; el evento `loadedmetadata` se emite de nuevo; el ancho del video se ajusta al contenedor (responsive).
   - Cobertura: source switching, ABR manual.

8. **Estado de error de carga (`MEDIA_ERR_*`)** — [media/error-state]
   - Setup: `src="broken.mp4"` (404) o códec no soportado.
   - Acción: cargar el demo.
   - Assertion: aparece una UI de error con icono y mensaje "Video failed to load"; `Retry` recarga la fuente; `video.error.code` se loguea en la consola con detalles; `aria-live="assertive"` anuncia el error.
   - Cobertura: MediaError, recovery.

9. **Almacenamiento de la posición de reproducción en `localStorage`** — [media/browser-storage]
   - Setup: reproducir 60 s de un video de 5 minutos.
   - Acción: cerrar la pestaña; reabrir minutos después.
   - Assertion: al cargar, el video reanuda en el timestamp guardado (con un margen de ±2 s); un toast ofrece "Resume from 01:00"; la key es `is-webcomponents:video:resume:<src>`; si el video ya terminó, no se restaura.
   - Cobertura: resume UX, storage key.

10. **Picture-in-Picture + Multi-tab (warning de audio)** — [interaction/audio]
    - Setup: dos pestañas con el mismo video, una en PiP, otra normal.
    - Acción: reproducir ambas.
    - Assertion: la segunda pestaña detecta la primera vía `MediaSession` y silencia automáticamente con un toast "Muted because another tab is playing"; al pausar la otra, recupera el audio.
    - Cobertura: media session, multi-tab.

11. **Velocidad de reproducción (0.5x → 2x)** — [interaction/playback-rate]
    - Setup: video reproduciendo.
    - Acción: seleccionar velocidad 1.5x, 0.5x, 2x.
    - Assertion: `video.playbackRate` cambia; el tono se preserva con `preservesPitch` (true); los subtítulos permanecen sincronizados; el cambio se anuncia vía `aria-live="polite"`.
    - Cobertura: playbackRate, pitch preservation.

12. **Buffering state visible (spinner + texto)** — [visual/loading]
    - Setup: throttling "Slow 3G" en Network.
    - Acción: reproducir el video y observar.
    - Assertion: cuando `video.readyState < 3`, aparece un spinner centrado y texto "Buffering…"; el spinner lleva `aria-live="polite"`; al llegar a `readyState >= 3`, desaparece.
    - Cobertura: buffering UX, readyState transitions.

13. **Bloqueo por DRM / `EncryptedMediaError`** — [media/error-state]
    - Setup: video con `type="application/vnd.apple.mpegurl"` o Widevine.
    - Acción: intentar reproducir sin licencia.
    - Assertion: el demo detecta `EncryptedMediaError` y muestra un mensaje claro "Protected content, DRM not available"; ofrece fallback a una versión sin DRM si existe.
    - Cobertura: DRM handling, graceful degradation.

---

### demo: video-playlist

#### Tests existentes (resumen, brevísimo)
- Lista de videos que se reproducen secuencialmente.
- Botón "Next/Previous" para saltar entre items.

#### Propuestas nuevas

1. **Auto-advance al siguiente video al terminar** — [media/autoplay]
   - Setup: playlist de 3 videos, autoplay habilitado.
   - Acción: dejar que el primer video termine.
   - Assertion: tras el evento `ended`, el siguiente video carga y comienza a reproducir en <500 ms; el `currentIndex` se actualiza; la UI destaca el item activo con `aria-current="true"`.
   - Cobertura: auto-advance, state sync.

2. **Reproducción aleatoria (shuffle) sin repetir** — [interaction/shuffle]
   - Setup: playlist de 10 videos.
   - Acción: activar shuffle y dejar que se reproduzcan 10 videos.
   - Assertion: cada video aparece exactamente una vez por ciclo; el algoritmo es Fisher-Yates; la UI muestra un icono shuffle con `aria-pressed="true"`; el orden generado es diferente en cada activación.
   - Cobertura: shuffle correctness, repetitions.

3. **Repetir uno / Repetir todo (repeat modes)** — [interaction/loop]
   - Setup: playlist de 3 videos.
   - Acción: cambiar entre Repeat Off → Repeat All → Repeat One.
   - Assertion: el modo Repeat All cicla indefinidamente; Repeat One reinicia el video actual al `ended`; los iconos cambian y `aria-label` describe el modo actual; el cambio se persiste en `localStorage`.
   - Cobertura: loop modes, persistence.

4. **Drag & drop para reordenar la playlist** — [interaction/dnd]
   - Setup: lista de 5 videos renderizada con handles de arrastre.
   - Acción: arrastrar el item 3 al primer puesto.
   - Assertion: el orden visual y el modelo interno se actualizan; se emite evento `reorder` con índices old/new; las teclas `Alt+ArrowUp/Down` reordenan sin drag (a11y); `aria-live` anuncia el nuevo orden.
   - Cobertura: DnD accesible, keyboard reorder.

5. **Persistencia de la cola en `IndexedDB`** — [media/browser-storage]
   - Setup: agregar 3 videos personalizados a la cola y recargar.
   - Acción: cerrar y reabrir el navegador.
   - Assertion: la cola persiste con metadatos (título, duración, src, thumbnail); si IndexedDB no está disponible, fallback a `localStorage` con warning; la cuota se gestiona borrando los items más viejos.
   - Cobertura: cola persistente, fallback storage.

6. **Carga lazy de miniaturas (IntersectionObserver)** — [media/file-loading]
   - Setup: playlist de 100 items.
   - Acción: hacer scroll lento hasta el final.
   - Assertion: solo las miniaturas visibles (con margen 200 px) se descargan; cada thumbnail carga con `loading="lazy"` o `IntersectionObserver`; el placeholder es un skeleton con dimensiones fijas (CLS = 0).
   - Cobertura: lazy loading, performance.

7. **Errores individuales (un video falla, la playlist continúa)** — [media/error-state]
   - Setup: playlist donde el video 2 de 5 es inaccesible (404).
   - Acción: reproducir secuencialmente.
   - Assertion: al fallar el video 2, la UI muestra error inline para ese item pero la playlist continúa con el 3; el item se marca con icono ⚠️ y `aria-label="Failed"`; el usuario puede "Skip" o "Retry" ese item.
   - Cobertura: error resilience, skip-on-error.

8. **Atajos de teclado (j/k/l, m, f, arrow next/prev)** — [keyboard]
   - Setup: focus en el player.
   - Acción: `k` pausa/reanuda, `j` retrocede 10 s, `l` adelanta 10 s, `m` mute, `f` fullscreen, `n` next, `p` previous.
   - Assertion: cada atajo funciona sin necesidad de clic previo; `?` abre overlay de ayuda con la lista; los atajos están deshabilitados cuando el foco está en un input de la playlist.
   - Cobertura: media keyboard conventions.

9. **Búsqueda dentro de la playlist con highlighting** — [interaction/search]
   - Setup: input "Search playlist" sobre 50 items.
   - Acción: teclear "ep" para filtrar episodios.
   - Assertion: los items se filtran en <100 ms; los matches se resaltan con `<mark>`; el input expone `role="searchbox"` y `aria-controls="playlist-list"`; si 0 matches, se muestra empty state.
   - Cobertura: search perf, a11y combobox.

10. **Sincronización entre pestañas (BroadcastChannel)** — [media/browser-storage]
    - Setup: misma playlist abierta en 2 pestañas.
    - Acción: cambiar el video en pestaña A.
    - Assertion: la pestaña B refleja el cambio en <200 ms vía `BroadcastChannel`; el `currentIndex` se mantiene sincronizado; no se duplica la reproducción simultánea (opcional: silenciar la inactiva).
    - Cobertura: cross-tab sync, BroadcastChannel.

11. **Volumen y mute persistentes** — [interaction/audio]
    - Setup: subir volumen al 80 %, recargar.
    - Acción: recargar la página.
    - Assertion: el volumen se restaura (con mute si estaba muteado); la key es `is-webcomponents:video-playlist:volume`; los cambios se persisten al cambiar, no en cada frame.
    - Cobertura: volume persistence.

12. **Cola de "Up next" con preview flotante** — [interaction/peek]
    - Setup: hover sobre el botón "Up next" (icono de la esquina).
    - Acción: pasar el cursor 500 ms.
    - Assertion: aparece un popover con los próximos 3 videos y sus miniaturas; `role="tooltip"` y `aria-describedby`; el popover se cierra al `Escape` o al salir con `mouseleave` con delay 300 ms.
    - Cobertura: peek UI, tooltip pattern.

13. **Accesibilidad del listado (lista virtual con roles correctos)** — [a11y/list]
    - Setup: playlist de 50 items en virtual scroll.
    - Acción: navegar con `Tab`, flechas y lector de pantalla.
    - Assertion: el contenedor es `role="listbox"` (o `role="list"` con `role="option"` si aplica); el item activo tiene `aria-selected="true"`; las flechas mueven la selección; `aria-setsize` y `aria-posinset` están presentes.
    - Cobertura: ARIA listbox pattern, virtual scroll a11y.

14. **Modo picture-in-picture automático al cambiar de pestaña** — [media/fullscreen-api]
    - Setup: playlist reproduciendo.
    - Acción: cambiar a otra pestaña del navegador.
    - Assertion: al perder visibilidad (`document.visibilityState === 'hidden'`), el video entra automáticamente en PiP si la API está disponible y el usuario lo permitió; al volver a la pestaña, sale de PiP y restaura el foco.
    - Cobertura: visibility API, PiP auto, permisos.

---

## Resumen de cobertura

- **5 demos auditadas**: icon, icon-explorer, image-editor, video, video-playlist.
- **Propuestas totales**: 13 (icon) + 13 (icon-explorer) + 13 (image-editor) + 13 (video) + 14 (video-playlist) = **66 propuestas**.
- **Categorías media cubiertas**:
  - `file-loading` (lazy, sprite, streaming, thumbnails, drag&drop)
  - `error-state` (404, MIME, DRM, tainted canvas, autoplay bloqueado)
  - `scrubbing` (teclado, frame preview, time formatting)
  - `autoplay` (auto-advance, política del navegador)
  - `captions` (WebVTT, multi-track, menú CC)
  - `fullscreen-api` (Fullscreen, PiP, visibility)
  - `keyboard` (j/k/l, atajos, focus trap, navegación virtual)
  - `browser-storage` (localStorage, IndexedDB, Cache API, BroadcastChannel)