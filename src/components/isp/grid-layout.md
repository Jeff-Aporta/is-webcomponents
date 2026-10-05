---
tag: iswc-grid-layout
tags:
  - iswc-grid-layout
category: isp
status: public
source: ./grid-layout.ts
style: ./grid-layout.css
preview: ./grid-layout.json
---
# `<iswc-grid-layout>`

## PropÃ³sito

Rejilla CSS declarativa: nÃºmero de celdas (o track list cruda), gap,
justificaciÃ³n y alineaciÃ³n por atributos. Port de
`src/lib/layout/GridLayout.svelte` de ISP.

Este mÃ³dulo registra `<iswc-grid-layout>`.

## CuÃ¡ndo usarlo

Para rejillas de tarjetas, formularios etiqueta/campo y cualquier estructura
bidimensional que quiera declararse en el markup.

## CuÃ¡ndo no usarlo

No usar para una sola fila o columna (usa `<iswc-flex-layout>`) ni para tablas de
datos (usa `<iswc-data-grid>` / `<iswc-ag-grid>`).

## ImportaciÃ³n

```js
import './grid-layout.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-grid-layout cells="3" gap="0.5rem">
  <iswc-card>1</iswc-card>
  <iswc-card>2</iswc-card>
  <iswc-card>3</iswc-card>
</iswc-grid-layout>
```

## Mapeo Svelte â†’ Web Component

- `cellsFit` â†’ atributo `cells-fit` (propiedad JS `cellsFit`).
- `cells` mantiene la doble semÃ¡ntica de ISP: nÃºmero â†’ `repeat(n, minmax(0, 1fr))`
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

TambiÃ©n refleja `data-sizew` y `data-szw-*`.

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-breakpoint` | Evento personalizado del componente (breakpoint). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-breakpoint` | `{ width, sizew, boolszw, lerpw }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-grid-layout');
el.addEventListener('iswc-breakpoint', (e) => {
  console.log('iswc-breakpoint', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `lerpw(b0, b1)` | Heredado de `BreakpointHost`. |

### CSS parts

| Part | Uso |
| --- | --- |
| `content` | El `<slot>` de las celdas. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--cells` | Track list ya resuelta. |
| `--gap` | Gap efectivo. |


### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.
## Comportamiento

Sin `cells`, la rejilla queda en `grid-template-columns: none` y las celdas
fluyen en una sola columna implÃ­cita.

## Dependencias y componentes relacionados

- [`block-layout.js`](block-layout.js) (`BreakpointHost`)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-grid-layout>`.

## Accesibilidad

Contenedor sin semÃ¡ntica propia; no usar como sustituto de `<table>` para datos
tabulares.

## Ejemplo avanzado

```html
<iswc-grid-layout cells="12rem 1fr" gap="0.75rem" items="center">
  <iswc-text color="neutral">Nombre</iswc-text>
  <iswc-input></iswc-input>
  <iswc-text color="neutral">Correo</iswc-text>
  <iswc-input type="email"></iswc-input>
</iswc-grid-layout>
```

## Errores comunes

- Pasar `cells="repeat(3, 1fr)"` esperando que ademÃ¡s aplique `cells-fit`: con
  track list cruda el flag se ignora (igual que en ISP).
- Usar `cellsFit` como atributo; el atributo es `cells-fit`.
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- Reusar `<iswc-flex-layout>` si el caso es unidimensional.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basÃ¡ndose solo en el preview.

## Fuentes

- [JavaScript](./grid-layout.ts)
- [CSS](./grid-layout.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./grid-layout.json)
