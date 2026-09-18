# F0.3 propuesta UX/UI exhaustiva — data (4 demos: ag-grid, data-grid, gauge, pivot-table)

## Perfil del proyecto
**is-webcomponents** — librería de Web Components vanilla TypeScript con Shadow DOM, tokens `--is-*`, y un kit de 67 demos servidos desde GitHub Pages. Stack: Playwright 1.62.1 + Chromium headless para tests browser.

## Categorías adaptadas a demos data (grids + gauge)
- **Interacción**: click en headers, sort, filter, paginación, selección de filas, drag column, resize, context menu, exportación, controles gauge.
- **Teclado**: Tab/Shift+Tab entre celdas/filtros, Enter para editar, Arrow keys para navegar celdas/filas/columnas, Space para select, Escape para cerrar menú, PgUp/PgDn, Home/End, atajos de sort/filter/export.
- **ARIA / a11y**: role=grid/row/columnheader/gridcell, aria-sort, aria-selected, aria-label en headers de icono, aria-live en regiones de paginación/empty, aria-busy en loading.
- **Estados visuales / edge cases**: empty state, loading/skeleton, error de carga, dataset grande (1k–100k filas), overflow horizontal/vertical, tema dark/light, resize column, ancho fijo/flex, RTL (si aplica), frozen columns, virtualización.

---

### demo: ag-grid
#### Tests existentes (resumen, brevísimo)
- Renderizado básico de filas y headers.
- Click en header dispara sort.
- Selección simple de fila.
- Sin cobertura específica de: paginación, virtualización, filtros avanzados, exportación, atajos teclado de grid, scroll infinito, estado vacío, dataset grande.

#### Propuestas nuevas

1. **Sort por click en header (asc/desc/none toggle)** — [Interacción]
   - Setup: cargar demo con dataset ≥ 50 filas. Localizar primer header de columna sortable.
   - Acción: click → click → click en el header. Observar icono de sort y orden de filas.
   - Assertion: 1º click ordena asc (icono ▲), 2º desc (▼), 3º vuelve al orden original (sin icono). `aria-sort` refleja `ascending`/`descending`/`none`.
   - Cobertura: branch de toggle sort + accesibilidad del estado.

2. **Multi-sort con Shift+Click** — [Interacción]
   - Setup: dataset con columnas `nombre`, `precio`, `stock`.
   - Acción: click en header `precio`; Shift+click en header `stock`.
   - Assertion: filas ordenadas primero por `precio` asc, dentro de cada precio por `stock` asc. Ambos headers muestran su icono de sort.
   - Cobertura: branch de multi-column sort y prioridad visual.

3. **Filter por columna (texto contiene / igual / startsWith)** — [Interacción]
   - Setup: abrir menú de filter en una columna textual.
   - Acción: escribir "Ma" en el input de filter. Pulsar Apply.
   - Assertion: solo se muestran filas cuyo valor contiene "Ma" (case-insensitive). El icono de filter aparece en el header. El contador de filas visibles cambia.
   - Cobertura: edge case de case-insensitivity y branch de operadores.

4. **Filter numérico por rango (between)** — [Interacción]
   - Setup: columna numérica (`precio`).
   - Acción: abrir filter numérico, escribir `min=100`, `max=500`, Apply.
   - Assertion: solo aparecen filas con `precio` ∈ [100, 500]. Indicador visual de filtro activo en header.
   - Cobertura: branch de operadores numéricos y validación de rango invertido.

5. **Paginación: cambiar tamaño de página y navegar** — [Interacción]
   - Setup: dataset con ≥ 250 filas, paginación habilitada (page size = 50).
   - Acción: cambiar selector de page size a 100; click en página 2; click en última página; click en "anterior".
   - Assertion: número de filas renderizadas coincide con page size. Indicador `Showing X-Y of Z` se actualiza. Botones prev/next tienen `disabled` correcto en extremos. `aria-current="page"` en la página activa.
   - Cobertura: branch de paginación completa + a11y de navegación.

6. **Selección múltiple (checkbox header + shift-click rango)** — [Interacción]
   - Setup: columna de selección con checkbox en cada fila + header.
   - Acción: click en checkbox de fila 1; click en checkbox de fila 5 con Shift; click en header checkbox (select all).
   - Assertion: filas 1, 2, 3, 4, 5 seleccionadas. Header checkbox marca todas. Contador "X selected" se actualiza. `aria-selected="true"` en filas seleccionadas.
   - Cobertura: branch de selección por rango y select-all.

7. **Navegación con teclado entre celdas (Arrow keys)** — [Teclado]
   - Setup: focus en celda (1,1) — fila 1, columna 1.
   - Acción: ArrowDown → ArrowDown → ArrowRight → ArrowLeft → Home → End → PgDn → PgUp.
   - Assertion: focus se mueve correctamente; `tabindex="0"` se reasigna dinámicamente a la celda activa; el resto tiene `tabindex="-1"`. Scroll automático cuando la celda sale del viewport.
   - Cobertura: branch completo de navegación por teclado y roving tabindex.

8. **Atajos de teclado: Ctrl+C copiar, Ctrl+F buscar** — [Teclado]
   - Setup: focus en grid con celdas seleccionadas.
   - Acción: Ctrl+C; abrir portapapeles y verificar; Ctrl+F abre overlay de búsqueda.
   - Assertion: contenido copiado coincide con TSV de la selección. Overlay de búsqueda recibe focus y es dismissable con Escape. `aria-label` del overlay.
   - Cobertura: branch de clipboard API y shortcut de búsqueda.

9. **Acciones de fila contextuales (botones en cada fila)** — [Interacción]
   - Setup: columna de acciones con botones "Ver", "Editar", "Eliminar" por fila.
   - Acción: click en "Editar" de fila 3; verificar emisión de evento `row-edit`.
   - Assertion: `event.detail` contiene `rowId` y `columnId`. Fila recibe clase `is-editing` durante edición inline (si existe). Botón "Eliminar" abre confirm modal accesible.
   - Cobertura: branch de eventos custom + inline editing.

10. **Export a CSV / Excel** — [Interacción]
    - Setup: localizar botón "Export CSV" en toolbar del grid.
    - Acción: click en "Export CSV"; capturar `download` event de Playwright.
    - Assertion: archivo descargado `data.csv` con header correcto y filas filtradas/ordenadas respetando estado actual. Encoding UTF-8. Botón tiene `aria-label` "Export to CSV".
    - Cobertura: branch de exportación respetando sort/filter activos.

11. **Virtualización: scroll a fila 10.000 en dataset 100k** — [Estados visuales]
    - Setup: inyectar dataset de 100.000 filas; deshabilitar paginación; activar virtualización.
    - Acción: scroll al final del viewport virtual; PgDn repetidamente hasta fila 99.999.
    - Assertion: solo ~30–50 nodos `<div role="row">` en DOM a la vez (DOM recicla). Memoria estable (no leak). Scrollbar refleja posición real. Header sticky permanece visible.
    - Cobertura: branch de virtualización y performance con dataset grande.

12. **Estado vacío (empty state)** — [Estados visuales]
    - Setup: aplicar filter que no devuelve resultados (ej. texto "ZZZZZZZ").
    - Acción: aplicar filtro.
    - Assertion: aparece overlay/mensaje "No rows to show" centrado, con icono y CTA "Clear filters". `role="status"` o `aria-live="polite"` anuncia el mensaje. Botón clear filters funcional.
    - Cobertura: branch de empty result con accesibilidad.

13. **Estado loading skeleton** — [Estados visuales]
    - Setup: interceptar request de datos y retrasar 2s (mock network throttle).
    - Acción: cargar el demo; observar grid durante carga.
    - Assertion: aparecen skeleton rows (pulse animation) con `aria-busy="true"` en el contenedor grid. Header visible pero sin datos. Tras respuesta, transición a contenido real sin layout shift > 0.1 CLS.
    - Cobertura: branch de loading state y reducción de CLS.

14. **Resize de columna por drag del borde** — [Interacción]
    - Setup: localizar handle de resize entre dos headers (zona 4–8px del borde derecho del header).
    - Acción: mousedown en handle, drag 100px a la derecha, mouseup.
    - Assertion: ancho de la columna aumenta 100px (±2px). Otras columnas mantienen su ancho o redistribuyen según configuración. Doble-click en handle auto-ajusta al contenido más ancho.
    - Cobertura: branch de resize manual y auto-fit.

15. **Column reorder por drag del header** — [Interacción]
    - Setup: dataset con 5+ columnas.
    - Acción: mousedown en header de columna 3, arrastrar a posición 1, mouseup.
    - Assertion: orden de columnas en DOM cambia; `aria-colindex` se actualiza; el dato de la fila sigue asociado a la nueva posición. Estado persiste tras re-render.
    - Cobertura: branch de drag & drop interno y persistencia.

16. **Tema dark/light toggle** — [Estados visuales]
    - Setup: demo renderizado en tema light.
    - Acción: click en toggle de tema del sitio (si existe) o setear atributo `data-theme="dark"` en `<html>`.
    - Assertion: tokens CSS `--is-bg-grid`, `--is-color-text-grid`, `--is-border-grid` se actualizan. Contraste WCAG AA en celdas (ratio ≥ 4.5:1) en ambos temas. Sin flash de contenido sin estilo (FOUC).
    - Cobertura: branch de theming sin regresión visual.

17. **Frozen columns (pin left)** — [Interacción]
    - Setup: columna `id` con `pinned: 'left'`.
    - Acción: scroll horizontal del grid 1000px a la derecha.
    - Assertion: columna `id` permanece visible en posición fija mientras el resto hace scroll. `aria-colindex` y orden visual son coherentes.
    - Cobertura: branch de pinning + scroll horizontal.

18. **Aria-sort dinámico + screen reader announce** — [ARIA / a11y]
    - Setup: con AT virtual (ej. axe-core + lectura de aria).
    - Acción: aplicar sort asc, luego desc.
    - Assertion: `aria-sort="ascending"` luego `"descending"` en el `<div role="columnheader">`. Live region anuncia "Sorted by Nombre ascending".
    - Cobertura: branch de accesibilidad sort + live region.

---

### demo: data-grid
#### Tests existentes (resumen, brevísimo)
- Renderizado de filas con datos primitivos.
- Estilos básicos por tokens.
- Sin cobertura específica de: virtualización propia, sort, filter, export, accesibilidad roles ARIA de grid, paginación, scroll infinito, frozen columns, estado vacío, carga lazy.

#### Propuestas nuevas

1. **Render inicial con dataset pequeño (≤ 50 filas)** — [Interacción]
   - Setup: cargar demo con dataset por defecto (asumido ≤ 50 filas).
   - Acción: observar render; contar nodos `<tr>` o `role="row"`.
   - Assertion: 1 fila por cada item del dataset. Headers en `<thead>` con `role="columnheader"`. Body en `<tbody>` con `role="row"`. Sin virtualización activa (todas las filas en DOM).
   - Cobertura: branch de render completo sin virtualización.

2. **Sort por click en header (single-column)** — [Interacción]
   - Setup: localizar primer `<th>` sortable.
   - Acción: click → click en el mismo header.
   - Assertion: filas reordenadas asc → desc. `aria-sort` cambia. Icono de sort visible en header. Click en header no-sortable no produce cambio.
   - Cobertura: branch de sort + opt-out por columna.

3. **Filter en cliente (input encima de cada columna)** — [Interacción]
   - Setup: localizar row de filtros bajo el header.
   - Acción: escribir "bar" en el filter de columna `name`.
   - Assertion: solo filas visibles cuyo `name` contiene "bar" (case-insensitive). Contador "X of Y rows" actualizado. Filter tiene `aria-label="Filter by Name"`.
   - Cobertura: branch de filter por columna + contador.

4. **Filter combinado (AND entre columnas)** — [Interacción]
   - Setup: filtros activos en 2 columnas.
   - Acción: escribir en filtro columna A "foo" y en columna B ">100".
   - Assertion: solo filas que cumplen AMBAS condiciones se muestran. Si ninguna cumple, aparece empty state.
   - Cobertura: branch de lógica AND entre filtros.

5. **Paginación numérica (page buttons + prev/next)** — [Interacción]
   - Setup: dataset con 300 filas, page size = 25.
   - Acción: click en página 3, página 7, next, prev, primera, última.
   - Assertion: rango de filas mostradas correcto. Botón "Previous" disabled en página 1. Botón "Next" disabled en última página. Página activa tiene `aria-current="page"` y clase `is-active`.
   - Cobertura: branch de paginación completa + disabled states.

6. **Selección de fila (click + Ctrl+click + Shift+click)** — [Interacción]
   - Setup: 10 filas visibles.
   - Acción: click fila 1; Ctrl+click fila 3; Shift+click fila 6.
   - Assertion: filas 1, 3, 4, 5, 6 seleccionadas. `aria-selected="true"` en cada una. Color de fondo distinto (token `--is-color-selected`). Single click en otra fila limpia selección si no hay modificador.
   - Cobertura: branch de selección con modificadores.

7. **Teclado: Tab entre celdas editables, Enter confirma** — [Teclado]
   - Setup: focus en celda editable de fila 1, columna `cantidad`.
   - Acción: Tab → Tab → Enter → escribir "5" → Enter.
   - Acción 2: Escape durante edición.
   - Assertion: navegación Tab respeta orden lógico (no salta a controles fuera del grid). Enter activa modo edición. Escape cancela y restaura valor previo. Cambio confirmado emite `cell-change` event con `oldValue` y `newValue`.
   - Cobertura: branch de inline editing + commit/cancel.

8. **Arrow keys navegación entre celdas** — [Teclado]
   - Setup: focus en celda (2,2).
   - Acción: ArrowUp → ArrowLeft → ArrowRight → ArrowDown.
   - Assertion: focus se mueve a celdas adyacentes. En bordes del grid, ArrowUp/Left en primera fila queda en la misma celda. `tabindex="0"` se transfiere al destino.
   - Cobertura: branch de navegación ortogonal + límites.

9. **Virtualización con dataset grande (scroll dentro de viewport)** — [Estados visuales]
   - Setup: inyectar 5.000 filas. Activar virtualización (scroll container de altura fija).
   - Acción: scroll rápido al fondo; scroll al medio; scroll al inicio.
   - Assertion: solo ~20–40 filas en DOM simultáneamente. Spacer rows al inicio/final simulan altura total. Scrollbar refleja altura total. Sin jank visible (FPS ≥ 30 medible vía Performance API).
   - Cobertura: branch de virtualización + performance.

10. **Resize de columna arrastrando el separador del header** — [Interacción]
    - Setup: cursor sobre el borde derecho del header `precio` (últimos 6px).
    - Acción: mousedown + drag +30px → mouseup. Doble-click en el separador.
    - Assertion: ancho de columna aumenta 30px. Doble-click ajusta a contenido más ancho. Otras columnas conservan ancho si `table-layout: fixed`.
    - Cobertura: branch de resize manual y auto-fit.

11. **Export CSV desde botón toolbar** — [Interacción]
    - Setup: aplicar sort y filter activos; localizar botón "Export".
    - Acción: click en "Export CSV".
    - Assertion: descarga archivo `.csv` con BOM UTF-8, headers separados por coma, filas en el orden y filtradas actuales. `aria-label="Export visible rows to CSV"`.
    - Cobertura: branch de exportación respetando estado.

12. **Estado vacío con icono y CTA** — [Estados visuales]
    - Setup: aplicar filter que no matchea.
    - Acción: observar grid.
    - Assertion: aparece empty state con icono (SVG inline), texto "No se encontraron resultados", botón "Limpiar filtros" funcional. Contenedor tiene `role="status"` y `aria-live="polite"`. Altura mínima del grid para evitar colapso visual.
    - Cobertura: branch de empty + accesibilidad + layout estable.

13. **Estado loading con skeleton rows** — [Estados visuales]
    - Setup: mockear carga de datos con delay 1500ms.
    - Acción: cargar demo.
    - Assertion: aparecen 5–10 skeleton rows con shimmer animation. `aria-busy="true"` en contenedor. Header skeleton no aparece (solo body). Tras carga, transición suave sin parpadeo.
    - Cobertura: branch de skeleton + accesibilidad loading.

14. **Estado de error en carga de datos** — [Estados visuales]
    - Setup: mockear fetch con 500.
    - Acción: cargar demo.
    - Assertion: aparece panel de error con icono, mensaje "Error al cargar datos", botón "Reintentar". `role="alert"` para lectores de pantalla. Click en Reintentar dispara nuevo fetch.
    - Cobertura: branch de error + recovery.

15. **Selección con teclado (Space + Arrow)** — [Teclado]
    - Setup: focus en fila 1.
    - Acción: ArrowDown → Space → ArrowDown → Space → Shift+ArrowDown.
    - Assertion: filas 1 y 2 seleccionadas individualmente; Shift+ArrowDown extiende a fila 3. `aria-selected` refleja. Combinable con Ctrl+Space para toggle.
    - Cobertura: branch de selección multi vía teclado.

16. **Fila expandible (detail row)** — [Interacción]
    - Setup: columna con icono chevron en cada fila.
    - Acción: click en chevron de fila 2.
    - Assertion: aparece fila de detalle debajo con colspan total. Chevron rota 90°. `aria-expanded="true"` en el botón. Contenido del detail carga lazy (skeleton si hay delay).
    - Cobertura: branch de expandable row + lazy content.

17. **Scroll horizontal con frozen first column** — [Interacción]
    - Setup: grid con 10 columnas, columna 1 frozen.
    - Acción: scroll horizontal 800px.
    - Assertion: columna 1 permanece fija visualmente. Resto hace scroll. Header y body de columna frozen alineados perfectamente (sin desincronización de 1–2px).
    - Cobertura: branch de pinning + alineación de capas.

18. **Accesibilidad: estructura ARIA completa** — [ARIA / a11y]
    - Setup: ejecutar axe-core sobre el demo.
    - Acción: scan automático + verificación manual.
    - Assertion: `<div role="grid">` contiene `role="rowgroup"` para thead/tbody. Headers con `role="columnheader"` y `aria-sort` cuando aplica. Celdas con `role="gridcell"`. Sin violaciones axe. Navegable con lector de pantalla virtual (NVDA/JAWS).
    - Cobertura: branch completo de a11y para grid.

19. **Performance con dataset masivo (100k filas, scroll libre)** — [Estados visuales]
    - Setup: inyectar 100.000 filas con virtualización infinita (load on scroll).
    - Acción: scroll continuo hasta el final.
    - Assertion: nuevas filas se cargan en chunks de 50 al acercarse al final. Spinner inferior aparece brevemente. Memoria heap no crece más de 50MB respecto al baseline. Sin bloqueo del hilo principal > 100ms.
    - Cobertura: branch de infinite scroll + memory profiling.

---

### demo: gauge
#### Tests existentes (resumen, brevísimos)
- Render de un medidor SVG con valor numérico.
- Sin cobertura específica de: rangos múltiples, animación de transición, accesibilidad, controles de incremento, theming dark/light, estados de error/overflow, formato de unidades, interactividad de segmento.

#### Propuestas nuevas

1. **Render con valor en centro del rango** — [Interacción]
   - Setup: cargar demo con `value=50`, `min=0`, `max=100`.
   - Acción: observar SVG del gauge.
   - Assertion: aguja/indicador apuntando al 50% del arco. Texto central muestra "50". Path del arco de fondo completo. Path de progreso cubre exactamente el 50%.
   - Cobertura: branch de cálculo de posición + render correcto.

2. **Animación de transición al cambiar valor** — [Interacción]
   - Setup: gauge renderizado con `value=0`.
   - Acción: setear `value=80` vía propiedad del componente.
   - Assertion: aguja/indicador se anima de 0 → 80 con transición CSS (duración 300–800ms, easing ease-in-out). Cambio disparado por `transitionend`. Valor numérico se actualiza durante la transición (count-up).
   - Cobertura: branch de animación + sincronización de texto.

3. **Estado en valor mínimo (lower bound)** — [Estados visuales]
   - Setup: `value=0` o `value=min`.
   - Acción: observar gauge.
   - Assertion: indicador en posición inicial. Color de zona inferior (rojo/naranja) si hay umbrales. Texto muestra "0" sin decimales si no aplica. Sin error ni NaN.
   - Cobertura: branch de boundary inferior.

4. **Estado en valor máximo (upper bound)** — [Estados visuales]
   - Setup: `value=100` o `value=max`.
   - Acción: observar gauge.
   - Assertion: indicador al final del arco. Texto muestra valor máximo. Si hay overflow visual, no se sale del SVG (`overflow="hidden"` en viewBox).
   - Cobertura: branch de boundary superior.

5. **Valor por debajo del mínimo (clamp o error)** — [Estados visuales]
   - Setup: `value=-10`, `min=0`.
   - Acción: observar comportamiento.
   - Assertion: gauge clamp a 0 (aguja en inicio) O muestra estado de error visual. Mensaje en consola si hay validación. `aria-valuenow="0"` (clamp) o `aria-invalid="true"`.
   - Cobertura: branch de underflow + decisión de diseño (clamp vs error).

6. **Valor por encima del máximo (clamp o error)** — [Estados visuales]
   - Setup: `value=150`, `max=100`.
   - Acción: observar.
   - Assertion: clamp a 100 O zona de overflow visible en rojo. `aria-valuenow="100"` si clamp. No rompe layout.
   - Cobertura: branch de overflow.

7. **Zonas de color por umbral (thresholds)** — [Interacción]
   - Setup: gauge con thresholds: 0–30 verde, 30–70 amarillo, 70–100 rojo.
   - Acción: cambiar valor a 25, 50, 85.
   - Assertion: color del arco de progreso cambia según zona. En 85, color rojo + icono de alerta aparece. `aria-valuetext` describe zona ("High").
   - Cobertura: branch de thresholds múltiples + accesibilidad descriptiva.

8. **Formato de valor con unidades (%, °C, MB)** — [Interacción]
   - Setup: gauge con `unit="%"`.
   - Acción: cambiar valor a 75.
   - Assertion: texto central muestra "75%" con sufijo de unidad. Con `decimals=1`, "75.5%". Unidad tiene `aria-hidden` o se incluye en `aria-valuetext`.
   - Cobertura: branch de formato + i18n de separador decimal.

9. **Click en el gauge (interactividad opcional)** — [Interacción]
   - Setup: si el demo tiene handler de click.
   - Acción: click en el centro del SVG.
   - Assertion: emite `gauge-click` event con `detail: { value, percent }`. Cursor `pointer` en hover. `role="button"` si es interactivo; `role="meter"` si solo lectura.
   - Cobertura: branch de interactividad opcional + roles ARIA duales.

10. **Accesibilidad ARIA slider/meter** — [ARIA / a11y]
    - Setup: con axe-core y lector virtual.
    - Acción: scan.
    - Assertion: contenedor tiene `role="meter"` con `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`. Alternativamente `role="progressbar"`. Etiqueta accesible vía `aria-label` o `<label>` asociado. Sin violaciones axe.
    - Cobertura: branch de roles ARIA correctos para gauge.

11. **Teclado: focus, Arrow +/- ajusta valor (si es interactivo)** — [Teclado]
    - Setup: focus en gauge interactivo (`tabindex="0"`).
    - Acción: ArrowRight → ArrowRight → ArrowUp → ArrowDown → Home → End.
    - Assertion: valor aumenta/disminuye según `step`. Home=min, End=max. `aria-valuenow` actualizado en cada cambio. `aria-disabled="true"` si el control está disabled.
    - Cobertura: branch de gauge como slider editable.

12. **Estado disabled** — [Estados visuales]
    - Setup: gauge con atributo `disabled`.
    - Acción: observar.
    - Assertion: opacidad 0.5 (token `--is-opacity-disabled`). `pointer-events: none`. `aria-disabled="true"`. Animación deshabilitada (cambio de valor es instantáneo).
    - Cobertura: branch de estado disabled + accesibilidad.

13. **Loading state (valor aún no calculado)** — [Estados visuales]
    - Setup: gauge sin `value` o con `value=null`.
    - Acción: observar.
    - Assertion: aparece skeleton o placeholder. `aria-busy="true"`. Sin NaN en texto. No rompe layout.
    - Cobertura: branch de loading/null value.

14. **Tema dark/light sin regresión** — [Estados visuales]
    - Setup: tema light activo.
    - Acción: toggle a dark.
    - Assertion: colores del arco y aguja cambian vía tokens `--is-color-gauge-*`. Contraste suficiente del texto central en ambos temas. Sin flash.
    - Cobertura: branch de theming.

15. **Tamaño responsivo (resize viewport)** — [Interacción]
    - Setup: viewport 1920x1080, gauge con width=400px.
    - Acción: resize a 600x400.
    - Assertion: gauge escala correctamente (viewBox preserveAspectRatio). Texto y aguja mantienen proporciones. Sin clipping. Aspect ratio se respeta.
    - Cobertura: branch de responsive SVG.

16. **Múltiples gauges en la misma página** — [Interacción]
    - Setup: demo con 3+ gauges simultáneos (CPU, RAM, Disco).
    - Acción: observar render y rendimiento.
    - Assertion: cada gauge tiene ID único. Eventos scoped por instancia (cambiar CPU no afecta RAM). Sin memory leak al añadir/remover gauges dinámicamente.
    - Cobertura: branch de múltiples instancias + Shadow DOM scoping.

17. **Hover muestra tooltip con valor exacto** — [Interacción]
    - Setup: hover sobre el arco del gauge.
    - Acción: mouseover en diferentes puntos del arco.
    - Assertion: aparece tooltip con valor numérico correspondiente a la posición. Tooltip tiene `role="tooltip"`. Sigue al cursor o se posiciona de forma fija. Se oculta en mouseleave.
    - Cobertura: branch de hover tooltip + posicionamiento.

---

### demo: pivot-table
#### Tests existentes (resumen, brevísimo)
- Render básico de tabla pivoteada con filas/columnas/medidas.
- Sin cobertura específica de: drag & drop de dimensiones a ejes, configuración dinámica, expansión/colapso de grupos, subtotales, exportación, sort, filter, virtualización, accesibilidad de jerarquía, theming.

#### Propuestas nuevas

1. **Render inicial con dimensiones en filas y medidas en valores** — [Interacción]
   - Setup: cargar demo con dataset que tiene configuración pivote (ej. filas=`categoría`, columnas=`mes`, valores=`sum(ventas)`).
   - Acción: observar tabla.
   - Assertion: headers de fila muestran categorías únicas. Headers de columna muestran meses. Body contiene celdas con sumas agregadas. Subtotales por fila/columna si la config lo activa.
   - Cobertura: branch de render base.

2. **Drag & drop de dimensión al eje de filas** — [Interacción]
   - Setup: lista lateral de dimensiones disponibles (chip "Región"); zona drop "Rows".
   - Acción: drag del chip "Región" → drop en zona "Rows".
   - Assertion: "Región" aparece como nueva dimensión de fila. Tabla se re-pivotea. Header de fila se actualiza. `aria-grabbed="true"` durante drag, `aria-dropeffect="move"` en target.
   - Cobertura: branch de drag & drop + re-pivot dinámico.

3. **Drag & drop de dimensión al eje de columnas** — [Interacción]
   - Setup: zona drop "Columns" visible.
   - Acción: drag chip "Trimestre" → drop en "Columns".
   - Assertion: tabla pivotea con trimestre como columna. Headers de columna actualizados. Animación suave en transición (≤ 300ms).
   - Cobertura: branch de cambio de eje.

4. **Cambiar función de agregación (sum → avg → count)** — [Interacción]
   - Setup: chip de medida "Ventas" en zona "Values".
   - Acción: click en chip → menú con opciones "Sum", "Average", "Count", "Min", "Max". Seleccionar "Average".
   - Assertion: valores numéricos en celdas cambian según agregación. Header de columna de medida indica "Avg(Ventas)". Sin recarga de página.
   - Cobertura: branch de cambio de agregación.

5. **Expandir / colapsar grupo jerárquico** — [Interacción]
   - Setup: tabla con jerarquía `Región > Categoría > Producto`.
   - Acción: click en chevron junto a "Europa" → colapsa; click otra vez → expande.
   - Assertion: filas hijas se ocultan/muestran. Chevron rota 90°. `aria-expanded` refleja estado. Subtotales del grupo se ocultan al colapsar.
   - Cobertura: branch de jerarquía + estado collapsed.

6. **Sort de medida en columna pivote** — [Interacción]
   - Setup: columna pivote con valores numéricos.
   - Acción: click en header de medida.
   - Assertion: filas ordenadas asc por valor de medida. Click de nuevo → desc. `aria-sort` actualizado. Icono sort visible.
   - Cobertura: branch de sort sobre medida agregada.

7. **Sort jerárquico preservando agrupamiento** — [Interacción]
   - Setup: jerarquía `Región > Producto`.
   - Acción: aplicar sort por `sum(ventas)` desc.
   - Assertion: dentro de cada Región, productos ordenados desc. Regiones no se reordenan entre sí (mantienen jerarquía). Click en sort de dimensión Región reordena el grupo completo.
   - Cobertura: branch de sort con jerarquía.

8. **Filter por dimensión (lista de valores)** — [Interacción]
   - Setup: dimensión `Región` con filtro.
   - Acción: abrir filtro; desmarcar "Asia"; aplicar.
   - Assertion: filas de "Asia" desaparecen. Subtotales recalculados. Header de filtro muestra icono activo. `aria-label="Filter by Region"`.
   - Cobertura: branch de filter sobre dimensión.

9. **Filtro Top N (top 5 por medida)** — [Interacción]
   - Setup: 20 productos en filas.
   - Acción: aplicar filtro "Top 5 by Ventas".
   - Assertion: solo 5 productos con mayor venta aparecen. Resto agrupados en "Otros" (si aplica) o excluidos. Contador actualizado.
   - Cobertura: branch de Top N filter.

10. **Paginación o virtualización de filas/columnas expandidas** — [Estados visuales]
    - Setup: dataset con 5.000 productos como filas, 12 meses como columnas.
    - Acción: observar render.
    - Assertion: si está paginado, controls de paginación visibles con rows per page. Si está virtualizado, scroll vertical con altura virtual completa. Scroll horizontal para columnas no se rompe.
    - Cobertura: branch de escala + scroll doble.

11. **Export a Excel/CSV con formato pivote** — [Interacción]
    - Setup: tabla pivoteada.
    - Acción: click en "Export".
    - Assertion: archivo descargado con estructura pivoteada (headers de columna, headers de fila, celdas de valor, totales). Compatible con Excel (sheet con celdas merged para headers multi-nivel). Encoding UTF-8 con BOM.
    - Cobertura: branch de exportación preservando estructura.

12. **Subtotales por grupo y gran total** — [Estados visuales]
    - Setup: configuración con subtotales habilitados.
    - Acción: expandir todos los grupos.
    - Assertion: cada grupo tiene fila "Subtotal" con agregado. Última fila/columna tiene "Total" global. Subtotales en negrita, gran total en negrita + fondo distinto (token `--is-color-pivot-total-bg`).
    - Cobertura: branch de subtotales + gran total.

13. **Estado vacío (sin datos tras filter)** — [Estados visuales]
    - Setup: aplicar filter que excluye todo.
    - Acción: observar tabla.
    - Assertion: aparece mensaje "No data to display" en zona de tabla. `role="status"` + `aria-live="polite"`. Icono ilustrativo. Botón "Reset filters" funcional.
    - Cobertura: branch de empty + accesibilidad.

14. **Estado de error (configuración inválida)** — [Estados visuales]
    - Setup: inyectar config inválida (medida sin aggregate function).
    - Acción: cargar demo.
    - Assertion: aparece panel de error con mensaje específico. Tabla no se renderiza. `role="alert"`. Botón "Recargar config".
    - Cobertura: branch de validación de config.

15. **Accesibilidad: estructura ARIA jerárquica** — [ARIA / a11y]
    - Setup: con axe-core y lector virtual.
    - Acción: scan + navegación con teclado.
    - Assertion: contenedor con `role="treegrid"` o `role="table"` con jerarquía. Headers con `aria-level` para indicar profundidad. Celdas con `aria-expanded` en filas padre. Sin violaciones axe. Tabla navegable con lector.
    - Cobertura: branch completo de a11y para tabla pivoteada.

16. **Teclado: navegación por celdas con Arrow + Expand con Right/Left** — [Teclado]
    - Setup: focus en celda de fila padre.
    - Acción: ArrowDown → ArrowDown → ArrowRight (expand) → ArrowDown → ArrowLeft (colapsar).
    - Assertion: foco navega jerárquicamente. ArrowRight expande grupo colapsado. ArrowLeft colapsa grupo expandido. En celda de hoja, ArrowLeft/Right navega entre celdas de misma fila.
    - Cobertura: branch de navegación jerárquica + semántica Right/Left.

17. **Reorden de medida (drag dentro de zona Values)** — [Interacción]
    - Setup: 2 medidas en zona Values: "Ventas", "Unidades".
    - Acción: drag chip "Unidades" sobre "Ventas".
    - Assertion: orden de columnas de medida cambia. Recalcula y re-renderiza. `aria-grabbed` durante drag.
    - Cobertura: branch de reorden interno + drag & drop accesible.

18. **Totales calculados visibles durante hover** — [Interacción]
    - Setup: cursor sobre celda de subtotal.
    - Acción: hover.
    - Assertion: aparece tooltip con detalle: "Suma de 47 filas, promedio=X, min=Y, max=Z". Tooltip `role="tooltip"`. Se oculta en mouseleave/blur.
    - Cobertura: branch de tooltip informativo + estadísticas adicionales.

19. **Performance con 50k filas y 24 columnas pivote** — [Estados visuales]
    - Setup: inyectar dataset de 50.000 transacciones con dimensiones jerárquicas.
    - Acción: observar tiempo de pivote + render.
    - Assertion: cálculo de agregaciones ≤ 2s. Render virtualizado (solo headers + viewport visible). Scroll fluido. Sin memory leak tras 5 minutos de interacción.
    - Cobertura: branch de escala + performance bajo carga.

20. **Tema dark/light sin regresión de legibilidad** — [Estados visuales]
    - Setup: tema light.
    - Acción: toggle dark.
    - Assertion: tokens `--is-bg-pivot`, `--is-color-pivot-header`, `--is-color-pivot-subtotal` se actualizan. Contraste WCAG AA en todos los textos. Subtotales siguen distinguibles. Sin flash.
    - Cobertura: branch de theming + contraste.
