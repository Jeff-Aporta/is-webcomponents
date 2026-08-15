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
| `<is-sankey-diagram>` | [sankey-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/sankey-diagram.md) | Diagrama de Sankey |
| `<is-quadrant-chart>` | [quadrant-chart.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/quadrant-chart.md) | Matriz de cuadrantes |
| `<is-venn-diagram>` | [venn-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/venn-diagram.md) | Diagrama de Venn |
| `<is-use-case-diagram>` | [use-case-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/use-case-diagram.md) | Diagrama de casos de uso UML |
| `<is-swimlane-diagram>` | [swimlane-diagram.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/swimlane-diagram.md) | Diagrama de carriles |
| `<is-journey-map>` | [journey-map.md](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/diagrams/journey-map.md) | Mapa de recorrido |

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
- `../_shared/diagram-arrow.js`
- `../_shared/svg-chart-engine.js`

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

## Legibilidad del render (aprendido exportando a PNG)

Los selfchecks de geometría pasaban en verde mientras el PNG salía ilegible.
Lo que se dibuja tiene que CABER, y eso no lo comprueba un layout correcto.
Cubierto por `render-legibilidad.selfcheck.mjs`.

- **La cabecera cuenta para el ancho.** Título y subtítulo se centran en
  `width / 2`: con un diagrama estrecho se salen por los dos lados. Todo spec
  con cabecera pasa por `../_shared/diagram-header.js`.
- **La etiqueta que va sobre una arista usa `theme.chipFillSoft`** (alfa 0.7),
  no `chipFill`. Con el fondo opaco, el chip tapa la línea que está explicando.
- **Las etiquetas que viven fuera de la figura entran en el lienzo.** Pasó en
  Venn (nombres de conjunto) y en Timeline (tarjeta del primer evento).
- **Ante un choque con la leyenda, el contenido BAJA.** Empujar la leyenda a la
  derecha desperdicia el ancho y termina cortando lo de la izquierda.
- **Un miembro puede llegar como objeto.** `readMember` de `class-spec` acepta
  `{ name, type, visibility }` y compone `visibilidad nombre : tipo`; antes
  hacía `String(raw)` y pintaba `[object Object]` sin avisar.
- **El diagrama ocupa el ancho que tiene.** El Sankey calculaba la separación
  entre capas con una constante y dejaba media lámina vacía: ahora se reparte
  el ancho objetivo entre las capas.

**`is-org-chart` es el outlier**: no extiende `DiagramElementBase`, su slot JSON
es el ARREGLO de nodos, sus nodos usan `name`/`title` (no `label`) y pinta las
tarjetas en `foreignObject`, que no sobrevive a un screenshot headless. No
usarlo donde el entregable sea una imagen exportada; `is-mindmap` con
`layout: "tree"` cubre el caso.

## Navegación

- [Índice global](https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/LLM.md)
