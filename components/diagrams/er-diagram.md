---
tag: is-er-diagram
tags:
  - is-er-diagram
category: diagrams
status: public
source: ./er-diagram.js
style: ./er-diagram.css
preview: ../../previews/diagrams/is-er-diagram.html
---
# `<is-er-diagram>`

## Propósito

Diagrama entidad-relación en SVG, sin Mermaid. Declaras entidades con sus
atributos y las relaciones entre ellas; el componente ubica las cajas,
rutea las líneas con A* y dibuja la notación de pata de gallo en cada extremo.

Este módulo registra `<is-er-diagram>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './er-diagram.js';
```

## Ejemplo mínimo

```html
<is-er-diagram></is-er-diagram>
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
| `--er-circle-fill` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-er-diagram> — diagrama entidad-relación en SVG, sin Mermaid.
> Configuración por JSON, igual que <is-flowchart>:
>   <is-er-diagram>
>     <script type="application/json">
>       { "erDiagram": { "entities": [...], "relations": [...] } }
>     </script>
>   </is-er-diagram>
> Atributos: variant (inline | viewer), without-viewer
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./er-spec.js`](./er-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`./sequence-turtle.js`](./sequence-turtle.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del módulo: `<is-er-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<is-er-diagram></is-er-diagram>
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

- [JavaScript](./er-diagram.js)
- [CSS](./er-diagram.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-er-diagram.html)
