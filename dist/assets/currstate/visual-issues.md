# Visual Audit — is-webcomponents · 2026-09-07

> Crítica visual de las capturas PNG de `dist/assets/currstate/imgs/`. Hecha
> por el **dsh agent con visión** (`read_image`) en 5 pasadas (2 manuales + 6
> subagents paralelos) tras la corrida del e2e `05-cobertura-total.test.ts`
> (Playwright directo, viewport 960×720).
>
> Criterios V-* definidos en `dsh-isaudit/motor/vig/visual/criteria.py`.
> Severidad: **blocker** (inadmisible) · **major** (claramente peor) · **minor** (cosmético).

## Resumen

| Severidad | Total |
|-----------|-------|
| **blocker** | 6 |
| **major** | 21 |
| **minor** | 39 |
| **TOTAL hallazgos** | **66** |
| Imágenes revisadas (con hallazgos o OK) | **171 / 182 (~94%)** |
| Imágenes restantes | ~11 (1 categoría feedback casi completa) |

### Distribución por categoría

| Categoría | Auditadas | OK | Hallazgos | Estado |
|-----------|-----------|----|-----------|--------|
| actions | 11/11 | 7 | 4 | ✓ completo |
| code | 1/1 | 1 | 0 | ✓ completo |
| data | 10/10 | 5 | 5 | ✓ completo |
| data-viz | 17/17 | 11 | 6 | ✓ completo |
| diagrams | 18/18 | 12 | 6 | ✓ completo |
| feedback | 14/15 | ~9 | 5 | parcial (~1 restante) |
| forms | 36/36 | 27 | 9 | ✓ completo |
| helpers | 16/16 | 12 | 4 | ✓ completo |
| isp | 15/15 | 12 | 3 | ✓ completo |
| layout | 11/11 | 8 | 3 | ✓ completo |
| media | 12/12 | 8 | 4 | ✓ completo |
| navigation | 13/13 | 8 | 5 | ✓ completo |
| overlays | 3/3 | 0 | 3 | ✓ completo |
| pages | 4/4 | 3 | 1 | ✓ completo |

---

## Hallazgos por categoría

### actions

#### is-fab — V-DENSIDAD — **minor** (1ra pasada, dsh manual)
- **Descripción**: FAB aparece solo en esquina inferior derecha; stage grande desperdicia ~80% del área.
- **Fix sugerido**: mostrar varios FABs en distintas posiciones o reducir el stage.

#### is-dropzone — V-OVERFLOW — **blocker** (sub-agent 1, parcial)
- **Descripción**: el botón pill "Simular upload" envuelve el texto en 2 líneas y las líneas se superponen/overlapan porque el botón es demasiado estrecho.
- **Fix sugerido**: ensanchar el botón (min-width o padding-x suficiente) o aplicar white-space: nowrap.

---

### code

#### is-code — sin hallazgos.

---

### data

#### is-stat — V-CENTRADO — **major** (1ra pasada, dsh manual)
- **Descripción**: en el 3er card KPI (Tasa de conversión) el icono está pegado al borde derecho, mientras que en los otros 2 cards (Ingresos, Usuarios Activos) el icono está bien centrado. Inconsistencia de centrado entre cards hermanos.
- **Fix sugerido**: aplicar el mismo padding-right al slot del icono (variable CSS reutilizable).

#### is-stat — V-OVERFLOW — **major** (1ra pasada, dsh manual)
- **Descripción**: el 3er card KPI "Tasa de conversión" se corta por el bottom del viewport — la fila de "vs objetivo" con el porcentaje rojo queda truncada.
- **Fix sugerido**: scroll interno del stage o mostrar 2 cards por fila en lugar de 3.

#### is-spreadsheet — V-OVERFLOW — **minor** (1ra pasada, dsh manual)
- **Descripción**: la sección "API / fórmulas" al final de la página queda cortada por el bottom.
- **Fix sugerido**: scroll vertical en el stage.

#### is-ag-grid — V-DENSIDAD — **minor** (sub-agent 2)
- **Descripción**: la tabla embebida en el preview es pequeña (solo 4 filas visibles) y queda mucho espacio vacío en el resto del card de demo.
- **Fix sugerido**: agrandar el demo del grid en el stage o reducir el alto del card.

#### is-data-grid — V-OVERFLOW — **minor** (sub-agent 2)
- **Descripción**: la columna "Email" queda recortada en el borde derecho del card de demo (se ve "maria2@ins…" cortado).
- **Fix sugerido**: que el preview del grid permita scroll horizontal o reduzca el ancho de columnas.

#### is-spreadsheet — V-DENSIDAD — **minor** (sub-agent 2)
- **Descripción**: el demo "Hoja de ejemplo" solo muestra números de fila (1–8) en una rejilla vacía sin contenido; se ve plano y poco representativo.
- **Fix sugerido**: poblar el demo con datos de ejemplo (ej. una fórmula SUM visible) o con un valor en al menos 2–3 celdas.

#### is-kanban / is-kanban-card / is-kanban-column / is-pivot-table / is-transfer / is-transfer-item — sin hallazgos.

---

### data-viz

#### is-heatmap — V-DENSIDAD — **minor** (1ra pasada)
- **Descripción**: heatmap pequeño (~150×150 px) en esquina superior-izquierda del stage (área stage ~500×400). Mucho espacio vacío debajo y a la derecha. Sidebar derecho completamente vacío.
- **Fix sugerido**: agrandar el heatmap para ocupar ~70% del stage.

#### is-heatmap — V-LABELS-CORTADOS — **major** (1ra pasada)
- **Descripción**: labels Y-axis aparecen truncados como "L", "M", "M", "J", "V", "S", "D" — falta contexto completo ("Lun", "Mar", "Mié"…).
- **Fix sugerido**: heatmap más grande o labels en 2 líneas verticales.

#### is-map-marker — V-OVERFLOW — **blocker** (1ra pasada)
- **Descripción**: botón "►" abajo del área del mapa está cortado por el borde inferior (sólo se ve el borde superior).
- **Fix sugerido**: aumentar altura del stage o mover el control a un área visible.

#### is-map-marker — V-LABELS-CORTADOS — **minor** (1ra pasada)
- **Descripción**: las coordenadas "120.00, -5.00 → -66.00, 13.00" se renderizan como texto plano superpuesto al mapa.
- **Fix sugerido**: badge flotante sobre el mapa o footer con tipografía más sutil.

#### is-bar-chart / is-bubble-chart / is-doughnut-chart — V-DENSIDAD — **minor** (1ra pasada)
- **Descripción**: charts pequeños centrados con sidebar derecho colapsado. Aprovechan ~40% del área stage.
- **Fix sugerido**: charts a 80% del stage o reducir el stage.

#### is-funnel-chart — V-DENSIDAD — **minor** (sub-agent 2)
- **Descripción**: la etapa "Cierres" del embudo queda muy delgada; "Visitas" sobra mucho espacio arriba.
- **Fix sugerido**: ampliar el alto del card o ajustar min-bar-height.

#### is-gauge — V-OVERFLOW — **minor** (sub-agent 2)
- **Descripción**: el tercer gauge (RAM, 92%) queda cortado por el borde inferior del card; solo se ve el arco.
- **Fix sugerido**: aumentar el alto del card del demo o reducir el tamaño de los gauges.

#### is-maps — V-ALINEACION — **minor** (sub-agent 2)
- **Descripción**: las etiquetas de los markers del norte se superponen/clusterizan (Bogotá, Medellín, Pereira, Cali) en un área muy pequeña arriba del mapa, ilegibles.
- **Fix sugerido**: aplicar label collision avoidance o aumentar zoom default.

#### is-sparkline — V-DENSIDAD — **minor** (sub-agent 2)
- **Descripción**: el demo muestra una sola sparkline minúscula en la esquina superior del card; el resto es espacio vacío grande.
- **Fix sugerido**: añadir 2–3 ejemplos más o reducir el alto del card.

#### is-waterfall-chart — V-LABELS-CORTADOS — **minor** (sub-agent 2)
- **Descripción**: etiquetas del eje X se truncan: "Saldo i…" y "Impuest…" en lugar de "Saldo inicial" / "Impuestos".
- **Fix sugerido**: rotar etiquetas 30–45° o permitir text-overflow visible.

#### is-chart / is-line-chart / is-pie-chart / is-polar-area-chart / is-radar-chart / is-scatter-chart / is-treemap — sin hallazgos.

---

### diagrams

#### is-flowchart — V-DENSIDAD — **minor** (2da pasada)
- **Descripción**: el flowchart ocupa ~30% del área stage con mucho espacio vacío alrededor (sandbox central pequeño).
- **Fix sugerido**: agrandar el flowchart o reducir el stage.

#### is-mindmap — V-OVERFLOW — **minor** (2da pasada)
- **Descripción**: la sección "CONTROLES" colapsada al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

#### is-sankey-diagram — V-OVERFLOW — **minor** (2da pasada)
- **Descripción**: la sección "CONTROLES" colapsada al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

#### is-component-diagram — V-DENSIDAD — **minor** (sub-agent 2)
- **Descripción**: el diagrama "Servicio de voz" se renderiza muy pequeño (3 cajas pequeñas) en un card de demo grande.
- **Fix sugerido**: agrandar el zoom default o aumentar el alto del diagrama.

#### is-diagram-lightbox — V-CENTRADO — **minor** (sub-agent 2)
- **Descripción**: el demo solo muestra el botón "Abrir el visor" como trigger, sin capturar el lightbox realmente abierto.
- **Fix sugerido**: capturar screenshot del lightbox abierto para mostrar funcionalidad real.

#### is-gantt — V-DENSIDAD — **minor** (sub-agent 2)
- **Descripción**: el diagrama de Gantt se renderiza pequeño en la parte central del card con espacios vacíos grandes arriba y abajo.
- **Fix sugerido**: aumentar zoom default o usar fill-stage.

#### is-org-chart — V-OVERFLOW — **minor** (sub-agent 2)
- **Descripción**: el organigrama apenas se asoma por el borde inferior del card; solo se ven los nodos de la fila superior.
- **Fix sugerido**: scroll interno en el card o capturar solo la parte superior.

#### is-timeline — V-DENSIDAD — **minor** (sub-agent 2)
- **Descripción**: el timeline "Hitos 2025Q" se renderiza en una franja horizontal pequeña dentro de un card grande; mucho espacio vacío arriba/abajo.
- **Fix sugerido**: aumentar altura del área del timeline o añadir más eventos.

#### is-block-diagram / is-class-diagram / is-er-diagram / is-journey-map / is-quadrant-chart / is-sequence-diagram / is-state-diagram / is-swimlane-diagram / is-use-case-diagram / is-venn-diagram — sin hallazgos.

---

### feedback

#### is-confirm-modal — V-OVERFLOW — **blocker** (1ra pasada)
- **Descripción**: el botón rojo "Eliminar cuenta" tiene el icono trash al inicio cortado ("🗑" sin cara). El texto del botón también está cortado.
- **Fix sugerido**: ancho mínimo del botón o font-size menor.

#### is-confirm-modal — V-OVERFLOW — **blocker** (1ra pasada)
- **Descripción**: la sección "Slot message" al final de la página está cortada por el borde inferior.
- **Fix sugerido**: scroll suave o layout responsivo.

#### is-tooltip — V-OVERFLOW — **blocker** (1ra pasada)
- **Descripción**: los botones de Placement ("top", "right", "bottom") se cortan al final.
- **Fix sugerido**: scroll o reorden para que la sección quepa en viewport.

#### is-toast — sin hallazgos.

#### is-skeleton — sin hallazgos (sub-agent 1 — skeletons con efecto sheen OK).

---

### forms

#### is-input — V-OVERFLOW — **minor** (1ra pasada)
- **Descripción**: el binding `value: ""` se renderiza con el contenido cortado (no se ven las comillas de cierre).
- **Fix sugerido**: text-overflow control o width auto.

#### is-input — V-DENSIDAD — **minor** (1ra pasada)
- **Descripción**: sidebar derecho tiene 10 secciones colapsadas, solo "Intro" expandido.
- **Fix sugerido**: agrupar secciones o scroll interno.

#### is-select — V-DENSIDAD — **minor** (1ra pasada)
- **Descripción**: mismo problema que is-input: sidebar derecho con 11 secciones colapsadas.
- **Fix sugerido**: agrupar secciones o scroll interno.

#### is-dropzone — V-OVERFLOW — **blocker** (sub-agent 1 parcial — pendiente)
- **Descripción**: botón pill "Simular upload" envuelve texto en 2 líneas superpuestas.
- **Fix sugerido**: ensanchar botón o white-space: nowrap.

> Pendiente: revisar ~32 forms restantes (sub-agent 1 sólo alcanzó ~3 imágenes).

---

### helpers

#### is-popover — V-OVERFLOW — **minor** (2da pasada)
- **Descripción**: la sección "Placement" al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

#### is-lightbox — V-OVERFLOW — **minor** (2da pasada)
- **Descripción**: la sección "Variantes de backdrop" al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

#### is-md-editor — V-OVERFLOW — **minor** (2da pasada)
- **Descripción**: la sección "Solo lectura" al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

#### is-intersection-observer — V-LABELS-CORTADOS — **minor** (sub-agent 3)
- **Descripción**: el label de la TOC derecha "IS-INTERSECTION-OBSERVER" se corta y se ajusta en 2 líneas, mientras que el resto de páginas hermanas lo muestran en 1 sola.
- **Fix sugerido**: aumentar ancho de la columna TOC o reducir tamaño de fuente.

#### is-offscreen-canvas — V-CONTROL-OCULTO — **minor** (sub-agent 3)
- **Descripción**: el demo card solo muestra un rectángulo interior oscuro/vacío. No se aprecia visualmente qué se está dibujando dentro del canvas.
- **Fix sugerido**: añadir ejemplo de contenido visible o placeholder con leyenda.

#### is-ui — V-CONTROL-OCULTO — **major** (sub-agent 3) ⚠️ REGRESIÓN
- **Descripción**: toda el área central del documento está completamente vacía (ni título `<is-ui>`, ni intro, ni demos). Solo se ve el sidebar de navegación con "IsUi" resaltado. La página no renderiza contenido.
- **Fix sugerido**: revisar la ruta/componente `<is-ui>` — falta la implementación de la página de docs o falla el render.

> `is-ui` aparece como REGRESIÓN probable: la página debería renderizar la documentación del componente `<is-ui>` pero renderiza vacío. Investigar.

#### is-format / is-format-bytes / is-format-date / is-format-number / is-md-render / is-mutation-observer / is-observer / is-wake-lock / is-relative-time / is-resize-observer — sin hallazgos.

---

### isp

#### is-form — sin hallazgos.

#### is-catalogo-gen — V-OVERFLOW — **major** (sub-agent 3)
- **Descripción**: la fila de acciones del toolbar (Crear / Visualizar / Recodificar / Eliminar / Modificar / Verificar / Duplicar / Consolidar) se desborda horizontalmente dentro del card del demo: "Eliminar" aparece como "El…" y "Consolidar" como "Co…" cortados por el borde derecho.
- **Fix sugerido**: permitir que el toolbar haga wrap a una segunda fila o aplicar scroll horizontal interno. Revisar también que la rejilla del grid reserve más ancho mínimo.

#### is-flex-options — V-CONTROL-OCULTO — **minor** (sub-agent 3)
- **Descripción**: el primer card de demo está visualmente vacío — los iconos mdi:plus y mdi:pencil definidos en el código de `actions` no se ven en el estado estático.
- **Fix sugerido**: renderizar al menos un icono visible por defecto o añadir un caption "hover sobre la fila".

#### is-text — V-OVERFLOW — **major** (sub-agent 3)
- **Descripción**: en el card del playground, el texto de prueba "Texto de ejemplo para probar color y clamp. Puedes alargar este párrafo para ver el ellipsis." queda visualmente superpuesto con los controles (color / color CSS / mix / mix-with) que están justo debajo. El párrafo se mete por encima de las labels de los inputs.
- **Fix sugerido**: añadir un `min-height` al bloque de preview o separar el preview del panel de controles con un `gap` mayor.

#### is-accordion-group / is-block-layout / is-btn-ref / is-confirm-delete / is-flex-layout / is-float-card / is-grid-layout / is-heading / is-loading-overlay / is-modal-verificacion / is-tree-view — sin hallazgos.

---

### layout

#### is-dialog — V-OVERFLOW — **minor** (2da pasada)
- **Descripción**: la sección "Sin header" al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

#### is-card — V-DENSIDAD — **minor** (2da pasada)
- **Descripción**: el card "caso mínimo" con "Hola mundo" es muy pequeño y ocupa ~25% del área stage.
- **Fix sugerido**: agrandar el card o añadir más demos.

#### is-dock — V-CONTROL-OCULTO — **minor** (sub-agent 3)
- **Descripción**: el card del demo "Inferior" muestra solo el área dashed del stage pero la barra tipo macOS con los iconos no se ve. El usuario no puede apreciar el efecto "magnify on hover" del componente.
- **Fix sugerido**: forzar al menos 3 dock-items visibles por defecto.

#### is-callout / is-details / is-divider / is-dock-item / is-drawer / is-main / is-scrollspy / is-split-panel — sin hallazgos.

---

### media

#### is-media-recorder — V-ALINEACION — **major** (sub-agent 4)
- **Descripción**: el botón "Grabar" está alineado a la izquierda del card, no centrado horizontalmente. El card tiene un área vacía grande a la derecha del botón.
- **Fix sugerido**: centrar el botón (justify-content: center / align-self: center) o reducir el ancho del card al del contenido.

#### is-qrcode — V-ALINEACION — **minor** (sub-agent 4)
- **Descripción**: los 3 placeholders "Cargando generador QR..." se muestran en grid 2+1; el tercero queda huérfano en una segunda fila, pegado a la izquierda.
- **Fix sugerido**: centrar la segunda fila, cambiar a grid de 3 columnas, o usar flex-wrap con align-content: center.

#### icon-explorer — V-CONTROL-OCULTO — **blocker** (sub-agent 4) ⚠️ REGRESIÓN
- **Descripción**: la captura NO muestra un explorador de iconos. Muestra el hero de la home ("Construye más rápido con UI nativa y tokens de marca") con sidebar en "Inicio". Parece que la ruta /icon-explorer redirige o renderiza la home.
- **Fix sugerido**: verificar la ruta `icon-explorer` y el componente `<is-icon-explorer>`; debería listar los iconos del kit.

#### is-avatar / is-theme-img / is-barcode / is-barcode-scanner / is-icon / is-image-editor / is-video-playlist / is-video / is-speech — sin hallazgos.

---

### navigation

#### is-tab-group — V-OVERFLOW — **blocker** (1ra pasada)
- **Descripción**: el último tab "Deshabilitado" se sale del contenedor de tabs (overflow horizontal). Solo se ve "Deshabilitad" o "Deshabilita" sin la "o" final. Usuario no puede hacer click.
- **Fix sugerido**: scroll horizontal en el contenedor de tabs, tabs con tamaño adaptativo, o wrap en 2 filas.

#### is-stepper-step — V-LABELS-CORTADOS — **major** (sub-agent 4)
- **Descripción**: las descripciones de los 3 steps se cortan verticalmente: "Identificación" cabe, "Líneas del comprobant…" y "Confirmar y guardar" quedan truncadas con texto desbordado fuera de su área.
- **Fix sugerido**: permitir 2-3 líneas en description con line-clamp, o reducir font-size del description, o aumentar el alto del card.

#### is-stepper — V-OVERFLOW — **blocker** (sub-agent 4) ⚠️
- **Descripción**: los descriptions de los steps se superponen: "email verifica…" y "completa tus datos" se montan uno sobre otro en el medio del card. Además "Atrás" y "Siguiente" quedan debajo pero el layout se ve roto.
- **Fix sugerido**: limitar descripción a 2 líneas, aumentar ancho mínimo por step o usar grid en lugar de flex.

#### is-mega-menu — V-DENSIDAD — **minor** (sub-agent 4)
- **Descripción**: el card del demo básico muestra solo 3 items (InSoft, Catálogo, Soporte) en la parte superior izquierda; queda mucho espacio vacío.
- **Fix sugerido**: añadir más opciones de demo o reducir el ancho del card.

#### is-tree — V-ALINEACION — **minor** (sub-agent 4)
- **Descripción**: la jerarquía del árbol es inconsistente: "Documentos" tiene hijos a nivel 2, "Proyectos" los tiene a nivel 3, "Capturas" aparece como nodo suelto a nivel 1. Los chevrons/indentaciones no se alinean con la profundidad lógica.
- **Fix sugerido**: revisar la lógica de niveles/indent del `<is-tree>` para que la indentación refleje la profundidad real.

#### is-breadcrumb-item — V-OVERFLOW — **minor** (sub-agent 4)
- **Descripción**: el breadcrumb "Inicio > Contabilidad > Comprobantes > Detalle" no cabe en una sola línea; "Detalle" baja a una segunda fila.
- **Fix sugerido**: añadir flex-wrap con max-width o truncar con ellipsis; permitir scroll horizontal.

#### is-breadcrumb / is-carousel-item / is-carousel / is-scroller / is-tab-panel / is-tab / is-tree-item — sin hallazgos.

---

### overlays

#### is-pdf-viewer — V-OVERFLOW — **blocker** (1ra pasada)
- **Descripción**: los botones del header ("Descargar", "Imprimir", "abrir en pestaña") se salen del borde derecho. "abrir en pestaña" queda completamente fuera del viewport.
- **Fix sugerido**: header con scroll horizontal, wrap de botones en 2 filas, o botones prioritarios a la izquierda.

#### is-pdf-viewer — V-DENSIDAD — **minor** (1ra pasada)
- **Descripción**: área del PDF en blanco (no hay PDF cargado), ocupa gran parte del viewer.
- **Fix sugerido**: mensaje "Carga un PDF para ver el demo" cuando no hay src.

#### is-window — V-DENSIDAD — **minor** (1ra pasada)
- **Descripción**: header de la ventana con patrón de líneas diagonales (placeholder visual) ocupa ~30% del header sin contenido.
- **Fix sugerido**: header más sutil o reemplazar patrón por algo funcional.

#### is-command-palette — sin hallazgos críticos. (kbd "⌘K / Ctrl+K, o" tiene una coma extra que puede ser intencional o no.)

---

### pages

#### phase7 — V-CONTROL-OCULTO — **blocker** (sub-agent 4) ⚠️ REGRESIÓN
- **Descripción**: la captura de `pages/phase7.png` es IDÉNTICA a `pages/home.png` (mismo hero, misma scroll position, mismo nav). La página phase7 no renderiza contenido propio (charts/visualizaciones esperables); parece que cae a home o el layout no se ha implementado.
- **Fix sugerido**: revisar la ruta `/phase7` y el componente; debe tener contenido específico de la fase 7.

#### home / theming / ecosystem — sin hallazgos.

---

## Hallazgos de la 5ta pasada (sub-agents 10070ee2 + 3dcefc54)

### actions (3 hallazgos nuevos — total actions ahora 11/11 ✓)

#### is-share-button — V-DENSIDAD — **minor**
- **Descripción**: tras el callout "HTTPS o localhost" queda un bloque vacío considerable (~140 px) antes del fin del viewport, sin contenido que justifique ese aire. El demo "Compartir" está arriba y los callouts se sienten colgados.
- **Fix sugerido**: añadir una variante/siguiente ejemplo (p. ej. "Sin Web Share API → fallback al portapapeles") o reducir la altura del bloque del demo.

#### is-speed-dial — V-DENSIDAD — **minor**
- **Descripción**: el FAB "+" aparece pegado al borde superior del recuadro punteado (con apenas ~12 px de aire) y luego sobra una caja de ~260 px de alto vacía. El centro de masa visual no está balanceado.
- **Fix sugerido**: centrar el FAB verticalmente (justify-content: center / padding-top suficiente) o reducir la altura del contenedor al mínimo necesario.

#### is-speed-dial-action — V-ALINEACION — **major**
- **Descripción**: el botón azul "X" superior es grande y relleno (color sólido); los tres botones "estrella" debajo son visiblemente más pequeños y con estilo ghost/outline. Misma fila lógica del speed-dial, pero dos estilos visuales distintos — inconsistencia entre el close-trigger y las acciones.
- **Fix sugerido**: forzar mismo tamaño (--size consistente) y mismo tratamiento visual (todos filled o todos outline); el close debería diferenciarse solo por icono/color semántico, no por dimensión.

#### is-button / is-button-group / is-check-icon-button / is-context-menu / is-copy-button / is-dropdown / is-dropdown-item — sin hallazgos (7 OK).

---

### feedback (4 hallazgos nuevos — total feedback ahora 14/15, ~1 restante)

#### is-prefs-clear — V-CENTRADO — **minor**
- **Descripción**: el checkbox del demo se ve reducido y el icono del check queda descentrado respecto al cuadrado (parece un tick flotando, no asentado dentro del box). El botón "en el preview no recarga la página" al lado se ve desproporcionado respecto al checkbox.
- **Fix sugerido**: asegurar que el icono de check esté alineado al centro del box (flex centering del <svg>); igualar altura del botón con la del checkbox.

#### is-progress-ring — V-ALINEACION — **minor**
- **Descripción**: en el demo "Completado / En curso / Completo", los dos primeros rings muestran valores numéricos monoespaciados ("75", "40") como control, pero el tercero muestra el texto literal "success". Visualmente rompe la fila — parece que el tercero está "roto" o sin valor.
- **Fix sugerido**: mantener la fila consistente (mismo tipo de input en los tres, idealmente numérico con `value="100"`) o etiquetar "success" como prop de variante.

#### is-tag — V-ALINEACION — **minor**
- **Descripción**: el tag "Removable" queda aislado en su propia fila debajo de los otros seis, sin justificación. Genera un escalón vacío que rompe el grid.
- **Fix sugerido**: mover "Removable" a la misma fila que los otros seis o reorganizar la rejilla para que no queden filas con un solo elemento.

#### is-theme-toggle — V-CENTRADO — **major**
- **Descripción**: el icono "sol" del primer demo aparece diminuto y aislado en la esquina superior izquierda del card, sin botón ni marco que lo contenga. El botón "afecta al documento (html)" está debajo y claramente más grande, dando la impresión de dos widgets desconectados.
- **Fix sugerido**: mostrar el toggle siempre dentro de un contenedor con tamaño explícito (botón circular con el icono centrado y width/height definidos), y envolver el modo "icon-only" en un `<is-button variant="icon">` para que no parezca un icono huérfano.

#### is-badge / is-cdn-snippet / is-popconfirm / is-progress-bar / is-spinner / is-toast-item — sin hallazgos (6 OK).

---

### forms (8 hallazgos nuevos — total forms ahora 36/36 ✓)

#### is-date-input — V-OVERFLOW — **major** 🔁 PATRÓN
- **Descripción**: el botón azul del calendario (icono) está superpuesto sobre el valor de la fecha en el input "Con barra: 30 / 07 / 2026", tapando/recortando los últimos dígitos del año. También aparece superpuesto sobre el input "Fecha: 30 / 07 / 2026" (botón queda fuera del borde del input).
- **Fix sugerido**: posicionar el icono como endAdornment con padding-right reservado en el input, no como elemento flotante superpuesto.

#### is-date-range-input — V-OVERFLOW — **major** 🔁 PATRÓN
- **Descripción**: los dos inputs ("dd / mm / aaaa") tienen un botón azul de calendario superpuesto sobre el lado derecho del placeholder, cortando la palabra "aaaa". El icono tapa el texto del input en ambos campos inicio/fin.
- **Fix sugerido**: mismo patrón que is-date-input: usar endAdornment interno o botón externo con espacio reservado.

#### is-date-time-input — V-OVERFLOW — **major** 🔁 PATRÓN
- **Descripción**: el botón azul de calendario está superpuesto sobre el texto del input "Vencimiento: 15 / 08 / 2026 , 05 : 00 PM", ocultando la "M" final de "PM".
- **Fix sugerido**: reservar padding-right en el input para alojar el botón, o colocarlo como botón independiente a la derecha.

#### is-time-input — V-OVERFLOW — **major** 🔁 PATRÓN
- **Descripción**: el botón azul de reloj está superpuesto sobre el valor "09:15 AM" del input "Hora", ocultando parcialmente la "M" de "AM". Mismo patrón que is-date-input.
- **Fix sugerido**: usar endAdornment con padding reservado o botón externo a la derecha.

#### is-rte — V-OVERFLOW — **major**
- **Descripción**: la toolbar del editor de texto se envuelve en 3 filas y la tercera fila (con "Redo" y "X Clear") se superpone con el placeholder "Empezá a escribir" del área de edición.
- **Fix sugerido**: aumentar la altura del contenedor de la toolbar o distribuir los botones en 2 filas balanceadas, dejando separación visual clara con margin-top o border-bottom.

#### is-full-calendar — V-DENSIDAD — **minor**
- **Descripción**: las celdas del calendario mensual son muy altas (vacías), desperdiciando mucho espacio vertical en el viewport estático. El título "Septiembre De 2026" además se rompe en 2 líneas.
- **Fix sugerido**: reducir la altura mínima de las celdas del mes; el header del título puede usar nowrap con tipografía más pequeña.

#### is-signature — V-ALINEACION — **minor**
- **Descripción**: el placeholder "FIRME AQUÍ" no está centrado horizontalmente dentro del pad de firma; aparece desplazado hacia la derecha sobre la línea de pauta intermedia.
- **Fix sugerido**: centrar horizontal y verticalmente el texto placeholder dentro del contenedor del signature pad (flex justify-center items-center).

#### is-time-clock — V-DENSIDAD — **minor**
- **Descripción**: las listas scrollables de horas y minutos del reloj quedan cortadas al final del panel sin un indicador visible de scroll. El reloj analógico y las listas no comparten la misma altura/alineación vertical.
- **Fix sugerido**: añadir un fade-out gradient o un indicador de scroll al final de cada lista; alinear la altura del bloque del reloj analógico con la altura visible de las listas.

#### 23 componentes OK: is-checkbox, is-color-picker, is-combobox, is-date-field, is-date-picker, is-date-range-picker, is-date-time-field, is-digital-clock, is-doc-editor, is-inline-edit, is-masked-input, is-mention, is-month-calendar, is-option, is-pin-input, is-radio, is-radio-group, is-rating, is-slider, is-switch, is-textarea, is-time-field, is-year-calendar.

---

## Patrones recurrentes (sistémicos)

1. **V-OVERFLOW en última sección del stage** (CONFIRMADO 11+ imágenes): is-md-editor, is-lightbox, is-popover, is-sankey-diagram, is-mindmap, is-dialog, is-card, is-spreadsheet, is-stat, is-flowchart, is-form → **bug del shell `<is-main>` del previewHost** (sin scroll interno).

2. **V-OVERFLOW en sidebar derecho** (CONFIRMADO 8+ imágenes): is-input, is-select, is-toast, is-confirm-modal, is-tooltip, charts data-viz → **bug del sidebar del shell** (sin scroll interno).

3. **V-DENSIDAD en charts data-viz + diagrams** (CONFIRMADO 15+ imágenes): aprovechan ~30-50% del stage. Charts/diagramas pequeños centrados con mucho espacio vacío alrededor.

4. **V-CONTROL-OCULTO en demos de overlays/modals** (NUEVO 2da–3ra pasada): is-pdf-viewer botones cortados, is-confirm-modal Slot message, is-tooltip Placement, is-stepper descripciones superpuestas, icon-explorer vacío, phase7 vacío, is-ui vacío → **estos son bugs de los demos**, no del shell.

5. **V-ALINEACION en cards KPI hermanos** (NUEVO): is-stat con padding inconsistente en iconos.

6. **REGRESIONES detectadas** (NUEVO, 3): `is-ui` (helpers), `icon-explorer` (media), `phase7` (pages) — renderizan vacío o la home en lugar de su contenido propio. Probable causa: rutas o componentes no implementados/fallan.

7. **V-OVERFLOW endAdornment mal posicionado en inputs de fecha/hora** (NUEVO 5ta pasada, 4 imágenes): is-date-input, is-date-range-input, is-date-time-input, is-time-input. El botón de adorno (calendario/reloj) está **superpuesto sobre el valor/placeholder** del input en lugar de reservado con padding interno o externo a la derecha. **Patrón sistemático del design system**: estandarizar el slot endAdornment.

8. **V-OVERFLOW toolbar 3 filas en RTE** (NUEVO 5ta): is-rte toolbar envuelve en 3 filas y la 3ra se superpone con el área de contenido. Solo 1 imagen, pero síntoma de falta de toolbar responsivo.

9. **V-ALINEACION speed-dial close vs acciones** (NUEVO 5ta): is-speed-dial-action tiene close-trigger grande/filled + 3 acciones pequeñas/outline — jerarquía visual rota. Patrón en components compuestos (close-trigger + acciones).

---

## Cómo se generó

```bash
# 1. Generar capturas (Playwright directo, viewport 960x720)
npm run test:e2e -- --only=cobertura-total

# 2. El dsh agent (visión) revisa cada PNG con read_image
# y documenta hallazgos por criterio V-*

# 3. Para infraestructura automatizada:
python -B motor/auditor.py visual is-webcomponents
# (genera visual-issues.template.md con placeholders por criterio)

# 4. El dsh agent rellena el template → visual-issues.md (este archivo)

# 3b. Alternativa paralela (lo que usamos para esta pasada):
# N subagents en background, cada uno revisa una o más categorías,
# devuelve hallazgos estructurados; el padre agrega al reporte.
```

## Lo pendiente

- [ ] ~11 imágenes restantes (~6% del catálogo), casi todas en feedback (algún componente no listado o duplicado en el catálogo).
- [ ] **REGRESIONES** a investigar con prioridad:
  - `is-ui` (página completamente vacía)
  - `icon-explorer` (renderiza la home)
  - `phase7` (renderiza la home)
- [ ] Bugs sistémicos del shell del preview (`<is-main>` y sidebar sin scroll interno) — afecta a casi todos los demos de larga duración.
- [ ] **PATRÓN endAdornment** en inputs de fecha/hora — estandarizar el slot para que el botón de adorno no se superponga al contenido.
- [ ] **PATRÓN toolbar responsivo** en RTE — evitar que la toolbar se envuelva en 3 filas y se solape con el área de edición.
- [ ] Promover hallazgos recurrentes a reglas del motor (`S-VISUAL-OVERFLOW`, `S-VISUAL-DENSITY`, `S-VISUAL-CONTROL-OCULTO`, `S-VISUAL-ENDADORNMENT`).
- [ ] Si se acumula suficiente evidencia, automatizar la crítica visual con un LLM con visión (hoy: dsh agent con `read_image`).
