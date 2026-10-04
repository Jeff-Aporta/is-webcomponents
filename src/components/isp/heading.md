---
tag: iswc-heading
tags:
  - iswc-heading
category: isp
status: public
source: ./heading.ts
style: ./heading.css
preview: ./heading.json
---
# `<iswc-heading>`

## PropÃ³sito

TÃ­tulo de nivel 1 a 6 con tinte de marca. Port de
`src/lib/typography/H1.svelte` â€¦ `H6.svelte` de ISP, unificados en un solo
mÃ³dulo multi-nivel.

Este mÃ³dulo registra `<iswc-heading>`.

## CuÃ¡ndo usarlo

Para los encabezados de una vista cuando se quiere el color tintado de la
paleta activa y una escala en `em` coherente con el resto del kit.

## CuÃ¡ndo no usarlo

No usar por su tamaÃ±o: el nivel es semÃ¡ntico. Para texto grande sin jerarquÃ­a,
usa `<iswc-text>` dentro de un contexto con `font-size` mayor.

## ImportaciÃ³n

```js
import './heading.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-heading level="1">TÃ­tulo de pÃ¡gina</iswc-heading>
<iswc-heading level="3" color="success">SecciÃ³n aprobada</iswc-heading>
<iswc-heading level="2" mix="0%">Solo acento</iswc-heading>
```

## Mapeo Svelte â†’ Web Component

- Seis componentes `H1`â€¦`H6` â†’ un mÃ³dulo con el atributo `level` (1-6). El
  shadow root construye el `<hN>` REAL, asÃ­ que la semÃ¡ntica y el Ã¡rbol de
  accesibilidad se conservan sin duplicar seis archivos.
- ISP pintaba `color-mix(in srgb, var(--h-clr), var(--iswc-color) var(--h-mix))`
  con `--h-clr = colorVar(color, "primary")`. AquÃ­ `--h-clr` cae a
  `--iswc-accent` â†’ `--iswc-color-brand-500` â†’ `--iswc-text`, y el color de mezcla es
  `--iswc-text` (el equivalente de `--iswc-color` en este kit). Los porcentajes son
  los mismos: 15 / 30 / 45 / 65 / 80 / 90 %.
- ISP envolvÃ­a el contenido en un `<Text>` interno; aquÃ­ no hace falta, porque
  el clamp y el color semÃ¡ntico ya se resuelven en el propio host.

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `level` | `1`â€¦`6` | Default `1`, reflejado. Un valor invÃ¡lido se corrige a `1`. |
| `color` | semÃ¡ntico Â· `current` Â· color CSS | SemÃ¡nticos â†’ tokens. `current` â†’ `currentColor`. Otro string â†’ color CSS tal cual. Default acento vÃ­a `--h-clr`. |
| `mix` | string (`0%`â€¦`100%`) | Override de `--h-mix`. Ausente = default del nivel. |
| `mix-with` | `text` Â· `transparent` Â· `white` Â· `black` Â· `current` Â· CSS | Destino del `color-mix` (default: texto del tema). |
| `size` | string CSS | Override de `--h-size`. Ausente = default del nivel. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `level` | lectura/escritura | Devuelve string `'1'`â€¦`'6'`. |
| `color` | lectura/escritura | Refleja el atributo. |
| `mix` | lectura/escritura | Refleja el atributo / limpia el override. |
| `size` | lectura/escritura | Refleja el atributo. |
| `computedMix` | solo lectura | Mix efectivo (atributo o default del nivel). |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Texto del tÃ­tulo. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No emite eventos propios.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-heading');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone mÃ©todos pÃºblicos: el componente es declarativo y su estado se controla por atributos.

### CSS parts

| Part | Uso |
| --- | --- |
| `heading` | El elemento `<hN>`; personalizable con `::part(heading)`. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--h-clr` | Color base del tÃ­tulo. |
| `--h-mix` | Porcentaje de `--iswc-text` mezclado; default segÃºn nivel. |
| `--h-size` | TamaÃ±o en em del nivel. |


### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.
## Comportamiento

Escala por nivel: 2 Â· 1.6 Â· 1.35 Â· 1.15 Â· 1 Â· 0.9 em sobre el `font-size`
heredado. No hay atributo `size`.

El color se declara dos veces: primero plano (`var(--h-clr)`) y luego con
`color-mix`, para que un navegador sin soporte no se quede sin declaraciÃ³n.

Cambiar `level` reemplaza Ãºnicamente el `<hN>` dentro del shadow root; los
`<link>` que inyecta `adoptCss` se conservan.

## Dependencias y componentes relacionados

- [`../_shared/element-base.js`](../_shared/element-base.js)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`text.md`](text.md)

Tags del mÃ³dulo: `<iswc-heading>`.

## Accesibilidad

Renderiza un `<h1>`â€¦`<h6>` nativo dentro del shadow root, que sÃ­ forma parte
del Ã¡rbol de accesibilidad. Elegir el nivel por jerarquÃ­a del documento, no por
tamaÃ±o.

## Ejemplo avanzado

```html
<div style="font-size: 1.25em">
  <iswc-heading level="2" style="--h-mix: 0%">Solo acento</iswc-heading>
</div>
```

## Errores comunes

- Elegir el `level` por tamaÃ±o y romper la jerarquÃ­a del documento.
- Esperar seis tags (`<iswc-h1>`â€¦): el mÃ³dulo registra un Ãºnico `<iswc-heading>`.
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- `color` y `variant` son dimensiones distintas; este componente solo tiene `color`.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basÃ¡ndose solo en el preview.

## Fuentes

- [JavaScript](./heading.ts)
- [CSS](./heading.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./heading.json)
