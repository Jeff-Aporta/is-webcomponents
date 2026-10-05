---
tag: iswc-flex-layout
tags:
  - iswc-flex-layout
category: isp
status: public
source: ./flex-layout.ts
style: ./flex-layout.css
preview: ./flex-layout.json
---
# `<iswc-flex-layout>`

## PropÃ³sito

Contenedor flex declarativo: direcciÃ³n, gap, justificaciÃ³n, alineaciÃ³n,
crecimiento y lÃ­mites de tamaÃ±o por atributos. Port de
`src/lib/layout/FlexLayout.svelte` de ISP.

Este mÃ³dulo registra `<iswc-flex-layout>`.

## CuÃ¡ndo usarlo

Para filas y columnas de UI donde se quiere el layout en el markup, sin
escribir CSS por cada caso, y con un gap por defecto que se adapta al ancho del
propio contenedor.

## CuÃ¡ndo no usarlo

No usar cuando el layout ya estÃ¡ resuelto por el CSS de la pÃ¡gina, ni para
rejillas bidimensionales â€” para eso estÃ¡ `<iswc-grid-layout>`.

## ImportaciÃ³n

```js
import './flex-layout.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-flex-layout gap="0.5rem" justify="between" align="center">
  <span>Izquierda</span>
  <iswc-button>AcciÃ³n</iswc-button>
</iswc-flex-layout>
```

## Mapeo Svelte â†’ Web Component

- Las props camelCase de ISP (`minWidth`, `maxHeight`â€¦) son atributos
  kebab-case (`min-width`, `max-height`).
- Los valores enumerados (`direction`, `justify`, `align`/`items`, `wrap`,
  `grow`, `inline`) se resuelven en CSS con `:host([attr])`, no construyendo un
  `style` string como hacÃ­a ISP.
- Los valores libres (`gap`, `width`, `height`, `min-*`, `max-*`) los traduce el
  JS a custom properties del host (`--gap`, `--width`, â€¦), asÃ­ el consumidor
  puede pisarlos tambiÃ©n desde CSS.
- `sizew` / `boolszw` / `lerpw` eran slot props; aquÃ­ se heredan de
  `BreakpointHost` y se publican igual que en
  [`block-layout.md`](block-layout.md).

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `gap` | string | Valor CSS. Default responsive: 0.2 / 0.35 / 0.5rem segÃºn `data-sizew`. |
| `direction` | `row` \| `column` | Default `row`. |
| `wrap` | boolean | `flex-wrap: wrap`. |
| `justify` | string | `start`, `center`, `end`, `between`, `around`, `evenly`, `left`, `right`, `flex-start`, `flex-end`. |
| `align` | string | `start`, `center`, `end`, `stretch`, `baseline`. |
| `items` | string | Alias histÃ³rico de `align`; `align` gana. |
| `grow` | boolean | `flex: 1 1 auto`. |
| `inline` | boolean | `display: inline-flex`. |
| `width` | string | Valor CSS. |
| `height` | string | Valor CSS. |
| `min-width` | string | Valor CSS. |
| `min-height` | string | Valor CSS. |
| `max-width` | string | Valor CSS. Default `100%` (`none` si `inline`). |
| `max-height` | string | Valor CSS. |

TambiÃ©n refleja `data-sizew` y `data-szw-*` (ver `block-layout.md`).

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `gap` | lectura/escritura | Refleja el atributo. |
| `direction` | lectura/escritura | Default `row`. |
| `wrap`, `grow`, `inline` | lectura/escritura | Booleanos reflejados. |
| `sizew`, `boolszw` | solo lectura | Heredadas de `BreakpointHost`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Ãtems flex. |

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
const el = document.querySelector('iswc-flex-layout');
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
| `content` | El `<slot>` de los Ã­tems. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--gap` | Gap efectivo. |
| `--width`, `--height` | TamaÃ±o. |
| `--min-width`, `--min-height` | MÃ­nimos. |
| `--max-width`, `--max-height` | MÃ¡ximos. |


### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.
## Comportamiento

El gap por defecto sale de `data-sizew` (`xs` â†’ 0.2rem, `sm` â†’ 0.35rem, resto
0.5rem), igual que en ISP. Si se pasa `gap`, el JS escribe `--gap` inline en el
host y gana sobre esa escalera.

## Dependencias y componentes relacionados

- [`block-layout.js`](block-layout.js) (`BreakpointHost`)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-flex-layout>`.

## Accesibilidad

Contenedor sin semÃ¡ntica propia. El orden visual coincide con el orden del DOM
mientras no se usen `order`/`row-reverse` desde fuera.

## Ejemplo avanzado

```html
<div style="font-size: 1.2em">
  <iswc-flex-layout direction="column" gap="0.75rem" max-width="30rem" align="stretch">
    <iswc-input placeholder="Nombre"></iswc-input>
    <iswc-flex-layout justify="end" gap="0.5rem">
      <iswc-button variant="plain">Cancelar</iswc-button>
      <iswc-button>Guardar</iswc-button>
    </iswc-flex-layout>
  </iswc-flex-layout>
</div>
```

## Errores comunes

- Usar `minWidth` en vez de `min-width`.
- Poner `align` y `items` a la vez esperando que gane `items`.
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- Mantener nombres exactos de atributos kebab-case.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basÃ¡ndose solo en el preview.

## Fuentes

- [JavaScript](./flex-layout.ts)
- [CSS](./flex-layout.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./flex-layout.json)
