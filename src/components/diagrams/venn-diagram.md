---
tag: is-venn-diagram
tags:
  - is-venn-diagram
category: diagrams
status: public
source: ./venn-diagram.js
style: ./venn-diagram.css
preview: ../../previews/diagrams/is-venn-diagram.json
---
# `<is-venn-diagram>`

## Propósito

Diagrama de **Venn** de dos o tres conjuntos en SVG, sin Mermaid, con las
posiciones canónicas y las regiones etiquetadas.

Este módulo registra `<is-venn-diagram>`.

## Cuándo usarlo

Cuando el mensaje es solape: alcance pedido contra alcance entregado,
usuarios de dos módulos, cobertura de dos catálogos.

## Cuándo no usarlo

Con cuatro o más conjuntos: los círculos no pueden representar todas las
regiones y el diagrama miente. Si lo que hay es jerarquía → `<is-mindmap>`.

## Importación

```js
import './venn-diagram.js';
```

## Ejemplo mínimo

```html
<is-venn-diagram>
  <script type="application/json">
    {}
  </script>
</is-venn-diagram>
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

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Payload JSON en un `<script type="application/json">`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | sí | sí | sí | no |
| `is-open-viewer` | sí | sí | sí | sí |

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

El relleno es translúcido y la intersección aparece por superposición, sin máscaras: el orden de declaración no altera el resultado. Un payload con menos de dos o más de tres conjuntos no se dibuja.

Documentación de cabecera preservada desde fuente:

> <is-venn-diagram> — diagrama de Venn (2 o 3 conjuntos) en SVG, sin Mermaid.
>   <is-venn-diagram>
>     <script type="application/json">
>       { "venn": { "sets": [...], "regions": [{ "sets": ["a","b"], "label": "Ambos" }] } }
>     </script>
>   </is-venn-diagram>
> Mismo esqueleto que <is-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout
> Eventos: is-render, is-open-viewer

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./venn-spec.js`](./venn-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del módulo: `<is-venn-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galería, que trae el payload completo con grupos y estilos:
[`../../previews/diagrams/is-venn-diagram.json`](../../previews/diagrams/is-venn-diagram.json).

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

- [JavaScript](./venn-diagram.js)
- [CSS](./venn-diagram.css)
- [Spec y layout](./venn-spec.js)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-venn-diagram.json)
