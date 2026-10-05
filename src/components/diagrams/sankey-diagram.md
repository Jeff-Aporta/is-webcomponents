---
tag: iswc-sankey-diagram
tags:
  - iswc-sankey-diagram
category: diagrams
status: public
source: ./sankey-diagram.ts
style: ./sankey-diagram.css
preview: ./sankey-diagram.json
---
# `<iswc-sankey-diagram>`

## PropÃ³sito

Diagrama de **Sankey** en SVG, sin Mermaid. Declaras nodos y enlaces con
valor, y el componente reparte las capas, calcula la altura de cada nodo y
dibuja cada flujo con un grosor proporcional a su valor.

Este mÃ³dulo registra `<iswc-sankey-diagram>`.

## CuÃ¡ndo usarlo

Cuando el mensaje es **cuÃ¡nto** se reparte entre caminos: esfuerzo por
etapa, presupuesto por concepto, trÃ¡fico por destino. El grosor es el dato.

## CuÃ¡ndo no usarlo

Si solo importa el orden o la estructura y no la magnitud â†’ `<iswc-flowchart>`.
Si los valores son categorÃ­as comparadas contra un eje â†’ usa un grÃ¡fico de barras.

## ImportaciÃ³n

```js
import './sankey-diagram.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-sankey-diagram>
  <script type="application/json">
    {}
  </script>
</iswc-sankey-diagram>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `height` | number | Alto del Ã¡rea de datos en px (default 320). |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |
| `iswc-toggle-group` | Evento personalizado del componente (toggle group). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |
| `iswc-toggle-group` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-sankey-diagram');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
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

Las capas salen del camino mÃ¡s largo desde las fuentes; la altura de un nodo es el mayor entre lo que entra y lo que sale. Un enlace con valor cero o negativo no se dibuja: no tendrÃ­a grosor.

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-sankey-diagram> â€” diagrama de Sankey en SVG, sin Mermaid.
>   <iswc-sankey-diagram>
>     <script type="application/json">
>       { "sankey": { "nodes": [...], "links": [{ "from": "a", "to": "b", "value": 40 }] } }
>     </script>
>   </iswc-sankey-diagram>
> Mismo esqueleto que <iswc-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click, height
> Propiedades: payload, spec, layout, hiddenGroups
> Eventos: iswc-render, iswc-open-viewer, iswc-toggle-group

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

Tags del mÃ³dulo: `<iswc-sankey-diagram>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galerÃ­a, que trae el payload completo con grupos y estilos:
[`./sankey-diagram.json`](./sankey-diagram.json).

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

- [JavaScript](./sankey-diagram.ts)
- [CSS](./sankey-diagram.css)
- [Spec y layout](./sankey-spec.js)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./sankey-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=sankey&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=sankey&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.
