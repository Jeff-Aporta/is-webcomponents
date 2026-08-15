---
tag: is-sankey-diagram
tags:
  - is-sankey-diagram
category: diagrams
status: public
source: ./sankey-diagram.js
style: ./sankey-diagram.css
preview: ../../previews/diagrams/is-sankey-diagram.json
---
# `<is-sankey-diagram>`

## Propósito

Diagrama de **Sankey** en SVG, sin Mermaid. Declaras nodos y enlaces con
valor, y el componente reparte las capas, calcula la altura de cada nodo y
dibuja cada flujo con un grosor proporcional a su valor.

Este módulo registra `<is-sankey-diagram>`.

## Cuándo usarlo

Cuando el mensaje es **cuánto** se reparte entre caminos: esfuerzo por
etapa, presupuesto por concepto, tráfico por destino. El grosor es el dato.

## Cuándo no usarlo

Si solo importa el orden o la estructura y no la magnitud → `<is-flowchart>`.
Si los valores son categorías comparadas contra un eje → usa un gráfico de barras.

## Importación

```js
import './sankey-diagram.js';
```

## Ejemplo mínimo

```html
<is-sankey-diagram>
  <script type="application/json">
    {}
  </script>
</is-sankey-diagram>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |
| `height` | number | Alto del área de datos en px (default 320). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `isViewer` | solo lectura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |
| `spec` | solo lectura | Declarada por clase. |
| `layout` | solo lectura | Declarada por clase. |
| `hiddenGroups` | lectura/escritura | Grupos ocultos por el visor. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Payload JSON en un `<script type="application/json">`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | sí | sí | sí | no |
| `is-open-viewer` | sí | sí | sí | sí |
| `is-toggle-group` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `updateComplete()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `canvas` | Personalizable con `::part(canvas)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-sans` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Las capas salen del camino más largo desde las fuentes; la altura de un nodo es el mayor entre lo que entra y lo que sale. Un enlace con valor cero o negativo no se dibuja: no tendría grosor.

Documentación de cabecera preservada desde fuente:

> <is-sankey-diagram> — diagrama de Sankey en SVG, sin Mermaid.
>   <is-sankey-diagram>
>     <script type="application/json">
>       { "sankey": { "nodes": [...], "links": [{ "from": "a", "to": "b", "value": 40 }] } }
>     </script>
>   </is-sankey-diagram>
> Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click, height
> Propiedades: payload, spec, layout, hiddenGroups
> Eventos: is-render, is-open-viewer, is-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./sankey-spec.js`](./sankey-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del módulo: `<is-sankey-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galería, que trae el payload completo con grupos y estilos:
[`../../previews/diagrams/is-sankey-diagram.json`](../../previews/diagrams/is-sankey-diagram.json).

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./sankey-diagram.js)
- [CSS](./sankey-diagram.css)
- [Spec y layout](./sankey-spec.js)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-sankey-diagram.json)
