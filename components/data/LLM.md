# `data` para LLM

## Propósito

Presentación, comparación, movimiento u organización de datos estructurados.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-data-grid>` | [data-grid.md](data-grid.md) | Data Grid |
| `<is-stat>` | [stat.md](stat.md) | Stat KPI |
| `<is-transfer>`, `<is-transfer-item>` | [transfer.md](transfer.md) | Transfer |
| `<is-gauge>` | [gauge.md](gauge.md) | Gauge |
| `<is-kanban>`, `<is-kanban-column>`, `<is-kanban-card>` | [kanban.md](kanban.md) | Kanban |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/grid-data.js`
- `../_shared/grid-types.js`
- `../_shared/grid-ui.js`
- `../_shared/adopt-css.js`

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

Confundir módulo multi-tag con archivos independientes; children viven en transfer/kanban.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](../LLM.md)
