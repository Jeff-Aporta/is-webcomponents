---
tag: iswc-text
tags:
  - iswc-text
category: isp
status: public
source: ./text.ts
style: ./text.css
preview: ./text.json
---
# `<iswc-text>`

## PropÃ³sito

Texto en lÃ­nea con color semÃ¡ntico y recorte por nÃºmero de lÃ­neas. Port de
`src/lib/typography/Text.svelte` de ISP.

Este mÃ³dulo registra `<iswc-text>`.

## CuÃ¡ndo usarlo

Para dar color semÃ¡ntico a un fragmento de texto, o para recortar contenido
largo a N lÃ­neas con elipsis dentro de una tarjeta o celda.

## CuÃ¡ndo no usarlo

No usar para tÃ­tulos (usa `<iswc-heading>`) ni para pÃ¡rrafos de contenido donde
un `<p>` normal ya sirve.

## ImportaciÃ³n

```js
import './text.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-text color="success">Aprobado</iswc-text>
<iswc-text lines="2">Texto largo que se recorta a dos lÃ­neasâ€¦</iswc-text>
```

## Mapeo Svelte â†’ Web Component

- `color` en ISP pasaba por `colorVar()` â†’ `var(--iswc-<color>)`. AquÃ­ el mapeo
  vive en el CSS (`:host([color=â€¦])`) y cae siempre a tokens del tema
  (`--iswc-brand-text`, `--iswc-color-success-500`, â€¦), nunca a un literal.
- El clamp: ISP resolvÃ­a `--mx-lns` con `attr(data-clamp-lines type(<integer>))`,
  soportado hoy solo en Chrome. AquÃ­ el JS escribe `--mx-lns` en el host desde
  el atributo `lines`, con la misma normalizaciÃ³n (`max(0, floor(Number(lines)))`
  y clamp solo si es `>= 1`).
- ISP marcaba `data-clamp-lines`; aquÃ­ el selector de estado es el propio
  atributo `lines` (`:host([lines])`).

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | semÃ¡ntico Â· `current` Â· color CSS | Sin attr: hereda. `current` â†’ `currentColor`. Otro string â†’ color CSS. |
| `mix` | string (`0%`â€¦`100%`) | Mezcla hacia `mix-with` vÃ­a `color-mix`. |
| `mix-with` | `text` Â· `transparent` Â· `white` Â· `black` Â· `current` Â· CSS | Destino del mix (default: texto del tema). |
| `lines` | number | Recorte a N lÃ­neas. |
| `lines` | number | `>= 1` activa el clamp; ausente o `0` lo desactiva. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `color` | lectura/escritura | Refleja el atributo. |
| `lines` | lectura/escritura | Normaliza a entero `>= 1` o elimina el atributo. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Texto. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No emite eventos propios.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-text');
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
| `content` | El `<slot>` del texto. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--text-clr` | Color resuelto; se puede pisar directamente. |
| `--mx-lns` | LÃ­neas del clamp (la escribe el JS). |


### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.
## Comportamiento

Con `lines` el host pasa a `display: -webkit-box` con `-webkit-box-orient:
vertical` y `-webkit-line-clamp: var(--mx-lns)`, que recorta exactamente a N
lÃ­neas con elipsis independientemente del `line-height` heredado. Antes se
limitaba tambiÃ©n `max-height` a `calc(var(--mx-lns) * 1.3em)` (copia literal de
ISP), pero con `line-height > 1.3` ese tope se cumplÃ­a antes que el clamp y
cortaba la Ãºltima lÃ­nea visible: por eso se eliminÃ³.

No hay atributo `size`: la escala sale del `font-size` heredado.

## Dependencias y componentes relacionados

- [`../_shared/element-base.js`](../_shared/element-base.js)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`heading.md`](heading.md)

Tags del mÃ³dulo: `<iswc-text>`.

## Accesibilidad

El texto recortado sigue completo en el DOM: los lectores de pantalla lo leen
entero. Si el recorte debe ser tambiÃ©n semÃ¡ntico, acortar el contenido.

## Ejemplo avanzado

```html
<div style="font-size: 1.25em; max-width: 20rem">
  <iswc-text color="danger" lines="3">Mensaje de error largoâ€¦</iswc-text>
</div>
```

## Errores comunes

- Esperar que `lines="0"` recorte: `0` desactiva el clamp.
- Meter el color en `variant`: `color` y `variant` son dimensiones distintas.
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- Usar los seis colores semÃ¡nticos documentados; no inventar otros.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basÃ¡ndose solo en el preview.

## Fuentes

- [JavaScript](./text.ts)
- [CSS](./text.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./text.json)
