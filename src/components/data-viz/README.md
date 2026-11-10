# Componentes · data-viz

Visualizacion: mapas, mapas de calor y graficos de series.

## Componentes

<!-- generado:componentes -->
| Tag | Título | Documento |
|---|---|---|
| `iswc-chart` | Chart | [chart.md](chart.md) |
| `iswc-bar-chart` | Bar Chart | [bar-chart.md](bar-chart.md) |
| `iswc-line-chart` | Line Chart | [line-chart.md](line-chart.md) |
| `iswc-pie-chart` | Pie Chart | [pie-chart.md](pie-chart.md) |
| `iswc-doughnut-chart` | Doughnut Chart | [doughnut-chart.md](doughnut-chart.md) |
| `iswc-radar-chart` | Radar Chart | [radar-chart.md](radar-chart.md) |
| `iswc-polar-area-chart` | Polar Area Chart | [polar-area-chart.md](polar-area-chart.md) |
| `iswc-scatter-chart` | Scatter Chart | [scatter-chart.md](scatter-chart.md) |
| `iswc-bubble-chart` | Bubble Chart | [bubble-chart.md](bubble-chart.md) |
| `iswc-sparkline` | Sparkline | [sparkline.md](sparkline.md) |
| `iswc-waterfall-chart` | Waterfall Chart | [waterfall-chart.md](waterfall-chart.md) |
| `iswc-funnel-chart` | Funnel Chart | [funnel-chart.md](funnel-chart.md) |
| `iswc-treemap` | Treemap | [treemap.md](treemap.md) |
| `iswc-gauge` | Gauge | [gauge.md](gauge.md) |
| `iswc-heatmap` | Heatmap | [heatmap.md](heatmap.md) |
| `iswc-maps` | Maps | [maps.md](maps.md) |
| `iswc-map-marker` | Map Marker | [map-marker.md](map-marker.md) |
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
