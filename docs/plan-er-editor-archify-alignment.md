# Plan: Editor visual editable para `<is-er-diagram>` alineado con archify

> Documento vivo del laboratorio de diagramas editables en `is-webcomponents`.
> Parte del objetivo mayor: hacer todo lo relacionado a diagramas editable y
> similar a archify.

## 0. Contexto y motivación

`is-webcomponents` ya tiene una librería amplia de `<is-*>` web components para
diagramas (ER, flowchart, sequence, etc.). Cada uno recibe un JSON estático y
produce SVG determinista. La limitación es que **no son editables desde la UI**:
posiciones, aristas, estilos y textos solo se cambian tocando el JSON.

El objetivo de esta fase es construir un **editor visual completo** para uno de
esos diagramas (empezamos por `<is-er-diagram>`) que permita:

- Arrastrar entidades para reposicionarlas.
- Crear, borrar y modificar aristas (tipos, extremos, cardinalidad, etiqueta).
- Editar textos directamente en pantalla.
- Personalizar estilos (colores, padding, márgenes, etc.).
- Obtener como salida un JSON que, al insertarse en el componente, regenera el
  mismo diagrama de forma **determinista** (mismo input → mismo output).

Tomamos como referencia el proyecto
[archify](https://github.com/tt-a1i/archify) (Node.js, MIT). Archify define un
contrato "typed JSON IR → SVG determinista" muy limpio: schema_version,
diagram_type, meta con title/animation/visual_preset, components con pos/size
explícitos, connections con fromSide/toSide/route/via/labelAt, y variants
(default/emphasis/security/dashed) para estilos.

Adoptamos ese contrato como **dirección objetivo**, sin romper la compatibilidad
con el JSON histórico de ISWC.

## 1. Análisis de archify (resumen ejecutivo)

### 1.1 Forma del IR (architecture.schema.json)

```jsonc
{
  "schema_version": 1,
  "diagram_type": "architecture",        // arquitectura
  "meta": {
    "title": "Sample Web App",
    "subtitle": "...",
    "locale": "en",
    "animation": "trace",               // activa animación CSS en aristas
    "visual_preset": "classic",         // classic | signal-flow | blueprint | editorial
    "viewBox": [1280, 720]              // opcional
  },
  "components": [
    {
      "id": "users",
      "type": "external",        // frontend|backend|database|cloud|security|messagebus|external
      "label": "Users",
      "sublabel": "Browser / Mobile",
      "pos": [40, 300],          // [x, y] explícito → compiler puro, no auto-layout
      "size": [120, 60]          // [w, h]
    }
  ],
  "boundaries": [
    { "kind": "region", "label": "AWS", "wraps": ["cdn", "lb", "api"] }
  ],
  "connections": [
    {
      "id": "users-to-cdn",
      "from": "users", "to": "cdn",
      "label": "HTTPS",
      "variant": "emphasis",            // default|emphasis|security|dashed
      "fromSide": "right", "toSide": "left",
      "route": "auto",                  // auto|straight|orthogonal-h|orthogonal-v
      "via": [[620, 142], [620, 246]],  // waypoints opcionales
      "labelAt": [320, 250],            // posición etiqueta
      "labelDx": 0, "labelDy": 0,
      "labelSegment": 1,                // segmento donde poner la etiqueta
      "width": 1.5                      // grosor arista
    }
  ]
}
```

### 1.2 Contrato de geometría y estilo

- **Posición explícita**: el autor dice dónde va cada componente. El compiler
  no hace auto-layout por defecto (existen helpers, pero el autor manda).
- **Routing por arista**: cada conexión declara `route` (auto/straight/
  orthogonal-h/orthogonal-v) y opcionalmente `fromSide`, `toSide`, `via`.
  `auto` aplica heurísticas (puentes automáticos cuando hay poco espacio entre
  anclas paralelas, midpoint dogleg por defecto).
- **Variantes semánticas**: `default | emphasis | security | dashed` mapean a
  estilos. Son los únicos estilos que el autor declara; los detalles
  tipográficos los decide el preset.
- **Animación**: opt-in vía `meta.animation: "trace"`. Activa keyframes CSS
  embebidos en el `<svg>` (duran dentro del SVG exportado).

### 1.3 Algoritmos clave (geometry.mjs, ~1400 líneas)

| Algoritmo | Función |
|---|---|
| Anclaje en el borde | `anchor(rect, side)` → punto en un lado de la caja |
| Spacing automático de puertos | `automaticPortSpread(relations, boxes, ...)` |
| Bridge cuando puertos paralelos están muy juntos | `automaticPortRhythmBridge(start, end, fromSide, toSide, ...)` |
| Routing `auto` con midpoint | `routeVia(conn, from, to, start, end, fromSide, toSide)` |
| Routing `straight` | `[[start, end]]` |
| Routing `orthogonal-h` | midpoint vertical via `[midX, startY]` y `[midX, endY]` |
| Routing `orthogonal-v` | midpoint horizontal via `[startX, midY]` y `[endX, midY]` |
| Polyline | `polylinePath(points)` |
| Polyline con esquinas redondeadas | `roundedPath(points, radius)` |
| Normalización (elimina colineales redundantes) | `normalizeRoutePoints(points)` |
| Posición de etiqueta | `labelPoint(item, points)` (soporta `labelAt`, `labelDx`, `labelDy`, `labelSegment`) |
| Validación | `cleanBorderRunProblems`, `cleanAmbiguousCorridorProblems`, `cleanRouteRhythmProblems`, etc. |

### 1.4 Animación CSS (preserva al exportar SVG)

Archify embebe estilos en el `<svg>`, no en una hoja externa:

```css
@keyframes archify-edge-flow {
  0%   { stroke-dasharray: 10 8; stroke-dashoffset: 54; opacity: 0.42; }
  88%  { stroke-dasharray: 10 8; stroke-dashoffset: 0;  opacity: 1;    }
  100% { stroke-dashoffset: 0; opacity: 1; }
}
svg[data-animation="trace"] [data-animate="edge"] {
  animation: archify-edge-flow 6s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  svg[data-animation="trace"] [data-animate] { animation: none !important; }
}
```

Claves:

- `stroke-dasharray` define el patrón visible del trazo.
- `stroke-dashoffset` animado desplaza el patrón, creando el efecto "march".
- Estilos embebidos en el SVG → sobreviven al copiar/exportar.
- Respeta `prefers-reduced-motion`.
- En embed/share se desactiva con `data-embed="true"` para que el receptor no
  vea movimiento inesperado.

## 2. Adaptación ISWC ↔ archify

### 2.1 Compatibilidad hacia atrás

ISWC ya tiene un JSON para `<is-er-diagram>`:

```jsonc
{
  "erDiagram": {
    "title": "...",
    "direction": "LR",
    "groups": [...],
    "entities": [
      { "id": "user", "name": "User", "group": "auth",
        "attributes": [{ "name": "id", "key": "PK", "type": "uuid" }] }
    ],
    "relations": [
      { "id": "r1", "from": "user", "to": "order", "label": "places",
        "fromCard": "one", "toCard": "many", "identifying": true }
    ]
  }
}
```

**Decisión**: mantener este JSON 100% compatible. Cero cambios a `erSpec.ts` en
el camino feliz.

Adoptamos los campos archify como **extensiones opcionales**:

| Campo archify | Mapeo ISWC |
|---|---|
| `schema_version`, `diagram_type` | Aceptados en `meta`; si están, validamos. |
| `meta.title/subtitle` | Equivalente a `erDiagram.title/subtitle`. |
| `meta.animation: "trace"` | Activa animación CSS en aristas dashed. |
| `pos: [x, y]` | Override por entidad: si la entidad tiene `pos`, layout la respeta. |
| `size: [w, h]` | Override por entidad. |
| `route: "auto"\|"straight"\|"orthogonal-h"\|"orthogonal-v"` | Por relación. Default: `orthogonal` (lo que ya hace ISWC). |
| `fromSide`, `toSide` | Por relación. Default: heurística de ISWC. |
| `via: [[x,y], ...]` | Por relación: waypoints antes del A*. |
| `labelAt: [x, y]` | Posición explícita de etiqueta. |
| `variant: "default"\|"emphasis"\|"security"\|"dashed"` | Estilo de la arista; en ISWC mapea a `identifying` y a un nuevo `dashStyle: "solid"\|"dashed"`. |
| `style: { ... }` | Override de estilos visuales por entidad/arista (fill, stroke, padding, margin, radius). |

**No copiamos** los conceptos archify que no aplican a ER:

- `boundaries` con `kind: "region" \| "security-group"` → no encajan con ER.
  ISWC ya tiene `groups` que envuelve entidades en cajones.
- `type: "frontend" \| ...` → no aplica a entidades ER. ISWC maneja tipos
  distintos (entidad, atributo, relación) por la posición en el JSON.
- `engineering_profile` → perfil de deployment review, fuera de alcance.

### 2.2 Modelo interno del editor (state)

El editor mantiene una representación intermedia que **es exactamente** el
JSON que el componente consume. Esta es la clave del determinismo:

```
┌─────────────────────────────────────────────────────────────┐
│                       UI (canvas)                          │
│     drag, click-to-connect, inline-edit, panel estilos        │
└────────────────────────┬────────────────────────────────────┘
                         │ eventos del DOM
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                State (en memoria)                            │
│   payload = { erDiagram: { entities, relations, ... } }      │
│   overrides = { entities: Map, relations: Map }             │
└────────────────────────┬────────────────────────────────────┘
                         │ serialize()
                         ▼
┌─────────────────────────────────────────────────────────────┐
│               JSON determinista (output)                    │
│   - claves ordenadas (entities → relations)                  │
│   - números normalizados (enteros cuando aplica)             │
│   - defaults explícitos omitidos                             │
│   - ids estables (no regenerados)                            │
└────────────────────────┬────────────────────────────────────┘
                         │ payload prop
                         ▼
┌─────────────────────────────────────────────────────────────┐
│       <is-er-diagram payload={payload}>                      │
│   resolveErSpec → computeErLayout → #buildSvg                │
└─────────────────────────────────────────────────────────────┘
```

**Garantía de determinismo**:

1. El editor serializa el JSON con un orden estable.
2. `computeErLayout` ya es determinista (sort, empaquetado, A* con snap).
3. La única fuente de no-determinismo potencial es `pos` editado por el
   usuario — y eso es exactamente lo que queremos: la posición editada es
   la canónica.

### 2.3 Decisiones de diseño del editor

| Decisión | Elección | Por qué |
|---|---|---|
| Modo de edición | Atributo `mode="edit"` (default `"read"`) | Reusa el patrón de `diagram-edit.ts` ya existente. |
| Persistencia | `persist="session"\|"local"\|"none"` (default `none`) | Reusa el patrón. |
| Trigger del editor | Botón flotante "Editar" en esquina superior derecha | No contamina la API en modo lectura. |
| Drag de nodos | `attachNodeDrag` (ya existe) con snap a 8px | Integración trivial. |
| Conexión entre nodos | Click en un nodo → click en otro nodo → crea arista | Modelo mental simple. |
| Edición de etiqueta | Doble click sobre el texto → input inline | Patrón conocido. |
| Panel de estilos | Drawer lateral derecho con controles por selección | Familiar y descubrible. |
| Exportar SVG | Botón "Exportar SVG" → serializa el `<svg>` (con estilos embebidos) | El entregable clave. |
| Exportar JSON | Botón "Copiar JSON" → muestra el payload serializado | El otro entregable clave. |

## 3. Plan de implementación (por fases)

### Fase A — Extender `er-spec.ts` (no rompe compatibilidad)  ✅

- Aceptar campos nuevos en `entities[*]` y `relations[*]`:
  - Entidad: `pos: [x, y]`, `size: [w, h]`, `style: { ... }`, `label` (alias de `name`).
  - Relación: `route`, `fromSide`, `toSide`, `via`, `labelAt`, `dashStyle`,
    `style: { ... }`, `width`.
- En `computeErLayout`:
  - Si una entidad trae `pos`, usar esa posición **antes** del empaquetado.
  - Si una relación trae `route`, enrutar según corresponda.
  - Si una relación trae `via`, enrutar como waypoints explícitos.
  - Si una relación trae `labelAt`, usar esa posición para la etiqueta.
- Mantener los defaults actuales: ER sin extras sigue funcionando idéntico.

### Fase B — Routing ortogonal/recto explícito  ✅

- Reusar `buildOrthogonalPath` y `routeOrthogonal` para orthogonal (default).
- Para `route: "straight"`, pintar `<line>` o `<path d="M x1 y1 L x2 y2">`.
- Para `orthogonal-h` y `orthogonal-v`, generar la polyline de midpoint
  (como archify).
- El snap a grid de 8px se mantiene.

### Fase C — Estilos y dashed  ✅

- En `er-diagram.css`, agregar reglas para `stroke-dasharray` configurable.
- Definir un mapa de variantes: `default | emphasis | security | dashed` mapea
  a color + grosor + dasharray.
- Animación:
  - Embed `<style>` dentro del `<svg>` con `@keyframes iswc-dash-march`.
  - Activar con `meta.animation: "trace"` o atributo `animation="trace"`.
  - Respetar `prefers-reduced-motion`.
  - Desactivar si el host tiene `data-static="true"`.

### Fase D — Editor visual  ✅

- Crear `src/components/diagrams/er-editor.ts` (companion component):
  - Botón flotante para abrir/cerrar.
  - Maneja el state (clone del payload).
  - Pointer handlers: drag de nodes, click-to-connect, double-click-edit.
  - Panel lateral con:
    - Lista de entidades y relaciones.
    - Sliders/inputs para colores (fill, stroke), paddings, márgenes, radius.
    - Selector de dashStyle y variant.
    - Botones: nueva entidad, nueva relación, eliminar.
- API: el editor envuelve al `<is-er-diagram>` y le pasa el payload.

### Fase E — Demos  ✅

- Crear `C:\ContaPyme\Personal\apps\is-webcomponents\demos/`:
  - `er-editor.html`: editor completo embebido.
  - `er-static.html`: solo lectura (vista "story" en html).
  - `index.html`: índice de demos.
- Añadir al `package.json` el script `pnpm run dev:demos` que sirve el
  directorio vía el servidor estático existente.

### Fase F — Serialización determinista  ✅

- `serializeErPayload(payload)`: toma el state y devuelve JSON estable.
- Tests: same state → byte-identical JSON.

## 4. Estructura de archivos (propuesta)

```
is-webcomponents/
├── src/
│   └── components/
│       └── diagrams/
│           ├── er-diagram.ts          (extendido, sin romper API)
│           ├── er-diagram.css        (extendido con dash-march)
│           ├── er-spec.ts            (extendido, acepta campos nuevos)
│           ├── er-editor.ts          (NUEVO — editor visual)
│           └── er-editor.css         (NUEVO — estilos del editor)
└── demos/
    ├── index.html                    (NUEVO — índice)
    ├── er-editor.html                (NUEVO — editor)
    ├── er-static.html                (NUEVO — vista estática)
    └── README.md                     (NUEVO — cómo correr)
```

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Romper el JSON histórico | Ningún campo existente cambia su semántica; los nuevos son opt-in. |
| Performance del editor con muchos nodos | Usar `requestAnimationFrame` y `passive: true` donde aplique. |
| Animación costosa en muchas aristas | La animación es por arista; archify mide cientos sin problema. |
| Coordenadas sub-pixel al exportar | Snap-to-8 se aplica antes del A* y antes de pintar. |
| Browser support de `pointer events` | Web Components ya están en el target Chromium/Firefox actual. |

## 6. Próximos pasos (después del ER piloto)

Una vez validado el patrón en `<is-er-diagram>`:

1. Aplicar el mismo editor a `<is-flowchart>` (el más cercano semánticamente).
2. Generalizar `er-editor.ts` → `diagram-editor.ts` parametrizable.
3. Crear el "archify-mirror" para el resto de tipos ISWC.
4. Cuando todos los tipos soporten `pos`, `route`, `via`, `variant`: ahí se
   puede escribir una **capa de portabilidad** que convierta un JSON
   `erDiagram` ↔ un JSON archify `architecture` (con la pérdida de los campos
   semánticos que no encajan).

## 7. Estado

- [x] Fase A — Extender `er-spec.ts` con campos archify-style
- [x] Fase B — Routing ortogonal/recto (`straight`, `orthogonal-h`, `orthogonal-v`, `auto`)
- [x] Fase C — Estilos y dashed con animación CSS embebida
- [x] Fase D — Editor visual `<is-er-editor>` (state, undo/redo, multi-select, drag, click-to-connect, panel, export)
- [x] Fase E — Demos: `index.html`, `er-editor.html`, `er-static.html`
- [x] Fase F — Serialización determinista (round-trip idéntico)

## 8. Tests exhaustivos

Cada demo tiene su suite Playwright (smoke + funcional + determinismo +
accesibilidad) y comparte una suite Stagehand opcional para QA visual.

| Demo | Tests Playwright | Stagehand opt-in | Total |
|---|---|---|---|
| `er-editor.html` | 11 (smoke + drag + undo/redo + add/delete + export JSON/SVG + determinismo + a11y) | sí | 11 |
| `er-static.html` | 8 (smoke + animation + routes + estilos + a11y) | sí | 8 |

Cobertura efectiva (sobre el feature surface de `<is-er-diagram>`):

- **Smoke**: el componente monta, renderiza entidades/aristas, expone API.
- **Funcional**: drag con snap a 8px, undo/redo, add/delete entities, click-to-connect (en demo interactivo).
- **Determinismo**: round-trip JSON idéntico, re-asignar mismo payload produce mismo viewBox.
- **Export**: SVG válido (DOMParser), JSON válido (round-trip), animación CSS embebida con `prefers-reduced-motion`.
- **Accesibilidad**: aria-label en panel, media query para movimiento reducido.

Suite Stagehand: SKIP por defecto (requiere `STAGEHAND=1` + API key). Cuando
está disponible, evalúa visual rubric (no overlap, aristas legibles, encaje,
texto, animación) por demo.

Runner: `pnpm test:demos`. Levanta `serve-demos.mjs` en `127.0.0.1:8491`,
corre todas las suites y baja el servidor. `--only=editor|static` filtra.

## 9. Arquitectura final (lite / full con core compartido)

```
                ┌────────────────────────────────────────┐
                │         er-archify.ts (core)          │
                │  - normalizeErPayload()                │
                │  - serializeErPayload() (determinista) │
                │  - renderErSvg()                       │
                │  - pickSidesArchify()                  │
                │  - straight/orthogonalH/VPath()        │
                │  - getEmbeddedCss(traceEnabled)        │
                └────────────────────────────────────────┘
                       ▲                       ▲
                       │                       │
            ┌──────────┴────────┐    ┌─────────┴─────────┐
            │  <is-er-diagram>  │    │   <is-er-editor>   │
            │       (lite)      │    │       (full)       │
            │                   │    │                   │
            │  - read <script>  │    │  - state interno  │
            │  - render SVG     │    │  - compone lite   │
            │  - hover/tooltip  │    │  - drag/multi-sel │
            │  - sin edición    │    │  - undo/redo      │
            │                   │    │  - click-to-connect│
            │                   │    │  - panel estilos  │
            │                   │    │  - export JSON/SVG│
            └───────────────────┘    └───────────────────┘
```

Garantía de paridad visual: ambos componentes llaman `serializeErPayload()` /
`computeErLayout()` desde el mismo core. Mismo payload → mismo SVG.

## 10. Decisiones de diseño (consolidadas tras grill-me)

| Decisión | Elección |
|---|---|
| Forma del editor | Componente hermano `<is-er-editor>` que compone `<is-er-diagram>` |
| Undo/redo + multi-select | Sí (v1) |
| Animación dash | Opt-in via `animation="trace"` o `meta.animation: "trace"` |
| Validación JSON | Strict: campos desconocidos lanzan error |
| Demos | 3 (index, er-editor, er-static) |
| Export SVG | Descargar `.svg` + copiar al clipboard |
| Tests | Híbrido Playwright + Stagehand |
| Cobertura | Smoke + funcional + determinismo + accesibilidad |
| Schema version | Sin bump, nuevos campos son opt-in |
| State root | Interno en `<is-er-editor>` (encapsulado) |
| Snap grid | 8px, sin visualización |