# F0.3 propuesta UX/UI exhaustiva — data-viz (1 demos: heatmap)

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens `--is-*`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Testables del grupo (categoría: data-viz)

### Demos a auditar (1)
  - src/components/data-viz/heatmap.preview.ts (behavior)

### JSON de cada demo (estructura + secciones)
  - src/components/data-viz/heatmap.json (estructura)

---

### demo: heatmap

#### Tests existentes (resumen, brevísimo)
- Cobertura base de render: matriz NxM con celdas coloreadas según escala, ejes X/Y con etiquetas, leyenda de color adyacente, tooltip numérico al hover sobre celda.
- Validación mínima: la suma de celdas y los valores extremos se imprimen en consola del demo.
- No hay cobertura documentada para: navegación por teclado entre celdas, cambio dinámico de dataset (resize), animación de entrada/salida de celdas, gestión de celdas vacías (null/NaN), accesibilidad de la leyenda, contraste en modo dark, ni comportamiento responsive cuando la matriz excede el viewport.

#### Propuestas nuevas

1. **Hover sobre celda muestra tooltip con valor exacto + coordenadas + serie** — [Interacción]
   - Setup: navega a la página del demo heatmap con el dataset por defecto (matriz de 7x24 con valores aleatorios).
   - Acción: mueve el puntero lentamente sobre la celda ubicada en la fila "Wednesday" / columna "14:00" hasta que aparezca el tooltip.
   - Assertion: el tooltip debe ser un elemento DOM (no solo atributo title nativo) y mostrar tres campos: valor numérico con al menos 2 decimales, etiqueta de fila y etiqueta de columna. El tooltip debe posicionarse respecto a la celda sin salirse del viewport.
   - Cobertura: edge case de borde (celda en la última fila/columna) y verificación de que no se usa el atributo `title` del HTML como única fuente.

2. **Hover sobre celda resalta fila y columna (crosshair)** — [Interacción]
   - Setup: misma página, dataset por defecto.
   - Acción: pasa el ratón sobre una celda arbitraria del centro de la matriz.
   - Assertion: la fila y columna correspondientes deben cambiar de estilo (color de fondo, borde o peso) respecto a las demás. La celda objetivo debe tener un estilo distinto del resto del crosshair.
   - Cobertura: interacción secundaria del hover, no documentada en el comportamiento básico.

3. **Click en celda fija su tooltip persistente hasta nuevo click** — [Interacción]
   - Setup: dataset por defecto.
   - Acción: haz click izquierdo sobre una celda; sin mover el ratón, haz click sobre otra celda; luego haz click sobre una zona vacía fuera de la matriz.
   - Assertion: tras el primer click el tooltip debe permanecer visible al retirar el ratón; el segundo click debe mover el tooltip a la nueva celda; el click fuera debe ocultar el tooltip. Ningún botón físico del ratón debe quedar con `pointer-events: none` en la celda.
   - Cobertura: pinning del tooltip — patrón común en dashboards analíticos, no validado por defecto.

4. **Doble-click en celda emite un evento custom `cell-dblclick` con payload** — [Interacción]
   - Setup: registra un listener en el host del componente para el evento `cell-dblclick` antes de la interacción.
   - Acción: doble-click sobre una celda que contenga el valor máximo del dataset.
   - Assertion: el listener debe dispararse exactamente una vez por doble-click (no dos veces como click+click), y el `event.detail` debe incluir `{ row, col, value, rowLabel, colLabel }`.
   - Cobertura: diferencia entre click y dblclick, contrato del evento hacia consumidores.

5. **Click derecho sobre celda abre menú contextual con "Copiar valor" / "Copiar fila"** — [Interacción]
   - Setup: dataset por defecto.
   - Acción: haz click derecho (button=2) sobre una celda del centro de la matriz.
   - Assertion: debe aparecer un popover/menú con al menos dos acciones (copiar valor, copiar fila como CSV). El menú debe ser focusable (Tab debe entrar al primer ítem) y cerrarse con Escape o click fuera. El menú debe estar dentro del Shadow DOM del componente.
   - Cobertura: context menu nativo suprimido (`contextmenu` event preventDefault), patrón propio del componente.

6. **Tab navega secuencialmente por celdas siguiendo orden fila→columna** — [Teclado]
   - Setup: dataset por defecto, foco al inicio de la página (Tab repetido hasta entrar al heatmap).
   - Acción: pulsa Tab consecutivamente y registra qué elemento recibe el foco en cada pulsación.
   - Assertion: las celdas focuseables deben recibirse en orden row-major (primera celda → última celda de la primera fila → primera celda de la segunda fila, etc.). Tras la última celda, el siguiente Tab debe salir del heatmap hacia el siguiente control de la página (no debe haber trampa de foco).
   - Cobertura: navegación con teclado, prerrequisito para usuarios sin ratón y para tests E2E de teclado.

7. **Arrow keys mueven el foco entre celdas adyacentes** — [Teclado]
   - Setup: dataset por defecto, foco en la celda central de la matriz (row=3, col=10).
   - Acción: pulsa ArrowRight, ArrowLeft, ArrowDown, ArrowUp secuencialmente.
   - Assertion: cada flecha debe mover el foco a la celda contigua en esa dirección. En los bordes (primera fila, primera columna, última fila, última columna), la flecha saliente debe detener el foco (no debe envolverse ni salir del heatmap si hay otra celda alcanzable).
   - Cobertura: navegación 2D dentro de grids, análoga a `role="grid"`.

8. **Enter sobre celda enfocada activa el modo "tooltip persistente"** — [Teclado]
   - Setup: dataset por defecto, foco en una celda arbitraria.
   - Acción: pulsa Enter; luego pulsa Enter de nuevo.
   - Assertion: el primer Enter debe mostrar el tooltip persistente (equivalente al click de la propuesta #3). El segundo Enter debe ocultarlo (toggle). Space debe comportarse idéntico a Enter en este contexto.
   - Cobertura: equivalencia teclado↔ratón para la acción primaria sobre celda.

9. **Escape cierra el tooltip persistente y devuelve el foco a la celda** — [Teclado]
   - Setup: dataset por defecto, abre el tooltip persistente con Enter.
   - Acción: pulsa Escape.
   - Assertion: el tooltip debe desaparecer y `document.activeElement` (o el equivalente dentro del ShadowRoot) debe ser la celda que lo originó (no `body`).
   - Cobertura: cierre accesible, patrón consistente con modales y popovers.

10. **Leyenda tiene `role="img"` con `aria-label` que describe el rango** — [ARIA / a11y]
    - Setup: inspecciona la leyenda de color (gradiente o escala discreta) en el Shadow DOM.
    - Acción: lee el árbol de accesibilidad (Playwright `page.accessibility.snapshot()`) sobre la leyenda.
    - Assertion: la leyenda completa debe exponerse como un único nodo accesible con nombre legible (p. ej. "Escala de color de 0 a 100, bajo=azul, alto=rojo"). Cada marca/etiqueta numérica de la leyenda debe tener un nodo `text` accesible.
    - Cobertura: la leyenda es información crítica para interpretar la matriz; sin a11y es invisible para lectores de pantalla.

11. **Matriz tiene `role="grid"` con `aria-rowcount`, `aria-colcount` y celdas como `role="gridcell"`** — [ARIA / a11y]
    - Setup: dataset por defecto, snapshot de accesibilidad.
    - Acción: navega el árbol de accesibilidad sobre el contenedor de la matriz.
    - Assertion: el contenedor debe tener `role="grid"` y los atributos `aria-rowcount`/`aria-colcount` igual al número real de filas/columnas renderizadas (incluyendo las de encabezado). Cada celda de datos debe tener `role="gridcell"` (no `cell`). Los encabezados de fila/columna deben tener `role="columnheader"`/`rowheader`.
    - Cobertura: contrato ARIA para grids 2D; sin esto la matriz es inaccesible con lector de pantalla.

12. **Anuncio en `aria-live` cuando se selecciona una celda con valor fuera de rango** — [ARIA / a11y]
    - Setup: usa un dataset modificado que contenga un valor negativo o un valor por encima del rango documentado en la leyenda.
    - Acción: navega con teclado hasta esa celda y pulsa Enter.
    - Assertion: debe existir una región `aria-live="polite"` (visible u oculta) en el Shadow DOM cuyo contenido cambie para anunciar algo como "Valor atípico: 150, fuera del rango esperado". El anuncio no debe interrumpir al lector (polite, no assertive).
    - Cobertura: detección y comunicación de outliers — patrón no estándar pero relevante para data-viz.

13. **Celdas con valor `null`/`NaN` se renderizan con patrón de "sin datos"** — [Estados visuales / edge cases]
    - Setup: inyecta un dataset donde al menos 5 celdas tengan `null` o `NaN` distribuidas (incluyendo una fila completa vacía).
    - Acción: renderiza el heatmap y haz screenshot.
    - Assertion: las celdas vacías NO deben heredarse del color mínimo de la escala; deben mostrar un patrón visual distinto (rayado diagonal, trama de puntos, color gris explícito o icono). La fila completamente vacía debe seguir dibujando sus etiquetas de fila.
    - Cobertura: distinción entre "valor bajo" y "dato faltante", error semántico frecuente en dataviz.

14. **Color scale cambia al alternar tema light/dark y mantiene la discriminación perceptual** — [Estados visuales / edge cases]
    - Setup: dataset por defecto; toggle del atributo `data-theme` o clase de tema en el host.
    - Acción: captura el color de fondo de la celda mínima, celda media y celda máxima en tema light; alterna a tema dark; captura los mismos tres colores.
    - Assertion: en ambos temas las tres celdas deben ser perceptiblemente distintas entre sí (delta L* en CIELAB ≥ 10 entre mínimo y máximo). En modo dark el fondo base del heatmap debe coincidir con el token `--is-surface-dark` o equivalente. La leyenda debe actualizarse al mismo tiempo.
    - Cobertura: consistencia cross-theme, requisito WCAG 1.4.11 (contraste no textual).

15. **Matriz grande (>50 filas, >50 columnas) es scrollable sin perder etiquetas de eje** — [Estados visuales / edge cases]
    - Setup: genera un dataset de 80x80 y cárgalo en el heatmap.
    - Acción: haz scroll horizontal hasta el final y luego scroll vertical hasta el final.
    - Assertion: las etiquetas de columna deben permanecer visibles en la parte superior durante el scroll vertical (sticky header); las etiquetas de fila deben permanecer visibles a la izquierda durante el scroll horizontal (sticky first column). El tooltip debe seguir a la celda hovered incluso cuando está parcialmente fuera del viewport. El rendimiento debe mantenerse ≥ 30 fps durante el scroll (medible con `performance.now()` entre frames).
    - Cobertura: escalabilidad del componente, no validada con el dataset por defecto pequeño.

16. **Animación de transición al cambiar de dataset no desorienta al usuario** — [Estados visuales / edge cases]
    - Setup: dataset por defecto; dispara un cambio de dataset a otro con rango y dimensiones distintas (p. ej. de 7x24 a 30x12).
    - Acción: captura el estado antes, durante y 500 ms después del cambio.
    - Assertion: la transición no debe superar 600 ms (cumple guía de animación perceptiva). El cambio debe respetar `prefers-reduced-motion: reduce` — si el usuario tiene esa preferencia activada, el cambio debe ser instantáneo. Las celdas nuevas no deben aparecer con un parpadeo de color blanco antes de adoptar el color de la escala.
    - Cobertura: accesibilidad de movimiento (WCAG 2.3.3), comportamiento bajo animación del SO deshabilitada.

17. **Etiquetas de eje largas se truncan con ellipsis y se muestran completas en tooltip** — [Interacción]
    - Setup: dataset con etiquetas de columna de 30+ caracteres (p. ej. timestamps ISO completos) y etiquetas de fila con palabras compuestas.
    - Acción: renderiza; pasa el ratón sobre una etiqueta de eje truncada.
    - Assertion: la etiqueta debe mostrar `…` o truncamiento visual sin desbordar el contenedor del heatmap. El tooltip al hover sobre la etiqueta debe mostrar el texto completo. El atributo `title` de la etiqueta debe contener el texto íntegro como fallback.
    - Cobertura: textos largos en ejes, problema común con datos reales (timestamps, nombres propios).

(17 propuestas totales — supera el mínimo de 12 requeridas)
