---
tag: iswc-media-recorder
tags:
  - iswc-media-recorder
category: media
status: public
source: ./media-recorder.ts
style: ./media-recorder.css
preview: ./media-recorder.json
---
# `<iswc-media-recorder>`

## PropÃ³sito

Graba cÃ¡mara, micrÃ³fono o pantalla (`getDisplayMedia`) con `MediaRecorder` y entrega un Blob.

Este mÃ³dulo registra `<iswc-media-recorder>`.

## CuÃ¡ndo usarlo

Notas de voz, captura de pantalla, clip de webcam.

## CuÃ¡ndo no usarlo

Para solo reproducir usa `<iswc-video>`. Dictado a texto es `<iswc-speech>`.

## ImportaciÃ³n

```js
import './media-recorder.js';
```

## Ejemplo mÃ­nimo

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

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `source` | lectura/escritura |  |

### Slots

| Slot | Uso |
| --- | --- |
| default | Ninguno.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-start` | Emitido al iniciar la operaciÃ³n. |
| `iswc-stop` | Emitido al detener la operaciÃ³n. |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-start` | sÃ­ `{ source }` | sÃ­ | sÃ­ | no |
| `iswc-stop` | sÃ­ `{ blob, url, type }` | sÃ­ | sÃ­ | no |
| `iswc-error` | sÃ­ `{ message }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-media-recorder');
el.addEventListener('iswc-start', (e) => {
  console.log('iswc-start', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

`start()`, `stop()`.

### CSS parts

| Part | Uso |
| --- | --- |
| `download` | BotÃ³n/enlace de descarga. |
| `preview` | PrevisualizaciÃ³n capturada. |
| `status` | `<output>` con el estado del componente. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

Al detener genera Object URL y enlace de descarga. Revoca al desmontar.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

BotÃ³n grabar/detener.

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

- `./media-recorder.js` Â· `./media-recorder.css`
- Preview: `./media-recorder.json`
