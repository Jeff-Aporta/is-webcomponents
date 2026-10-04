---
tag: iswc-chart
tags:
  - iswc-chart
category: charts
status: public
source: ./chart.ts
style: ./chart.css
preview: ./chart.json
---
# `<iswc-chart>`

## PropÃ³sito

Motor de grÃ¡ficos en SVG, sin dependencias externas. La configuraciÃ³n usa el
mismo esquema de Chart.js, asÃ­ que un config existente funciona
sin cambios.

Este mÃ³dulo registra `<iswc-chart>`.

## CuÃ¡ndo usarlo

Series, distribuciones, relaciones o jerarquÃ­as de datos.

## CuÃ¡ndo no usarlo

No crear otro engine si marks/engine existentes cubren caso.

## ImportaciÃ³n

```js
import './chart.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-chart></iswc-chart>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `legend-position` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `index-axis` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `grid` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `stacked` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-animation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-legend` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-tooltip` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `x-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `y-label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `svg` | solo lectura | Declarada por clase. |
| `chart` | solo lectura | Declarada por clase. |
| `payload` | lectura/escritura | Declarada por clase. |
| `isViewer` | solo lectura | Declarada por clase. |
| `turtle` | solo lectura | Declarada por clase. |
| `config` | lectura/escritura | Declarada por clase. |
| `type` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-turtle-state` | Emitido al actualizarse el estado del mÃ³dulo turtle (resize, datos, etc.). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-turtle-state` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-open-viewer` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-chart');
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
| `legend` | Personalizable con `::part(legend)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |
| `sr-status` | Region `aria-live` para anuncios a lectores de pantalla (oculta visualmente). |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--border-color-N` | Token leÃ­do o definido por componente. |
| `--chart-text` | Token leÃ­do o definido por componente. |
| `--grid-color` | Token leÃ­do o definido por componente. |
| `--chart-surface` | Token leÃ­do o definido por componente. |
| `--chart-bar-radius` | Token leÃ­do o definido por componente. |
| `--chart-bar-gap` | Token leÃ­do o definido por componente. |
| `--chart-line-width` | Token leÃ­do o definido por componente. |
| `--chart-point-radius` | Token leÃ­do o definido por componente. |
| `--chart-slice-gap` | Token leÃ­do o definido por componente. |
| `--chart-doughnut-ratio` | Token leÃ­do o definido por componente. |
| `--dash` | Token leÃ­do o definido por componente. |
| `--square` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--chart-tick-size` | Token leÃ­do o definido por componente. |
| `--chart-legend-size` | Token leÃ­do o definido por componente. |
| `--chart-title-size` | Token leÃ­do o definido por componente. |
| `--chart-tooltip-size` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--chart-muted` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--chart-axis-color` | Token leÃ­do o definido por componente. |
| `--border-color-1` | Token leÃ­do o definido por componente. |
| `--fill-color-1` | Token leÃ­do o definido por componente. |
| `--border-color-2` | Token leÃ­do o definido por componente. |
| `--border-color-3` | Token leÃ­do o definido por componente. |
| `--border-color-4` | Token leÃ­do o definido por componente. |
| `--border-color-5` | Token leÃ­do o definido por componente. |
| `--border-color-6` | Token leÃ­do o definido por componente. |
| `--border-color-7` | Token leÃ­do o definido por componente. |
| `--border-color-8` | Token leÃ­do o definido por componente. |
| `--fill-color-2` | Token leÃ­do o definido por componente. |
| `--fill-color-3` | Token leÃ­do o definido por componente. |
| `--fill-color-4` | Token leÃ­do o definido por componente. |
| `--fill-color-5` | Token leÃ­do o definido por componente. |
| `--fill-color-6` | Token leÃ­do o definido por componente. |
| `--fill-color-7` | Token leÃ­do o definido por componente. |
| `--fill-color-8` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-chart> â€” motor de charts en SVG, sin dependencias.
> Consumo compatible con Chart.js: `config` (propiedad) o <script type="application/json">
> hijo, con la forma `{ type, data: { labels, datasets }, options }`.
> Los atributos del elemento tienen precedencia sobre `options` cuando estÃ¡n presentes.
> Atributos: type, label, legend-position, index-axis, min, max, grid,
>            stacked, without-animation, without-legend, without-tooltip, x-label, y-label
> Propiedades: config, svg, chart (alias de svg)
> Evento: iswc-render

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)
- [`../_shared/chart-palette.js`](../_shared/chart-palette.js)
- [`../_shared/path-turtle.js`](../_shared/path-turtle.js)
- [`../diagrams/diagram-kinds.js`](../diagrams/diagram-kinds.js)

Tags del mÃ³dulo: `<iswc-chart>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-pressed`.

## Ejemplo avanzado

```html
<iswc-chart></iswc-chart>
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

- [JavaScript](./chart.ts)
- [CSS](./chart.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./chart.json)
