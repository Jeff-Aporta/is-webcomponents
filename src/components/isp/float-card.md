---
tag: is-float-card
tags:
  - is-float-card
category: isp
status: public
source: ./float-card.js
style: ./float-card.css
preview: ../../previews/isp/is-float-card.json
---
# `<is-float-card>`

## Propósito

Caja con un panel flotante anclado al contenido. Port de
`FloatingComponent.svelte` (ClientesIS). El panel (slot `float`) se muestra
con `open` o `lock()`; **no se desmonta**: opacity/visibility, para que
`is-button` / `is-icon` no se re-upgraden en cada hover.

Este módulo registra `<is-float-card>`.

## Cuándo usarlo

Tools de hover sobre una fila, chip o ancla que deben aparecer al lado sin
recrear el DOM. Toolbar flotante de un árbol, acciones sobre un ítem.

## Cuándo no usarlo

Panel que se abre con clic y se cierra con Escape / clic fuera →
`<is-popover>`. Tooltip breve → `<is-tooltip>`. No usar `<is-floating>`
(building block interno).

## Importación

```js
import './float-card.js';
```

## Ejemplo mínimo

```html
<is-float-card open horizontal="right" vertical="center">
  <span>Fila</span>
  <is-button slot="float" variant="plain">Acción</is-button>
</is-float-card>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Muestra el panel. |
| `horizontal` | string | `left` · `center` · `right` · `left+N` · `right+N`. Default `right`. |
| `vertical` | string | `top` · `center` · `bottom` · `top+N` · `bottom+N`. Default `center`. |
| `locked` | boolean | Keep-alive: lo pone `lock()`, no el consumidor. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| — | — | — | — | — |

No emite eventos propios. Escucha `is-show` / `is-hide` de hijos (p. ej.
`<is-dropdown>`) para `lock()` / `unlock()`.

### Métodos y propiedades públicas

| Método | Uso |
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
| `--is-bg-elev` | Fondo del panel. |
| `--is-border` | Borde. |
| `--is-radius-sm` | Radio. |
| `--is-shadow` | Sombra. |

### Integración con formularios

No declara integración form-associated.

## Comportamiento

El panel vive siempre en el DOM. Sin `open` ni `locked`: `opacity: 0` +
`visibility: hidden`. Un `<is-dropdown>` interno que emite `is-show` llama
`lock()` para que el panel no se apague al salir el hover hacia el menú.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`flex-options.md`](./flex-options.md) — toolbar típica en `slot="float"`
- [`../helpers/popover.md`](../helpers/popover.md) — overlay click, no hover

Tags del módulo: `<is-float-card>`.

## Accesibilidad

El panel no se desmonta: los controles siguen en el árbol de accesibilidad.
Ocultar con `open` es visual; el consumidor no debe poner foco en tools
ocultas.

## Ejemplo avanzado

```html
<is-float-card id="fc" horizontal="right" vertical="top+50">
  <span>Lección</span>
  <is-flex-options slot="float" compact></is-flex-options>
</is-float-card>
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

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.
- Hover tools: montar una vez, togglear `open`. No recrear hijos.

## Fuentes

- [JavaScript](./float-card.js)
- [CSS](./float-card.css)
- [Preview](../../previews/isp/is-float-card.json)
