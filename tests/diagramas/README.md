# tests/diagramas — los diagramas

Los diagramas (flujo, clases, estados, ER, Gantt, sankey…) y su contrato: el payload que
entienden, el SVG que dibujan y los estilos que comparten.

## Como se escriben

- Un archivo por diagrama (`flowchart-iswc.test.ts`).
- Los diagramas comparten el lienzo (`src/styles/_kit.scss`): si cambia, cambia para todos.
- El payload de ejemplo vive en `tests/fixtures/`.

## Guardianes

- `tests/gobernanza/scss-simple.test.ts` — el lienzo del diagrama no se copia a mano.
- `tests/diagramas/diagram-styles-layout.test.ts` — el tema y el layout.
