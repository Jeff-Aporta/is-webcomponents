---
tag: iswc-chart
tags:
  - iswc-chart
category: data-viz
status: public
source: ./chart.ts
style: ./chart.scss
preview: ./chart.json
---
# `<iswc-chart>`

## Propósito

Motor de gráficos en SVG, sin dependencias externas. La configuración usa el
mismo esquema de Chart.js, así que un config existente funciona
sin cambios.

Este módulo registra `<iswc-chart>`.

## Cuándo usarlo

Series, distribuciones, relaciones o jerarquías de datos.

## Cuándo no usarlo

No crear otro engine si marks/engine existentes cubren caso.

## Importación

```js
import './chart.js';
```

## Ejemplo mínimo

```html
<iswc-chart></iswc-chart>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | `bar` \| `line` \| `pie` \| … | Tipo de gráfica en `<iswc-chart>`; los componentes tipados lo fijan. |
| `label` | string | Título accesible y encabezado de la gráfica. |
| `legend-position` | `top` \| `bottom` \| `left` \| `right` | Lado de la leyenda. Por defecto `bottom`. |
| `index-axis` | `x` \| `y` | `y` vuelve horizontales las barras. |
| `min` | number | Mínimo fijo del eje de valores. |
| `max` | number | Máximo fijo del eje de valores. |
| `grid` | boolean | Fuerza la rejilla del eje. |
| `stacked` | boolean | Apila las series. |
| `without-animation` | boolean | Pinta sin animar la entrada. |
| `without-legend` | boolean | Oculta la leyenda. |
| `without-tooltip` | boolean | Quita el tooltip al pasar el puntero. |
| `x-label` | string | Título del eje X. |
| `y-label` | string | Título del eje Y. |
| `color` | `viewer` \| color | `viewer` lo pinta como visor dentro del lightbox. |

#### Propiedades públicas

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


| Evento | Descripción |
| --- | --- |
| `iswc-render` | Emitido al renderizar o redibujar el componente. |
| `iswc-turtle-state` | Emitido al actualizarse el estado del módulo turtle (resize, datos, etc.). |
| `iswc-open-viewer` | Emitido al abrir el visor ampliado (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-render` | sí | sí | sí | no |
| `iswc-turtle-state` | sí | sí | sí | no |
| `iswc-open-viewer` | sí | sí | sí | sí |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-chart');
el.addEventListener('iswc-render', (e) => {
  console.log('iswc-render', e.detail);
});
```

</details>

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
| `legend` | Personalizable con `::part(legend)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |
| `sr-status` | Region `aria-live` para anuncios a lectores de pantalla (oculta visualmente). |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-chart-1..8` | Serie N de la paleta activa. Fuente única del color. |
| `--iswc-chart-on-1..8` | Texto legible sobre la serie N (bg2font). |
| `--border-color-N` | Fuerza el color de la serie N. |
| `--chart-text` | Token leído o definido por componente. |
| `--grid-color` | Token leído o definido por componente. |
| `--chart-surface` | Token leído o definido por componente. |
| `--chart-bar-radius` | Token leído o definido por componente. |
| `--chart-bar-gap` | Token leído o definido por componente. |
| `--chart-line-width` | Token leído o definido por componente. |
| `--chart-point-radius` | Token leído o definido por componente. |
| `--chart-slice-gap` | Token leído o definido por componente. |
| `--chart-doughnut-ratio` | Token leído o definido por componente. |
| `--dash` | Token leído o definido por componente. |
| `--square` | Token leído o definido por componente. |
| `--iswc-sans` | Token leído o definido por componente. |
| `--chart-tick-size` | Token leído o definido por componente. |
| `--chart-legend-size` | Token leído o definido por componente. |
| `--chart-title-size` | Token leído o definido por componente. |
| `--chart-tooltip-size` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--chart-muted` | Token leído o definido por componente. |
| `--iswc-text-dim` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--chart-axis-color` | Token leído o definido por componente. |
| `--border-color-1` | Token leído o definido por componente. |
| `--fill-color-1` | Token leído o definido por componente. |
| `--border-color-2` | Token leído o definido por componente. |
| `--border-color-3` | Token leído o definido por componente. |
| `--border-color-4` | Token leído o definido por componente. |
| `--border-color-5` | Token leído o definido por componente. |
| `--border-color-6` | Token leído o definido por componente. |
| `--border-color-7` | Token leído o definido por componente. |
| `--border-color-8` | Token leído o definido por componente. |
| `--fill-color-2` | Token leído o definido por componente. |
| `--fill-color-3` | Token leído o definido por componente. |
| `--fill-color-4` | Token leído o definido por componente. |
| `--fill-color-5` | Token leído o definido por componente. |
| `--fill-color-6` | Token leído o definido por componente. |
| `--fill-color-7` | Token leído o definido por componente. |
| `--fill-color-8` | Token leído o definido por componente. |
| `--iswc-radius-sm` | Token leído o definido por componente. |
| `--iswc-focus` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-chart> — motor de charts en SVG, sin dependencias.
> Consumo compatible con Chart.js: `config` (propiedad) o <script type="application/json">
> hijo, con la forma `{ type, data: { labels, datasets }, options }`.
> Los atributos del elemento tienen precedencia sobre `options` cuando están presentes.
> Atributos: type, label, legend-position, index-axis, min, max, grid,
>            stacked, without-animation, without-legend, without-tooltip, x-label, y-label
> Propiedades: config, svg, chart (alias de svg)
> Evento: iswc-render

## Color

Toda gráfica toma el color de una sola fuente: los tokens `--iswc-chart-1` a `--iswc-chart-8`, derivados de `--iswc-accent` en `src/styles/chart-tokens.ts`.

| Caso | Color |
| --- | --- |
| Una serie | `--iswc-chart-1`: el main de la paleta. Solo se ajusta su luminosidad si sin eso no se leería sobre la superficie. |
| Varias series, o rebanadas | Rampa armónica: tono rotado en OKLCH, luminosidad alterna, croma y banda propios de claro y oscuro. |
| Más de 8 | Se repite el ciclo más oscuro. |
| `status` en el dataset (`success`, `warning`, `danger`) | Color semántico. Solo cuando la serie lo pide. |
| `backgroundColor` / `borderColor` en el dataset, o `--border-color-N` | Lo que indique quien consume. Un arreglo en `backgroundColor` colorea cada categoría. |

`--iswc-chart-on-N` es bg2font sobre la serie: las etiquetas dentro de una marca lo usan. Se resuelve en CSS con `light-dark()`, así que paleta, tema y panda (también los papeles) cambian sin repintar ni repetir la animación.

Rejilla, ejes, leyenda y tooltip usan `--iswc-chart-grid-color`, `--chart-axis-color`, `--chart-text` y `--chart-muted`, compartidos con los diagramas en `core/diagram-kit.scss`. Sus tamaños van en `em`: al cambiar el `font-size` del contexto, leyenda y tooltip escalan y el lienzo se re-maqueta.

Los diagramas leen los mismos tokens y los resuelven a literales, porque su SVG se exporta. Un `hue` explícito en el JSON se respeta; sin él, el tono automático es la serie de la paleta en sankey, cuadrante, recorrido, Gantt, línea de tiempo, Venn, carriles, bloques, mapa mental y treemap.

El guardián `tests/gobernanza/chart-tokens.test.ts` rechaza hex, `rgb()` y `hsl()` fijos en gráficas.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../../core/svg-chart-engine.js)
- [`../_shared/chart-palette.js`](./utils/chart-palette.js)
- [`../_shared/path-turtle.js`](../../core/path-turtle.js)
- [`../diagrams/diagram-kinds.js`](../diagrams/utils/diagram-model.js)

Tags del módulo: `<iswc-chart>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-pressed`.

## Ejemplo avanzado

```html
<iswc-chart></iswc-chart>
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

- [JavaScript](./chart.ts)
- [CSS](./chart.scss)
- [Índice de categoría](../../../specs/componentes.md)
- [Preview](./chart.json)
