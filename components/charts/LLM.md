# `charts` para LLM

## Propósito

Series, distribuciones, relaciones o jerarquías de datos.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-chart>` | [chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/chart.md) | Chart |
| `<is-bar-chart>` | [bar-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/bar-chart.md) | Bar Chart |
| `<is-line-chart>` | [line-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/line-chart.md) | Line Chart |
| `<is-pie-chart>` | [pie-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/pie-chart.md) | Pie Chart |
| `<is-doughnut-chart>` | [doughnut-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/doughnut-chart.md) | Doughnut Chart |
| `<is-radar-chart>` | [radar-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/radar-chart.md) | Radar Chart |
| `<is-polar-area-chart>` | [polar-area-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/polar-area-chart.md) | Polar Area Chart |
| `<is-scatter-chart>` | [scatter-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/scatter-chart.md) | Scatter Chart |
| `<is-bubble-chart>` | [bubble-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/bubble-chart.md) | Bubble Chart |
| `<is-sparkline>` | [sparkline.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/sparkline.md) | Sparkline |
| `<is-waterfall-chart>` | [waterfall-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/waterfall-chart.md) | Waterfall Chart |
| `<is-funnel-chart>` | [funnel-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/funnel-chart.md) | Funnel Chart |
| `<is-treemap>` | [treemap.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/charts/treemap.md) | Treemap |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/svg-chart-engine.js`
- `../_shared/chart-palette.js`
- `./marks-cartesian.js`
- `./marks-radial.js`
- `../_shared/adopt-css.js`
- `../_shared/path-turtle.js`
- `../diagrams/diagram-kinds.js`
- `../diagrams/sequence-spec.js`
- `../_shared/tk-hue.js`
- `../_shared/tk-inline-md.js`

## Dependencias compartidas

Revisar imports y `_shared/` antes de implementar. Reusar stdlib, plataforma y módulos existentes.

## Patrones comunes

- Importar módulo ES antes de usar tag.
- Usar propiedades para objetos/payloads y atributos declarados para escalares.
- Respetar contrato de eventos, parts, states y tokens.

## Qué hacer

- Leer MD, JS, CSS y preview exacto de manifest.
- Leer callers antes de tocar helper compartido.
- Preservar accesibilidad, validación y fallbacks.
- Ejecutar `node scripts/docs-consistency.selfcheck.mjs`.

## Qué no hacer

- No inventar API ni copiar contrato de componente parecido.
- No crear abstracción si shared/native resuelve caso.
- No crear size colors; usar font-size contextual y em.
- No duplicar MD por tag multi-tag.

## Errores conocidos y prevención

Duplicar engine o asumir config idéntica; revisar wrapper y marks.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/components/LLM.md)
