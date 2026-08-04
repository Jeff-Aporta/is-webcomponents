---
tag: is-loading-overlay
tags:
  - is-loading-overlay
category: isp
status: public
source: ./loading-overlay.js
style: ./loading-overlay.css
preview: ../../previews/isp/is-loading-overlay.html
---
# `<is-loading-overlay>`

## Propósito

Capa de bloqueo a pantalla completa con spinner y mensaje. Port de
`src/lib/overlays/Loading.svelte` (ISP-SvelteComponents), que abre su diálogo
con `notClose`.

Este módulo registra `<is-loading-overlay>`.

## Cuándo usarlo

Operaciones que el usuario NO debe poder interrumpir ni esquivar: guardar,
consolidar, cerrar periodo.

## Cuándo no usarlo

No usar para cargas parciales de una zona (ahí van `<is-skeleton>` o
`<is-spinner>` en línea) ni para nada cancelable — esta capa no se cierra sola.

## Importación

```js
import './loading-overlay.js';
```

## Ejemplo mínimo

```html
<is-loading-overlay open message="Guardando…"></is-loading-overlay>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Visible. |
| `message` | string | Texto bajo el indicador. |
| `scroll-lock` | boolean | Bloquea el scroll del documento mientras está abierto. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Refleja el atributo. |
| `message` | lectura/escritura | Refleja el atributo. |
| `scrollLock` | lectura/escritura | Refleja `scroll-lock`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Indicador propio en lugar de `<is-spinner>`. |
| `message` | Contenido rico en lugar del atributo `message`. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-show` | `{}` | sí | sí | no |
| `is-hide` | `{}` | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Abre la capa. |
| `hide()` | La cierra. |
| `toggle()` | Alterna. |

### CSS parts

| Part | Uso |
| --- | --- |
| `backdrop` | Personalizable con `::part(backdrop)`. |
| `panel` | Personalizable con `::part(panel)`. |
| `indicator` | Personalizable con `::part(indicator)`. |
| `message` | Personalizable con `::part(message)`. |

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-loading-backdrop` | Color del velo. |
| `--is-loading-indicator` | Color del spinner. |
| `--is-z-overlay` | Capa de apilado. |

## Comportamiento

No es dismissable: no escucha Escape, ni clic en el velo, ni ofrece botón de
cerrar. Por eso NO extiende `ModalBase` (que sí trae los tres). Solo el código
que la abrió puede cerrarla.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../feedback/spinner.js`](../feedback/spinner.js)

Tags del módulo: `<is-loading-overlay>`.

## Accesibilidad

`role="alertdialog"` + `aria-busy="true"` en el velo; `<is-spinner>` aporta el
`role="status"`.

## Errores comunes

- Esperar que Escape la cierre.
- Dejarla abierta si la promesa falla: cerrar siempre en `finally`.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./loading-overlay.js)
- [CSS](./loading-overlay.css)
- [Preview](../../previews/isp/is-loading-overlay.html)
