# F0.3 propuesta UX/UI exhaustiva — charts (3 demos: chart, radar-chart, scatter-chart)

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens `--is-*`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Testables del grupo (categoría: charts)

### Demos a auditar (3)
- src/components/charts/chart.preview.ts (behavior)
- src/components/charts/radar-chart.preview.ts (behavior)
- src/components/charts/scatter-chart.preview.ts (behavior)

### JSON de cada demo (estructura + secciones)
- src/components/charts/chart.json (estructura)
- src/components/charts/radar-chart.json (estructura)
- src/components/charts/scatter-chart.json (estructura)

---

### demo: chart
#### Tests existentes (resumen, brevísimo)
- Render básico del SVG/canvas con datos por defecto.
- Cambio de `type` (bar/line) en atributo.
- Verificación de número de elementos `<rect>` o `<path>` por serie.
- Captura de screenshot estable para regresión visual.

#### Propuestas nuevas

1. **Hover sobre un punto/bar de la serie A muestra tooltip con valor exacto y nombre de categoría** — [hover/tooltip]
   - Setup: cargar demo con dataset multi-serie (A, B, C) de 8 puntos.
   - Acción: pasar el mouse sobre el tercer elemento de la serie A; esperar 300 ms.
   - Assertion: aparece `<div role="tooltip">` (o equivalente dentro del Shadow DOM) con texto que contiene el valor numérico (ej. "42.5") y la etiqueta de categoría (ej. "Mar"); el resto del chart permanece visible con opacidad reducida (`< 0.6`) sobre los elementos no hovered.
   - Cobertura: branch de mouseover vs mousemove; formateo numérico localizado (coma vs punto decimal).

2. **Mover el cursor entre dos barras consecutivas actualiza el tooltip sin parpadeo** — [hover/tooltip]
   - Setup: dataset denso (≥12 categorías) en modo bar agrupado.
   - Acción: hover en barra 5, mover a barra 6 sin salir del chart, hover en barra 7.
   - Assertion: solo una instancia de tooltip presente en el DOM en cada momento (no se acumulan); el contenido del texto cambia entre eventos; no hay reflow visible (>0 ms con `getBoundingClientRect` idéntico en chart wrapper).
   - Cobertura: reutilización del nodo tooltip, anti-flicker.

3. **Legend toggle: clic en item de la leyenda oculta/muestra la serie correspondiente** — [legend toggle]
   - Setup: chart con leyenda visible y 3 series.
   - Acción: clic en el segundo swatch/label de la leyenda.
   - Assertion: la serie B desaparece del DOM (o queda con `display:none`); el conteo de `<rect>`/`<path>` visibles decrece; `aria-pressed="true"` o `data-active="false"` en el botón de leyenda; el eje X no se recolapsa (el espacio reservado se mantiene).
   - Cobertura: filtrado de serie, accesibilidad del toggle.

4. **Legend toggle doble: clic dos veces restaura la serie en su posición original** — [legend toggle]
   - Setup: tras ocultar serie B en la propuesta 3.
   - Acción: clic otra vez en el mismo item de leyenda.
   - Assertion: serie B reaparece; los colores coinciden con el orden original (no se reordenan series activas); se emite evento custom `is-chart-legend-change` con detalle `{ series: "B", visible: true }`.
   - Cobertura: idempotencia, reordenamiento.

5. **Hover sobre eje X muestra línea guía vertical y resalta puntos en la intersección** — [axis interaction]
   - Setup: chart line mode con 2 series y eje X temporal (12 meses).
   - Acción: mover mouse a la coordenada X correspondiente a "Jun" sobre el área del plot.
   - Assertion: aparece una línea vertical tenue (`stroke-dasharray`) cruzando todo el plot; los puntos cuya X coincide quedan con `r` aumentado o `stroke-width` mayor; el eje Y muestra el valor exacto en formato tooltip.
   - Cobertura: crosshair, highlight de intersección.

6. **Animación de entrada: al cargar la demo, las barras crecen desde la base** — [animation]
   - Setup: cargar demo con `prefers-reduced-motion: no-preference`.
   - Acción: observar la primera pintura del chart tras mount.
   - Assertion: durante los primeros 600 ms la altura de `<rect>` parte de 0 y se aproxima al valor final; al terminar, los atributos `height`/`y` son estables; no hay `transition` permanente en hover tras finalizar.
   - Cobertura: entrada animada vs estado final estático.

7. **Contraste de color cumple WCAG AA entre series adyacentes** — [color/contrast]
   - Setup: chart con paleta por defecto en tema light.
   - Acción: medir color de fondo del plot (`getComputedStyle`) y color de relleno de cada serie con `getBoundingClientRect` + pixel sample.
   - Assertion: para series A vs B, la diferencia de luminancia relativa es ≥ 1.5 (ratio aproximado AA para UI gráfica no textual); las series no comparten el mismo hue.
   - Cobertura: daltonismo, series adyacentes.

8. **Estado vacío: pasar atributo `data="[]"` o valor vacío renderiza placeholder sin崩溃** — [empty state]
   - Setup: setear atributo/prop `data` a array vacío `[]` en el web component.
   - Acción: cargar demo.
   - Assertion: chart muestra mensaje "Sin datos" centrado (o icono); ejes se renderizan con rango válido (0–1) sin `NaN`; no hay elementos `<rect>`/`<path>`; no hay errores en consola (`pageerror` count = 0).
   - Cobertura: array vacío, NaN guards.

9. **Dataset con valor negativo dibuja barras debajo del eje X** — [data overflow]
   - Setup: datos mixtos con valores `[-50, -10, 5, 30, 80]`.
   - Acción: cargar demo.
   - Assertion: el eje Y incluye valor 0 visible; las barras negativas crecen hacia abajo; las positivas hacia arriba; tooltip al hover muestra el signo negativo correctamente.
   - Cobertura: dominio cruzado por cero.

10. **Overflow horizontal con 200 categorías activa scroll interno y mantiene eje Y fijo** — [data overflow]
    - Setup: dataset con 200 puntos.
    - Acción: cargar demo; intentar scroll horizontal dentro del chart wrapper.
    - Assertion: el contenedor del plot tiene `overflow-x: auto` (o equivalente); el eje Y permanece sticky a la izquierda (`position: sticky` o re-render sin desplazamiento); el tooltip al hover se posiciona relativo al viewport del plot, no de la página.
    - Cobertura: virtualización vs scroll, sticky axis.

11. **Atajo de teclado `Tab` recorre en orden lógico: plot area → leyenda → botones de acción** — [keyboard]
    - Setup: demo cargado, foco al inicio del documento.
    - Acción: presionar `Tab` repetidamente hasta volver al inicio.
    - Assertion: la secuencia de elementos focuseables es: contenedor del chart (con `tabindex="0"`), botones de leyenda (en orden visual), botones de export/reset si existen; cada foco muestra outline visible (`outline-width >= 2px`, no `outline: none`).
    - Cobertura: orden de tabulación, focus ring.

12. **Cambio de tema dark/light repinta series sin re-mount** — [theme]
    - Setup: demo en tema light; togglear `data-theme="dark"` en el `<html>` o atributo del componente.
    - Acción: cambiar el atributo.
    - Assertion: los `fill`/`stroke` de las series se actualizan en el siguiente frame (≤200 ms); el texto del eje Y hereda color de token `--is-color-text`; el fondo del plot pasa de `--is-color-surface-light` a `--is-color-surface-dark`; no hay parpadeo blanco intermedio > 50 ms.
    - Cobertura: CSS variables reactivas, transición suave.

13. **Doble click en una barra abre detalle (drill-down) si el handler está conectado** — [interaction]
    - Setup: dataset con handler `onItemDoubleClick` que registra en consola.
    - Acción: doble click en barra central.
    - Assertion: evento custom `is-chart-item-dblclick` emitido con detalle `{ series, category, value }`; el handler de demo lo loguea; el chart no se reinicia ni pierde el estado de la leyenda.
    - Cobertura: eventos compuestos, doble click.

14. **Error de carga de datos (JSON inválido) muestra estado de error y no rompe la página** — [edge case]
    - Setup: setear prop `data` con string no parseable (`"{invalid"`).
    - Acción: cargar demo.
    - Assertion: chart muestra banner "Error al cargar datos" con `role="alert"`; el resto del shadow DOM no contiene nodos huérfanos; el listener global `error` no se dispara; el botón "Reintentar" si existe queda focuseable.
    - Cobertura: parser resilience.

---

### demo: radar-chart
#### Tests existentes (resumen, brevísimo)
- Render del polígono principal con valores normalizados 0–1.
- Render de los ejes radiales (uno por dimensión/categoría).
- Reactividad a cambio de número de categorías en el dataset.
- Captura visual de regresión con paleta por defecto.

#### Propuestas nuevas

1. **Hover sobre vértice del polígono resalta solo ese vértice y muestra tooltip numérico** — [hover/tooltip]
   - Setup: radar con 6 ejes y 2 series superpuestas.
   - Acción: pasar mouse sobre el cuarto vértice de la serie A (a 45° del norte).
   - Assertion: aparece tooltip con texto que incluye el nombre del eje (ej. "Velocidad") y el valor numérico (ej. "0.78"); el vértice hovered tiene `r` mayor que los demás de su serie; los polígonos no hovered tienen opacidad reducida (~0.3).
   - Cobertura: detección angular, polígonos superpuestos.

2. **Mover el cursor de vértice A1 a vértice A2 actualiza el tooltip sin destruir el polígono** — [hover/tooltip]
   - Setup: tras el hover inicial del test anterior.
   - Acción: mover mouse al siguiente vértice de la misma serie sin salir del área del chart.
   - Assertion: solo un tooltip activo en cualquier instante; el contenido textual cambia; el polígono no parpadea (sus atributos `points` no se reescriben completos, solo el círculo del vértice).
   - Cobertura: actualización incremental de hover.

3. **Legend toggle: ocultar una serie deja visible el grid y ejes radiales** — [legend toggle]
   - Setup: radar con leyenda y 3 series.
   - Acción: clic en item de leyenda de la serie B.
   - Assertion: polígono B desaparece; los 6 ejes radiales y el grid hexagonal/circular permanecen; el rango 0–1 no cambia; el tooltip al hover ya no muestra valores de B.
   - Cobertura: filtrado sin destruir chrome.

4. **Click derecho sobre un vértice abre menú contextual con "fijar valor" y "copiar"** — [interaction]
   - Setup: radar con handler de contextmenu conectado.
   - Acción: click derecho sobre vértice central de la serie A.
   - Assertion: aparece `<ul role="menu">` con 2 ítems focuseables; el primer ítem queda activo (`aria-selected="true"`); `contextmenu` nativo del navegador suprimido (`event.defaultPrevented === true`).
   - Cobertura: context menu accesible.

5. **Reordenamiento de ejes por drag: arrastrar etiqueta "Coste" de la posición 2 a la posición 5** — [drag & drop]
   - Setup: radar con 6 ejes en orden A,B,C,D,E,F; atributo `reorderable="true"`.
   - Acción: `mouse.down()` sobre label "Coste" en slot 2; `mouse.move()` al slot 5; `mouse.up()`.
   - Assertion: el orden de los puntos del polígono cambia correspondientemente; se emite evento `is-radar-axis-reorder` con `{ from: 2, to: 5, axis: "Coste" }`; el grid no se reordena (solo etiquetas y mapeo de datos).
   - Cobertura: drag & drop accesible.

6. **Animación de transición al cambiar dataset: el polígono interpola del viejo al nuevo** — [animation]
   - Setup: radar con `transition-duration: 600ms`; dataset inicial A=[0.2,0.5,0.8,0.4,0.6,0.3].
   - Acción: cambiar atributo `data` a B=[0.6,0.7,0.5,0.8,0.4,0.7].
   - Assertion: en `requestAnimationFrame` intermedio (300 ms), los vértices tienen coordenadas intermedias (distancia euclidiana a ambos estados < ε); al finalizar (700 ms), los `points` son los del dataset B; no hay saltos bruscos.
   - Cobertura: tween de polígono.

7. **Contraste del área rellena vs fondo cumple AA en tema dark** — [color/contrast]
   - Setup: radar en `data-theme="dark"` con área rellena semi-transparente.
   - Acción: medir luminancia de la capa de relleno (color + alpha) sobre fondo oscuro.
   - Assertion: ratio de contraste ≥ 3:1 (AA para UI gráfica); el texto del tooltip sigue siendo legible sobre el área rellena.
   - Cobertura: transparencia sobre fondo oscuro.

8. **Estado vacío con todas las series en `0` muestra polígono colapsado al centro** — [empty state]
   - Setup: dataset con valores `[0,0,0,0,0,0]`.
   - Acción: cargar demo.
   - Assertion: todos los vértices coinciden en el centro del radar; el área es despreciable; el texto "Sin variación" aparece en el centro; no hay error de `NaN` en los radios.
   - Cobertura: degenerate case.

9. **Dataset con un eje faltante (undefined) salta ese vértice sin romper el polígono** — [data overflow]
   - Setup: serie A con `[0.4, 0.5, undefined, 0.7, 0.3, 0.6]`.
   - Acción: cargar demo.
   - Assertion: el polígono se cierra saltando el índice 2 (path con `moveTo` directo de índice 1 a índice 3); aparece marcador "N/D" en el eje faltante; el cálculo de área ignora ese vértice.
   - Cobertura: datos incompletos.

10. **Hover sobre label de eje (no sobre polígono) muestra tooltip con descripción del eje** — [hover/tooltip]
    - Setup: ejes con `aria-describedby` apuntando a descripciones largas.
    - Acción: pasar mouse sobre el texto "Rendimiento" (no sobre el polígono).
    - Assertion: aparece tooltip con texto "Rendimiento: throughput del sistema en ops/seg"; no se resalta ningún vértice; el evento `is-radar-axis-hover` se emite con `{ axis: "Rendimiento" }`.
    - Cobertura: hover en chrome (no solo data).

11. **Teclado: flechas ↑↓ ajustan el valor del eje actualmente enfocado** — [keyboard]
    - Setup: foco en vértice de la serie A del eje 3.
    - Acción: presionar `ArrowUp` 3 veces, luego `ArrowDown` 1 vez.
    - Assertion: el valor del vértice aumenta en pasos discretos (ej. +0.05 por pulsación, tope 1.0); el polígono se redibuja con nuevos puntos; se emite evento `is-radar-value-change` por cada paso; el foco permanece en el mismo vértice.
    - Cobertura: edición inline.

12. **ARIA: el grupo de polígonos tiene `role="img"` con `aria-label` que resume el chart** — [ARIA / a11y]
    - Setup: cargar demo con `aria-label="Radar de rendimiento Q3"`.
    - Acción: inspeccionar `shadowRoot.querySelector('svg')`.
    - Assertion: `<svg role="img" aria-label="Radar de rendimiento Q3">`; los ejes tienen `<title>` interno; los polígonos tienen `aria-hidden="true"` (decorativos); la leyenda tiene `role="list"` con `role="listitem"` por entrada.
    - Cobertura: descripción semántica.

13. **Overflow con 20 ejes: el chart aplica auto-rotación de etiquetas** — [data overflow]
    - Setup: dataset con 20 dimensiones; ancho del contenedor fijo a 400 px.
    - Acción: cargar demo.
    - Assertion: las etiquetas no se solapan (cada `<text>` con `transform="rotate(...)"` cuando ángulo < 15°); al menos una etiqueta completa es legible sin tooltip; ningún `<text>` queda cortado por el viewport del SVG.
    - Cobertura: auto-layout de labels.

14. **Estado loading mientras se cargan datos asincrónicos: skeleton hexagonal** — [edge case]
    - Setup: simular fetch lento (1500 ms) antes de hidratar el chart.
    - Acción: cargar demo con `data-src="..."` y mockear respuesta lenta.
    - Assertion: aparece placeholder con 6 líneas radiales tenues; el SVG tiene `aria-busy="true"`; tras la resolución, los polígonos reales aparecen y `aria-busy` pasa a `false`; los lectores de pantalla anuncian el cambio vía `aria-live="polite"`.
    - Cobertura: async loading state.

---

### demo: scatter-chart
#### Tests existentes (resumen, brevísimo)
- Render de N puntos `<circle>` con posiciones X/Y correctas.
- Reactividad al cambio de dataset y al resize del contenedor.
- Verificación de que los ejes X e Y muestran ticks numéricos.
- Screenshot de regresión con dataset conocido.

#### Propuestas nuevas

1. **Hover sobre un punto muestra tooltip con coordenadas exactas (x, y) y metadatos** — [hover/tooltip]
   - Setup: scatter con 50 puntos distribuidos, atributo `point-meta` con clave/valor por punto.
   - Acción: hover sobre el punto con metadato `{ id: "P-12", cluster: "A" }`.
   - Assertion: tooltip con texto "P-12 · cluster A · x=4.32, y=7.10"; el punto hovered tiene `stroke` añadido y `r` aumentado en 2 px; los puntos cercanos dentro de un radio de 8 px NO se resaltan (no hay highlight de vecinos).
   - Cobertura: tooltip rico, sin cross-highlight accidental.

2. **Brush selection: arrastrar sobre un área rectangular selecciona un subset de puntos** — [axis interaction]
   - Setup: scatter con `selection-enabled="true"`; 100 puntos.
   - Acción: `mouse.down()` en (200,200), `mouse.move()` a (400,350), `mouse.up()`.
   - Assertion: aparece un `<rect>` con `fill="rgba(...)"` semitransparente; los puntos dentro del rectángulo cambian de `fill` a color de selección; el contador "12 seleccionados" aparece en un panel inferior; se emite evento `is-scatter-selection` con array de IDs.
   - Cobertura: brush interactivo.

3. **Legend toggle por cluster: clic en "Cluster B" oculta solo los puntos de ese cluster** — [legend toggle]
   - Setup: scatter con 3 clusters coloreados (A=rojo, B=verde, C=azul).
   - Acción: clic en label "Cluster B" en la leyenda.
   - Assertion: solo los `<circle>` con `data-cluster="B"` quedan con `display:none` o son removidos del DOM; el eje X/Y no se recalculan (los demás puntos no "saltan" al centro); el conteo de puntos visibles coincide con A+C.
   - Cobertura: filtrado categórico.

4. **Zoom con rueda del mouse (wheel) sobre el plot hace zoom in/out centrado en el cursor** — [axis interaction]
   - Setup: scatter con `zoom-enabled="true"`; dataset amplio (rango 0–100 en ambos ejes).
   - Acción: posicionar cursor en (250, 250) del plot; `wheel` con `deltaY: -120`.
   - Assertion: el dominio del eje X cambia de [0,100] a aprox [20, 60] centrado en x=50; el punto bajo el cursor permanece visualmente en la misma posición relativa; se emite evento `is-scatter-zoom` con `{ centerX, centerY, scaleX, scaleY }`.
   - Cobertura: zoom semántico.

5. **Pan con click+drag mueve la vista sin perder el dominio completo** — [axis interaction]
   - Setup: tras zoom del test anterior.
   - Acción: `mouse.down()` en centro del plot, `mouse.move()` 100 px a la derecha, `mouse.up()`.
   - Assertion: el rango visible se desplaza proporcionalmente; un punto que antes estaba en el borde derecho ahora puede estar parcialmente fuera; el botón "Reset zoom" (si existe) es focuseable y restaura el dominio original.
   - Cobertura: pan complementario al zoom.

6. **Animación al añadir puntos: nuevos puntos aparecen con fade-in de 400 ms** — [animation]
   - Setup: scatter con 20 puntos iniciales.
   - Acción: ejecutar `chart.addPoints([{x:5,y:5},{x:6,y:6}])`.
   - Assertion: los nuevos `<circle>` tienen `opacity: 0` en `t=0`, llegan a `opacity: 1` en `t≈400ms`; los puntos previos NO se re-animan; no hay reflow del eje (los nuevos se ajustan al rango existente si está dentro).
   - Cobertura: append animado.

7. **Color por dimensión continua (color scale): 50 puntos con valor z se colorean por gradiente** — [color/contrast]
   - Setup: scatter con `color-by="intensity"`, rango z ∈ [0,1].
   - Acción: cargar demo.
   - Assertion: los puntos con z=0 son del color mínimo del gradiente, z=1 del máximo; un punto con z=0.5 tiene el color intermedio; los puntos adyacentes en z NO tienen colores idénticos cuando Δz > 0.05; la leyenda muestra la barra de color.
   - Cobertura: escala continua, suavidad perceptual.

8. **Estado vacío con 0 puntos: ejes visibles sin datos y mensaje "Sin puntos"** — [empty state]
   - Setup: setear `data="[]"`.
   - Acción: cargar demo.
   - Assertion: ejes X/Y renderizados con rango por defecto [0,1]; área de plot vacía; texto "Sin puntos" centrado con `role="status"`; ningún `<circle>` presente.
   - Cobertura: estado vacío.

9. **Dataset con 5000 puntos: render usa canvas en lugar de SVG cuando supera umbral** — [data overflow]
   - Setup: setear `data` con 5000 puntos y atributo `render-mode="auto"`.
   - Acción: cargar demo y medir tiempo de render.
   - Assertion: el chart internamente usa `<canvas>` en lugar de `<svg>` cuando `points.length > 1000` (umbral configurable); tiempo de primer paint < 1500 ms en CI; interacción hover sigue funcional sobre canvas (hit-testing con punto más cercano dentro de 12 px).
   - Cobertura: virtualización / fallback canvas.

10. **Punto con valor NaN se omite del render sin崩溃** — [data overflow]
    - Setup: dataset con un punto `{x: 3, y: NaN}` entre 20 puntos válidos.
    - Acción: cargar demo.
    - Assertion: ese punto no aparece como `<circle>`; los ejes no muestran `NaN` en ticks; el tooltip al hover sobre el área donde estaría no se muestra (no hay hit-target); console sin warnings de `NaN`.
    - Cobertura: NaN guards.

11. **Teclado: `Tab` enfoca cada punto individualmente si `keyboard-nav="true"`** — [keyboard]
    - Setup: scatter con navegación por teclado habilitada y 5 puntos focuseables.
    - Acción: presionar `Tab` desde el inicio.
    - Assertion: foco se mueve secuencialmente a cada `<circle tabindex="0">`; el punto focused tiene outline visible y `aria-current="true"`; `Arrow keys` mueven entre puntos en orden de índice; `Enter` emite `is-scatter-point-select` con el ID del punto.
    - Cobertura: navegación por teclado punto a punto.

12. **ARIA: cada punto focuseable tiene `aria-label` con sus coordenadas y metadatos** — [ARIA / a11y]
    - Setup: cargar demo.
    - Acción: inspeccionar shadow root.
    - Assertion: `<circle tabindex="0" aria-label="Punto 12, x=4.32, y=7.10, cluster A">`; el contenedor SVG tiene `role="img"` con `aria-label="Diagrama de dispersión con 50 puntos"`; los ejes tienen `<title>` accesible.
    - Cobertura: descripción individual accesible.

13. **Resize del contenedor: el chart re-renderiza ajustando el viewport SVG sin deformar proporciones** — [edge case]
    - Setup: cargar demo en contenedor de 800×600 px.
    - Acción: redimensionar a 400×300 px vía `page.setViewportSize` o estilo.
    - Assertion: el SVG ajusta `width` y `height` con `viewBox` constante; los puntos mantienen sus posiciones relativas; los ejes siguen siendo legibles; el resize observer dispara como máximo una vez por frame.
    - Cobertura: responsive resize.

14. **Click en un punto con `onPointClick` handler abre un side-panel con detalle** — [interaction]
    - Setup: handler conectado en el demo; panel `#detail` en light DOM adyacente.
    - Acción: clic en el tercer punto del cluster A.
    - Assertion: el panel `#detail` recibe `innerHTML` con detalles del punto (id, x, y, cluster); el chart no pierde foco (el último elemento activo sigue siendo el `<circle>` clickeado); `Escape` cierra el panel y devuelve foco al punto.
    - Cobertura: drill-down click.

15. **Cambio de tema dark: los colores de los puntos y ejes se actualizan vía tokens** — [theme]
    - Setup: cargar demo en tema light; toggle a `data-theme="dark"`.
    - Acción: cambiar el atributo.
    - Assertion: los `fill` de los círculos cambian a la paleta dark; los textos de ejes usan `--is-color-text-on-dark`; el fondo del plot usa `--is-color-surface-dark`; ningún círculo queda invisible (contraste mínimo verificado).
    - Cobertura: theming reactivo.

---

## Resumen de cobertura

| Demo | Propuestas | Categorías cubiertas |
|---|---|---|
| chart | 14 | hover/tooltip, legend toggle, axis interaction, animation, color/contrast, empty state, data overflow, keyboard, theme, interaction, edge case |
| radar-chart | 14 | hover/tooltip, legend toggle, interaction, drag & drop, animation, color/contrast, empty state, data overflow, keyboard, ARIA, edge case |
| scatter-chart | 15 | hover/tooltip, axis interaction, legend toggle, animation, color/contrast, empty state, data overflow, keyboard, ARIA, edge case, interaction, theme |
| **Total** | **43** | todas las obligatorias (charts focus) |

> Cada propuesta sigue el formato: Setup → Acción → Assertion → Cobertura. Las assertions son verificables con Playwright 1.62.1 + Chromium headless sobre el Shadow DOM del web component.