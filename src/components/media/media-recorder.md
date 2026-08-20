---
tag: is-media-recorder
tags:
  - is-media-recorder
category: media
status: public
source: ./media-recorder.js
style: ./media-recorder.css
preview: ../../previews/media/is-media-recorder.json
---
# `<is-media-recorder>`

## Propósito

Graba cámara, micrófono o pantalla (`getDisplayMedia`) con `MediaRecorder` y entrega un Blob.

Este módulo registra `<is-media-recorder>`.

## Cuándo usarlo

Notas de voz, captura de pantalla, clip de webcam.

## Cuándo no usarlo

Para solo reproducir usa `<is-video>`. Dictado a texto es `<is-speech>`.

## Importación

```js
import './media-recorder.js';
```

## Ejemplo mínimo

```html
<is-media-recorder source="camera"></is-media-recorder>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `source` | camera \| mic \| display | Origen del stream |
| `disabled` | boolean |  |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `source` | lectura/escritura |  |

### Slots

| Slot | Uso |
| --- | --- |
| default | Ninguno.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-start` | sí `{ source }` | sí | sí | no |
| `is-stop` | sí `{ blob, url, type }` | sí | sí | no |
| `is-error` | sí `{ message }` | sí | sí | no |

### Métodos y propiedades públicas

`start()`, `stop()`.

### CSS parts

`preview`, `download`

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No es form-associated.

## Comportamiento

Al detener genera Object URL y enlace de descarga. Revoca al desmontar.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

Botón grabar/detener.

## Ejemplo avanzado

```html
<is-media-recorder source="display"></is-media-recorder>
```

## Errores comunes

- `getDisplayMedia` exige gesto de usuario.
- `source=mic` oculta el video.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./media-recorder.js` · `./media-recorder.css`
- Preview: `../../previews/media/is-media-recorder.json`
