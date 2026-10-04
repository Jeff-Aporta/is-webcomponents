---
tag: iswc-media-recorder
tags:
  - iswc-media-recorder
category: media
status: public
source: ./media-recorder.js
style: ./media-recorder.css
preview: ./media-recorder.json
---
# `<iswc-media-recorder>`

## Propósito

Graba cámara, micrófono o pantalla (`getDisplayMedia`) con `MediaRecorder` y entrega un Blob.

Este módulo registra `<iswc-media-recorder>`.

## Cuándo usarlo

Notas de voz, captura de pantalla, clip de webcam.

## Cuándo no usarlo

Para solo reproducir usa `<iswc-video>`. Dictado a texto es `<iswc-speech>`.

## Importación

```js
import './media-recorder.js';
```

## Ejemplo mínimo

```html
<iswc-media-recorder source="camera"></iswc-media-recorder>
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


| Evento | Descripción |
| --- | --- |
| `iswc-start` | Emitido al iniciar la operación. |
| `iswc-stop` | Emitido al detener la operación. |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-start` | sí `{ source }` | sí | sí | no |
| `iswc-stop` | sí `{ blob, url, type }` | sí | sí | no |
| `iswc-error` | sí `{ message }` | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-media-recorder');
el.addEventListener('iswc-start', (e) => {
  console.log('iswc-start', e.detail);
});
```

</details>

### Métodos y propiedades públicas

`start()`, `stop()`.

### CSS parts

| Part | Uso |
| --- | --- |
| `download` | Botón/enlace de descarga. |
| `preview` | Previsualización capturada. |
| `status` | `<output>` con el estado del componente. |

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
<iswc-media-recorder source="display"></iswc-media-recorder>
```

## Errores comunes

- `getDisplayMedia` exige gesto de usuario.
- `source=mic` oculta el video.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./media-recorder.js` · `./media-recorder.css`
- Preview: `./media-recorder.json`
