---
tag: iswc-speech
tags:
  - iswc-speech
category: media
status: public
source: ./speech.ts
style: ./speech.css
preview: ./speech.json
---
# `<iswc-speech>`

## PropÃ³sito

Dictado (`SpeechRecognition`) y lectura (`SpeechSynthesis`) con `lang` del documento.

Este mÃ³dulo registra `<iswc-speech>`.

## CuÃ¡ndo usarlo

Asistentes, dictado al campo, leer un resultado en voz alta.

## CuÃ¡ndo no usarlo

No sustituye una nota de voz (`MediaRecorder`). Firefox no trae SpeechRecognition.

## ImportaciÃ³n

```js
import './speech.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-speech lang="es-ES" text="Proceso completado con Ã©xito"></iswc-speech>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `lang` | string | Default `document.documentElement.lang` o `es-ES` |
| `text` | string | Texto a leer |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `lang` | lectura/escritura |  |
| `text` | lectura/escritura |  |

### Slots

| Slot | Uso |
| --- | --- |
| default | Contenido extra bajo el transcript.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-result` | Evento personalizado del componente (result). |
| `iswc-speak-end` | Evento personalizado del componente (speak end). |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-result` | sÃ­ `{ transcript, isFinal }` | sÃ­ | sÃ­ | no |
| `iswc-speak-end` | no | sÃ­ | sÃ­ | no |
| `iswc-error` | sÃ­ `{ message }` | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-speech');
el.addEventListener('iswc-result', (e) => {
  console.log('iswc-result', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

`listen()`, `stop()`, `speak(text?)`, `cancel()`.

### CSS parts

| Part | Uso |
| --- | --- |
| `bar` | Barra de nivel/vu-meter. |
| `transcript` | Texto transcrito del audio. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

Recognition continua con interim. Synthesis via `speechSynthesis.speak`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

Botones con `aria-pressed` en dictado; transcript `aria-live`.

## Ejemplo avanzado

```html
<iswc-speech lang="es-CO"></iswc-speech>
```

## Errores comunes

- Esperar STT en Firefox.
- No pedir permiso de micrÃ³fono.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./speech.js` Â· `./speech.css`
- Preview: `./speech.json`
