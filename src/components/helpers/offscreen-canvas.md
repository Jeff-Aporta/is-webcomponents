---
tag: iswc-offscreen-canvas
tags:
  - iswc-offscreen-canvas
category: helpers
status: public
source: ./offscreen-canvas.ts
style: ./offscreen-canvas.css
preview: ./offscreen-canvas.json
---
# `<iswc-offscreen-canvas>`

## PropÃ³sito

Lienzo que transfiere el control a OffscreenCanvas (y opcionalmente a un Worker).

Este mÃ³dulo registra `<iswc-offscreen-canvas>`.

## CuÃ¡ndo usarlo

Pintar 2D/3D pesado sin congelar el hilo de UI.

## CuÃ¡ndo no usarlo

EdiciÃ³n con puntero sobre el canvas visible: `iswc-image-editor` necesita el contexto en el hilo principal.

## ImportaciÃ³n

```js
import './offscreen-canvas.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-offscreen-canvas width="320" height="180"></iswc-offscreen-canvas>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `width` | number | Default 320 |
| `height` | number | Default 180 |
| `worker-src` | string | URL del worker; postMessage transfiere el canvas |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `canvas` | solo lectura | HTMLCanvasElement |
| `offscreen` | solo lectura | OffscreenCanvas o fallback |

### Slots

| Slot | Uso |
| --- | --- |
| default | Ninguno.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-ready` | Emitido cuando el componente estÃ¡ listo. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-ready` | sÃ­ `{ offscreen, fallback }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-offscreen-canvas');
el.addEventListener('iswc-ready', (e) => {
  console.log('iswc-ready', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

### CSS parts

| Part | Uso |
| --- | --- |
| `canvas` | Personalizable con `::part(canvas)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

`transferControlToOffscreen` una vez. Sin API, fallback al canvas del DOM.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

Canvas decorativo salvo que el consumidor ponga `aria-label`.

## Ejemplo avanzado

```html
<iswc-offscreen-canvas worker-src="./worker.js" width="640" height="360"></iswc-offscreen-canvas>
```

## Errores comunes

- Llamar `getContext` en el canvas del DOM despuÃ©s de transferir.
- `worker-src` cross-origin sin CORS.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./offscreen-canvas.js` Â· `./offscreen-canvas.css`
- Preview: `./offscreen-canvas.json`
