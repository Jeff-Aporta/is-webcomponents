---
tag: iswc-swimlane-diagram
tags:
  - iswc-swimlane-diagram
category: diagrams
status: public
source: ./swimlane-diagram.js
style: ./swimlane-diagram.css
preview: ./swimlane-diagram.json
---
# `<iswc-swimlane-diagram>`

## Propósito

Diagrama de **carriles** (cross-functional flowchart) en SVG, sin Mermaid:
cada fila es un responsable y cada columna un momento del proceso.

Este módulo registra `<iswc-swimlane-diagram>`.

## Cuándo usarlo

Cuando el proceso cruza varias áreas y lo importante es **quién** hace cada
paso, no solo en qué orden ocurre.

## Cuándo no usarlo

Si no hay más de un responsable → `<iswc-flowchart>` dice lo mismo con menos
tinta. Si lo que importa es el reparto de una magnitud → `<iswc-sankey-diagram>`.

## Importación

```js
import './swimlane-diagram.js';
```

## Ejemplo mínimo

```html
<iswc-swimlane-diagram>
  <script type="application/json">
    {}
  </script>
</iswc-swimlane-diagram>
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
| `hiddenLanes` | lectura/escritura | Carriles ocultos por el visor. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Payload JSON en un `<script type="application/json">`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sí | sí | sí | no |
| `iswc-open-viewer` | sí | sí | sí | sí |
| `iswc-toggle-lane` | sí | sí | sí | no |

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
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

La columna de un paso se declara con `column` o se deduce por orden topológico. Un enlace hacia atrás (reproceso) se dibuja punteado y por debajo del carril, para que no se confunda con el avance normal.

Documentación de cabecera preservada desde fuente:

> <iswc-swimlane-diagram> — diagrama de carriles en SVG, sin Mermaid.
>   <iswc-swimlane-diagram>
>     <script type="application/json">
>       { "swimlane": { "lanes": [...], "steps": [...], "links": [...] } }
>     </script>
>   </iswc-swimlane-diagram>
> Mismo esqueleto que <iswc-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, hiddenLanes
> Eventos: iswc-render, iswc-open-viewer, iswc-toggle-lane

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./swimlane-spec.js`](./swimlane-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)
- [`../_shared/diagram-arrow.js`](../_shared/diagram-arrow.js)

Tags del módulo: `<iswc-swimlane-diagram>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galería, que trae el payload completo con grupos y estilos:
[`./swimlane-diagram.json`](./swimlane-diagram.json).

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

- [JavaScript](./swimlane-diagram.js)
- [CSS](./swimlane-diagram.css)
- [Spec y layout](./swimlane-spec.js)
- [Índice de categoría](./LLM.md)
- [Preview](./swimlane-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=swimlane&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=swimlane&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.
