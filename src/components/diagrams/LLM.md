# `diagrams` para LLM

## Propósito

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Qué componente elegir

Elegir módulo mínimo que cubra necesidad. Abrir referencia específica; no inferir API desde nombre.

## Componentes

| Tags | Documento | Uso principal |
| --- | --- | --- |
| `<is-flowchart>` | [flowchart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/flowchart.md) | Diagrama de flujo |
| `<is-sequence-diagram>` | [sequence-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/sequence-diagram.md) | Diagrama de secuencia |
| `<is-lightbox>` | [lightbox.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/lightbox.md) | Lightbox |
| `<is-diagram-lightbox>` | [diagram-lightbox.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/diagram-lightbox.md) | Visor de diagramas |
| `<is-class-diagram>` | [class-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/class-diagram.md) | Diagrama de clases |
| `<is-state-diagram>` | [state-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/state-diagram.md) | Diagrama de estados |
| `<is-er-diagram>` | [er-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/er-diagram.md) | Diagrama entidad-relación |
| `<is-block-diagram>` | [block-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/block-diagram.md) | Diagrama de bloques |
| `<is-mindmap>` | [mindmap.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/mindmap.md) | Mapa mental |
| `<is-gantt>` | [gantt.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/gantt.md) | Diagrama de Gantt |
| `<is-timeline>` | [timeline.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/timeline.md) | Línea de tiempo |
| `<is-org-chart>` | [org-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/org-chart.md) | Organigrama jerárquico |

## Composición y relaciones

Módulos multi-tag se documentan juntos. Parent/child mantienen contrato del mismo JS/CSS.

## Reusar antes de crear

- `../_shared/diagram-edit.js`
- `../_shared/node-link-layout.js`
- `../_shared/tree-layout.js`
- `./diagram-kinds.js`
- `../_shared/adopt-css.js`
- `../_shared/tk-hue.js`
- `../_shared/tk-inline-md.js`
- `../_shared/tk-icon-inline.js`
- `../_shared/icon-loader.js`
- `../_shared/diagram-grid.js`
- `../_shared/tk-color.js`
- `../_shared/path-turtle.js`

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

Inventar payloads o registrar specs como elementos; usar schema/kind registry.

Fuente manda sobre preview. Ruta preview viene de `manifest.js.page`.

## Módulos internos

No expone módulos internos documentales en esta categoría.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
