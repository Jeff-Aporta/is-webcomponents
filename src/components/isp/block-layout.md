---
tag: is-block-layout
tags:
  - is-block-layout
category: isp
status: public
source: ./block-layout.js
style: ./block-layout.css
preview: ../../previews/isp/is-block-layout.json
---
# `<is-block-layout>`

## Propósito

Caja de bloque que mide su propio ancho con `ResizeObserver` y publica el
breakpoint resultante para que el contenido reaccione al ancho del CONTENEDOR,
no al del viewport. Port de `src/lib/layout/BlockLayout.svelte` de ISP.

Este módulo registra `<is-block-layout>` y exporta la maquinaria de breakpoints
(`BreakpointHost`, `sizewFor`, `flagsFor`, `lerpFor`, `BREAKPOINTS`,
`BREAKPOINT_W`) que reutilizan `flex-layout.js` y `grid-layout.js`.

## Cuándo usarlo

Cuando un bloque debe adaptarse a su propio ancho (paneles redimensionables,
celdas de grid, contenido dentro de un `<is-split-panel>`) y una media query de
viewport no sirve.

## Cuándo no usarlo

No usar como caja decorativa ni como sustituto de un `<div>`: cada instancia
paga un `ResizeObserver`. Tampoco para layout flex/grid — para eso están
`<is-flex-layout>` y `<is-grid-layout>`, que ya heredan esta misma medición.

## Importación

```js
import './block-layout.js';
```

## Cuerpo JSON (json2html / html2json)

Mismo codec compacto que `<is-form>`: `[tag, attrs?, …hijos]`.

```js
block.fromJSON({
  body: [
    ['p', 'Hola'],
    ['strong', 'desde JSON'],
  ],
});
block.html2json();
```

| Método | Uso |
| --- | --- |
| `json2html(body)` / `html2json()` | Light DOM ↔ JSON |
| `toJSON()` / `fromJSON(json)` | `{ inline, cscroll, body }` |
| `IsBlockLayout.json2html` / `html2json` | Estáticos |

## Ejemplo mínimo

```html
<is-block-layout>
  <p class="titulo">Crece con el contenedor</p>
</is-block-layout>
```

```css
is-block-layout[data-szw-lg] .titulo { font-weight: 700; }
.titulo { font-size: calc(1rem + var(--lerpw, 0) * 0.75rem); }
```

## Mapeo Svelte → Web Component

En Svelte el componente entregaba `{ sizew, boolszw, lerpw }` como **slot
props**. Un Web Component no tiene slot props, así que lo mismo se publica por
cuatro canales equivalentes:

| ISP (slot prop) | Aquí | Notas |
| --- | --- | --- |
| `sizew` | atributo reflejado `data-sizew` + propiedad JS `sizew` | `xs \| sm \| md \| lg \| xl` |
| `boolszw` | atributos reflejados `data-szw-xs` … `data-szw-xl` + propiedad JS `boolszw` | acumulativos: presentes si el breakpoint es `<=` al actual |
| `lerpw(b0, b1)` | método JS `lerpw(b0, b1)` + custom property `--lerpw` (solo el caso por defecto `('sm','xl')`) | CSS no puede llamar funciones, por eso solo se publica la interpolación por defecto |
| — | custom property `--clientw` | ancho en px, sin unidad; permite calcular otras interpolaciones con `calc()` |
| — | evento `is-breakpoint` | entrega los tres valores, incluida la función `lerpw` completa |

La prop `sizew` de ISP era además de ENTRADA (podía inicializarse a `"md"`);
aquí es de salida únicamente, porque siempre se recalcula desde la medición.

Lo que **no** se portó: la detección por regex del `style` para decidir si
añadir la clase `custom-scrollbar`. Aquí el scrollbar temizado se aplica
siempre desde `_shared/scrollbars.css`, así que basta el atributo `cscroll`
para el `overflow: auto`.

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `inline` | boolean | `display: inline-block`. |
| `cscroll` | boolean | `overflow: auto`. |

#### Atributos reflejados (salida)

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `data-sizew` | string | Breakpoint actual. |
| `data-szw-xs` … `data-szw-xl` | boolean | Banderas acumulativas (`boolszw`). |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `inline` | lectura/escritura | Refleja el atributo. |
| `cscroll` | lectura/escritura | Refleja el atributo. |
| `sizew` | solo lectura | Breakpoint actual. |
| `boolszw` | solo lectura | Objeto `{ xs, sm, md, lg, xl }` de booleanos. |
| `clientWidthMeasured` | solo lectura | Último ancho medido. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido del bloque. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-breakpoint` | `{ width, sizew, boolszw, lerpw }` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `lerpw(b0 = 'sm', b1 = 'xl')` | Progreso lineal (sin recortar) del ancho entre dos anclas. |
| `measureWidth()` | Fuerza una medición inmediata. |

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
| `--lerpw` | Escrita por el componente: `lerpw('sm','xl')`. |


### Integración con formularios

No declara integración form-associated.
## Comportamiento

Anclas de breakpoint idénticas a ISP: `xs: 0`, `sm: 480`, `md: 600`, `lg: 800`,
`xl: 1200`. La escalera de comparación también es la del original (`< 480` →
`xs`, `<= 600` → `sm`, `<= 800` → `md`, `< 1200` → `lg`, resto `xl`).

El `ResizeObserver` se crea en `connectedCallback` y se destruye en
`disconnectedCallback`.

## Dependencias y componentes relacionados

- [`../_shared/element-base.js`](../_shared/element-base.js)
- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`flex-layout.md`](flex-layout.md), [`grid-layout.md`](grid-layout.md)

Tags del módulo: `<is-block-layout>`.

## Accesibilidad

Contenedor sin semántica propia: no altera el árbol de accesibilidad.

## Ejemplo avanzado

```html
<is-block-layout id="panel" cscroll style="max-height: 20rem"></is-block-layout>
<script type="module">
  document.getElementById('panel').addEventListener('is-breakpoint', (e) => {
    console.log(e.detail.sizew, e.detail.lerpw('md', 'xl'));
  });
</script>
```

## Errores comunes

- Esperar slot props como en Svelte: aquí se leen `data-sizew` / `--lerpw` / el evento.
- Estilar con `is-block-layout .foo` DESDE el CSS del componente: eso vive fuera del shadow.
- Crear un `size` colors; usar font-size contextual y em.

## Reglas para LLM

- Reusar `BreakpointHost` antes de reimplementar la medición.
- Booleano se activa por presencia; no usar `attr="false"`.
- No modificar API basándose solo en el preview.

## Fuentes

- [JavaScript](./block-layout.js)
- [CSS](./block-layout.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/isp/is-block-layout.json)
