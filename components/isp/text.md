---
tag: is-text
tags:
  - is-text
category: isp
status: public
source: ./text.js
style: ./text.css
preview: ../../previews/isp/is-text.html
---
# `<is-text>`

## Propósito

Texto en línea con color semántico y recorte por número de líneas. Port de
`src/lib/typography/Text.svelte` de ISP.

Este módulo registra `<is-text>`.

## Cuándo usarlo

Para dar color semántico a un fragmento de texto, o para recortar contenido
largo a N líneas con elipsis dentro de una tarjeta o celda.

## Cuándo no usarlo

No usar para títulos (usa `<is-heading>`) ni para párrafos de contenido donde
un `<p>` normal ya sirve.

## Importación

```js
import './text.js';
```

## Ejemplo mínimo

```html
<is-text color="success">Aprobado</is-text>
<is-text lines="2">Texto largo que se recorta a dos líneas…</is-text>
```

## Mapeo Svelte → Web Component

- `color` en ISP pasaba por `colorVar()` → `var(--is-<color>)`. Aquí el mapeo
  vive en el CSS (`:host([color=…])`) y cae siempre a tokens del tema
  (`--is-brand-text`, `--is-color-success-500`, …), nunca a un literal.
- El clamp: ISP resolvía `--mx-lns` con `attr(data-clamp-lines type(<integer>))`,
  soportado hoy solo en Chrome. Aquí el JS escribe `--mx-lns` en el host desde
  el atributo `lines`, con la misma normalización (`max(0, floor(Number(lines)))`
  y clamp solo si es `>= 1`).
- ISP marcaba `data-clamp-lines`; aquí el selector de estado es el propio
  atributo `lines` (`:host([lines])`).

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | `brand` \| `neutral` \| `info` \| `success` \| `warning` \| `danger` | Sin default: si falta, hereda el color del contexto. |
| `lines` | number | `>= 1` activa el clamp; ausente o `0` lo desactiva. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `color` | lectura/escritura | Refleja el atributo. |
| `lines` | lectura/escritura | Normaliza a entero `>= 1` o elimina el atributo. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Texto. |

### Eventos

No emite eventos propios.

### CSS parts

| Part | Uso |
| --- | --- |
| `content` | El `<slot>` del texto. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--text-clr` | Color resuelto; se puede pisar directamente. |
| `--mx-lns` | Líneas del clamp (la escribe el JS). |

## Comportamiento

Con `lines` el host pasa a `display: -webkit-box` con `-webkit-box-orient:
vertical`, y a partir de dos líneas se limita también `max-height` a
`calc(var(--mx-lns) * 1.3em)`, igual que ISP.

No hay atributo `size`: la escala sale del `font-size` heredado.

## Dependencias y componentes relacionados

- [`../_shared/element-base.js`](../_shared/element-base.js)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`heading.md`](heading.md)

Tags del módulo: `<is-text>`.

## Accesibilidad

El texto recortado sigue completo en el DOM: los lectores de pantalla lo leen
entero. Si el recorte debe ser también semántico, acortar el contenido.

## Ejemplo avanzado

```html
<div style="font-size: 1.25em; max-width: 20rem">
  <is-text color="danger" lines="3">Mensaje de error largo…</is-text>
</div>
```

## Errores comunes

- Esperar que `lines="0"` recorte: `0` desactiva el clamp.
- Meter el color en `variant`: `color` y `variant` son dimensiones distintas.
- Crear size colors; usar font-size contextual y em.

## Reglas para LLM

- Usar los seis colores semánticos documentados; no inventar otros.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basándose solo en el preview.

## Fuentes

- [JavaScript](./text.js)
- [CSS](./text.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/isp/is-text.html)
