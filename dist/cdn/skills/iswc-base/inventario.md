# Inventario de componentes ISWC

Generado de los `.json` de `src/components`. Antes de crear algo, búscalo aquí. Total: 225.

## actions (11)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-button` | Botón de acción con variantes, colores, tamaños, íconos al inicio o al final, estado de carga y modo enlace. | content:, color, variant, shape, type, with-caret, loading, disabled, href, target | `src/components/actions/button.json` |
| `iswc-button-group` | Agrupa botones relacionados en una barra (unidos, segmentados o separados), con orientación horizontal o verti | label, variant, select, value, orientation, allow-empty, pill, stretch | `src/components/actions/button-group.json` |
| `iswc-check-icon-button` | Botón de ícono que alterna entre marcado y desmarcado (como un interruptor compacto), con estado accesible y e | checked-icon, label, checked, variant, disabled | `src/components/actions/check-icon-button.json` |
| `iswc-context-menu` | Menú emergente que se abre con clic derecho sobre un elemento objetivo (o sobre el propio componente) y lista  | scroll-lock | `src/components/actions/context-menu.json` |
| `iswc-copy-button` | Botón que copia un texto al portapapeles y confirma el resultado con su propio mensaje de éxito o error. | from, copy-label, success-label, value, error-label, disabled, feedback-duration, tooltip, tooltip-placement | `src/components/actions/copy-button.json` |
| `iswc-dropdown` | Menú desplegable anclado a un botón disparador, con navegación por teclado y cierre al hacer clic fuera. | value, color, type, checked | `src/components/actions/dropdown.json` |
| `iswc-dropdown-item` | Opción de un menú desplegable: texto, ícono y estado deshabilitado; al elegirla emite su selección al menú. | value, color, disabled | `src/components/actions/dropdown-item.json` |
| `iswc-fab` | Botón de acción flotante (FAB) fijo en una esquina de la pantalla para la acción principal de la vista. | position, label, color, extended, pulse | `src/components/actions/fab.json` |
| `iswc-share-button` | Comparte título, texto y URL con las apps nativas (Web Share). Si no hay share, copia al portapapeles. |  | `src/components/actions/share-button.json` |
| `iswc-speed-dial` | Botón flotante que al activarse despliega en abanico un grupo de acciones secundarias. | label, direction, open, data-wrapper, data-arc, data-start-angle, data-sweep | `src/components/actions/speed-dial.json` |
| `iswc-speed-dial-action` | Acción individual del abanico de un iswc-speed-dial, con ícono y etiqueta. | label | `src/components/actions/speed-dial-action.json` |

## code (1)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-code` | Editor de código con resaltado nativo, temas, formateo y marcas, con API para pasar de código a JSON y vicever | lang, wrap, readonly, tab-size | `src/components/code/code.json` |

## data (13)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-ag-grid` | Rejilla de datos avanzada: ordenar, filtrar, agrupar, redimensionar columnas y editar celdas. |  | `src/components/data/ag-grid.json` |
| `iswc-data-grid` | Tabla de datos con columnas configurables, orden, filtro, paginación y selección de filas. |  | `src/components/data/data-grid.json` |
| `iswc-kanban` | Tablero kanban con columnas y tarjetas que se arrastran entre columnas para cambiar su estado. |  | `src/components/data/kanban.json` |
| `iswc-kanban-card` | Tarjeta de un tablero kanban que representa una tarea y se arrastra entre columnas. |  | `src/components/data/kanban-card.json` |
| `iswc-kanban-column` | Columna de un tablero kanban: título, contador y la lista de tarjetas que contiene. |  | `src/components/data/kanban-column.json` |
| `iswc-meta-list` | Lista de metadatos clave → valor agrupada. | heading, layout | `src/components/data/meta-list.json` |
| `iswc-pivot-table` | Tabla dinámica que agrupa una colección por filas y columnas y agrega una medida, todo en el cliente. |  | `src/components/data/pivot-table.json` |
| `iswc-spreadsheet` | Hoja de cálculo completa: varias hojas, más de 380 funciones con alias en español, formato, gráficos, macros,  |  | `src/components/data/spreadsheet.json` |
| `iswc-stat` | Tarjeta de indicador (KPI) con valor, etiqueta, variación y tendencia. |  | `src/components/data/stat.json` |
| `iswc-stat-group` | Fila de indicadores que se acomoda al ancho, con esqueletos mientras carga. | items, esqueletos | `src/components/data/stat-group.json` |
| `iswc-trace-log` | Log plegable de un proceso: tiempo, nivel, etapa, mensaje, duración y datos de cada paso. | eventos, titulo, abierto, en-vivo, filtro | `src/components/data/trace-log.json` |
| `iswc-transfer` | Doble lista para pasar elementos de una lista disponible a una seleccionada y viceversa. |  | `src/components/data/transfer.json` |
| `iswc-transfer-item` | Elemento de una lista de iswc-transfer que se puede seleccionar y mover. |  | `src/components/data/transfer-item.json` |

## data-viz (17)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-bar-chart` | Gráfica de barras verticales u horizontales, agrupadas o apiladas, en SVG. | open-on-click, stacked | `src/components/charts/bar-chart.json` |
| `iswc-bubble-chart` | Gráfica de burbujas: puntos en dos ejes cuyo tamaño representa una tercera magnitud. | open-on-click | `src/components/charts/bubble-chart.json` |
| `iswc-chart` | Motor de gráficas en SVG sin dependencias (barras, líneas, áreas…) a partir de series de datos declarativas. | open-on-click, type, x-label, without-legend | `src/components/charts/chart.json` |
| `iswc-doughnut-chart` | Gráfica de dona que muestra la proporción de cada parte respecto al total, con hueco central. | open-on-click | `src/components/charts/doughnut-chart.json` |
| `iswc-funnel-chart` | Gráfica de embudo para etapas sucesivas de un proceso y su caída entre una y otra. | open-on-click | `src/components/charts/funnel-chart.json` |
| `iswc-gauge` | Medidor circular que muestra un porcentaje o un valor dentro de un rango. | value, label, unit, color, half, format | `src/components/data/gauge.json` |
| `iswc-heatmap` | Mapa de calor: matriz de celdas coloreadas según su valor numérico. | x-label, y-label, color, show-values | `src/components/data-viz/heatmap.json` |
| `iswc-line-chart` | Gráfica de líneas para series a lo largo de un eje continuo, con puntos y área opcional. | open-on-click | `src/components/charts/line-chart.json` |
| `iswc-map-marker` | Marcador posicionado por coordenadas dentro de un iswc-maps, con contenido emergente. |  | `src/components/data-viz/map-marker.json` |
| `iswc-maps` | Visualizador geográfico de mapas con marcadores, zoom y desplazamiento. | viewbox, interactive, engine | `src/components/data-viz/maps.json` |
| `iswc-pie-chart` | Gráfica circular de torta que reparte un total en porciones proporcionales. | open-on-click | `src/components/charts/pie-chart.json` |
| `iswc-polar-area-chart` | Gráfica de área polar: sectores de igual ángulo cuyo radio indica el valor. | open-on-click, label, legend-position, without-legend, without-animation | `src/components/charts/polar-area-chart.json` |
| `iswc-radar-chart` | Gráfica de radar para comparar varias magnitudes de una o más series sobre ejes radiales. | open-on-click, label, legend-position | `src/components/charts/radar-chart.json` |
| `iswc-scatter-chart` | Gráfica de dispersión de puntos en dos ejes para ver correlaciones. | open-on-click, label, x-label, y-label, grid | `src/components/charts/scatter-chart.json` |
| `iswc-sparkline` | Mini gráfica de tendencia sin ejes, para incrustar junto a un número o en una tabla. | label, variant, trend, curve | `src/components/charts/sparkline.json` |
| `iswc-treemap` | Mapa de árbol en SVG: rectángulos anidados cuyo área representa el peso de cada elemento de una jerarquía. | open-on-click | `src/components/charts/treemap.json` |
| `iswc-waterfall-chart` | Gráfica de cascada que muestra cómo aumentos y disminuciones llevan de un valor inicial a uno final. | open-on-click | `src/components/charts/waterfall-chart.json` |

## diagrams (21)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-block-diagram` | Diagrama de bloques en SVG generado desde datos declarativos, sin Mermaid. | open-on-click | `src/components/diagrams/block-diagram.json` |
| `iswc-class-diagram` | Diagrama de clases UML en SVG con paquetes, atributos, métodos y relaciones, sin Mermaid. | open-on-click | `src/components/diagrams/class-diagram.json` |
| `iswc-component-diagram` | Diagrama de componentes UML en SVG con paquetes y conexiones ruteadas, sin Mermaid. | min-gap, open-on-click | `src/components/diagrams/component-diagram.json` |
| `iswc-diagram-edit-app` | Edita el diagrama y comparte un enlace nuevo. El ?json= con el que se abrió la página se queda igual. |  | `src/components/diagrams/diagram-edit-app.json` |
| `iswc-diagram-lightbox` | Visor ampliado para diagramas: abre un diagrama a pantalla completa con zoom y desplazamiento. |  | `src/components/diagrams/diagram-lightbox.json` |
| `iswc-diagram-view-app` | Abre cualquier diagrama con ?kind= y ?json= en base64url. La dirección no cambia al mirar el documento. |  | `src/components/diagrams/diagram-view-app.json` |
| `iswc-er-diagram` | Diagrama entidad-relación en SVG con tablas, columnas y cardinalidades, sin Mermaid. | open-on-click | `src/components/diagrams/er-diagram.json` |
| `iswc-er-editor` | Editor visual de entidad-relación. Compartir el resultado se hace con la app de edición, sin reescribir el enl |  | `src/components/diagrams/er-editor.json` |
| `iswc-flowchart` | Diagrama de flujo en SVG con carriles, decisiones y rutas ortogonales, sin Mermaid. | open-on-click | `src/components/diagrams/flowchart.json` |
| `iswc-gantt` | Diagrama de Gantt en SVG con tareas, fechas, dependencias e hitos, sin Mermaid. | open-on-click | `src/components/diagrams/gantt.json` |
| `iswc-journey-map` | Mapa de recorrido de usuario en SVG: etapas, acciones y nivel de satisfacción, sin Mermaid. | open-on-click | `src/components/diagrams/journey-map.json` |
| `iswc-mindmap` | Mapa mental en SVG que parte de una idea central y se ramifica en subtemas, sin Mermaid. | open-on-click | `src/components/diagrams/mindmap.json` |
| `iswc-org-chart` | Organigrama jerárquico de arriba hacia abajo a partir de un árbol de personas o áreas. | open-on-click, node-width | `src/components/diagrams/org-chart.json` |
| `iswc-quadrant-chart` | Matriz de cuatro cuadrantes en SVG para clasificar elementos según dos ejes, sin Mermaid. | open-on-click | `src/components/diagrams/quadrant-chart.json` |
| `iswc-sankey-diagram` | Diagrama de Sankey en SVG que muestra flujos entre nodos con grosor proporcional al valor, sin Mermaid. | open-on-click | `src/components/diagrams/sankey-diagram.json` |
| `iswc-sequence-diagram` | Diagrama de secuencia en SVG con participantes, mensajes numerados y fragmentos alt, loop y par, sin Mermaid. | open-on-click | `src/components/diagrams/sequence-diagram.json` |
| `iswc-state-diagram` | Diagrama de estados en SVG con transiciones etiquetadas entre estados, sin Mermaid. | open-on-click | `src/components/diagrams/state-diagram.json` |
| `iswc-swimlane-diagram` | Diagrama de carriles en SVG que reparte los pasos de un proceso por responsable, sin Mermaid. | open-on-click | `src/components/diagrams/swimlane-diagram.json` |
| `iswc-timeline` | Línea de tiempo de hitos en SVG, ordenados por fecha, sin Mermaid. | open-on-click | `src/components/diagrams/timeline.json` |
| `iswc-use-case-diagram` | Diagrama de casos de uso UML en SVG con actores, casos y relaciones, sin Mermaid. | open-on-click | `src/components/diagrams/use-case-diagram.json` |
| `iswc-venn-diagram` | Diagrama de Venn de dos o tres conjuntos en SVG con sus intersecciones, sin Mermaid. | open-on-click | `src/components/diagrams/venn-diagram.json` |

## feedback (19)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-badge` | Insignia pequeña para contadores o estados, sola o superpuesta sobre otro elemento. | color, variant, attention, pill | `src/components/feedback/badge.json` |
| `iswc-cdn-snippet` | Panel con el fragmento mínimo para usar un componente desde el CDN, listo para copiar. | tag, category, title, base, dependencies | `src/components/feedback/cdn-snippet.json` |
| `iswc-confirm-modal` | Diálogo de confirmación con mensaje y botones de aceptar y cancelar que resuelve la decisión del usuario. | heading | `src/components/feedback/confirm-modal.json` |
| `iswc-empty-state` | Estado vacío, cargando o error de una lista o un panel, con acción opcional. | estado, variante, titulo, texto, icono | `src/components/feedback/empty-state.json` |
| `iswc-loading` | Indicador de carga en línea: spinner y texto opcional, anunciado como estado. | texto | `src/components/feedback/loading.json` |
| `iswc-palette-selector` | Selector de las 25 paletas del kit (agrupadas por familia, con buscador y muestras de identidad) y del modific | value, panda, hide-panda | `src/components/feedback/palette-selector.json` |
| `iswc-popconfirm` | Confirmación ligera en un globo anclado al botón que la dispara, con aceptar y cancelar. | placement, hide-arrow | `src/components/feedback/popconfirm.json` |
| `iswc-prefs-clear` | Botón que deja la app como en su primera carga: borra todo lo que el kit guarda (llaves ISWC:) y sus cachés en | reload | `src/components/feedback/prefs-clear.json` |
| `iswc-progress-bar` | Barra de progreso lineal, determinada (con porcentaje) o indeterminada. | value, label, indeterminate | `src/components/feedback/progress-bar.json` |
| `iswc-progress-ring` | Anillo de progreso circular con el porcentaje en el centro. | value, label | `src/components/feedback/progress-ring.json` |
| `iswc-skeleton` | Bloque de carga (esqueleto) que ocupa el lugar del contenido mientras llega. | effect | `src/components/feedback/skeleton.json` |
| `iswc-spinner` | Indicador giratorio de carga. |  | `src/components/feedback/spinner.json` |
| `iswc-status-pill` | Pastilla de una línea para un paso de un proceso: pendiente, hecho o error. | text, status, icon, ts, pending-label, done-label, error-label | `src/components/feedback/status-pill.json` |
| `iswc-stream-bubble` | Burbuja de una respuesta que llega por partes, con estado, pasos previos y markdown ligero. | state, text, name, avatar, animated, progress | `src/components/feedback/stream-bubble.json` |
| `iswc-tag` | Etiqueta compacta para categorías o filtros, con color y opción de quitarla. | color, with-remove, pill | `src/components/feedback/tag.json` |
| `iswc-theme-toggle` | Interruptor entre tema claro y oscuro que aplica el tema a la página y lo recuerda. | dark | `src/components/feedback/theme-toggle.json` |
| `iswc-toast` | Contenedor de notificaciones emergentes temporales apiladas en una esquina de la pantalla. |  | `src/components/feedback/toast.json` |
| `iswc-toast-item` | Notificación emergente individual con color, mensaje, acción opcional y cierre automático. | color, open, duration | `src/components/feedback/toast-item.json` |
| `iswc-tooltip` | Globo de ayuda contextual que aparece al pasar el puntero o enfocar el elemento al que está anclado. | placement, trigger | `src/components/feedback/tooltip.json` |

## files (8)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-csv-edit` | Editor de archivos CSV en forma de tabla: editar celdas, agregar o quitar filas y columnas. | src, content, height | `src/components/files/csv-edit.json` |
| `iswc-csv-view` | Visor de archivos CSV como tabla de solo lectura. | src, content, height | `src/components/files/csv-view.json` |
| `iswc-docx-view` | Visor de documentos Word (.docx) en el navegador. | src, content, height | `src/components/files/docx-view.json` |
| `iswc-file-edit` | Editor de archivos que elige el editor adecuado según el tipo (texto, CSV…). | src, content, height | `src/components/files/file-edit.json` |
| `iswc-file-view` | Visor de archivos que elige el visor adecuado según el tipo (texto, CSV, Word, PowerPoint…). | src, content, height | `src/components/files/file-view.json` |
| `iswc-pptx-view` | Visor de presentaciones PowerPoint (.pptx) en el navegador. | src, content, height | `src/components/files/pptx-view.json` |
| `iswc-txt-edit` | Editor de archivos de texto plano. | src, content, height | `src/components/files/txt-edit.json` |
| `iswc-txt-view` | Visor de archivos de texto plano. | src, content, height | `src/components/files/txt-view.json` |

## forms (37)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-checkbox` | Casilla de verificación que participa en formularios (FormData y validación) con estado indeterminado. | checked, indeterminate, disabled, color, label-placement, value, checked-icon, indeterminate-icon, readonly, error | `src/components/forms/checkbox.json` |
| `iswc-color-picker` | Selector de color que participa en formularios, con paleta, entrada hexadecimal y vista previa. | label, value, disabled | `src/components/forms/color-picker.json` |
| `iswc-combobox` | Campo de texto con lista de opciones filtrable mientras se escribe. | label, placeholder, clearable, value, required | `src/components/forms/combobox.json` |
| `iswc-date-field` | Campo de fecha editable por secciones (día, mes, año) con el teclado. | label, value, locale, clearable, required, min, readonly | `src/components/forms/date-field.json` |
| `iswc-date-input` | Campo de fecha que abre un calendario en un panel para elegir el día. | label, value, locale, clearable, action-bar | `src/components/forms/date-input.json` |
| `iswc-date-picker` | Calendario mensual en línea para elegir una fecha. | value, locale, min, max, open-to, view, first-day-of-week, show-outside-days, fixed-weeks, show-week-numbers | `src/components/forms/date-picker.json` |
| `iswc-date-range-input` | Dos campos de fecha (inicio y fin) con un calendario de rango en un panel. | label, start, end | `src/components/forms/date-range-input.json` |
| `iswc-date-range-picker` | Selector de rango de fechas con varios meses a la vista y atajos como «últimos 7 días». | locale, calendars, value | `src/components/forms/date-range-picker.json` |
| `iswc-date-time-field` | Campo de fecha y hora editable por secciones con el teclado. | value | `src/components/forms/date-time-field.json` |
| `iswc-date-time-input` | Campo de fecha y hora con calendario y reloj lado a lado en un panel. | label, value | `src/components/forms/date-time-input.json` |
| `iswc-digital-clock` | Selector de hora en lista o en columnas de horas, minutos, segundos y AM/PM. | value | `src/components/forms/digital-clock.json` |
| `iswc-doc-editor` | Editor de documentos por bloques al estilo Notion: párrafos, títulos, listas y más. |  | `src/components/forms/doc-editor.json` |
| `iswc-dropzone` | Zona para arrastrar y soltar archivos, con vista previa, cola y progreso por archivo. | accept, max-files, max-size | `src/components/forms/dropzone.json` |
| `iswc-duration-picker` | Selector de duración en horas, minutos y segundos. | value, min, max, step | `src/components/forms/duration-picker.json` |
| `iswc-file-input` | Campo para elegir archivos desde el equipo que participa en formularios, con lista de seleccionados. | label, accept, multiple, required | `src/components/forms/file-input.json` |
| `iswc-full-calendar` | Calendario completo con vistas de día, semana y mes para ver y gestionar eventos. | first-day, hours-start, hours-end | `src/components/forms/full-calendar.json` |
| `iswc-inline-edit` | Texto que se convierte en campo editable al hacer clic y guarda o cancela el cambio en el sitio. | placeholder, mode, rows | `src/components/forms/inline-edit.json` |
| `iswc-input` | Campo de texto que participa en formularios, con etiqueta, ayuda, error, prefijos y sufijos. | label, placeholder, hint, clearable, required | `src/components/forms/input.json` |
| `iswc-masked-input` | Campo con formato aplicado mientras se escribe (tarjeta, fecha, teléfono…) a partir de un patrón. | pattern, autocomplete, placeholder, required, value | `src/components/forms/masked-input.json` |
| `iswc-mention` | Campo de texto que sugiere usuarios o etiquetas al escribir @ o #. | trigger | `src/components/forms/mention.json` |
| `iswc-month-calendar` | Rejilla de los 12 meses de un año para elegir un mes. | value | `src/components/forms/month-calendar.json` |
| `iswc-option` | Opción de una lista de iswc-select o iswc-combobox, con valor y etiqueta. | value, disabled | `src/components/forms/option.json` |
| `iswc-pin-input` | Campo de código PIN u OTP con una casilla por dígito y avance automático. | length, placeholder, mask, disabled, value, invalid | `src/components/forms/pin-input.json` |
| `iswc-radio` | Opción de radio dentro de un iswc-radio-group, que es quien publica el valor al formulario. | value, disabled, row, color, label-placement, error, readonly, required | `src/components/forms/radio.json` |
| `iswc-radio-group` | Grupo de opciones de radio que participa en formularios: guarda el valor de la opción elegida. | value | `src/components/forms/radio-group.json` |
| `iswc-rating` | Valoración con estrellas u otros íconos que participa en formularios. | value, max, disabled, required, show-label, label-format, precision, allow-half, empty-icon, color | `src/components/forms/rating.json` |
| `iswc-rte` | Editor de texto enriquecido con barra de formato (negrita, listas, enlaces…). | placeholder, value, h2 | `src/components/forms/rte.json` |
| `iswc-select` | Lista desplegable de opciones que participa en formularios y nunca queda recortada por el contenedor. | label, placeholder, clearable, value, variant, error, full-width, auto-width, max-visible, multiple | `src/components/forms/select.json` |
| `iswc-signature` | Pad para firmar a mano con el dedo o el ratón que exporta la firma a PNG o SVG. |  | `src/components/forms/signature.json` |
| `iswc-slider` | Control deslizante para elegir un valor o un rango numérico que participa en formularios. | value, value-label, disabled, min, max, step, shift-step, min-distance, disable-swap, color | `src/components/forms/slider.json` |
| `iswc-switch` | Interruptor de encendido y apagado que participa en formularios. | checked, disabled, color, label-placement, checked-icon, on-label, off-label, readonly, error, required | `src/components/forms/switch.json` |
| `iswc-tenant-selector` | Selector del cliente activo en apps con varios clientes. | opciones, activa, etiqueta, icono | `src/components/forms/tenant-selector.json` |
| `iswc-textarea` | Área de texto de varias líneas que participa en formularios, con contador y auto-alto. | maxlength, show-count, rows, variant, autosize, min-rows, max-rows, resize, alias, de | `src/components/forms/textarea.json` |
| `iswc-time-clock` | Reloj analógico para elegir la hora con las manecillas. | value, ampm, locale, hour24, min-time, max-time | `src/components/forms/time-clock.json` |
| `iswc-time-field` | Campo de hora editable por secciones con el teclado. | value | `src/components/forms/time-field.json` |
| `iswc-time-input` | Campo de hora que abre un panel para elegir horas y minutos. | label, value | `src/components/forms/time-input.json` |
| `iswc-year-calendar` | Rejilla desplazable de años para elegir un año. | value | `src/components/forms/year-calendar.json` |

## helpers (17)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-floating` | Building block interno. En producto usa iswc-popover o iswc-tooltip. |  | `src/components/helpers/floating.json` |
| `iswc-format` | Formatea un valor según su tipo (fecha, número, bytes o tiempo relativo) con la configuración regional. | type, pattern, case, currency, truncate, pad-start, pad-length, format, display, date | `src/components/helpers/format.json` |
| `iswc-format-bytes` | Muestra un tamaño en bytes en la unidad legible más adecuada (KB, MB, GB…). | value, unit, display, autofit, locale | `src/components/helpers/format-bytes.json` |
| `iswc-format-date` | Muestra una fecha con el formato y la configuración regional indicados. | hour, minute, second, year, month, day, weekday, era, hour-format, time-zone | `src/components/helpers/format-date.json` |
| `iswc-format-number` | Muestra un número con separadores, decimales, moneda o porcentaje según la configuración regional. | value, type, currency, minimum-fraction-digits, maximum-fraction-digits, pad-start, pad-length, minimum-integer-digits | `src/components/helpers/format-number.json` |
| `iswc-intersection-observer` | Emite eventos cuando su contenido entra o sale de la vista (alias de iswc-observer type="intersection"). | root, intersect-class, threshold, once | `src/components/helpers/intersection-observer.json` |
| `iswc-lightbox` | Visor a pantalla completa para imágenes u otro contenido, con navegación entre elementos. |  | `src/components/diagrams/lightbox.json` |
| `iswc-md-editor` | Vista previa de markdown con diálogo a pantalla completa para editarlo y revisarlo. | label, filename, can-edit | `src/components/helpers/md-editor.json` |
| `iswc-md-render` | Muestra markdown o HTML en línea con variables {{var}} como chips y edición en el sitio opcional. | can-edit, placeholder | `src/components/helpers/md-render.json` |
| `iswc-mutation-observer` | Emite eventos cuando cambia el DOM de su contenido (alias de iswc-observer type="mutation"). | child-list, attr | `src/components/helpers/mutation-observer.json` |
| `iswc-observer` | Observa su contenido (intersección, cambios de tamaño o mutaciones del DOM) y emite eventos al detectarlos. | type, root, intersect-class, threshold, attr, child-list | `src/components/helpers/observer.json` |
| `iswc-offscreen-canvas` | Lienzo que transfiere el control a OffscreenCanvas (y opcionalmente a un Worker). | width, height | `src/components/helpers/offscreen-canvas.json` |
| `iswc-popover` | Panel flotante con contenido interactivo anclado a un elemento. | placement, flip, shift, boundary, auto-size | `src/components/helpers/popover.json` |
| `iswc-relative-time` | Muestra cuánto tiempo pasó o falta respecto a ahora («hace 5 minutos») y se actualiza solo. | sync, data-rt-offset, format, numeric | `src/components/helpers/relative-time.json` |
| `iswc-resize-observer` | Emite eventos cuando cambia el tamaño de su contenido (alias de iswc-observer type="resize"). |  | `src/components/helpers/resize-observer.json` |
| `iswc-ui` | Utilidad IswcUi: html, adoptCss y define para apps consumidoras del kit. |  | `src/components/helpers/ui.json` |
| `iswc-wake-lock` | Mantiene la pantalla encendida con Screen Wake Lock mientras `active` está puesto. |  | `src/components/helpers/wake-lock.json` |

## isp (15)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-accordion-group` | Coordina varios iswc-details como acordeón: abrir uno puede cerrar los demás. | multiple | `src/components/isp/accordion-group.json` |
| `iswc-block-layout` | Contenedor de diseño en bloque con espaciado y alineación configurables. | inline, cscroll | `src/components/isp/block-layout.json` |
| `iswc-btn-ref` | Campo + modal de selección ISP (BtnRef). | label, required, multi | `src/components/isp/btn-ref.json` |
| `iswc-catalogo-gen` | Catálogo CRUD genérico ISP con controller JSON. |  | `src/components/isp/catalogo-gen.json` |
| `iswc-confirm-delete` | Confirmación de borrado que exige escribir un texto para habilitar la acción destructiva. | entity, pk-label, confirm-value, maxlength, case-sensitive | `src/components/isp/confirm-delete.json` |
| `iswc-flex-layout` | Contenedor flex con dirección, separación, alineación y ajuste configurables. | gap, justify, align, wrap, max-width, grow | `src/components/isp/flex-layout.json` |
| `iswc-flex-options` | Toolbar de acciones ISP pintada con iswc-button / iswc-dropdown. |  | `src/components/isp/flex-options.json` |
| `iswc-float-card` | Panel flotante anclado (port FloatingComponent). Hover muestra tools ya montadas. |  | `src/components/isp/float-card.json` |
| `iswc-form` | Ficha ISP — cuerpo en JSON compacto (json2html / html2json). | submit-label | `src/components/isp/form.json` |
| `iswc-grid-layout` | Contenedor de rejilla con columnas, separación y comportamiento adaptable configurables. | cells, gap, cells-fit, items | `src/components/isp/grid-layout.json` |
| `iswc-heading` | Título de sección (h1 a h6) con la tipografía y los tamaños del sistema de diseño. | level, color, mix, mix-with | `src/components/isp/heading.json` |
| `iswc-loading-overlay` | Capa a pantalla completa con indicador de carga que bloquea la interacción mientras trabaja. | message, scroll-lock | `src/components/isp/loading-overlay.json` |
| `iswc-modal-verificacion` | Diálogo de verificación que pide confirmar o validar una operación antes de continuar. |  | `src/components/isp/modal-verificacion.json` |
| `iswc-text` | Texto con las variantes tipográficas, tamaños y colores del sistema de diseño. | color, mix, mix-with, lines | `src/components/isp/text.json` |
| `iswc-tree-view` | Árbol editable ISP (port TreeRowView): drag, historial y ficha. | label-field | `src/components/isp/tree-view.json` |

## layout (21)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-app-shell` | Armazón de app: barra fija (marca, pestañas, sesión) y vista con scroll propio. Layout completo con iswc-app-n | brand, logo, brand-href, toast | `src/components/layout/app-shell.json` |
| `iswc-callout` | Recuadro destacado para avisos dentro del contenido (marca, neutro, éxito, advertencia o peligro), con ícono,  | color, variant | `src/components/layout/callout.json` |
| `iswc-card` | Tarjeta contenedora con encabezado, cuerpo, pie e imagen opcionales para agrupar información relacionada. | variant | `src/components/layout/card.json` |
| `iswc-demo` | Caja de los ejemplos de la galería. |  | `src/components/layout/demo.json` |
| `iswc-details` | Bloque plegable con un resumen siempre visible que muestra u oculta su contenido, con animación y control por  | variant, icon-placement, open, disabled | `src/components/layout/details.json` |
| `iswc-dialog` | Ventana modal con foco atrapado, cierre por Escape o clic fuera (opcional), y ranuras para título, contenido y |  | `src/components/layout/dialog.json` |
| `iswc-divider` | Línea divisoria horizontal o vertical, con texto opcional en el centro. | opacity, color | `src/components/layout/divider.json` |
| `iswc-doc-layout` | Layout documental: navegación, contenido e índice de la página con scroll-spy; responsive y redimensionable. | toc, toc-title, no-bar, hide-start | `src/components/layout/doc-layout.json` |
| `iswc-dock` | Barra de íconos al estilo del Dock de macOS que agranda los elementos cercanos al puntero. | label, active, position | `src/components/layout/dock.json` |
| `iswc-dock-item` | Elemento de un iswc-dock con ícono y etiqueta que crece al acercar el puntero. |  | `src/components/layout/dock-item.json` |
| `iswc-drawer` | Panel lateral deslizable (izquierda, derecha, arriba o abajo) para navegación o formularios sin salir de la vi |  | `src/components/layout/drawer.json` |
| `iswc-login` | Puerta de acceso single o multi-cuenta con cambio de contraseña, cierre global y auditoría de sesiones; emite  | remember, busy, disabled, error, notice | `src/components/layout/login.json` |
| `iswc-login-dropdown` | Acceso compacto en un desplegable: usuario/contraseña o token y elección entre opciones. Emite iswc-login-subm | label, heading, modes, placement, remember, open | `src/components/layout/login-dropdown.json` |
| `iswc-login-gate` | Cortina de acceso: contenido público + login antes de revelar la parte protegida. Reusa <iswc-login>. | logged, busy, error, heading | `src/components/layout/login-gate.json` |
| `iswc-main` | Contenedor principal desplazable de la página, equivalente a la etiqueta main. |  | `src/components/layout/main.json` |
| `iswc-md-docs-vault` | Lector de documentación modular como un libro: índice, búsqueda, hoja anterior/siguiente y enlaces compartible | main | `src/components/layout/md-docs-vault.json` |
| `iswc-page-header` | Cabecera de una vista: ícono, título, subtítulo y acciones. | titulo, subtitulo, icono | `src/components/layout/page-header.json` |
| `iswc-scrollspy` | Resalta en un índice la sección que está visible mientras se desplaza la página. |  | `src/components/layout/scrollspy.json` |
| `iswc-server-api-docs` | Endpoints de la API de un server al estilo Swagger: valida su documento con Zod (y dice si admite el parse est | api-base | `src/components/layout/server-api-docs.json` |
| `iswc-session-menu` | Sesión en la barra: acceso sin sesión; con logged, avatar, perfil, items propios y Cerrar sesión (iswc-logout) | logged, name, subtitle, avatar, logout-label, modes | `src/components/layout/session-menu.json` |
| `iswc-split-panel` | Divide el espacio en dos paneles redimensionables con un separador arrastrable, horizontal o vertical. | storage-key, orientation, primary, snap, disabled | `src/components/layout/split-panel.json` |

## media (16)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-ai-tool` | Una herramienta de IA que corre en el navegador: OCR, voz a texto, traducción, quitar fondo y diez más. | herramienta, texto, variant | `src/components/media/ai-tool.json` |
| `iswc-avatar` | Avatar de usuario con imagen, iniciales o ícono, y estado opcional. | initials, label, shape | `src/components/media/avatar.json` |
| `iswc-barcode` | Genera un código de barras en SVG a partir de un texto. | type, value, height, fg, show-text | `src/components/media/barcode.json` |
| `iswc-barcode-scanner` | Decodifica QR/EAN con `BarcodeDetector` sobre la cámara. No genera códigos: eso es `iswc-barcode` / `iswc-qrco | formats | `src/components/media/barcode-scanner.json` |
| `iswc-figure` | Figura de contenido: imagen + pie + enlace «abrir en una pestaña nueva». | caption, alt, variant, fit, link, paper, link-label | `src/components/media/figure.json` |
| `iswc-icon` | Ícono por nombre (colecciones de Iconify o propias) que hereda el color del texto. | label, src | `src/components/media/icon.json` |
| `iswc-icon-explorer` | Explorador offline de familias e iconos del CDN. |  | `src/components/media/icon-explorer.json` |
| `iswc-image-editor` | Editor de imagen para recortar, hacer zoom y rotar antes de guardar. | aspect | `src/components/media/image-editor.json` |
| `iswc-media-recorder` | Graba cámara, micrófono o pantalla (`getDisplayMedia`) con `MediaRecorder` y entrega un Blob. | source | `src/components/media/media-recorder.json` |
| `iswc-parallax-collage` | Collage por capas con parallax opcional: desplazar, rotar o separar en profundidad. | efecto, direccion, distancia, velocidad, proporcion, quieto, capas | `src/components/media/parallax-collage.json` |
| `iswc-person` | Una persona en línea: avatar con iniciales, nombre y detalle. | nombre, usuario, detalle, compacto | `src/components/media/person.json` |
| `iswc-qrcode` | Genera un código QR en SVG a partir de un texto o enlace. | level, cell, bg | `src/components/media/qrcode.json` |
| `iswc-speech` | Dictado (`SpeechRecognition`) y lectura (`SpeechSynthesis`) con `lang` del documento. | lang | `src/components/media/speech.json` |
| `iswc-theme-img` | Imagen que cambia de versión según el tema claro u oscuro activo. | alt | `src/components/media/theme-img.json` |
| `iswc-video` | Reproductor de video con controles propios del sistema de diseño. | controls, playsinline, muted, loop | `src/components/media/video.json` |
| `iswc-video-playlist` | Reproductor de video con lista de reproducción lateral al estilo YouTube. | autoplay-next, placement | `src/components/media/video-playlist.json` |

## navigation (17)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-app-nav` | Filas de pestañas para la barra de una app: primaria + secundarias dependientes, APG y repintado sin recrear i | rows | `src/components/navigation/app-nav.json` |
| `iswc-breadcrumb` | Ruta de migas de pan que muestra dónde está el usuario y permite volver a niveles anteriores. | label, href | `src/components/navigation/breadcrumb.json` |
| `iswc-breadcrumb-item` | Paso individual de una ruta de migas de pan, con enlace o como posición actual. |  | `src/components/navigation/breadcrumb-item.json` |
| `iswc-carousel` | Carrusel de diapositivas con flechas, indicadores y avance automático opcional. | loop, autoplay, slides-per-page, vertical, aspect-ratio, without-indicators, without-controls | `src/components/navigation/carousel.json` |
| `iswc-carousel-item` | Diapositiva individual de un iswc-carousel. |  | `src/components/navigation/carousel-item.json` |
| `iswc-doc-index` | Índice documental agrupado con búsqueda de texto completo y fragmento resaltado. | placeholder, current | `src/components/navigation/doc-index.json` |
| `iswc-mega-menu` | Menú amplio de varias columnas con encabezados y enlaces, para portales con mucho contenido. | label, hover | `src/components/navigation/mega-menu.json` |
| `iswc-pager` | Paso a la página anterior / siguiente con el título de cada una. | prev, next, prev-label, next-label, next-href | `src/components/navigation/pager.json` |
| `iswc-pagination` | Paginación numérica con pista desplazable y selector de tamaño. | page, pages, page-size, elements-per-page, hide-page-size, compact, disabled, variant, color | `src/components/navigation/pagination.json` |
| `iswc-scroller` | Contenedor desplazable con flechas y sombras que indican que hay más contenido a los lados. | orientation, without-scroll-buttons | `src/components/navigation/scroller.json` |
| `iswc-stepper` | Indicador de pasos de un proceso (asistente) que marca el paso actual y los completados. | active, label, error, disabled | `src/components/navigation/stepper.json` |
| `iswc-stepper-step` | Paso individual de un iswc-stepper con número, título y estado. |  | `src/components/navigation/stepper-step.json` |
| `iswc-tab` | Pestaña de un iswc-tab-group que activa su panel al seleccionarla. |  | `src/components/navigation/tab.json` |
| `iswc-tab-group` | Grupo de pestañas que muestra un panel a la vez, con navegación por teclado. | active, placement | `src/components/navigation/tab-group.json` |
| `iswc-tab-panel` | Panel de contenido asociado a una pestaña de un iswc-tab-group. |  | `src/components/navigation/tab-panel.json` |
| `iswc-tree` | Árbol jerárquico de elementos que se expanden y contraen, con selección. | selection, expanded, disabled | `src/components/navigation/tree.json` |
| `iswc-tree-item` | Nodo de un iswc-tree que puede contener hijos, expandirse y seleccionarse. |  | `src/components/navigation/tree-item.json` |

## overlays (5)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-command-palette` | Paleta de comandos que se abre con Ctrl+K o Cmd+K para buscar y ejecutar acciones. |  | `src/components/overlays/command-palette.json` |
| `iswc-json-dialog` | Diálogo para ver o editar un documento JSON, con validación mientras se escribe. | open, readonly, titulo, valor | `src/components/overlays/json-dialog.json` |
| `iswc-pdf-viewer` | Visor de PDF con el visor nativo del navegador y modo avanzado opcional. | src, download, print, height | `src/components/overlays/pdf-viewer.json` |
| `iswc-semantic-search` | Botón de búsqueda global que abre la paleta de comandos con orden por significado inyectado. | comandos, boton, atajo, placeholder, etiqueta | `src/components/overlays/semantic-search.json` |
| `iswc-window` | Ventana flotante de estilo escritorio que se puede mover, redimensionar, minimizar y cerrar. | x, y, width, height, minimizable, maximizable, closable, resizable, scope, position | `src/components/overlays/window.json` |

## preview (7)

| Tag | Para qué | Props principales | Archivo |
| --- | --- | --- | --- |
| `iswc-demo-section` | Phase W32: homogeneiza TODAS las secciones de un demo. El titulo y el lede quedan flotantes (full-width); el r |  | `src/components/preview/demo-section.json` |
| `iswc-doc-demo` | Shell homogéneo de documentación/demo reutilizable (barra, nav, preview). La propia galería es el ejemplo vivo |  | `src/components/layout/doc-demo.json` |
| `iswc-examples-carousel` | Helper W19: carrusel de ejemplos predefinidos para playgrounds. Cada card contiene una instancia real del comp |  | `src/components/preview/examples-carousel.json` |
| `iswc-playground` | Escenario de pruebas de un componente con controles para cambiar sus atributos en vivo. |  | `src/components/preview/playground.json` |
| `iswc-preview-component` | Shell que monta una definición JSON de la galería. La propia galería es el ejemplo vivo. |  | `src/components/layout/preview-component.json` |
| `iswc-preview-controls` | Panel de knobs del playground. La galería le pasa spec y escucha iswc-controls-change. |  | `src/components/layout/preview-controls.json` |
| `iswc-slots-pg` | Helper para playgrounds de componentes con slots. Estandar W11: dos tabs (Simple + Slots) con editor por slot  |  | `src/components/preview/slots-pg.json` |
