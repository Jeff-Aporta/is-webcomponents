---
tag: is-grid-layout
tags:
  - is-grid-layout
category: isp
status: public
source: ./grid-layout.js
style: ./grid-layout.css
preview: ../../previews/isp/is-grid-layout.html
---
# `<is-grid-layout>`

## Propósito

Rejilla CSS declarativa: número de celdas (o track list cruda), gap,
justificación y alineación por atributos. Port de
`src/lib/layout/GridLayout.svelte` de ISP.

Este módulo registra `<is-grid-layout>`.

## Cuándo usarlo

Para rejillas de tarjetas, formularios etiqueta/campo y cualquier estructura
bidimensional que quiera declararse en el markup.

## Cuándo no usarlo

No usar para una sola fila o columna (usa `<is-flex-layout>`) ni para tablas de
datos (usa `<is-data-grid>` / `<is-ag-grid>`).

## Importación

```js
import './grid-layout.js';
```

## Ejemplo mínimo

```html
<is-grid-layout cells="3" gap="0.5rem">
  <is-card>1</is-card>
  <is-card>2</is-card>
  <is-card>3</is-card>
</is-grid-layout>
```

## Mapeo Svelte → Web Component

- `cellsFit` → atributo `cells-fit` (propiedad JS `cellsFit`).
- `cells` mantiene la doble semántica de ISP: número → `repeat(n, minmax(0, 1fr))`
  (o `repeat(n, max-content)` con `cells-fit`); cualquier otra cosa se usa tal
  cual como track list. El JS lo resuelve a la custom property `--cells`.
- `direction` decide, como en ISP, si `--cells` alimenta
  `grid-template-columns` (`column`, default) o `grid-template-rows` +
  `grid-auto-flow: column` (`row`).
- Los alias `between` / `around` / `evenly` de `justify` se expanden en CSS.
- `sizew` / `boolszw` / `lerpw` eran slot props; ver [`block-layout.md`](block-layout.md).

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `cells` | number \| track list CSS | Ver mapeo arriba. |
| `cells-fit` | boolean | Celdas `max-content` en vez de `minmax(0, 1fr)`. |
| `direction` | `column` \| `row` | Default `column`. |
| `gap` | string | Valor CSS. Default responsive 0.2 / 0.35 / 0.5rem. |
| `justify` | string | `start`, `center`, `end`, `left`, `right`, `stretch`, `normal`, `between`, `around`, `evenly` (y las formas `space-*`). |
| `items` | string | `start`, `center`, `end`, `stretch`, `baseline`, `normal`. |
| `inline` | boolean | `display: inline-grid`. |
| `cscroll` | boolean | `overflow: auto`. |

También refleja `data-sizew` y `data-szw-*`.

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `cells` | lectura/escritura | Refleja el atributo. |
| `cellsFit` | lectura/escritura | Refleja `cells-fit`. |
| `direction` | lectura/escritura | Default `column`. |
| `inline`, `cscroll` | lectura/escritura | Booleanos reflejados. |
| `sizew`, `boolszw` | solo lectura | Heredadas de `BreakpointHost`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Celdas de la rejilla. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-breakpoint` | `{ width, sizew, boolszw, lerpw }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `lerpw(b0, b1)` | Heredado de `BreakpointHost`. |

### CSS parts

| Part | Uso |
| --- | --- |
| `content` | El `<slot>` de las celdas. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--cells` | Track list ya resuelta. |
| `--gap` | Gap efectivo. |

## Comportamiento

Sin `cells`, la rejilla queda en `grid-template-columns: none` y las celdas
fluyen en una sola columna implícita.

## Dependencias y componentes relacionados

- [`block-layout.js`](block-layout.js) (`BreakpointHost`)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-grid-layout>`.

## Accesibilidad

Contenedor sin semántica propia; no usar como sustituto de `<table>` para datos
tabulares.

## Ejemplo avanzado

```html
<is-grid-layout cells="12rem 1fr" gap="0.75rem" items="center">
  <is-text color="neutral">Nombre</is-text>
  <is-input></is-input>
  <is-text color="neutral">Correo</is-text>
  <is-input type="email"></is-input>
</is-grid-layout>
```

## Errores comunes

- Pasar `cells="repeat(3, 1fr)"` esperando que además aplique `cells-fit`: con
  track list cruda el flag se ignora (igual que en ISP).
- Usar `cellsFit` como atributo; el atributo es `cells-fit`.
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- Reusar `<is-flex-layout>` si el caso es unidimensional.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basándose solo en el preview.

## Fuentes

- [JavaScript](./grid-layout.js)
- [CSS](./grid-layout.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/isp/is-grid-layout.html)
