# Componentes · diagrams

Diagramas: flujo, clases, estados, ER, Gantt y demas, en SVG.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-flowchart` | Diagrama de flujo | [flowchart.md](flowchart.md) |
| `iswc-sequence-diagram` | Diagrama de secuencia | [sequence-diagram.md](sequence-diagram.md) |
| `iswc-diagram-lightbox` | Visor de diagramas | [diagram-lightbox.md](diagram-lightbox.md) |
| `iswc-class-diagram` | Diagrama de clases | [class-diagram.md](class-diagram.md) |
| `iswc-state-diagram` | Diagrama de estados | [state-diagram.md](state-diagram.md) |
| `iswc-er-diagram` | Diagrama entidad-relación | [er-diagram.md](er-diagram.md) |
| `iswc-er-editor` | Editor entidad-relación | [er-editor.md](er-editor.md) |
| `iswc-diagram-view-app` | Visor de diagramas (API) | [diagram-view-app.md](diagram-view-app.md) |
| `iswc-diagram-edit-app` | Editor de diagramas (API) | [diagram-edit-app.md](diagram-edit-app.md) |
| `iswc-block-diagram` | Diagrama de bloques | [block-diagram.md](block-diagram.md) |
| `iswc-component-diagram` | Diagrama de componentes | [component-diagram.md](component-diagram.md) |
| `iswc-mindmap` | Mapa mental | [mindmap.md](mindmap.md) |
| `iswc-gantt` | Diagrama de Gantt | [gantt.md](gantt.md) |
| `iswc-timeline` | Línea de tiempo | [timeline.md](timeline.md) |
| `iswc-org-chart` | Org Chart | [org-chart.md](org-chart.md) |
| `iswc-sankey-diagram` | Diagrama de Sankey | [sankey-diagram.md](sankey-diagram.md) |
| `iswc-quadrant-chart` | Matriz de cuadrantes | [quadrant-chart.md](quadrant-chart.md) |
| `iswc-venn-diagram` | Diagrama de Venn | [venn-diagram.md](venn-diagram.md) |
| `iswc-use-case-diagram` | Diagrama de casos de uso | [use-case-diagram.md](use-case-diagram.md) |
| `iswc-swimlane-diagram` | Diagrama de carriles | [swimlane-diagram.md](swimlane-diagram.md) |
| `iswc-journey-map` | Mapa de recorrido | [journey-map.md](journey-map.md) |
<!-- /generado:componentes -->

## Reglas del dominio

- Los cuatro archivos de cada componente: `<nombre>.ts`, `<nombre>.scss`, `<nombre>.md` y `<nombre>.json`.
- El `.md` del componente es su ficha: props, eventos, slots y ejemplos.
- El `.json` es el contrato que leen la galeria, el audit y el constructor de apps.
- El SCSS entra por `@use 'iswc:css'` (el alias) o por el modulo compartido `kit`.
- El `.ts` lleva la cabecera `// @contexto INDICE.md · <md del dominio>`.

## Guardianes

- `tests/gobernanza/contrato-cuatro-archivos.test.ts` — los cuatro archivos de cada componente.
- `tests/gobernanza/componentes-contrato.test.ts` — props, eventos y slots contra el `.json`.
- `tests/gobernanza/sin-codigo-muerto.test.ts` — nada sin importador ni export sin consumidor.
- `tests/gobernanza/indice-md.test.ts` — cada tag tiene su md y el indice esta al dia.

## Documentos relacionados

- [INDICE.md](../../../../INDICE.md) — el indice de todos los documentos del kit.
- [specs/constitution.md](../../../../specs/constitution.md) — lo que no se negocia.
