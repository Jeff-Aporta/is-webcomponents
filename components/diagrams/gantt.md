---
tag: is-gantt
tags:
  - is-gantt
category: diagrams
status: public
source: ./gantt.js
style: ./gantt.css
preview: ../../previews/diagrams/is-gantt.html
---
# `<is-gantt>`

## Propósito

Diagrama de Gantt en SVG, sin Mermaid. Una fila por tarea, en el
orden que la declares; el componente calcula la escala de tiempo,
dibuja las barras y rutea las flechas de dependencia rodeando las
demás barras.

Este módulo registra `<is-gantt>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './gantt.js';
```

## Ejemplo mínimo

```html
<is-gantt></is-gantt>
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
| `--is-sans` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-gantt> — diagrama de Gantt en SVG, sin Mermaid.
>   <is-gantt>
>     <script type="application/json">
>       { "gantt": { "title": "...", "groups": [...], "tasks": [...] } }
>     </script>
>   </is-gantt>
> Una fila por tarea (orden de declaración, sin empaquetar). Las flechas
> `after:` se rutean con A* sobre la rejilla de costos, igual que las
> aristas de flowchart.
> Atributos: variant (inline | viewer), without-viewer
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./gantt-spec.js`](./gantt-spec.js)
- [`./flowchart-spec.js`](./flowchart-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/path-turtle.js`](../_shared/path-turtle.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)

Tags del módulo: `<is-gantt>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<is-gantt></is-gantt>
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

- [JavaScript](./gantt.js)
- [CSS](./gantt.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/diagrams/is-gantt.html)
