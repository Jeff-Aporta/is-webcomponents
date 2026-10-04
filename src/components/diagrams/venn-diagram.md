---
tag: iswc-venn-diagram
tags:
  - iswc-venn-diagram
category: diagrams
status: public
source: ./venn-diagram.ts
style: ./venn-diagram.css
preview: ./venn-diagram.json
---
# `<iswc-venn-diagram>`

## PropÃ³sito

Diagrama de **Venn** de dos o tres conjuntos en SVG, sin Mermaid, con las
posiciones canÃ³nicas y las regiones etiquetadas.

Este mÃ³dulo registra `<iswc-venn-diagram>`.

## CuÃ¡ndo usarlo

Cuando el mensaje es solape: alcance pedido contra alcance entregado,
usuarios de dos mÃ³dulos, cobertura de dos catÃ¡logos.

## CuÃ¡ndo no usarlo

Con cuatro o mÃ¡s conjuntos: los cÃ­rculos no pueden representar todas las
regiones y el diagrama miente. Si lo que hay es jerarquÃ­a â†’ `<iswc-mindmap>`.

## ImportaciÃ³n

```js
import './venn-diagram.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-venn-diagram>
  <script type="application/json">
    {}
  </script>
</iswc-venn-diagram>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-venn-diagram');
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

El relleno es translÃºcido y la intersecciÃ³n aparece por superposiciÃ³n, sin mÃ¡scaras: el orden de declaraciÃ³n no altera el resultado. Un payload con menos de dos o mÃ¡s de tres conjuntos no se dibuja.

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-venn-diagram> â€” diagrama de Venn (2 o 3 conjuntos) en SVG, sin Mermaid.
>   <iswc-venn-diagram>
>     <script type="application/json">
>       { "venn": { "sets": [...], "regions": [{ "sets": ["a","b"], "label": "Ambos" }] } }
>     </script>
>   </iswc-venn-diagram>
> Mismo esqueleto que <iswc-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout
> Eventos: iswc-render, iswc-open-viewer

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

Tags del mÃ³dulo: `<iswc-venn-diagram>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galerÃ­a, que trae el payload completo con grupos y estilos:
[`./venn-diagram.json`](./venn-diagram.json).

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

- [JavaScript](./venn-diagram.ts)
- [CSS](./venn-diagram.css)
- [Spec y layout](./venn-spec.js)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./venn-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=venn&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=venn&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.
