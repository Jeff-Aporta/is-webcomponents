---
tag: iswc-float-card
tags:
  - iswc-float-card
category: isp
status: public
source: ./float-card.ts
style: ./float-card.css
preview: ./float-card.json
---
# `<iswc-float-card>`

## PropÃ³sito

Caja con un panel flotante anclado al contenido. Port de
`FloatingComponent.svelte` (ClientesIS). El panel (slot `float`) se muestra
con `open` o `lock()`; **no se desmonta**: opacity/visibility, para que
`iswc-button` / `iswc-icon` no se re-upgraden en cada hover.

Este mÃ³dulo registra `<iswc-float-card>`.

## CuÃ¡ndo usarlo

Tools de hover sobre una fila, chip o ancla que deben aparecer al lado sin
recrear el DOM. Toolbar flotante de un Ã¡rbol, acciones sobre un Ã­tem.

## CuÃ¡ndo no usarlo

Panel que se abre con clic y se cierra con Escape / clic fuera â†’
`<iswc-popover>`. Tooltip breve â†’ `<iswc-tooltip>`. No usar `<iswc-floating>`
(building block interno).

## ImportaciÃ³n

```js
import './float-card.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-float-card open horizontal="right" vertical="center">
  <span>Fila</span>
  <iswc-button slot="float" variant="plain">AcciÃ³n</iswc-button>
</iswc-float-card>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Muestra el panel. |
| `horizontal` | string | `left` Â· `center` Â· `right` Â· `left+N` Â· `right+N`. Default `right`. |
| `vertical` | string | `top` Â· `center` Â· `bottom` Â· `top+N` Â· `bottom+N`. Default `center`. |
| `locked` | boolean | Keep-alive: lo pone `lock()`, no el consumidor. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Refleja el atributo. |
| `horizontal` | lectura/escritura | Refleja el atributo. |
| `vertical` | lectura/escritura | Refleja el atributo. |
| `locked` | lectura | True mientras hay locks. |
| `linearTransform` | lectura/escritura | `{ tx, ty, e }` extra (px / scale). |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido ancla. |
| `float` | Panel flotante (tools). |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `â€”` | Evento `â€”`. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| â€” | â€” | â€” | â€” | â€” |

No emite eventos propios. Escucha `iswc-show` / `iswc-hide` de hijos (p. ej.
`<iswc-dropdown>`) para `lock()` / `unlock()`.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-float-card');
el.addEventListener('â€”', (e) => {
  console.log('â€”', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `lock()` | Mantiene el panel visible (keep-alive). |
| `unlock()` | Suelta un lock. |

### CSS parts

| Part | Uso |
| --- | --- |
| `wrap` | Contenedor relativo. |
| `panel` | Caja absoluta del slot `float`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-bg-elev` | Fondo del panel. |
| `--iswc-border` | Borde. |
| `--iswc-radius-sm` | Radio. |
| `--iswc-shadow` | Sombra. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.

## Comportamiento

El panel vive siempre en el DOM. Sin `open` ni `locked`: `opacity: 0` +
`visibility: hidden`. Un `<iswc-dropdown>` interno que emite `iswc-show` llama
`lock()` para que el panel no se apague al salir el hover hacia el menÃº.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`flex-options.md`](./flex-options.md) â€” toolbar tÃ­pica en `slot="float"`
- [`../helpers/popover.md`](../helpers/popover.md) â€” overlay click, no hover

Tags del mÃ³dulo: `<iswc-float-card>`.

## Accesibilidad

El panel no se desmonta: los controles siguen en el Ã¡rbol de accesibilidad.
Ocultar con `open` es visual; el consumidor no debe poner foco en tools
ocultas.

## Ejemplo avanzado

```html
<iswc-float-card id="fc" horizontal="right" vertical="top+50">
  <span>LecciÃ³n</span>
  <iswc-flex-options slot="float" compact></iswc-flex-options>
</iswc-float-card>
<script type="module">
  const fc = document.getElementById('fc');
  fc.addEventListener('pointerenter', () => { fc.open = true; });
  fc.addEventListener('pointerleave', () => { if (!fc.locked) fc.open = false; });
</script>
```

## Errores comunes

- Usar `display:none` / `hidden` en el panel: pisa el hide del host y deja
  tools pegadas, o re-crea custom elements (flicker).
- Abrir con clic y esperar dismiss de popover: este tag no cierra solo.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.
- Hover tools: montar una vez, togglear `open`. No recrear hijos.

## Fuentes

- [JavaScript](./float-card.ts)
- [CSS](./float-card.css)
- [Preview](./float-card.json)
