---
tag: is-offscreen-canvas
tags:
  - is-offscreen-canvas
category: helpers
status: public
source: ./offscreen-canvas.js
style: ./offscreen-canvas.css
preview: ../../previews/helpers/is-offscreen-canvas.json
---
# `<is-offscreen-canvas>`

## Propósito

Lienzo que transfiere el control a OffscreenCanvas (y opcionalmente a un Worker).

Este módulo registra `<is-offscreen-canvas>`.

## Cuándo usarlo

Pintar 2D/3D pesado sin congelar el hilo de UI.

## Cuándo no usarlo

Edición con puntero sobre el canvas visible: `is-image-editor` necesita el contexto en el hilo principal.

## Importación

```js
import './offscreen-canvas.js';
```

## Ejemplo mínimo

```html
<is-offscreen-canvas width="320" height="180"></is-offscreen-canvas>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `width` | number | Default 320 |
| `height` | number | Default 180 |
| `worker-src` | string | URL del worker; postMessage transfiere el canvas |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `canvas` | solo lectura | HTMLCanvasElement |
| `offscreen` | solo lectura | OffscreenCanvas o fallback |

### Slots

| Slot | Uso |
| --- | --- |
| default | Ninguno.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-ready` | sí `{ offscreen, fallback }` | sí | sí | no |

### Métodos y propiedades públicas

No expone.

### CSS parts

`canvas`

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No es form-associated.

## Comportamiento

`transferControlToOffscreen` una vez. Sin API, fallback al canvas del DOM.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

Canvas decorativo salvo que el consumidor ponga `aria-label`.

## Ejemplo avanzado

```html
<is-offscreen-canvas worker-src="./worker.js" width="640" height="360"></is-offscreen-canvas>
```

## Errores comunes

- Llamar `getContext` en el canvas del DOM después de transferir.
- `worker-src` cross-origin sin CORS.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./offscreen-canvas.js` · `./offscreen-canvas.css`
- Preview: `../../previews/helpers/is-offscreen-canvas.json`
