# F0.3 — Propuestas UX/UI exhaustivas · diagrams

> Categoría: **diagrams** · 4 demos · ≥12 propuestas por demo · foco: zoom, pan, select, drag, export, animation, large graph.
> Proyecto: is-webcomponents (Web Components vanilla TS, Shadow DOM, tokens `--is-*`).

---

### demo: diagram-lightbox
#### Tests existentes (resumen, brevísimo)
- Smoke de carga, click en thumbnails, apertura/cierre del overlay.
#### Propuestas nuevas

1. **Zoom in/out con botones dedicados** — [zoom]
   - Setup: renderizar la preview con un diagrama de ≥3 niveles de detalle; localizar los botones "+" y "−".
   - Acción: click sucesivo en "+" 4 veces, luego en "−" 2 veces.
   - Assertion: el `transform: scale()` del contenedor interno incrementa/decrementa en pasos discretos (p. ej. 1.0 → 1.25 → 1.5 → 1.75 → 2.0); se emite un evento `is-diagram-zoom-change` con el factor; el botón "−" queda deshabilitado al alcanzar el `zoomMin`.
   - Cobertura: branch `zoomMin` y `zoomMax`, event payload, atributo `aria-valuenow` si hay slider asociado.

2. **Zoom con rueda del mouse centrado en cursor** — [zoom / pan]
   - Setup: cargar el diagrama en la lightbox; obtener coordenadas del viewport interno y posición de un nodo.
   - Acción: posicionar el cursor sobre el nodo y girar la rueda 3 clics hacia arriba; luego 2 clics hacia abajo.
   - Assertion: el factor de zoom cambia y el punto bajo el cursor permanece visualmente fijo (no se desplaza el lienzo durante el zoom); se respeta `preventDefault` para no hacer scroll de página.
   - Cobertura: interaction target = contenido del gráfico (no el chrome), inertia, eventual deltaNormalization (líneas vs trackpads).

3. **Pan con drag desde fondo vacío** — [pan]
   - Setup: abrir lightbox; identificar área "vacía" entre nodos.
   - Acción: `mousedown` en zona vacía → `mousemove` +200 px en X, +120 en Y → `mouseup`.
   - Assertion: el contenedor interno se traslada por un `translate(x, y)` igual al delta; ningún nodo se selecciona; los botones de zoom conservan estado.
   - Cobertura: dragThreshold para evitar micro-jitter; touch equivalente (touchstart/touchmove/touchend).

4. **Pan con teclado (flechas) y reset** — [teclado]
   - Setup: foco en el lienzo (tab hasta `role="application"` o contenedor con `tabindex="0"`).
   - Acción: presionar `ArrowRight`, `ArrowDown`, `ArrowLeft`, `ArrowUp` (con Shift cada 3ª vez para pan rápido).
   - Assertion: `translate` se actualiza en pasos discretos (~16/32 px); existe botón "Reset view" que vuelve a `scale=1, translate=0,0`; `aria-keyshortcuts` documenta flechas.
   - Cobertura: pan sin inercia, pan con Shift, foco recuperable.

5. **Fit-to-screen vs 100%** — [zoom]
   - Setup: diagrama grande (>2× viewport).
   - Acción: click en "Fit" tras haber hecho zoom in.
   - Assertion: el `scale` se ajusta para que el bounding box del grafo entre en viewport con margen (p. ej. 8% padding); un botón "100%" restaura a 1:1; transición CSS ≤200 ms.
   - Cobertura: branch de overflow si boundingBox > viewport en un eje.

6. **Selección múltiple con Shift+Click y rectángulo de selección** — [select]
   - Setup: cargar diagrama con ≥8 nodos.
   - Acción: click en nodo A → Shift+click en B y C → mantener Shift y arrastrar sobre zona vacía.
   - Assertion: nodos B y C quedan en `aria-selected="true"`; aparece overlay translúcido (rect de selección) que cubre el área barrida; `data-selected` se aplica a los nodos contenidos.
   - Cobertura: drag deshabilita selección nodo-por-nodo, escape del mouseup fuera del lienzo.

7. **Drag individual de nodo y persistencia visual** — [drag]
   - Setup: foco/hover sobre nodo draggable.
   - Acción: `mousedown` sobre el nodo → `mousemove` +50, +30 → `mouseup`; repetir sobre nodo no-draggable.
   - Assertion: el nodo se reposiciona vía `transform: translate(...)`; emite `is-diagram-node-moved` con `{id, x, y}`; nodo con `data-locked="true"` no se mueve y cursor muestra `not-allowed`.
   - Cobertura: branch locked, undo/redo si existe, colisión con otros nodos (push-out o overlap permitido).

8. **Export a PNG y SVG** — [export]
   - Setup: lightbox abierta con diagrama visible.
   - Acción: click en "Export" → elegir "PNG" → confirmar; repetir eligiendo "SVG".
   - Assertion: descarga un blob `image/png` con dimensiones del bounding box (no del viewport) y DPI ≥144; descarga SVG inline (sin estilos externos) auto-contenido; toast `is-toast` con `role="status"` confirma "Exportado".
   - Cobertura: branch de nodos fuera del viewport, fondo transparente vs con fondo, nombre de archivo derivado del título.

9. **Export a JSON del modelo** — [export]
   - Setup: tener ≥1 nodo seleccionado y al menos 1 arista modificada.
   - Acción: menú export → "JSON".
   - Assertion: descarga un `.json` cuyo shape coincide con `nodes[]` + `edges[]`, conservando ids, posiciones nuevas y `selected: true`; archivo re-importable sin warnings.
   - Cobertura: round-trip integrity, UTF-8, pretty-print.

10. **Atajos de teclado documentados y bloqueados durante edición** — [teclado]
    - Setup: foco en canvas; foco alterno en `<input>` de búsqueda.
    - Acción: con foco en canvas, pulsar `+`, `−`, `0` (reset), `F` (fit), `Ctrl+E` (export); luego mover foco al input y repetir.
    - Assertion: canvas responde a atajos; input NO los captura (no escribe "+" en el campo); tooltip o `aria-keyshortcuts` lista todos.
    - Cobertura: stopPropagation en handlers, preventDefault correcto, IME no rompe shortcuts.

11. **Animación de entrada/salida y respeto a prefers-reduced-motion** — [animación]
    - Setup: con DevTools emulando `prefers-reduced-motion: reduce` (y sin emular, en dos runs).
    - Acción: abrir/cerrar la lightbox 2 veces; hacer zoom in/out con botones.
    - Assertion: con `reduce`, las transiciones CSS se acortan a `0.01ms` o se eliminan; sin `reduce`, hay `transition: transform 180ms ease-out`; sin parpadeo ni reflows visibles en el contenido.
    - Cobertura: branch media query, animación de selección, animación de aparición de nodos.

12. **Lightbox con grafo muy grande (perf y virtualización)** — [large graph]
    - Setup: cargar demo con dataset de ≥500 nodos y ≥1000 aristas.
    - Acción: medir FPS durante pan de 2 s y zoom sucesivo; verificar que solo se renderizan los nodos en viewport (`<svg>` con `visibility` o DOM recycling).
    - Assertion: FPS ≥45 en pan continuo; DOM node count estable (no crece con el dataset); el botón "Fit" resuelve en <300 ms; memoria no crece tras 5 ciclos pan/zoom.
    - Cobertura: virtualization, layer de nodos vs aristas, hit-testing.

13. **Navegación accesible con landmarks y focus trap** — [a11y]
    - Setup: abrir lightbox; tabular.
    - Acción: `Tab` recorre close, prev/next, zoom-in/out, fit, export, reset; `Shift+Tab` regresa; `Escape` cierra y devuelve foco al disparador original.
    - Assertion: focus-trap dentro del diálogo (`role="dialog"`, `aria-modal="true"`); primer foco al abrir = botón de cerrar o primer control lógico; `aria-label="Cerrar diagrama"` en X; `aria-describedby` enlaza al título.
    - Cobertura: focus restoration, screen reader anuncia título y dimensiones.

14. **Hover y tooltips por nodo con retardo accesible** — [hover / a11y]
    - Setup: pasar el puntero sobre un nodo.
    - Acción: hover 800 ms; luego mover fuera 200 ms y volver.
    - Assertion: aparece tooltip con `role="tooltip"` mostrando id + descripción; aparece en ≤150 ms; se oculta al salir o al hacer focus out; teclado (`Focus` + `Enter`) muestra tooltip sin hover; sin tooltip persistente durante drag.
    - Cobertura: timing, hover-vs-touch (long-press), truncado en bordes del viewport.

15. **Modo oscuro/claro y contraste WCAG** — [visual]
    - Setup: alternar tema desde el toggle global; cargar diagrama con aristas de 1 px.
    - Acción: cambiar tema 3 veces; hacer zoom al 200%.
    - Assertion: tokens `--is-color-fg`, `--is-color-bg` se actualizan en el Shadow DOM; contraste texto/fondo ≥4.5:1 (medido); aristas siguen visibles (no desaparecen) y leyenda mantiene contraste ≥3:1.
    - Cobertura: branch dark, fuerza de selección, foco visible en ambos temas.

---

### demo: lightbox
#### Tests existentes (resumen, brevísimo)
- Apertura por click en thumbnails, navegación prev/next, cierre con X y Escape.
#### Propuestas nuevas

1. **Navegación con teclado entre imágenes** — [teclado]
   - Setup: abrir lightbox con ≥3 elementos en la galería.
   - Acción: presionar `ArrowRight`, `ArrowLeft`, `Home`, `End`.
   - Assertion: índice activo avanza/retrocede; `Home` salta al primero, `End` al último; `aria-current="true"` en el item visible; foco se mantiene en el viewer, no salta al fondo.
   - Cobertura: wrap-around opcional, throttling al mantener flecha, focus management.

2. **Zoom con pellizco (touch) y doble-click** — [zoom]
   - Setup: emular dispositivo táctil; abrir imagen grande.
   - Acción: `dblclick` sobre la imagen; zoom-in por touchstart + 2 dedos + touchmove (pinch out) + touchend.
   - Assertion: `dblclick` alterna 1× ↔ 2× (toggle); pinch incrementa factor proporcional; al separar los dedos se detiene el zoom; sin scroll de página accidental.
   - Cobertura: branch max-zoom, zoom-out al colisionar dedos (pinch in).

3. **Pan dentro de imagen zoomed** — [pan]
   - Setup: hacer zoom a 3× sobre una imagen más grande que el viewport.
   - Acción: arrastrar con mouse y con 1 dedo; luego arrastrar fuera de la imagen.
   - Assertion: la imagen se traslada dentro de los límites (no se puede "perder" la imagen); al soltar fuera, no se cierra el lightbox; sin scroll horizontal de página.
   - Cobertura: bounds checking, momentum opcional.

4. **Caption y metadatos accesibles** — [a11y]
   - Setup: imagen con caption, autor y licencia.
   - Acción: tabular y leer caption con lector (axe/Landmark audit).
   - Assertion: el caption se expone en `aria-labelledby` o `figcaption` enlazado al viewer; autor y licencia tienen `aria-describedby`; no se duplica el texto como `aria-label` redundante.
   - Cobertura: contenido largo con scroll interno si excede altura.

5. **Carga lazy y estado loading** — [estado]
   - Setup: imagen de ≥2 MB; activar throttling "Slow 3G".
   - Acción: abrir lightbox; observar spinner/skeleton.
   - Assertion: aparece placeholder con `role="status" aria-live="polite"` "Cargando…"; al completar, se reemplaza sin parpadeo; botón cerrar deshabilitado durante carga inicial (no durante zoom).
   - Cobertura: error de red → muestra fallback con `role="alert"` "No se pudo cargar"; botón "Reintentar".

6. **Cierre por click en backdrop, Escape y Swipe-down (móvil)** — [interacción]
   - Setup: lightbox abierta.
   - Acción: click en backdrop; `Escape`; en móvil, swipe-down >120 px.
   - Assertion: las 3 acciones cierran el lightbox; click en la imagen NO cierra; swipe-up insuficiente (<60 px) no cierra; el foco regresa al disparador original tras cualquier cierre.
   - Cobertura: threshold, hit-testing del backdrop.

7. **Soporte de vídeo/gif con play/pause accesible** — [interacción]
   - Setup: galería con al menos 1 vídeo.
   - Acción: navegar al vídeo; `Space` y `K` para play/pausa; `M` mute; `F` fullscreen.
   - Assertion: `<video>` con `controls` o botones personalizados con `aria-pressed`; teclas funcionan con foco en contenedor; no auto-play con sonido.
   - Cobertura: branch muted, captions (`<track>`), error de codec.

8. **Export del elemento visible** — [export]
   - Setup: abrir imagen/vídeo.
   - Acción: click en "Descargar"; en vídeo, "Guardar frame actual".
   - Assertion: descarga blob con nombre `lightbox-N-{index}.{ext}`; para vídeo, descarga un PNG del frame en el `currentTime` mostrado.
   - Cobertura: CORS, formatos alternativos (webp, avif), tamaño máximo.

9. **Atajos globales documentados en `aria-keyshortcuts`** — [teclado / a11y]
   - Setup: foco en el viewer.
   - Acción: probar `+`, `−`, `0`, `f`, `c` (caption toggle), `?` (mostrar ayuda).
   - Assertion: cada atajo se anuncia vía tooltip y `aria-keyshortcuts`; pulsar `?` muestra overlay con la lista; al pulsar fuera o `Escape`, se cierra.
   - Cobertura: discoverability, i18n.

10. **Historial y deep-link por índice** — [interacción]
    - Setup: galería con ≥10 items.
    - Acción: navegar al item 5; copiar URL; recargar; abrir lightbox directo por URL.
    - Assertion: la URL contiene `?lightbox=5` o `#i=5`; al abrir directo, el lightbox arranca en ese índice con `aria-current` correcto; reemplazar historial (pushState) sin saturar `back`.
    - Cobertura: deep-link, history.back restaura galería al estado previo.

11. **Animación de transición entre slides (sin `prefers-reduced-motion`)** — [animación]
    - Setup: alternar `prefers-reduced-motion`.
    - Acción: navegar prev/next rápidamente 5 veces.
    - Assertion: con motion, transición ≤240 ms ease-out; con `reduce`, transición instantánea; cola de animaciones no se solapa; la imagen saliente queda oculta a `aria-hidden="true"` durante transición.
    - Cobertura: accessibility tree estable, sin traps.

12. **Lightbox en contenedor con scroll y `position: fixed` correcto** — [visual / edge]
    - Setup: abrir lightbox desde una página con scroll largo y `<dialog>` anidados.
    - Acción: scroll de página subyacente; abrir lightbox desde dentro de otro modal.
    - Assertion: el body queda con `overflow: hidden` solo mientras el lightbox está abierto; el lightbox soporta nesting (z-index superior, focus-trap aislado); al cerrar ambos, scroll se restaura a posición previa.
    - Cobertura: scroll-lock, modal stacking, focus restoration anidada.

13. **Estado vacío y single-item** — [edge]
    - Setup: galería con 0 elementos; galería con 1 elemento.
    - Acción: abrir lightbox.
    - Assertion: con 0 items, el disparador está deshabilitado con `aria-disabled="true"` y mensaje "Sin elementos"; con 1 item, los botones prev/next están ocultos o `disabled` con `aria-label="Sin más elementos"`.
    - Cobertura: branch empty, branch single, sin flicker.

14. **Soporte de imágenes con orientación EXIF y colores `color-profile`** — [visual]
    - Setup: imagen con EXIF rotación 90°.
    - Acción: abrir y comparar con visor nativo.
    - Assertion: la imagen se renderiza orientada correctamente; el `color-profile` (sRGB/Display P3) se respeta sin tonos lavados; el `<canvas>` para export usa el mismo perfil.
    - Cobertura: branch EXIF, fallback a sRGB.

---

### demo: org-chart
#### Tests existentes (resumen, brevísimo)
- Render del árbol con padres/hijos, expand/collapse por nodo, hover con tooltip.
#### Propuestas nuevas

1. **Expand/collapse por chevron y por click en nodo** — [interacción]
   - Setup: chart con raíz y ≥3 niveles, cada nivel con ≥2 hijos.
   - Acción: click en chevron de un nodo con hijos; click en el cuerpo del nodo (no chevron); doble-click en nodo.
   - Assertion: click en chevron alterna `aria-expanded` y muestra/oculta hijos con animación; click en cuerpo abre panel detalle (no colapsa); doble-click colapsa/expande según estado actual; nodo sin hijos no muestra chevron.
   - Cobertura: branch con hijos vs sin hijos, event bubbling detenido donde corresponde.

2. **Búsqueda con highlight y navegación al resultado** — [interacción]
   - Setup: chart con ≥50 personas, campo de búsqueda con `aria-label="Buscar persona"`.
   - Acción: teclear "mar"; pulsar `Enter`; pulsar `Enter` otra vez; `Shift+Enter`.
   - Assertion: los nodos coincidentes muestran `mark` interno o clase `is-highlighted`; el chart hace scroll/zoom para centrar el resultado activo; `aria-activedescendant` apunta al nodo actual; Shift+Enter navega al anterior.
    - Cobertura: diacríticos, búsqueda por id, debounce de 150 ms.

3. **Selección con single-click y multi-selección con Ctrl/Meta** — [select]
   - Setup: chart con ≥5 nodos hermanos.
   - Acción: click en A → Ctrl+click en B → Ctrl+Shift+click en C → click en fondo.
   - Assertion: A queda `aria-selected="true"`; B y C también; click en fondo limpia selección; emitir evento `is-org-selection-change` con lista de ids; nodos no-draggables pueden seleccionarse igual.
    - Cobertura: branch meta vs ctrl (Mac vs Win/Linux), shift-range (de A a C连续的).

4. **Drag & drop para reasignar jerarquía** — [drag]
   - Setup: foco en nodo A (no bloqueado); target B en otra rama.
   - Acción: arrastrar A sobre B; soltar; intentar arrastrar A sobre su propio descendiente.
   - Assertion: al entrar en B, aparece overlay `aria-dropeffect="move"`; al soltar, A pasa a ser hijo de B (cambio de `parentId`); soltar sobre descendiente se rechaza con shake visual y `aria-live="assertive" "Movimiento no permitido"`; si B está bloqueado, cursor `not-allowed`.
    - Cobertura: cycle prevention, undo (Ctrl+Z), persistencia JSON.

5. **Zoom y pan del árbol completo (wheel + drag)** — [zoom / pan]
   - Setup: chart con ≥100 nodos.
   - Acción: rueda hacia arriba; rueda hacia abajo con Ctrl; drag con botón medio (o Space+drag) para pan.
   - Assertion: zoom respeta `zoomMin/zoomMax`; Ctrl+wheel hace zoom (sin Ctrl = scroll de página, no); pan con Space+drag mueve `translate`; existe botón "Reset" que devuelve a estado inicial con animación ≤200 ms.
    - Cobertura: branch min-zoom (fit-to-screen), sensibilidad por trackpad vs mouse.

6. **Export a PNG, SVG y PDF (A4/Letter)** — [export]
   - Setup: chart renderizado.
   - Acción: menú export → PNG, SVG, PDF (vertical/horizontal).
   - Assertion: PNG/SVG incluye todos los nodos expandidos (no solo el viewport); PDF respeta `page-size`, `orientation` y `margin`; tipografía embebida; el archivo PDF abre sin warnings en visor estándar.
    - Cobertura: paginación cuando el árbol excede 1 página, header/footer opcional.

7. **Animación de entrada escalonada y respeto a reduced-motion** — [animación]
   - Setup: alternar `prefers-reduced-motion`.
   - Acción: recargar chart con 30+ nodos.
   - Assertion: con motion, nodos aparecen con stagger ≤30 ms en grupos por nivel; con `reduce`, aparecen todos a la vez; las líneas no se animan de forma prolongada; nada "salta" al final.
    - Cobertura: branch reduce, performance con árbol grande.

8. **Jerarquías con muchos hijos (10+) y virtualización** — [large graph]
   - Setup: nodo con 25 hijos directos.
   - Acción: expandir y medir FPS mientras se hace pan vertical.
   - Assertion: se aplica virtualización o paginación (paginación "Mostrando 1-20, siguiente ▸"); sin lag perceptible; `aria-rowcount` expone el total real.
    - Cobertura: branch overflow, scroll interno del nodo contenedor.

9. **Atajos de teclado: flechas, Enter, Esc, Ctrl+F, Ctrl+E** — [teclado]
   - Setup: foco en chart.
   - Acción: `ArrowDown/Up` mueve selección entre hijos; `ArrowRight/Left` expande/colapsa; `Enter` abre detalle; `Ctrl+F` enfoca búsqueda; `Ctrl+E` abre export; `Escape` cierra paneles.
   - Assertion: navegación coherente con la jerarquía; cada atajo documentado en `aria-keyshortcuts` y/o ayuda `?`; sin disparar atajo al escribir en `<input>`.
    - Cobertura: focus delegation, IME.

10. **Modo "solo lectura" vs "editable"** — [estado]
    - Setup: alternar atributo `data-readonly` o propiedad.
    - Acción: intentar drag, intentar editar nombre, intentar eliminar.
    - Assertion: en readonly, drag está deshabilitado (`aria-disabled="true"`), no hay botón de eliminar, click en nodo abre panel en modo vista; banner "Solo lectura" con `role="status"` aparece si se intenta una acción prohibida.
     - Cobertura: branch readonly, atajos bloqueados, export sigue permitido.

11. **Contraste y patrones para nodos críticos vs OK** — [a11y / visual]
    - Setup: nodos con `status: critical|warning|ok`.
    - Acción: revisar estilos en tema dark/light.
    - Assertion: los patrones no dependen solo del color (icono + borde + color); texto crítico con contraste ≥4.5:1; tokens `--is-color-critical`, etc. se exponen vía custom property y se pueden sobreescribir.
     - Cobertura: daltonismo, alto contraste Windows.

12. **Estado de error: datos corruptos o nodo raíz ausente** — [edge]
    - Setup: inyectar JSON con `parentId` huérfano y nodo raíz duplicado.
    - Acción: cargar chart.
    - Assertion: la app muestra banner `role="alert"` con mensaje legible y acción "Reportar"; el chart renderiza lo que pueda sin crashear; consola no emite errores no manejados.
     - Cobertura: validación runtime, fallback a estado vacío.

13. **Persistencia local (localStorage) y reset** — [estado]
    - Setup: colapsar/expandir varios nodos, mover uno.
    - Acción: recargar; abrir menú "Restablecer".
    - Assertion: tras recarga, posiciones colapsadas se mantienen; "Restablecer" limpia storage y vuelve al estado inicial con confirmación `is-confirm-dialog`.
     - Cobertura: storage quota, versionado de schema.

14. **Internacionalización y dirección RTL** — [a11y]
    - Setup: cambiar `dir="rtl"` y locale `ar`/`he`.
    - Acción: recargar chart.
    - Assertion: el layout se espeja horizontalmente; flechas de teclado intercambian sentido lógico; tipografía usa fallback adecuado para caracteres no latinos; traducciones de labels y atajos cargadas.
     - Cobertura: branch rtl, truncation en idiomas largos.

---

### demo: sequence-diagram
#### Tests existentes (resumen, brevísimo)
- Render de actores en columnas, mensajes con flechas, auto-layout vertical.
#### Propuestas nuevas

1. **Hover sobre mensaje muestra tooltip con metadatos** — [hover]
   - Setup: diagrama con ≥6 mensajes, incluido un mensaje "async" y un "self".
   - Acción: hover sobre cada tipo 500 ms; focus con teclado.
   - Assertion: tooltip con `role="tooltip"` indica `from`, `to`, `label`, `type: sync|async|return|self`; aparece en ≤150 ms; se oculta al perder hover/focus y al iniciar drag.
   - Cobertura: timeout de tooltip, truncado en bordes, touch long-press equivalente.

2. **Activadores/grupos `alt`, `loop`, `par`, `opt` expandibles** — [interacción]
   - Setup: diagrama con bloques `alt` y `loop` de al menos 2 ramas.
   - Acción: click en el chevron del bloque; `Enter` con foco en él; `Space`; `ArrowRight/Left`.
   - Assertion: bloque alterna `aria-expanded`; ramas se ocultan/muestran con animación ≤200 ms; auto-layout reacomoda mensajes siguientes respetando el `gap`; `aria-controls` apunta al contenedor de mensajes.
   - Cobertura: branch vacías, branch con 1 sola rama, estado colapsado inicial.

3. **Mensajes "self" (auto-llamada) con render correcto** — [visual]
   - Setup: incluir 2 self-messages en actores diferentes.
   - Acción: renderizar y comparar con spec.
   - Assertion: la flecha curva cierra sobre el mismo actor sin solapar mensajes adyacentes; el label se posiciona dentro del lazo sin colisión; con `reduce-motion`, no hay animación de trazado.
   - Cobertura: branch self, mensajes consecutivos, separación mínima.

4. **Selección de mensaje individual y rango Shift+Click** — [select]
   - Setup: ≥10 mensajes en orden.
   - Acción: click en mensaje 3; Shift+click en 7; Ctrl+click en 1 (no contiguo).
   - Assertion: mensajes seleccionados muestran `aria-selected="true"` con borde; emitir `is-seq-selection-change` con `{ids: []}`; rango Shift respeta orden cronológico; las notas (`note over`) son seleccionables igual.
   - Cobertura: branch range, branch notes, limpiar selección con Escape.

5. **Drag de mensajes para reordenar (cuando editable)** — [drag]
   - Setup: atributo `editable="true"`; ≥3 mensajes entre A→B.
   - Acción: arrastrar mensaje del medio arriba del primero; soltar; intentar arrastrar un self-message.
   - Assertion: el orden se actualiza; auto-layout reacomoda; los self-messages mantienen su actor; `aria-live` anuncia "Mensaje movido"; undo con `Ctrl+Z`.
   - Cobertura: branch readonly (no drag), branch self no-draggable.

6. **Zoom con rueda y paneo con Space+drag** — [zoom / pan]
   - Setup: diagrama > viewport verticalmente.
   - Acción: rueda para zoom; Space+drag para pan; `0` reset; `F` fit.
   - Assertion: factor de zoom cambia con `transform: scale()`; pan mueve `translate` solo cuando hay un nodo foco en Space; reset vuelve a 1,0; fit acomoda todo el contenido con margen 8%.
   - Cobertura: límites, sensibilidad de trackpad, IME-safe.

7. **Export a PNG, SVG, PlantUML y Mermaid** — [export]
   - Setup: diagrama cargado.
   - Acción: menú export → cada formato.
   - Assertion: PNG/SVG con dimensiones del bounding box completo; PlantUML generado y reimportable en plantuml.com; Mermaid con sintaxis `sequenceDiagram` válida y pasa por su parser sin warnings; nombre de archivo usa slug del título.
   - Cobertura: round-trip, caracteres especiales escapados.

8. **Animación de trazo de flechas y respeto a reduced-motion** — [animación]
   - Setup: alternar `prefers-reduced-motion`.
   - Acción: cargar y observar aparición de mensajes.
   - Assertion: con motion, flechas se trazan con `stroke-dasharray` ≤400 ms; con `reduce`, aparecen instantáneamente; `aria-busy` no queda `true` más de 500 ms.
   - Cobertura: branch reduce, animación de highlight en hover, sin parpadeo.

9. **Diagramas muy largos (perf y lazy render)** — [large graph]
   - Setup: diagrama con ≥80 mensajes y ≥10 actores.
   - Acción: scroll vertical; medir FPS; colapsar/expandir bloques.
   - Assertion: FPS ≥45 en scroll; DOM no crece más allá de ~1.5× viewport (virtualización o paginación); búsqueda "Ctrl+F" salta al mensaje con `aria-live="polite" "Mensaje N de M"`.
   - Cobertura: branch overflow, scroll-into-view de resultado.

10. **Accesibilidad del orden de lectura y roles ARIA** — [a11y]
    - Setup: lector de pantalla; diagrama con 3 actores y notas.
    - Acción: navegar con lector linealmente.
    - Assertion: el contenedor expone `role="img"` con `aria-label` resumen; los mensajes individuales son accesibles vía `role="listitem"`; las notas como `role="note"`; los actores como `role="rowheader"`; no se depende solo del color para distinguir sync/async (icono + etiqueta).
    - Cobertura: árbol accesible estable, foco secuencial.

11. **Notas (`note left/right/over`) y posicionamiento accesible** — [visual]
    - Setup: diagrama con notas `note left of A`, `note right of B`, `note over A,B`.
    - Acción: alternar tema dark/light.
    - Assertion: las notas no se solapan con mensajes; en tema dark, fondo de nota tiene contraste ≥3:1; en RTL, las notas espejan su lado; tooltip de hover muestra autor si existe.
    - Cobertura: branch overlap, branch over-multi-actor.

12. **Validación de sintaxis al pegar/cargar** — [edge]
    - Setup: pegar texto inválido (sin `:`, con actores duplicados).
    - Acción: click en "Cargar texto"; abrir modal de input.
    - Assertion: aparece `role="alert"` con el primer error y línea; los inputs con error tienen `aria-invalid="true"` y `aria-describedby` apuntando al mensaje; botón "Cargar" deshabilitado hasta sintaxis válida.
    - Cobertura: branch parser-ok, branch parser-error, recuperación.

13. **Estado vacío y diagrama sin mensajes** — [edge]
    - Setup: cargar definición con solo actores y sin mensajes.
    - Acción: observar render.
    - Assertion: el diagrama muestra los actores en sus columnas con `aria-label` por actor; placeholder "Aún no hay mensajes" con `role="status"`; export produce archivo válido (sin secciones vacías que rompan parsers).
    - Cobertura: branch empty, branch solo-actors.

14. **Atajos específicos: `Ctrl+Enter` envía en editor, `Ctrl+S` guarda** — [teclado]
    - Setup: foco en el editor de texto del demo.
    - Acción: escribir texto válido; `Ctrl+Enter` parsea; `Ctrl+S` guarda en localStorage; `Ctrl+/` comenta línea.
    - Assertion: cada atajo funciona y se documenta; en modo read-only los atajos de edición están deshabilitados; al pulsar atajo fuera del editor no dispara acciones.
    - Cobertura: branch readonly, IME-safe.

15. **Soporte de múltiples actores con mismo nombre y resolución de ambigüedad** — [edge]
    - Setup: definición con `actor User` duplicado por error.
    - Acción: cargar.
    - Assertion: el parser normaliza o avisa con `role="alert" "Actor duplicado: User"` y propone sufijo `_1`, `_2`; el render no colapsa las columnas por error; export consistente con la normalización.
    - Cobertura: branch dedupe, branch warn-and-continue.

---

## Resumen

- **diagram-lightbox**: 15 propuestas.
- **lightbox**: 14 propuestas.
- **org-chart**: 14 propuestas.
- **sequence-diagram**: 15 propuestas.
- **Total**: **58 propuestas** (≥48 requerido). Cubren: zoom, pan, select, drag, export, animación, large graph, teclado, ARIA, estados y edge cases.