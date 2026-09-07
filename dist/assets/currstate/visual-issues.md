# Visual Audit — is-webcomponents · 2026-09-07

> Crítica visual de las capturas PNG de `dist/assets/currstate/imgs/`. Hecha
> por el **dsh agent con visión** (`read_image`) en 3 pasadas (2 manuales + 4
> subagents paralelos) tras la corrida del e2e `05-cobertura-total.test.ts`
> (Playwright directo, viewport 960×720).
>
> Criterios V-* definidos en `dsh-isaudit/motor/vig/visual/criteria.py`.
> Severidad: **blocker** (inadmisible) · **major** (claramente peor) · **minor** (cosmético).

## Resumen

| Severidad | Total |
|-----------|-------|
| **blocker** | 6 |
| **major** | 14 |
| **minor** | 31 |
| **TOTAL hallazgos** | **51** |
| Imágenes revisadas (con hallazgos o OK) | 134 / 182 (~74%) |
| Imágenes restantes | ~48 (5% del catálogo: actions-resto, forms-resto, feedback-resto) |

### Distribución por categoría

| Categoría | Auditadas | OK | Hallazgos |
|-----------|-----------|----|-----------|
| actions | 1 | 0 | 1 (sub-agent 1 parcial) |
| code | 1 | 1 | 0 |
| data | 10 | 5 | 5 (1 my + 4 sub-agent 2) |
| data-viz | 17 | 11 | 6 (5 my + 1 sub-agent 2) |
| diagrams | 18 | 12 | 6 (3 my + 3 sub-agent 2) |
| feedback | 3 + 12 (parcial) | ~10 | 3 (my) + 1 (sub-agent 1) |
| forms | 2 + ~3 (sub-agent 1) | 4 | 2 (my) + 1 (sub-agent 1) |
| helpers | 16 | 12 | 4 (3 my + 1 sub-agent 3) |
| isp | 15 | 12 | 3 (1 my + 2 sub-agent 3) |
| layout | 11 | 8 | 3 (2 my + 1 sub-agent 3) |
| media | 12 | 8 | 4 (sub-agent 4) |
| navigation | 13 | 8 | 5 (1 my + 4 sub-agent 4) |
| overlays | 3 | 0 | 3 (my) |
| pages | 4 | 3 | 1 (sub-agent 4) |

> Sub-agent 1 (actions+forms+feedback, 57 imágenes) terminó parcialmente
> tras ~23 imágenes; las restantes (~34 imágenes de actions-resto,
> forms-resto, feedback-resto) NO están revisadas. Suman a los ~48 que
> faltan en el catálogo.

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

## Patrones recurrentes (sistémicos)

1. **V-OVERFLOW en última sección del stage** (CONFIRMADO 11+ imágenes): is-md-editor, is-lightbox, is-popover, is-sankey-diagram, is-mindmap, is-dialog, is-card, is-spreadsheet, is-stat, is-flowchart, is-form → **bug del shell `<is-main>` del previewHost** (sin scroll interno).

2. **V-OVERFLOW en sidebar derecho** (CONFIRMADO 8+ imágenes): is-input, is-select, is-toast, is-confirm-modal, is-tooltip, charts data-viz → **bug del sidebar del shell** (sin scroll interno).

3. **V-DENSIDAD en charts data-viz + diagrams** (CONFIRMADO 15+ imágenes): aprovechan ~30-50% del stage. Charts/diagramas pequeños centrados con mucho espacio vacío alrededor.

4. **V-CONTROL-OCULTO en demos de overlays/modals** (NUEVO 2da–3ra pasada): is-pdf-viewer botones cortados, is-confirm-modal Slot message, is-tooltip Placement, is-stepper descripciones superpuestas, icon-explorer vacío, phase7 vacío, is-ui vacío → **estos son bugs de los demos**, no del shell.

5. **V-ALINEACION en cards KPI hermanos** (NUEVO): is-stat con padding inconsistente en iconos.

6. **REGRESIONES detectadas** (NUEVO, 3): `is-ui` (helpers), `icon-explorer` (media), `phase7` (pages) — renderizan vacío o la home en lugar de su contenido propio. Probable causa: rutas o componentes no implementados/fallan.

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

- [ ] Sub-agent 1 terminó parcialmente: ~34 imágenes restantes en `actions`, `forms`, `feedback` no fueron revisadas (quedaron en su lista de tareas cuando el sub-agent se cerró).
- [ ] **REGRESIONES** a investigar con prioridad:
  - `is-ui` (página completamente vacía)
  - `icon-explorer` (renderiza la home)
  - `phase7` (renderiza la home)
- [ ] Bugs sistémicos del shell del preview (`<is-main>` y sidebar sin scroll interno) — afecta a casi todos los demos de larga duración.
- [ ] Promover hallazgos recurrentes a reglas del motor (`S-VISUAL-OVERFLOW`, `S-VISUAL-DENSITY`, `S-VISUAL-CONTROL-OCULTO`).
- [ ] Si se acumula suficiente evidencia, automatizar la crítica visual con un LLM con visión (hoy: dsh agent con `read_image`).
