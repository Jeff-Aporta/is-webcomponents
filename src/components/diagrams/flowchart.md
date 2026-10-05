---
tag: iswc-flowchart
tags:
  - iswc-flowchart
category: diagrams
status: public
source: ./flowchart.ts
style: ./flowchart.css
preview: ./flowchart.json
---
# `<iswc-flowchart>`

## PropÃ³sito

Diagrama de flujo en SVG, sin Mermaid. TÃº declaras nodos y aristas; el
componente decide las capas, reduce los cruces y rutea las flechas
rodeando las cajas.

Este mÃ³dulo registra `<iswc-flowchart>`.

## CuÃ¡ndo usarlo

Relaciones, flujos, estados, estructura o tiempo desde payloads declarativos.

## CuÃ¡ndo no usarlo

No inventar schemas ni usar specs/layout como custom elements.

## ImportaciÃ³n

```js
import './flowchart.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-flowchart open-on-click animation="flow">
  <script type="application/json">
    { "flowchart": { "direction": "TB", "nodes": [â€¦], "edges": [â€¦] } }
  </script>
</iswc-flowchart>
```

`animation="flow"` dibuja una arista dashed brand (con transparencia) detrÃ¡s de cada arista continua; los dash se desplazan en el sentido del flujo. Ausente = sin animaciÃ³n. Tokens futuros se suman con espacios (`animation="flow â€¦"`).

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `inline` \| `viewer` | Modo visor vs embebido. |
| `mode` | `read` \| `edit` | EdiciÃ³n de layout (drag). |
| `open-on-click` | boolean | Clic abre `<iswc-diagram-lightbox>`. |
| `animation` | tokens (`flow`, â€¦) | Efectos opcionales (espacio-separados). Default: off. |
| `persist` / `storage-key` | string | Persistencia de overrides en edit. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `animation` | lectura/escritura | Tokens (`flow`, â€¦). VacÃ­o = off. |
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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-turtle-state` | Emitido al actualizarse el estado del mÃ³dulo turtle (resize, datos, etc.). |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-toggle-group` | Evento personalizado del componente (toggle group). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-turtle-state` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-toggle-group` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-flowchart');
el.addEventListener('iswc-turtle-state', (e) => {
  console.log('iswc-turtle-state', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `updateComplete()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-flowchart> â€” diagrama de flujo en SVG, sin Mermaid.
> ConfiguraciÃ³n por JSON, igual que <iswc-sequence-diagram>:
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

Tags del mÃ³dulo: `<iswc-flowchart>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-flowchart></iswc-flowchart>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./flowchart.ts)
- [CSS](./flowchart.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./flowchart.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=flowchart&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=flowchart&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.
