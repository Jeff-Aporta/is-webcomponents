---
tag: is-chart
tags:
  - is-chart
category: charts
status: public
source: ./chart.js
style: ./chart.css
preview: ../../previews/data-viz/is-chart.html
---
# `<is-chart>`

## Propósito

Motor de gráficos en SVG, sin dependencias externas. La configuración usa el
mismo esquema de Chart.js, así que un config existente funciona
sin cambios.

Este módulo registra `<is-chart>`.

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
<is-chart></is-chart>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `type` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `legend-position` | string/según contrato | Fuente define default/restricción. |
| `index-axis` | string/según contrato | Fuente define default/restricción. |
| `min` | string/según contrato | Fuente define default/restricción. |
| `max` | string/según contrato | Fuente define default/restricción. |
| `grid` | string/según contrato | Fuente define default/restricción. |
| `stacked` | string/según contrato | Fuente define default/restricción. |
| `without-animation` | string/según contrato | Fuente define default/restricción. |
| `without-legend` | string/según contrato | Fuente define default/restricción. |
| `without-tooltip` | string/según contrato | Fuente define default/restricción. |
| `x-label` | string/según contrato | Fuente define default/restricción. |
| `y-label` | string/según contrato | Fuente define default/restricción. |
| `variant` | string/según contrato | Fuente define default/restricción. |

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-render` | sí | sí | sí | no |
| `is-turtle-state` | sí | sí | sí | no |
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
| `legend` | Personalizable con `::part(legend)`. |
| `tooltip` | Personalizable con `::part(tooltip)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--border-color-N` | Token leído o definido por componente. |
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
| `--is-sans` | Token leído o definido por componente. |
| `--chart-tick-size` | Token leído o definido por componente. |
| `--chart-legend-size` | Token leído o definido por componente. |
| `--chart-title-size` | Token leído o definido por componente. |
| `--chart-tooltip-size` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--chart-muted` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
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
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-chart> — motor de charts en SVG, sin dependencias.
> Consumo compatible con Chart.js: `config` (propiedad) o <script type="application/json">
> hijo, con la forma `{ type, data: { labels, datasets }, options }`.
> Los atributos del elemento tienen precedencia sobre `options` cuando están presentes.
> Atributos: type, label, legend-position, index-axis, min, max, grid,
>            stacked, without-animation, without-legend, without-tooltip, x-label, y-label
> Propiedades: config, svg, chart (alias de svg)
> Evento: is-render

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)
- [`../_shared/chart-palette.js`](../_shared/chart-palette.js)
- [`../_shared/path-turtle.js`](../_shared/path-turtle.js)
- [`../diagrams/diagram-kinds.js`](../diagrams/diagram-kinds.js)

Tags del módulo: `<is-chart>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-pressed`.

## Ejemplo avanzado

```html
<is-chart></is-chart>
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

- [JavaScript](./chart.js)
- [CSS](./chart.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/data-viz/is-chart.html)
