---
tag: is-quadrant-chart
tags:
  - is-quadrant-chart
category: diagrams
status: public
source: ./quadrant-chart.js
style: ./quadrant-chart.css
preview: ../../previews/diagrams/is-quadrant-chart.json
---
# `<is-quadrant-chart>`

## Propósito

Matriz **2×2** en SVG, sin Mermaid. Dos ejes continuos, cuatro cuadrantes
nombrados y puntos ubicados con coordenadas `x` / `y` entre 0 y 1.

Este módulo registra `<is-quadrant-chart>`.

## Cuándo usarlo

Priorización y comparación de opciones: impacto contra esfuerzo, costo
contra calidad, riesgo contra valor.

## Cuándo no usarlo

Si necesitas ejes con escala numérica real y muchos puntos → usa un gráfico
de dispersión. Si no hay dos dimensiones, no hay matriz.

## Importación

```js
import './quadrant-chart.js';
```

## Ejemplo mínimo

```html
<is-quadrant-chart>
  <script type="application/json">
    {}
  </script>
</is-quadrant-chart>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |

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

Las coordenadas se recortan a 0..1: un punto fuera de rango se pega al borde en vez de salirse del lienzo. Las etiquetas que caerían encimadas se apilan una línea más abajo.

Documentación de cabecera preservada desde fuente:

> <is-quadrant-chart> — matriz 2×2 en SVG, sin Mermaid.
>   <is-quadrant-chart>
>     <script type="application/json">
>       { "quadrant": { "xAxis": { "left": "Bajo", "right": "Alto" }, "points": [...] } }
>     </script>
>   </is-quadrant-chart>
> Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, hiddenGroups
> Eventos: is-render, is-open-viewer, is-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./quadrant-spec.js`](./quadrant-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del módulo: `<is-quadrant-chart>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galería, que trae el payload completo con grupos y estilos:
[`../../previews/diagrams/is-quadrant-chart.json`](../../previews/diagrams/is-quadrant-chart.json).

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

- [JavaScript](./quadrant-chart.js)
- [CSS](./quadrant-chart.css)
- [Spec y layout](./quadrant-spec.js)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-quadrant-chart.json)
