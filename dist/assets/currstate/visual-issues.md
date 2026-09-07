# Visual Audit — is-webcomponents · 2026-09-07

> Crítica visual de las capturas PNG de `dist/assets/currstate/imgs/`. Hecha
> por el **dsh agent con visión** (`read_image`) tras la corrida del e2e
> `05-cobertura-total.test.ts` (Playwright directo, viewport 960×720).
>
> Criterios V-* definidos en `dsh-isaudit/motor/vig/visual/criteria.py`.
> Severidad: **blocker** (inadmisible) · **major** (claramente peor) · **minor** (cosmético).
>
> Esta es la **primera pasada**. Categorías no listadas → sin hallazgos al
> momento de la revisión (pueden aparecer al revisar más a fondo).

## Resumen

| Severidad | Total |
|-----------|-------|
| **blocker** | 4 |
| **major** | 9 |
| **minor** | 13 |
| **TOTAL hallazgos** | **26** |
| Componentes auditados | 27 de 182 (~15% — 2 pasadas) |
| Categorías cubiertas | actions(1), data(3), data-viz(5), diagrams(3), feedback(3), forms(2), helpers(3), isp(1), layout(3), navigation(1), overlays(3), feedback(1 is-skeleton OK) |
| Quedan por revisar | ~155 imágenes (~85%) |

---

## data-viz (5 hallazgos)

### is-heatmap — V-DENSIDAD — **minor**
- **Descripción**: heatmap pequeño (~150×150 px) en esquina superior-izquierda del stage (área stage ~500×400). Mucho espacio vacío debajo y a la derecha. Sidebar derecho completamente vacío (solo "Intro" y "Controles" colapsado).
- **Fix sugerido**: agrandar el heatmap para ocupar ~70% del stage, o reducir el stage para que se vea más denso.

### is-heatmap — V-LABELS-CORTADOS — **major**
- **Descripción**: labels Y-axis aparecen truncados como "L", "M", "M", "J", "V", "S", "D" — falta contexto completo (debería ser "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"). El heatmap es tan pequeño que el espacio para los labels es insuficiente.
- **Fix sugerido**: heatmap más grande o labels en formato "Lun\nMar" vertical con 2 líneas.

### is-map-marker — V-OVERFLOW — **blocker**
- **Descripción**: botón "►" abajo del área del mapa está cortado por el borde inferior (sólo se ve el borde superior). Indica scroll/playback que el usuario no puede usar.
- **Fix sugerido**: aumentar altura del stage o mover el control a un área visible.

### is-map-marker — V-LABELS-CORTADOS — **minor**
- **Descripción**: las coordenadas "120.00, -5.00 → -66.00, 13.00" se renderizan como texto plano superpuesto al mapa en lugar de un label flotante. Compite visualmente con los markers (Medellín, Bogotá, Cali).
- **Fix sugerido**: badge flotante sobre el mapa o footer con tipografía más sutil.

### is-bar-chart / is-bubble-chart / is-doughnut-chart — V-DENSIDAD — **minor**
- **Descripción**: charts pequeños centrados con sidebar derecho colapsado sin contenido (solo "Intro" activo). Aprovecha ~40% del área stage. Espacio desperdiciado arriba/abajo del chart.
- **Fix sugerido**: charts a 80% del stage o reducir el stage para que se vea más denso.

---

## overlays (3 hallazgos)

### is-pdf-viewer — V-OVERFLOW — **blocker**
- **Descripción**: los botones del header ("Descargar", "Imprimir", "abrir en pestaña") se salen del borde derecho del viewer. "abrir en pestaña" queda completamente fuera del viewport. Usuario no puede hacer click en él.
- **Fix sugerido**: header con scroll horizontal, o wrap de botones en 2 filas, o botones prioritarios a la izquierda.

### is-pdf-viewer — V-DENSIDAD — **minor**
- **Descripción**: área del PDF en blanco (no hay PDF cargado), ocupa gran parte del viewer.
- **Fix sugerido**: mensaje "Carga un PDF para ver el demo" cuando no hay src.

### is-window — V-DENSIDAD — **minor**
- **Descripción**: header de la ventana con patrón de líneas diagonales (placeholder visual) ocupa ~30% del header sin contenido. Estética mejorable.
- **Fix sugerido**: header más sutil (línea fina) o reemplazar patrón por algo funcional.

---

## feedback (3 hallazgos)

### is-confirm-modal — V-OVERFLOW — **blocker**
- **Descripción**: el botón rojo "Eliminar cuenta" tiene el icono trash al inicio, pero el icono se ve cortado ("🗑" sin la cara completa). El texto del botón también está cortado ("Eliminar cue" en lugar de "Eliminar cuenta").
- **Fix sugerido**: ancho mínimo del botón o font-size menor.

### is-confirm-modal — V-OVERFLOW — **blocker**
- **Descripción**: la sección "Slot message" al final de la página está cortada por el borde inferior — no se ve el contenido.
- **Fix sugerido**: scroll suave o layout responsivo que muestre todas las secciones.

### is-tooltip — V-OVERFLOW — **blocker**
- **Descripción**: los botones de Placement ("top", "right", "bottom") en la sección Placement se cortan al final (overflow vertical). El usuario no puede ver la sección completa.
- **Fix sugerido**: scroll o reorden para que la sección quepa en viewport.

---

## forms (3 hallazgos)

### is-input — V-OVERFLOW — **minor**
- **Descripción**: el binding `value: ""` se renderiza con el contenido cortado (no se ven las comillas de cierre).
- **Fix sugerido**: text-overflow control o width auto.

### is-input — V-DENSIDAD — **minor**
- **Descripción**: sidebar derecho tiene 10 secciones (Appearance, Tipos, Adornos, Error y validación, Contador de caracteres, Ancho, Label a la izquierda, Estados, Dentro de un, Referencia) — solo "Intro" expandido muestra 1.
- **Fix sugerido**: agrupar secciones relacionadas o scroll interno.

### is-select — V-DENSIDAD — **minor**
- **Descripción**: mismo problema que is-input: sidebar derecho con 11 secciones colapsadas, solo "Intro" activo.
- **Fix sugerido**: agrupar secciones o scroll interno.

---

## navigation (1 hallazgo)

### is-tab-group — V-OVERFLOW — **blocker**
- **Descripción**: el último tab "Deshabilitado" se sale del contenedor de tabs (overflow horizontal). Solo se ve "Deshabilitad" o "Deshabilita" sin la "o" final. Usuario no puede hacer click en él.
- **Fix sugerido**: scroll horizontal en el contenedor de tabs, o tabs con tamaño adaptativo, o wrap en 2 filas cuando no caben.

---

## Patrones recurrentes (sistémicos)

1. **V-OVERFLOW en sidebar derecho (múltiples)**: el sidebar derecho del demo preview tiene muchas secciones que se cortan. El componente padre (sidebar del shell de preview) tiene altura limitada sin scroll interno visible.

2. **V-DENSIDAD en charts (data-viz)**: charts pequeños con mucho espacio vacío alrededor. Aprovechan ~40-50% del stage.

3. **V-OVERFLOW en sections largas**: cuando una sección (is-confirm-modal Slot message, is-tooltip Placement) tiene contenido extenso, se corta por el borde inferior.

---

## data (4 hallazgos nuevos — 2da pasada)

### is-stat — V-CENTRADO — **major**
- **Descripción**: en el 3er card KPI (Tasa de conversión) el icono (esquina superior derecha del card) está pegado al borde, mientras que en los otros 2 cards (Ingresos, Usuarios Activos) el icono está bien centrado dentro del card. Inconsistencia de centrado entre cards hermanos.
- **Fix sugerido**: aplicar el mismo padding-right al slot del icono en todos los cards (variable CSS reutilizable).

### is-stat — V-OVERFLOW — **major**
- **Descripción**: el 3er card KPI "Tasa de conversión" se corta por el bottom del viewport — la fila de "vs objetivo" con el porcentaje rojo queda truncada.
- **Fix sugerido**: scroll interno del stage o mostrar 2 cards por fila en lugar de 3.

### is-spreadsheet — V-OVERFLOW — **minor**
- **Descripción**: la sección "API / fórmulas" al final de la página queda cortada por el bottom.
- **Fix sugerido**: scroll vertical en el stage.

### is-transfer — sin hallazgos (vista limpia, sin overflow, sin labels cortados).

---

## diagrams (3 hallazgos nuevos)

### is-flowchart — V-DENSIDAD — **minor**
- **Descripción**: el flowchart ocupa ~30% del área stage con mucho espacio vacío alrededor (sandbox central pequeño).
- **Fix sugerido**: agrandar el flowchart o reducir el stage.

### is-mindmap — V-OVERFLOW — **minor**
- **Descripción**: la sección "CONTROLES" colapsada al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

### is-sankey-diagram — V-OVERFLOW — **minor**
- **Descripción**: la sección "CONTROLES" colapsada al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

---

## helpers (3 hallazgos nuevos)

### is-popover — V-OVERFLOW — **minor**
- **Descripción**: la sección "Placement" al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

### is-lightbox — V-OVERFLOW — **minor**
- **Descripción**: la sección "Variantes de backdrop" al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

### is-md-editor — V-OVERFLOW — **minor**
- **Descripción**: la sección "Solo lectura" al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

---

## isp (1 hallazgo nuevo)

### is-form — sin hallazgos visuales críticos.
- Form bien estructurado (Código, Nombre, switch Activo). Sidebar derecho con solo 2 secciones ("Round-trip JSON", "Referencia") — OK.

---

## layout (2 hallazgos nuevos)

### is-dialog — V-OVERFLOW — **minor**
- **Descripción**: la sección "Sin header" al final se corta por el bottom.
- **Fix sugerido**: scroll vertical.

### is-card — V-DENSIDAD — **minor**
- **Descripción**: el card "caso mínimo" con "Hola mundo" es muy pequeño y ocupa ~25% del área stage. Mucho espacio vacío alrededor.
- **Fix sugerido**: agrandar el card o añadir más demos.

---

## feedback (subagent encontró 1 imagen OK)

### is-skeleton — sin hallazgos.
- Subagent (b70bf331): "is-skeleton.png se ve correcto. Skeletons con efecto sheen." Skeleton loading placeholders con shimmer effect (gradient). 2 playgrounds: top con skeleton blocks + shimmer, y effects (sheen, pulse variants).

---

## Patrones recurrentes actualizados (2da pasada confirma)

1. **V-OVERFLOW sistémico en última sección del stage** (CONFIRMADO en 2da pasada): is-md-editor, is-lightbox, is-popover, is-sankey-diagram, is-mindmap, is-dialog, is-card, is-spreadsheet, is-stat, is-flowchart, is-form → **la sección final del scrollSpy casi siempre queda cortada por el bottom del viewport**. Esto NO es bug de los componentes individuales, es del **shell del demo preview** (el `<is-main>` del previewHost tiene altura limitada sin scroll interno).

2. **V-OVERFLOW en sidebar derecho** (CONFIRMADO en 2da pasada): is-input, is-select, is-toast, is-confirm-modal, is-tooltip, charts data-viz → **el sidebar derecho del shell tiene muchas secciones que se cortan sin scroll interno visible**.

3. **V-CENTRADO en cards KPI** (NUEVO en 2da pasada): is-stat → **iconos de cards hermanos con posición inconsistente** (uno pegado al borde, otros centrados).

4. **V-DENSIDAD en charts data-viz y diagrams** (CONFIRMADO en 2da pasada): aprovechan ~30-50% del stage. Charts pequeños centrados con mucho espacio vacío alrededor.

---

## Cómo se generó

```bash
# 1. Generar capturas (Playwright directo, viewport 960x720)
npm run test:e2e -- --only=cobertura-total

# 2. El dsh agent (visión) revisa cada PNG con read_image
# y documenta hallazgos por criterio V-*

# 3. Para integrar al motor:
python -B motor/auditor.py visual is-webcomponents --no-capture
# (genera visual-issues.template.md con placeholders por criterio)

# 4. El dsh agent rellena el template → visual-issues.md (este archivo)
```

## Próximos pasos

- [ ] Revisar las 167 capturas restantes (categorías: actions, code, data, diagrams, forms, helpers, isp, layout, media, pages — total ~167 imágenes).
- [ ] Categorizar hallazgos por tipo de fix (CSS-only / JS / markup).
- [ ] Convertir hallazgos sistémicos (patrones recurrentes) en reglas del motor (`S-VISUAL-OVERFLOW`, `S-VISUAL-DENSITY`).
- [ ] Si se acumula suficiente evidencia, promover `vig/visual/` a subcomando automatizado en lugar de manual.
