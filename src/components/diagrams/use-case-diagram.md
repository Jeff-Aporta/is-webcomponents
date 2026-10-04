---
tag: iswc-use-case-diagram
tags:
  - iswc-use-case-diagram
category: diagrams
status: public
source: ./use-case-diagram.ts
style: ./use-case-diagram.css
preview: ./use-case-diagram.json
---
# `<iswc-use-case-diagram>`

## PropÃ³sito

Diagrama de **casos de uso UML** en SVG, sin Mermaid: actores fuera del
lÃ­mite del sistema, casos en elipses dentro, y relaciones con su estereotipo
(`Â«includeÂ»`, `Â«extendÂ»`) o su punta hueca de generalizaciÃ³n.

Este mÃ³dulo registra `<iswc-use-case-diagram>`.

## CuÃ¡ndo usarlo

Cuando la pregunta es de alcance: quÃ© puede hacer cada rol dentro de un
sistema y quÃ© queda fuera de su alcance.

## CuÃ¡ndo no usarlo

Si necesitas el orden temporal de las interacciones â†’ `<iswc-sequence-diagram>`.
Si es la arquitectura interna â†’ `<iswc-component-diagram>`.

## ImportaciÃ³n

```js
import './use-case-diagram.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-use-case-diagram>
  <script type="application/json">
    {}
  </script>
</iswc-use-case-diagram>
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
const el = document.querySelector('iswc-use-case-diagram');
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

La asociaciÃ³n se dibuja sin punta, como manda UML; `include` y `extend` van punteadas con su estereotipo, y la generalizaciÃ³n lleva punta hueca. Los actores se reparten por el lado declarado y los casos se apilan en el orden en que vienen: el autor manda sobre el motor.

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-use-case-diagram> â€” diagrama de casos de uso UML en SVG, sin Mermaid.
>   <iswc-use-case-diagram>
>     <script type="application/json">
>       { "useCase": { "system": { "name": "Portal" }, "actors": [...], "cases": [...], "links": [...] } }
>     </script>
>   </iswc-use-case-diagram>
> Mismo esqueleto que <iswc-flowchart>: shadow DOM, slot JSON + MutationObserver,
> tema por atributo `data-theme`, `color` (inline | viewer), lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout, hiddenGroups
> Eventos: iswc-render, iswc-open-viewer, iswc-toggle-group

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/diagram-element-base.js`](../_shared/diagram-element-base.js)
- [`./use-case-spec.js`](./use-case-spec.js)
- [`./sequence-spec.js`](./sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`./diagram-kinds.js`](./diagram-kinds.js)
- [`../_shared/define.js`](../_shared/define.js)
- [`../_shared/emit.js`](../_shared/emit.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)
- [`../_shared/diagram-arrow.js`](../_shared/diagram-arrow.js)

Tags del mÃ³dulo: `<iswc-use-case-diagram>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

Ver el preview de la galerÃ­a, que trae el payload completo con grupos y estilos:
[`./use-case-diagram.json`](./use-case-diagram.json).

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

- [JavaScript](./use-case-diagram.ts)
- [CSS](./use-case-diagram.css)
- [Spec y layout](./use-case-spec.js)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./use-case-diagram.json)

## App API

Visor: `demos/diagramas/app/view.html?kind=usecase&json=<base64url>`.
Editor: `demos/diagramas/app/edit.html?kind=usecase&json=<base64url>`.

`json` es el documento completo en base64url. Editar no reescribe ese parÃ¡metro: Compartir arma un enlace nuevo con el JSON resultante.
