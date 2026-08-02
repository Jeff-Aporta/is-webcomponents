---
tag: is-treemap
tags:
  - is-treemap
category: charts
status: public
source: ./treemap.js
style: ./treemap.css
preview: ../../previews/data-viz/is-treemap.html
---
# `<is-treemap>`

## Propósito

Treemap anidado en SVG, con el algoritmo squarified (Bruls/Huizing/
van Wijk): rectángulos con aspect-ratio cercano a 1, sin huecos ni
solapes.

Este módulo registra `<is-treemap>`.

## Cuándo usarlo

Series, distribuciones, relaciones o jerarquías de datos.

## Cuándo no usarlo

No crear otro engine si marks/engine existentes cubren caso.

## Importación

```js
import './treemap.js';
```

## Ejemplo mínimo

```html
<is-treemap></is-treemap>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `variant` | string/según contrato | Fuente define default/restricción. |

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
| `default` | Contenido proyectado. |

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
| `--chart-surface` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-treemap> — treemap anidado en SVG (algoritmo squarified), sin librerías.
>   <is-treemap>
>     <script type="application/json">
>       { "treemap": { "nodes": [{ "id":"inv", "label":"Inventario", "value":3200 }] } }
>     </script>
>   </is-treemap>
> Mismo esqueleto que <is-flowchart> / <is-mindmap>: shadow DOM, slot JSON +
> MutationObserver, tema por atributo `data-theme`, `variant` (inline | viewer),
> lightbox propio.
> Atributos: variant (inline | viewer), without-viewer
> Propiedades: payload, spec, layout
> Eventos: is-render, is-open-viewer

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./treemap-spec.js`](./treemap-spec.js)
- [`../diagrams/sequence-spec.js`](../diagrams/sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`../diagrams/diagram-kinds.js`](../diagrams/diagram-kinds.js)

Tags del módulo: `<is-treemap>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<is-treemap></is-treemap>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./treemap.js)
- [CSS](./treemap.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data-viz/is-treemap.html)
