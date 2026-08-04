---
tag: is-flex-layout
tags:
  - is-flex-layout
category: isp
status: public
source: ./flex-layout.js
style: ./flex-layout.css
preview: ../../previews/isp/is-flex-layout.html
---
# `<is-flex-layout>`

## Propósito

Contenedor flex declarativo: dirección, gap, justificación, alineación,
crecimiento y límites de tamaño por atributos. Port de
`src/lib/layout/FlexLayout.svelte` de ISP.

Este módulo registra `<is-flex-layout>`.

## Cuándo usarlo

Para filas y columnas de UI donde se quiere el layout en el markup, sin
escribir CSS por cada caso, y con un gap por defecto que se adapta al ancho del
propio contenedor.

## Cuándo no usarlo

No usar cuando el layout ya está resuelto por el CSS de la página, ni para
rejillas bidimensionales — para eso está `<is-grid-layout>`.

## Importación

```js
import './flex-layout.js';
```

## Ejemplo mínimo

```html
<is-flex-layout gap="0.5rem" justify="between" align="center">
  <span>Izquierda</span>
  <is-button>Acción</is-button>
</is-flex-layout>
```

## Mapeo Svelte → Web Component

- Las props camelCase de ISP (`minWidth`, `maxHeight`…) son atributos
  kebab-case (`min-width`, `max-height`).
- Los valores enumerados (`direction`, `justify`, `align`/`items`, `wrap`,
  `grow`, `inline`) se resuelven en CSS con `:host([attr])`, no construyendo un
  `style` string como hacía ISP.
- Los valores libres (`gap`, `width`, `height`, `min-*`, `max-*`) los traduce el
  JS a custom properties del host (`--gap`, `--width`, …), así el consumidor
  puede pisarlos también desde CSS.
- `sizew` / `boolszw` / `lerpw` eran slot props; aquí se heredan de
  `BreakpointHost` y se publican igual que en
  [`block-layout.md`](block-layout.md).

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `gap` | string | Valor CSS. Default responsive: 0.2 / 0.35 / 0.5rem según `data-sizew`. |
| `direction` | `row` \| `column` | Default `row`. |
| `wrap` | boolean | `flex-wrap: wrap`. |
| `justify` | string | `start`, `center`, `end`, `between`, `around`, `evenly`, `left`, `right`, `flex-start`, `flex-end`. |
| `align` | string | `start`, `center`, `end`, `stretch`, `baseline`. |
| `items` | string | Alias histórico de `align`; `align` gana. |
| `grow` | boolean | `flex: 1 1 auto`. |
| `inline` | boolean | `display: inline-flex`. |
| `width` | string | Valor CSS. |
| `height` | string | Valor CSS. |
| `min-width` | string | Valor CSS. |
| `min-height` | string | Valor CSS. |
| `max-width` | string | Valor CSS. Default `100%` (`none` si `inline`). |
| `max-height` | string | Valor CSS. |

También refleja `data-sizew` y `data-szw-*` (ver `block-layout.md`).

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `gap` | lectura/escritura | Refleja el atributo. |
| `direction` | lectura/escritura | Default `row`. |
| `wrap`, `grow`, `inline` | lectura/escritura | Booleanos reflejados. |
| `sizew`, `boolszw` | solo lectura | Heredadas de `BreakpointHost`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Ítems flex. |

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
| `content` | El `<slot>` de los ítems. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--gap` | Gap efectivo. |
| `--width`, `--height` | Tamaño. |
| `--min-width`, `--min-height` | Mínimos. |
| `--max-width`, `--max-height` | Máximos. |

## Comportamiento

El gap por defecto sale de `data-sizew` (`xs` → 0.2rem, `sm` → 0.35rem, resto
0.5rem), igual que en ISP. Si se pasa `gap`, el JS escribe `--gap` inline en el
host y gana sobre esa escalera.

## Dependencias y componentes relacionados

- [`block-layout.js`](block-layout.js) (`BreakpointHost`)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-flex-layout>`.

## Accesibilidad

Contenedor sin semántica propia. El orden visual coincide con el orden del DOM
mientras no se usen `order`/`row-reverse` desde fuera.

## Ejemplo avanzado

```html
<div style="font-size: 1.2em">
  <is-flex-layout direction="column" gap="0.75rem" max-width="30rem" align="stretch">
    <is-input placeholder="Nombre"></is-input>
    <is-flex-layout justify="end" gap="0.5rem">
      <is-button variant="plain">Cancelar</is-button>
      <is-button>Guardar</is-button>
    </is-flex-layout>
  </is-flex-layout>
</div>
```

## Errores comunes

- Usar `minWidth` en vez de `min-width`.
- Poner `align` y `items` a la vez esperando que gane `items`.
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- Mantener nombres exactos de atributos kebab-case.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basándose solo en el preview.

## Fuentes

- [JavaScript](./flex-layout.js)
- [CSS](./flex-layout.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/isp/is-flex-layout.html)
