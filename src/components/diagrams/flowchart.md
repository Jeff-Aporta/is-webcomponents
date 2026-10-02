---
tag: iswc-flowchart
tags:
  - iswc-flowchart
category: diagrams
status: public
source: ./flowchart.js
style: ./flowchart.css
preview: ./flowchart.json
---
# `<iswc-flowchart>`

## Propósito

Diagrama de flujo en SVG, sin Mermaid. Tú declaras nodos y aristas; el
componente decide las capas, reduce los cruces y rutea las flechas
rodeando las cajas.

Este módulo registra `<iswc-flowchart>`.

## Cuándo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## Cuándo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## Importación

```js
import './flowchart.js';
```

## Ejemplo mínimo

```html
<iswc-flowchart open-on-click animation="flow">
  <script type="application/json">
    { "flowchart": { "direction": "TB", "nodes": […], "edges": […] } }
  </script>
</iswc-flowchart>
```

`animation="flow"` dibuja una arista dashed brand (con transparencia) detrás de cada arista continua; los dash se desplazan en el sentido del flujo. Ausente = sin animación. Tokens futuros se suman con espacios (`animation="flow …"`).

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `inline` \| `viewer` | Modo visor vs embebido. |
| `mode` | `read` \| `edit` | Edición de layout (drag). |
| `open-on-click` | boolean | Clic abre `<iswc-diagram-lightbox>`. |
| `animation` | tokens (`flow`, …) | Efectos opcionales (espacio-separados). Default: off. |
| `persist` / `storage-key` | string | Persistencia de overrides en edit. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `animation` | lectura/escritura | Tokens (`flow`, …). Vacío = off. |
| `mode` | lectura/escritura | Declarada por clase. |
| `overrides` | lectura/escritura | Declarada por clase. |
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
| `iswc-turtle-state` | sí | sí | sí | no |
| `iswc-render` | sí | sí | sí | no |
| `iswc-toggle-group` | sí | sí | sí | sí |
| `iswc-open-viewer` | sí | sí | sí | sí |

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

Documentación de cabecera preservada desde fuente:

> <iswc-flowchart> — diagrama de flujo en SVG, sin Mermaid.
> Configuración por JSON, igual que <iswc-sequence-diagram>:
>   <iswc-flowchart>
>     <script type="application/json">
>       { "flowchart": { "direction": "TB", "nodes": [...], "edges": [...] } }
>     </script>
>   </iswc-flowchart>
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, turtle, hiddenGroups
> Eventos: iswc-render, iswc-turtle-state, iswc-open-viewer, iswc-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./flowchart-spec.js`](./flowchart-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`./sequence-turtle.js`](./sequence-turtle.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`../_shared/tk-icon-inline.js`](../_shared/tk-icon-inline.js)
- [`../_shared/icon-loader.js`](../_shared/icon-loader.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/diagram-edit.js`](../_shared/diagram-edit.js)

Tags del módulo: `<iswc-flowchart>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-flowchart></iswc-flowchart>
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

- [JavaScript](./flowchart.js)
- [CSS](./flowchart.css)
- [Índice de categoría](./LLM.md)
- [Preview](./flowchart.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=flowchart&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=flowchart&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parámetro: Compartir arma un enlace nuevo con el JSON resultante.
