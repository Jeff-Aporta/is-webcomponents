---
tag: iswc-treemap
tags:
  - iswc-treemap
category: charts
status: public
source: ./treemap.ts
style: ./treemap.css
preview: ./treemap.json
---
# `<iswc-treemap>`

## PropÃ³sito

Treemap anidado en SVG, con el algoritmo squarified (Bruls/Huizing/
van Wijk): rectÃ¡ngulos con aspect-ratio cercano a 1, sin huecos ni
solapes.

Este mÃ³dulo registra `<iswc-treemap>`.

## CuÃ¡ndo usarlo

Series, distribuciones, relaciones o jerarquÃ­as de datos.

## CuÃ¡ndo no usarlo

No crear otro engine si marks/engine existentes cubren caso.

## ImportaciÃ³n

```js
import './treemap.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-treemap></iswc-treemap>
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
| `default` | Contenido proyectado. |

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
const el = document.querySelector('iswc-treemap');
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
| `--chart-surface` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-treemap> â€” treemap anidado en SVG (algoritmo squarified), sin librerÃ­as.
>   <iswc-treemap>
>     <script type="application/json">
>       { "treemap": { "nodes": [{ "id":"inv", "label":"Inventario", "value":3200 }] } }
>     </script>
>   </iswc-treemap>
> Mismo esqueleto que <iswc-flowchart> / <iswc-mindmap>: shadow DOM, slot JSON +
> MutationObserver, tema por atributo `data-theme`, `color` (inline | viewer),
> lightbox propio.
> Atributos: color (inline | viewer), open-on-click
> Propiedades: payload, spec, layout
> Eventos: iswc-render, iswc-open-viewer

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./treemap-spec.js`](./treemap-spec.js)
- [`../diagrams/sequence-spec.js`](../diagrams/sequence-spec.js)
- [`../_shared/tk-hue.js`](../_shared/tk-hue.js)
- [`../_shared/tk-inline-md.js`](../_shared/tk-inline-md.js)
- [`../diagrams/diagram-kinds.js`](../diagrams/diagram-kinds.js)

Tags del mÃ³dulo: `<iswc-treemap>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`.

## Ejemplo avanzado

```html
<iswc-treemap></iswc-treemap>
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

- [JavaScript](./treemap.ts)
- [CSS](./treemap.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./treemap.json)
