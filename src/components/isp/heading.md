---
tag: is-heading
tags:
  - is-heading
category: isp
status: public
source: ./heading.js
style: ./heading.css
preview: ../../previews/isp/is-heading.json
---
# `<is-heading>`

## Propósito

Título de nivel 1 a 6 con tinte de marca. Port de
`src/lib/typography/H1.svelte` … `H6.svelte` de ISP, unificados en un solo
módulo multi-nivel.

Este módulo registra `<is-heading>`.

## Cuándo usarlo

Para los encabezados de una vista cuando se quiere el color tintado de la
paleta activa y una escala en `em` coherente con el resto del kit.

## Cuándo no usarlo

No usar por su tamaño: el nivel es semántico. Para texto grande sin jerarquía,
usa `<is-text>` dentro de un contexto con `font-size` mayor.

## Importación

```js
import './heading.js';
```

## Ejemplo mínimo

```html
<is-heading level="1">Título de página</is-heading>
<is-heading level="3" color="success">Sección aprobada</is-heading>
<is-heading level="2" mix="0%">Solo acento</is-heading>
```

## Mapeo Svelte → Web Component

- Seis componentes `H1`…`H6` → un módulo con el atributo `level` (1-6). El
  shadow root construye el `<hN>` REAL, así que la semántica y el árbol de
  accesibilidad se conservan sin duplicar seis archivos.
- ISP pintaba `color-mix(in srgb, var(--h-clr), var(--is-color) var(--h-mix))`
  con `--h-clr = colorVar(color, "primary")`. Aquí `--h-clr` cae a
  `--is-accent` → `--is-color-brand-500` → `--is-text`, y el color de mezcla es
  `--is-text` (el equivalente de `--is-color` en este kit). Los porcentajes son
  los mismos: 15 / 30 / 45 / 65 / 80 / 90 %.
- ISP envolvía el contenido en un `<Text>` interno; aquí no hace falta, porque
  el clamp y el color semántico ya se resuelven en el propio host.

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `level` | `1`…`6` | Default `1`, reflejado. Un valor inválido se corrige a `1`. |
| `color` | semántico · `current` · color CSS | Semánticos → tokens. `current` → `currentColor`. Otro string → color CSS tal cual. Default acento vía `--h-clr`. |
| `mix` | string (`0%`…`100%`) | Override de `--h-mix`. Ausente = default del nivel. |
| `mix-with` | `text` · `transparent` · `white` · `black` · `current` · CSS | Destino del `color-mix` (default: texto del tema). |
| `size` | string CSS | Override de `--h-size`. Ausente = default del nivel. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `level` | lectura/escritura | Devuelve string `'1'`…`'6'`. |
| `color` | lectura/escritura | Refleja el atributo. |
| `mix` | lectura/escritura | Refleja el atributo / limpia el override. |
| `size` | lectura/escritura | Refleja el atributo. |
| `computedMix` | solo lectura | Mix efectivo (atributo o default del nivel). |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Texto del título. |

### Eventos

No emite eventos propios.

### Métodos y propiedades públicas

No expone métodos públicos: el componente es declarativo y su estado se controla por atributos.

### CSS parts

| Part | Uso |
| --- | --- |
| `heading` | El elemento `<hN>`; personalizable con `::part(heading)`. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--h-clr` | Color base del título. |
| `--h-mix` | Porcentaje de `--is-text` mezclado; default según nivel. |
| `--h-size` | Tamaño en em del nivel. |


### Integración con formularios

No declara integración form-associated.
## Comportamiento

Escala por nivel: 2 · 1.6 · 1.35 · 1.15 · 1 · 0.9 em sobre el `font-size`
heredado. No hay atributo `size`.

El color se declara dos veces: primero plano (`var(--h-clr)`) y luego con
`color-mix`, para que un navegador sin soporte no se quede sin declaración.

Cambiar `level` reemplaza únicamente el `<hN>` dentro del shadow root; los
`<link>` que inyecta `adoptCss` se conservan.

## Dependencias y componentes relacionados

- [`../_shared/element-base.js`](../_shared/element-base.js)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`text.md`](text.md)

Tags del módulo: `<is-heading>`.

## Accesibilidad

Renderiza un `<h1>`…`<h6>` nativo dentro del shadow root, que sí forma parte
del árbol de accesibilidad. Elegir el nivel por jerarquía del documento, no por
tamaño.

## Ejemplo avanzado

```html
<div style="font-size: 1.25em">
  <is-heading level="2" style="--h-mix: 0%">Solo acento</is-heading>
</div>
```

## Errores comunes

- Elegir el `level` por tamaño y romper la jerarquía del documento.
- Esperar seis tags (`<is-h1>`…): el módulo registra un único `<is-heading>`.
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- `color` y `variant` son dimensiones distintas; este componente solo tiene `color`.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basándose solo en el preview.

## Fuentes

- [JavaScript](./heading.js)
- [CSS](./heading.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/isp/is-heading.json)
