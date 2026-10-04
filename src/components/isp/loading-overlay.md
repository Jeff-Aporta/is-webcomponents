---
tag: iswc-loading-overlay
tags:
  - iswc-loading-overlay
category: isp
status: public
source: ./loading-overlay.ts
style: ./loading-overlay.css
preview: ./loading-overlay.json
---
# `<iswc-loading-overlay>`

## PropÃ³sito

Capa de bloqueo a pantalla completa con spinner y mensaje. Port de
`src/lib/overlays/Loading.svelte` (ISP-SvelteComponents), que abre su diÃ¡logo
con `notClose`.

Este mÃ³dulo registra `<iswc-loading-overlay>`.

## CuÃ¡ndo usarlo

Operaciones que el usuario NO debe poder interrumpir ni esquivar: guardar,
consolidar, cerrar periodo.

## CuÃ¡ndo no usarlo

No usar para cargas parciales de una zona (ahÃ­ van `<iswc-skeleton>` o
`<iswc-spinner>` en lÃ­nea) ni para nada cancelable â€” esta capa no se cierra sola.

## ImportaciÃ³n

```js
import './loading-overlay.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-loading-overlay open message="Guardandoâ€¦"></iswc-loading-overlay>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Visible. |
| `message` | string | Texto bajo el indicador. |
| `scroll-lock` | boolean | Bloquea el scroll del documento mientras estÃ¡ abierto. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Refleja el atributo. |
| `message` | lectura/escritura | Refleja el atributo. |
| `scrollLock` | lectura/escritura | Refleja `scroll-lock`. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Indicador propio en lugar de `<iswc-spinner>`. |
| `message` | Contenido rico en lugar del atributo `message`. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | `{}` | sÃ­ | sÃ­ | no |
| `iswc-hide` | `{}` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-loading-overlay');
el.addEventListener('iswc-show', (e) => {
  console.log('iswc-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
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

### Custom states

No expone custom states.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-loading-backdrop` | Color del velo. |
| `--iswc-loading-indicator` | Color del spinner. |
| `--iswc-z-overlay` | Capa de apilado. |


### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated.
## Comportamiento

No es dismissable: no escucha Escape, ni clic en el velo, ni ofrece botÃ³n de
cerrar. Por eso NO extiende `ModalBase` (que sÃ­ trae los tres). Solo el cÃ³digo
que la abriÃ³ puede cerrarla.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../feedback/spinner.js`](../feedback/spinner.js)

Tags del mÃ³dulo: `<iswc-loading-overlay>`.

## Accesibilidad

`role="alertdialog"` + `aria-busy="true"` en el velo; `<iswc-spinner>` aporta el
`role="status"`.

## Ejemplo avanzado

```html
<iswc-block-layout style="position: relative">
  <iswc-loading-overlay id="cargando" message="Consultando saldosâ€¦" scroll-lock>
  </iswc-loading-overlay>
  <iswc-data-grid></iswc-data-grid>
</iswc-block-layout>

<script type="module">
  const overlay = document.getElementById('cargando');
  overlay.open = true;
  await cargarSaldos();
  overlay.open = false;
</script>
```

## Errores comunes

- Esperar que Escape la cierre.
- Dejarla abierta si la promesa falla: cerrar siempre en `finally`.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"`.

## Fuentes

- [JavaScript](./loading-overlay.ts)
- [CSS](./loading-overlay.css)
- [Preview](./loading-overlay.json)
