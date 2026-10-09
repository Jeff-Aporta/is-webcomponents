---
tag: iswc-block-layout
tags:
  - iswc-block-layout
category: isp
status: public
source: ./block-layout.ts
style: ./block-layout.css
preview: ./block-layout.json
---
# `<iswc-block-layout>`

## PropÃ³sito

Caja de bloque que mide su propio ancho con `ResizeObserver` y publica el
breakpoint resultante para que el contenido reaccione al ancho del CONTENEDOR,
no al del viewport. Port de `src/lib/layout/BlockLayout.svelte` de ISP.

Este mÃ³dulo registra `<iswc-block-layout>` y exporta la maquinaria de breakpoints
(`BreakpointHost`, `sizewFor`, `flagsFor`, `lerpFor`, `BREAKPOINTS`,
`BREAKPOINT_W`) que reutilizan `flex-layout.js` y `grid-layout.js`.

## CuÃ¡ndo usarlo

Cuando un bloque debe adaptarse a su propio ancho (paneles redimensionables,
celdas de grid, contenido dentro de un `<iswc-split-panel>`) y una media query de
viewport no sirve.

## CuÃ¡ndo no usarlo

No usar como caja decorativa ni como sustituto de un `<div>`: cada instancia
paga un `ResizeObserver`. Tampoco para layout flex/grid â€” para eso estÃ¡n
`<iswc-flex-layout>` y `<iswc-grid-layout>`, que ya heredan esta misma mediciÃ³n.

## ImportaciÃ³n

```js
import './block-layout.js';
```

## Cuerpo JSON (json2html / html2json)

Mismo codec compacto que `<iswc-form>`: `[tag, attrs?, â€¦hijos]`.

```js
block.fromJSON({
  body: [
    ['p', 'Hola'],
    ['strong', 'desde JSON'],
  ],
});
block.html2json();
```

| MÃ©todo | Uso |
| --- | --- |
| `json2html(body)` / `html2json()` | Light DOM â†” JSON |
| `toJSON()` / `fromJSON(json)` | `{ inline, cscroll, body }` |
| `IswcBlockLayout.json2html` / `html2json` | EstÃ¡ticos |

## Ejemplo mÃ­nimo

```html
<iswc-block-layout>
  <p class="titulo">Crece con el contenedor</p>
</iswc-block-layout>
```

```css
iswc-block-layout[data-szw-lg] .titulo { font-weight: 700; }
.titulo { font-size: calc(1rem + var(--lerpw, 0) * 0.75rem); }
```

## Mapeo Svelte â†’ Web Component

En Svelte el componente entregaba `{ sizew, boolszw, lerpw }` como **slot
props**. Un Web Component no tiene slot props, asÃ­ que lo mismo se publica por
cuatro canales equivalentes:

| ISP (slot prop) | AquÃ­ | Notas |
| --- | --- | --- |
| `sizew` | atributo reflejado `data-sizew` + propiedad JS `sizew` | `xs \| sm \| md \| lg \| xl` |
| `boolszw` | atributos reflejados `data-szw-xs` â€¦ `data-szw-xl` + propiedad JS `boolszw` | acumulativos: presentes si el breakpoint es `<=` al actual |
| `lerpw(b0, b1)` | mÃ©todo JS `lerpw(b0, b1)` + custom property `--lerpw` (solo el caso por defecto `('sm','xl')`) | CSS no puede llamar funciones, por eso solo se publica la interpolaciÃ³n por defecto |
| â€” | custom property `--clientw` | ancho en px, sin unidad; permite calcular otras interpolaciones con `calc()` |
| â€” | evento `iswc-breakpoint` | entrega los tres valores, incluida la funciÃ³n `lerpw` completa |

La prop `sizew` de ISP era ademÃ¡s de ENTRADA (podÃ­a inicializarse a `"md"`);
aquÃ­ es de salida Ãºnicamente, porque siempre se recalcula desde la mediciÃ³n.

Lo que **no** se portÃ³: la detecciÃ³n por regex del `style` para decidir si
aÃ±adir la clase `custom-scrollbar`. AquÃ­ el scrollbar temizado se aplica
siempre desde `_shared/scrollbars.css`, asÃ­ que basta el atributo `cscroll`
para el `overflow: auto`.

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `inline` | boolean | `display: inline-block`. |
| `cscroll` | boolean | `overflow: auto`. |
| `remember-scroll` | boolean | Opt-in memoria de scroll (requiere `storage-key`). |
| `storage-key` | string | Clave bajo `iswc-root[iswc-block-layout]`. |
| `scroll-ttl` | number | ms de validez (default 1h). |

#### Atributos reflejados (salida)

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `data-sizew` | string | Breakpoint actual. |
| `data-szw-xs` â€¦ `data-szw-xl` | boolean | Banderas acumulativas (`boolszw`). |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `inline` | lectura/escritura | Refleja el atributo. |
| `cscroll` | lectura/escritura | Refleja el atributo. |
| `rememberScroll` / `storageKey` / `scrollTtl` | lectura/escritura | Memoria de scroll. |
| `sizew` | solo lectura | Breakpoint actual. |
| `boolszw` | solo lectura | Objeto `{ xs, sm, md, lg, xl }` de booleanos. |
| `clientWidthMeasured` | solo lectura | Ãšltimo ancho medido. |
| `clientHeightMeasured` | solo lectura | Ãšltimo alto medido. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido del bloque. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-breakpoint` | Evento personalizado del componente (breakpoint). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-breakpoint` | `{ width, height, sizew, boolszw, lerpw }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-block-layout');
el.addEventListener('iswc-breakpoint', (e) => {
  console.log('iswc-breakpoint', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `lerpw(b0 = 'sm', b1 = 'xl')` | Progreso lineal (sin recortar) del ancho entre dos anclas. |
| `measureSize()` / `measureWidth()` | Fuerza una mediciÃ³n inmediata. |
| `getWidth()` / `getHeight()` | Dimensiones medidas del host (px). |
| `rect()` / `getRect()` | `{ x, y, width, height, top, left, right, bottom }` en viewport. |
| `saveScroll()` / `restoreScroll()` / `clearRememberedScroll()` / `scrollToTop()` | Memoria de scroll (si estÃ¡ habilitada). |

### CSS parts

| Part | Uso |
| --- | --- |
| `content` | El `<slot>` del contenido. |

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--clientw` | Escrita por el componente: ancho en px sin unidad. |
| `--clienth` | Escrita por el componente: alto en px sin unidad. |
| `--lerpw` | Escrita por el componente: `lerpw('sm','xl')`. |


### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.
## Comportamiento

Anclas de breakpoint idÃ©nticas a ISP: `xs: 0`, `sm: 480`, `md: 600`, `lg: 800`,
`xl: 1200`. La escalera de comparaciÃ³n tambiÃ©n es la del original (`< 480` â†’
`xs`, `<= 600` â†’ `sm`, `<= 800` â†’ `md`, `< 1200` â†’ `lg`, resto `xl`).

El `ResizeObserver` se crea en `connectedCallback` y se destruye en
`disconnectedCallback`.

## Dependencias y componentes relacionados

- [`../_shared/element-base.js`](../_shared/element-base.js)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`flex-layout.md`](flex-layout.md), [`grid-layout.md`](grid-layout.md)

Tags del mÃ³dulo: `<iswc-block-layout>`.

## Accesibilidad

Contenedor sin semÃ¡ntica propia: no altera el Ã¡rbol de accesibilidad.

## Ejemplo avanzado

```html
<iswc-block-layout id="panel" cscroll style="max-height: 20rem"></iswc-block-layout>
<script type="module">
  document.getElementById('panel').addEventListener('iswc-breakpoint', (e) => {
    console.log(e.detail.sizew, e.detail.lerpw('md', 'xl'));
  });
</script>
```

## Errores comunes

- Esperar slot props como en Svelte: aquÃ­ se leen `data-sizew` / `--lerpw` / el evento.
- Estilar con `iswc-block-layout .foo` DESDE el CSS del componente: eso vive fuera del shadow.
- Crear un `size` colors; usar font-size contextual y em.

## Reglas para LLM

- Reusar `BreakpointHost` antes de reimplementar la mediciÃ³n.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basÃ¡ndose solo en el preview.

## Fuentes

- [JavaScript](./block-layout.ts)
- [CSS](./block-layout.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./block-layout.json)
