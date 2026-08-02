---
tag: is-sequence-diagram
tags:
  - is-sequence-diagram
category: diagrams
status: public
source: ./sequence-diagram.js
style: ./sequence-diagram.css
preview: ../../previews/diagrams/is-sequence-diagram.html
---
# `<is-sequence-diagram>`

## Propósito

Diagrama de secuencia en SVG, sin Mermaid. La configuración es un JSON
con actores, mensajes y grupos; el layout (posiciones, ruteo ortogonal
de las flechas y colocación de etiquetas) se calcula solo.

Este módulo registra `<is-sequence-diagram>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './sequence-diagram.js';
```

## Ejemplo mínimo

```html
<is-sequence-diagram></is-sequence-diagram>
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
| `turtle` | solo lectura | Declarada por clase. |
| `hiddenGroups` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-turtle-state` | sí | sí | sí | no |
| `is-render` | sí | sí | sí | no |
| `is-toggle-group` | sí | sí | sí | sí |
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

Documentación de cabecera preservada desde fuente:

> <is-sequence-diagram> — diagrama de secuencia en SVG, sin Mermaid.
> Configuración por JSON (idéntica a la del proyecto original): un
> <script type="application/json"> hijo, o la propiedad `payload`.
>   <is-sequence-diagram>
>     <script type="application/json">
>       { "sequence": { "actors": [...], "messages": [...] } }
>     </script>
>   </is-sequence-diagram>
> También acepta `{ "preset": "tk1437191" }`.
> Atributos
>   color  inline (default) | viewer — viewer activa hover, leyenda clickeable
>            y auto-animación de la tortuga.
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: is-turtle-state (detail: {playing, idx, total, replay}),
>          is-open-viewer (click en colore inline),
>          is-toggle-group (detail: {id})

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`./sequence-turtle.js`](./sequence-turtle.js)
- [`../_shared/diagram-grid.js`](../_shared/diagram-grid.js)
- [`../_shared/tk-icon-inline.js`](../_shared/tk-icon-inline.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-color.js`](../_shared/tk-color.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`../_shared/icon-loader.js`](../_shared/icon-loader.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del módulo: `<is-sequence-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<is-sequence-diagram></is-sequence-diagram>
```

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

- [JavaScript](./sequence-diagram.js)
- [CSS](./sequence-diagram.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-sequence-diagram.html)
