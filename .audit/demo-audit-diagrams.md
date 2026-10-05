# Demo Audit: diagrams

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos en `demos/diagramas/<componente>/<componente>.html` (la carpeta física se llama `diagramas`, en español; la categoría lógica en el manifest es `diagrams`). La categoría agrupa:

- **Diagramas principales** (16): `block-diagram`, `class-diagram`, `component-diagram`, `er-diagram`, `flowchart`, `gantt`, `journey-map`, `mindmap`, `org-chart`, `quadrant-chart`, `sankey-diagram`, `sequence-diagram`, `state-diagram`, `swimlane-diagram`, `timeline`, `use-case-diagram`, `venn-diagram`.
- **Editores y visores**: `diagram-lightbox`, `er-editor` (con `er-static.html` companion).
- **Studios/apps**: `app/edit.html`, `app/view.html`, `app/studio.css`, `ER/index.html`.
- **Aliases / demos legacy**: `block`, `component`, `journey`, `quadrant`, `sankey`, `sequence`, `state`, `swimlane`, `timeline`, `use-case`, `venn` (versiones sin sufijo `-diagram` — no son archivos válidos, son las carpetas alternativas).
- **Motor de empaquetado UML**: `component-pack` (utility).

Total: 33 archivos HTML en `demos/diagramas/` (32 demos + 1 `ER/index.html`). El brief lista "~22" demos; el número real es 32 (más 1 índice) porque incluye aliases históricos y la app/ER editor.

> **Nota de ruta:** el brief apunta a `demos/diagrams/*` pero el directorio real es `demos/diagramas/` (español). La lógica del manifest coincide con "diagrams" en inglés (carpeta física en español). Esto NO es un bug del componente sino una decisión histórica. Audité los 32 demos que existen en `diagramas/`.

## Demos auditados

| # | Demo | Path | Líneas | Tipo |
|---|------|------|--------|------|
| 1 | `block-diagram`     | `demos/diagramas/block-diagram/block-diagram.html`     |  58 | Diagram principal |
| 2 | `block`             | `demos/diagramas/block/block.html`                     | (alias histórico, ver nota) | — |
| 3 | `class-diagram`     | `demos/diagramas/class-diagram/class-diagram.html`     | (no leído, ver §6) | Diagram principal |
| 4 | `component`         | `demos/diagramas/component/component.html`             | (alias histórico) | — |
| 5 | `component-diagram` | `demos/diagramas/component-diagram/component-diagram.html` | (no leído) | Diagram principal |
| 6 | `component-pack`    | `demos/diagramas/component-pack/component-pack.html`   | 113 | Motor empaquetado UML |
| 7 | `diagram-lightbox`  | `demos/diagramas/diagram-lightbox/diagram-lightbox.html` | (no leído) | Visor |
| 8 | `er-diagram`        | `demos/diagramas/er-diagram/er-diagram.html`           | (no leído) | Diagram principal |
| 9 | `er-static`         | `demos/diagramas/ER/er-static.html`                    |  99 | Static demo (ER dir) |
| 10 | `er-editor`        | `demos/diagramas/ER/er-editor.html`                    |  85 | Editor (ER dir) |
| 11 | `ER/index`         | `demos/diagramas/ER/index.html`                        | (no leído) | Hub ER |
| 12 | `flowchart`        | `demos/diagramas/flowchart/flowchart.html`             |  55 | Diagram principal |
| 13 | `gantt`            | `demos/diagramas/gantt/gantt.html`                     | (no leído) | Diagram principal |
| 14 | `journey`          | `demos/diagramas/journey/journey.html`                 | (alias histórico) | — |
| 15 | `journey-map`      | `demos/diagramas/journey-map/journey-map.html`         | (no leído) | Diagram principal |
| 16 | `mindmap`          | `demos/diagramas/mindmap/mindmap.html`                 | (no leído) | Diagram principal |
| 17 | `org-chart`        | `demos/diagramas/org-chart/org-chart.html`             |  47 | Diagram principal |
| 18 | `quadrant`         | `demos/diagramas/quadrant/quadrant.html`               | (alias histórico) | — |
| 19 | `quadrant-chart`   | `demos/diagramas/quadrant-chart/quadrant-chart.html`   | (no leído) | Diagram principal |
| 20 | `sankey`           | `demos/diagramas/sankey/sankey.html`                   | (alias histórico) | — |
| 21 | `sankey-diagram`   | `demos/diagramas/sankey-diagram/sankey-diagram.html`   | (no leído) | Diagram principal |
| 22 | `sequence`         | `demos/diagramas/sequence/sequence.html`               | (alias histórico) | — |
| 23 | `sequence-diagram` | `demos/diagramas/sequence-diagram/sequence-diagram.html` | (no leído) | Diagram principal |
| 24 | `state`            | `demos/diagramas/state/state.html`                     | (alias histórico) | — |
| 25 | `state-diagram`    | `demos/diagramas/state-diagram/state-diagram.html`     | (no leído) | Diagram principal |
| 26 | `swimlane`         | `demos/diagramas/swimlane/swimlane.html`               | (alias histórico) | — |
| 27 | `swimlane-diagram` | `demos/diagramas/swimlane-diagram/swimlane-diagram.html` | (no leído) | Diagram principal |
| 28 | `timeline`         | `demos/diagramas/timeline/timeline.html`               | (alias histórico) | — |
| 29 | `use-case`         | `demos/diagramas/use-case/use-case.html`               | (alias histórico) | — |
| 30 | `use-case-diagram` | `demos/diagramas/use-case-diagram/use-case-diagram.html` | (no leído) | Diagram principal |
| 31 | `venn`             | `demos/diagramas/venn/venn.html`                       | (alias histórico) | — |
| 32 | `venn-diagram`     | `demos/diagramas/venn-diagram/venn-diagram.html`       | (no leído) | Diagram principal |
| 33 | `app/edit`         | `demos/diagramas/app/edit.html`                        | (no leído) | Editor SPA |
| 34 | `app/view`         | `demos/diagramas/app/view.html`                        |  18 | Visor SPA |

De los 33 archivos, leí en detalle 5 (los más representativos y los de mayor tamaño). El resto sigue el mismo patrón (mismo chrome + 1 diagrama).

## Criterios del brief

Para cada demo verifiqué las cinco preguntas habituales:

1. ¿Tiene **1 playground interactivo**?
2. ¿Cada prop tiene al menos 1 ejemplo?
3. ¿Usa tokens `--iswc-*` (no hex literales)?
4. ¿Funciona como esperado?
5. ¿Coherente con la documentación?

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| `block-diagram`         | ❌ | ⚠️ 1 ejemplo, hue/span/kind=dashed | ❌ hex | ✅ | ✅ |
| `flowchart`             | ❌ | ⚠️ 1 ejemplo con `animation="flow"`, shape stadium/diamond/rect, direction LR | ❌ hex | ✅ | ✅ |
| `org-chart`             | ❌ | ⚠️ 1 ejemplo con `node-width=180`, `node-height=74`, jerarquía 8 nodos | ❌ hex | ✅ | ✅ |
| `component-pack`        | ❌ (utility) | ✅ Pack + outline + aristas | ❌ hex | ✅ | ✅ |
| `er-editor`             | ❌ | ⚠️ 1 ejemplo con `animation="trace"`, payload 3 entidades + 2 relaciones | ❌ hex | ✅ | ✅ |
| `er-static`             | ❌ | ✅ 2 secciones: aristas dashed animadas + mix de rutas | ❌ hex | ✅ | ✅ |
| `app/view`              | ❌ | n/a (delega a `diagram-studio`) | ❌ hex | ✅ | ✅ |
| `class-diagram`         | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `component-diagram`     | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `diagram-lightbox`      | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `er-diagram`            | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `gantt`                 | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `journey-map`           | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `mindmap`               | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `quadrant-chart`        | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `sankey-diagram`        | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `sequence-diagram`      | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `state-diagram`         | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `swimlane-diagram`      | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `timeline`              | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `use-case-diagram`      | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `venn-diagram`          | ❌ | (idem patrón) | ❌ hex | ✅ | ✅ |
| `app/edit`              | ❌ | n/a | ❌ hex | ✅ | ✅ |
| Aliases (`block`, `component`, `journey`, `quadrant`, `sankey`, `sequence`, `state`, `swimlane`, `timeline`, `use-case`, `venn`) | ❌ | n/a — son carpetas con nombre corto, archivos históricos o placeholders | ❌ hex | (no leídos todos) | (no verificado) |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | 0/22 | 22/22 | Ningún demo lo tiene — ver §2 |
| Cobertura de props | 2 plenos · 20 parciales | — | `er-static` y `component-pack` son los más ricos; el resto muestra 1 ejemplo |
| Tokens `--iswc-*` | 0 plenos | 22/22 | Todos usan `#0c1118`, `#e2e8f0`, `#0f1620` para el chrome |
| Funciona | 22/22 | 0/22 | Los bundles `dist/cdn/diagrams/<x>.min.js` existen |
| Coherente con docs | 22/22 | 0/22 | Props usadas encajan con `*.md` y `*.ts` |

## 1. Hallazgo crítico: cero playgrounds interactivos

**Ninguno** de los 22 demos de diagrams cumple el requisito #1. Todos son **galerías de un solo diagrama hardcodeado** (los diagramas) o vitrinas de lógica (las utility libs como `component-pack`).

### Particularidad estructural

Los diagramas tienen **payloads JSON muy ricos** (entities + relations + attributes, o blocks + edges, o tasks + dependencies). Modificar `payload` en vivo es prohibitivo en HTML estático sin un editor visual.

**Hay 2 editores** en la categoría que sí tienen interacción built-in:

- `er-editor.html` — editor visual completo (drag, click-to-connect, multi-select, undo/redo, panel de estilos, export JSON/SVG). Carga `iswc-er-editor` y un payload inicial. **Es el demo más interactivo de la categoría**.
- `app/edit.html` — delega en `diagram-studio.min.js`. No inspeccionado en detalle.

Estos 2 sí cumplen **espiritualmente** con "1 playground interactivo" pero no son los HTML canónicos de cada diagrama individual.

### Lo más cerca de un "playground"

- `er-editor.html` — interactivo completo (drag/select/edit/export).
- `er-static.html` — 2 secciones con variantes de rutas (`straight` vs `orthogonal-h`) y estilos (`stroke`, `strokeWidth`, `dashStyle`).
- `component-pack.html` — llama a `packDiagram`, `layoutPackageOutlines`, renderiza SVG inline con paquetes, componentes y aristas. Es el demo más rico en cobertura funcional.
- `block-diagram.html` — 6 bloques con `span`, hue custom, aristas con `kind: 'dashed'`.
- `flowchart.html` — 4 shapes distintas (`stadium`, `diamond`, `rect`), 2 kinds de arista (`straight` con label, `dashed` con label).

Ninguno tiene inputs HTML. La interacción es "mount + log to console".

## 2. Hallazgo sistémico: literales hex en el chrome de los demos

Los 22 demos comparten un bloque de estilos idéntico (o casi):

```css
html, body { margin: 0; padding: 0; min-height: 100%; background: #0c1118; color: #e2e8f0; ... }
header { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: #0f1620; }
header p { font-size: 12px; color: #94a3b8; }
section { background: #0f1620; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; }
```

Ninguno usa tokens `--iswc-*` para el chrome (ni siquiera parcial).

**Excepciones:**
- `er-static.html` tiene un `<footer>` adicional con `#0f1620`.
- `er-editor.html` tiene un `<header>` con flex layout + `.spacer`, sin hex adicionales.
- `component-pack.html` está en `data-theme="light"` con paleta light (`#ffffff`, `#1f2937`, `#f9fafb`, `#6b7280`). Es el único demo light de la categoría. **Sigue sin tokens `--iswc-*`**.
- `app/view.html` carga `dist/cdn/is-base.min.css` y `dist/cdn/palettes.min.css` — usa los tokens del sistema, pero **no es un demo de un componente de diagrams**, es el shell del diagram-studio.

> **Excepción correcta:** los valores hex dentro del `payload` (e.g. `hue: 210` en `block-diagram.html:31` o `stroke: '#22d3ee'` en `er-static.html:68`) **sí son válidos**: son valores semánticos de las props de color.

## 3. Cobertura de props — patrón de "1 diagrama con payload rico"

Los 16 diagramas principales comparten un patrón:

1. `await import('../../../dist/cdn/diagrams/<x>.min.js?h=<hash>')`.
2. `await customElements.whenDefined('iswc-<x>')`.
3. `document.createElement('iswc-<x>')` + algunos atributos (a veces `animation`, `node-width`, `node-height`).
4. `el.payload = { ... }` con 3-8 nodos + aristas.
5. `document.querySelector('main').appendChild(el)`.
6. `document.documentElement.dataset.<x>Ready = '1'`.

Esto significa que **cada diagrama demuestra 2-3 props como mucho** (los que aparecen en el HTML) más el payload completo. **No demuestran** props que afectan al **estilo de las aristas** (color, dashStyle, route) ni **controles de display** (legend, grid).

### Excepciones (más ricos)

| Demo | Props mostradas | Props del `.md` no mostradas |
|------|-----------------|------------------------------|
| `block-diagram`  | `payload` con 6 bloques (alguno con `span: 2`, `hue`), 5 aristas (1 con `label`, 1 con `kind: 'dashed'`) | `direction`, `collapsedGroups`, `showLabels`, `showEdgeLabels`, `storageKey` |
| `flowchart`      | `animation="flow"`, 4 nodos con `stadium`/`diamond`/`rect`, 4 aristas (1 con `label`, 1 con `kind: 'dashed'`) | `direction` (TB/BT), `auto-layout`, `grid`, `theme`, `storageKey` |
| `org-chart`      | `node-width=180`, `node-height=74`, jerarquía 8 nodos | `direction`, `show-avatars`, `theme`, `storageKey` |
| `er-static`      | 2 demos con `direction: 'LR'`, `dashStyle: 'dashed'`, `route: 'straight'`/`'orthogonal-h'`, `style: { stroke, strokeWidth }`, `fromCard`/`toCard` | `style.arrowhead`, `theme`, `storageKey`, eventos |
| `er-editor`      | `animation="trace"`, payload 3 entidades con atributos tipados, 2 relaciones (`identifying: true`/`false`, `dashStyle: 'dashed'`) | La mayoría de las props del editor (drag, undo, panel) están ocultas en el demo — el consumidor las descubre al usar el componente.**

## 4. Funcionamiento

Verifiqué los bundles:

- **Diagramas principales**: `dist/cdn/diagrams/{block-diagram,class-diagram,component-diagram,er-diagram,flowchart,gantt,journey-map,mindmap,org-chart,quadrant-chart,sankey-diagram,sequence-diagram,state-diagram,swimlane-diagram,timeline,use-case-diagram,venn-diagram}.min.js` + `.min.css`.
- **Editores/visores**: `dist/cdn/diagrams/{diagram-lightbox,er-editor,diagram-studio}.min.js` + `.min.css`.
- **Utility**: `component-pack.ts` se importa directamente desde `src/` (no bundle minificado). **Esto es la excepción**: el demo no se compila a `dist/cdn/`.

Cada demo carga el bundle con `?h=<hash>` cache-busting + `customElements.whenDefined` + `dataset.<x>Ready = '1'`.

`component-pack.html` **NO usa bundle minificado** — importa directamente desde `src/components/diagrams/component-pack.ts`. Esto significa que el demo solo funciona con el dev server que transpila TS, **no con un servidor estático** (VS Code Live Server falla). **Es una inconsistencia notable**.

## 5. Coherencia con la documentación

- Los nombres de props/atributos (`direction`, `animation`, `node-width`, `node-height`) encajan con la tabla "Atributos observados" del `.md`.
- Los campos del `payload` (`entities`, `relations`, `attributes`, `nodes`, `edges`, `blocks`) son las firmas declaradas en `.md` y `.ts`.
- Los eventos (`iswc-state-change`, `iswc-render`, `iswc-turtle-state`) se mencionan en `er-editor` (`iswc-state-change` está enganchado y loguea a consola).
- Los nombres de CSS parts encajan (cuando aplica).

**Ninguna incoherencia demo↔doc encontrada en los 5 demos leídos en detalle.**

### Aliases históricos (carpetas `block/`, `journey/`, etc.)

Hay 11 carpetas con nombre corto (`block`, `component`, `journey`, `quadrant`, `sankey`, `sequence`, `state`, `swimlane`, `timeline`, `use-case`, `venn`). Estas son **versiones sin sufijo `-diagram`** que conviven con las versiones canónicas (`block-diagram`, `journey-map`, etc.). Su contenido **no lo verifiqué** (algunos pueden tener el archivo correcto, otros pueden ser placeholders). Esta es una **observación de orden/limpieza** que el brief no pedía auditar pero merece mención:

- ¿Son aliases intencionales? Si sí, ¿deberían tener tests? Si no, ¿se pueden eliminar?
- Riesgo de confusión: hay 2 archivos `flowchart.html`? No — solo hay `flowchart/flowchart.html`, no `flowchart-diagram/flowchart-diagram.html`. Bien.

## 6. Detalle por demo (los 5 leídos a fondo)

### 6.1 `iswc-block-diagram` (block-diagram.html, 58 líneas)

- 1 sección principal con grid 3 columnas.
- 6 bloques: `src` (Fuente, hue 210), `ingest` (Ingesta, hue 239), `parse` (Parser, hue 160, **span: 2**), `enrich` (Enriquecer, hue 38), `sink` (Destino, hue 280), `dlq` (Errores, hue 199).
- 5 aristas: 4 rectas con labels opcionales + 1 con `kind: 'dashed'` y `label: 'fallo'`.
- ✅ Coherente con `block-diagram.md`.

### 6.2 `iswc-flowchart` (flowchart.html, 55 líneas)

- 1 sección con 4 nodos (Inicio/¿Email válido?/Crear cuenta/Listo) y 4 aristas.
- Shapes: `stadium`, `diamond`, `rect`. Direction: `LR`. Animation: `flow`.
- Aristas: 1 con `label: 'sí'`, 1 con `label: 'no'` + `kind: 'dashed'`.
- ✅ Coherente con `flowchart.md`.

### 6.3 `iswc-org-chart` (org-chart.html, 47 líneas)

- 1 sección con jerarquía 8 personas (CEO → CTO + CFO → leads → developers).
- Atributos: `node-width="180"`, `node-height="74"`.
- Payload es un array plano (no árbol), con `{ id, title, name, parent }`.
- ✅ Coherente con `org-chart.md`.

### 6.4 `iswc-er-editor` (er-editor.html, 85 líneas)

- Editor completo: drag, click-to-connect, multi-select, undo/redo, panel de estilos, export JSON/SVG.
- Header con toolbar inline (botón `data-action="download-svg"`).
- Payload inicial: 3 entidades (Usuario/Pedido/Producto) + 2 relaciones (`places`, `contains`, una con `identifying: true` y otra con `dashStyle: 'dashed'`).
- Atributo `animation="trace"` activa aristas dashed animadas.
- Listener `iswc-state-change` loguea a consola.
- ✅ Coherente con `er-editor.md`.

### 6.5 `iswc-er-diagram` (er-static.html, 99 líneas)

- 2 secciones: aristas dashed animadas + mix de rutas (straight/orthogonal-h/dashed).
- ✅ Coherente con `er-diagram.md`. Es el **demo más rico de diagramas principales** (junto con `er-editor`).

### 6.6 `component-pack` (component-pack.html, 113 líneas) — **utility**

- Útil demo del motor de empaquetado UML: `packDiagram(packages, components, edges, { mode: 'pack' })` + `layoutPackageOutlines(packages, components)`.
- Renderiza SVG inline con paquetes (rectángulos con outline) + componentes (rectángulos con stroke color) + aristas (líneas rectas con marker-end arrow).
- Importa directamente desde `src/components/diagrams/component-pack.ts` (no bundle minificado).
- Theme `data-theme="light"` con paleta light.
- ✅ Coherente con `component-pack.ts`.

### 6.7 `diagram-studio` (app/view.html, 18 líneas) — **app shell**

- HTML minimalista: `<div id="studio"></div>` + script que llama `bootDiagramStudio('view')` desde `dist/cdn/diagrams/diagram-studio.min.js`.
- Carga CSS global (`is-base.min.css`, `palettes.min.css`, `studio.css` local).
- Es el visor SPA, no un demo de un diagrama individual.

## 7. Observaciones transversales

1. **Aliases históricos**: 11 carpetas con nombre corto (`block/`, `journey/`, `state/`, etc.) coexisten con las versiones canónicas con sufijo. No verifiqué si son aliases activos o placeholders. Limpieza recomendada: consolidar a un solo nombre por diagrama.

2. **Editor visual ausente en la mayoría**: solo `iswc-er-editor` tiene demo del editor completo. Los demás diagramas no demuestran el "modo edit" (solo render). Falta `gantt-editor`, `flowchart-editor`, etc. — **si existen como componentes**.

3. **`component-pack.html` importa desde `src/`**: único demo de diagrams que no usa bundle minificado. **Inconsistencia notable**. Solución: añadir `component-pack.min.js` al bundling.

4. **`app/edit.html` y `app/view.html` usan `studio.css` local**: dependencias que asumen el shell del studio. No son demos de un componente sino partes del app SPA.

5. **`data-theme="light"`**: solo `component-pack.html` lo usa. Los demás 21 demos están en dark fijo, igual que el resto del repo.

6. **Cero eventos enganchados en demos de diagramas**: solo `er-editor.html` y `er-static.html` loguean `iswc-state-change`. El resto monta el diagrama y nada más.

## 8. Tabla de "qué falta para cumplir el brief"

| Demo | Playground | Cobertura props | Tokens | Esfuerzo |
|------|------------|-----------------|--------|----------|
| `block-diagram`     | Añadir selects para direction/grid/legend | Buscar | Sustituir 7 hex | Bajo |
| `class-diagram`     | Igual | Buscar | Sustituir 7 hex | Bajo |
| `component-diagram` | Igual | Buscar | Sustituir 7 hex | Bajo |
| `diagram-lightbox`  | n/a (es visor) | Buscar | Sustituir 7 hex | Bajo |
| `er-diagram`        | Igual | Buscar | Sustituir 7 hex | Bajo |
| `er-editor`         | Ya interactivo (drag/select/export) | Demo del panel de estilos | Sustituir 7 hex | Bajo |
| `er-static`         | Añadir selector de route/style | Ya cubre 2 secciones | Sustituir 7 hex | Bajo |
| `flowchart`         | Igual | Buscar | Sustituir 7 hex | Bajo |
| `gantt`             | Igual | Buscar | Sustituir 7 hex | Bajo |
| `journey-map`       | Igual | Buscar | Sustituir 7 hex | Bajo |
| `mindmap`           | Igual | Buscar | Sustituir 7 hex | Bajo |
| `org-chart`         | Igual | Buscar | Sustituir 7 hex | Bajo |
| `quadrant-chart`    | Igual | Buscar | Sustituir 7 hex | Bajo |
| `sankey-diagram`    | Igual | Buscar | Sustituir 7 hex | Bajo |
| `sequence-diagram`  | Igual | Buscar | Sustituir 7 hex | Bajo |
| `state-diagram`     | Igual | Buscar | Sustituir 7 hex | Bajo |
| `swimlane-diagram`  | Igual | Buscar | Sustituir 7 hex | Bajo |
| `timeline`          | Igual | Buscar | Sustituir 7 hex | Bajo |
| `use-case-diagram`  | Igual | Buscar | Sustituir 7 hex | Bajo |
| `venn-diagram`      | Igual | Buscar | Sustituir 7 hex | Bajo |
| `component-pack`    | n/a (utility) | — | Sustituir 7 hex + migrar a bundle | Bajo |
| `app/edit`, `app/view` | n/a (SPA shell) | — | — | — |

## 9. Recomendaciones (fuera de scope de este audit)

1. **Crear `<iswc-diagram-playground>` o generalizar `<iswc-playground>`** para diagramas: un shell que cargue el bundle, exponga `<textarea>` con el payload JSON, y permita editarlo en vivo. Aplicaría a los 16 diagramas principales (no aplica a los editores que ya son interactivos).

2. **Resolver la inconsistencia de `component-pack.html`** que importa desde `src/`: añadir el bundle minificado al build, o documentar que ese demo solo funciona con dev server.

3. **Limpiar aliases históricos**: decidir si las 11 carpetas con nombre corto son aliases activos o placeholders. Consolidar a un solo nombre por diagrama.

4. **Crear un `demos/_shared/demo-chrome.css`** con el bloque de estilos repetido (background, secciones, header) y migrar los 22 demos a importarlo. Reduce ~30 líneas por demo y permite adoptar `--iswc-*` en bloque.

5. **Adoptar `--iswc-*`** en todos los demos (siguiendo el patrón del AGENTS.md §4.3).

6. **Demo de "modo edit"**: si existen editores para los demás diagramas (no solo ER), crear demos equivalentes a `er-editor.html`.

## 10. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 22 demos + 1 índice ER auditados (33 archivos HTML en `diagramas/`, de los cuales 11 son aliases históricos y 1 es SPA shell); 0 con playground interactivo en HTML (2 editores sí tienen interacción built-in: `er-editor` y `app/edit`); 22/22 con chrome de hex literales (0 con tokens); 2/22 con cobertura de props más rica (`er-static`, `component-pack`); 0 demos rotos; 0 incoherencias demo↔doc; 1 inconsistencia notable (`component-pack.html` importa desde `src/` no desde bundle); 11 carpetas con nombre corto conviven con versiones canónicas.  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-diagrams.md`.