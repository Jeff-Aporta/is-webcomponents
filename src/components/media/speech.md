---
tag: is-speech
tags:
  - is-speech
category: media
status: public
source: ./speech.js
style: ./speech.css
preview: ../../previews/media/is-speech.json
---
# `<is-speech>`

## Propósito

Dictado (`SpeechRecognition`) y lectura (`SpeechSynthesis`) con `lang` del documento.

Este módulo registra `<is-speech>`.

## Cuándo usarlo

Asistentes, dictado al campo, leer un resultado en voz alta.

## Cuándo no usarlo

No sustituye una nota de voz (`MediaRecorder`). Firefox no trae SpeechRecognition.

## Importación

```js
import './speech.js';
```

## Ejemplo mínimo

```html
<is-speech lang="es-ES" text="Proceso completado con éxito"></is-speech>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `lang` | string | Default `document.documentElement.lang` o `es-ES` |
| `text` | string | Texto a leer |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `lang` | lectura/escritura |  |
| `text` | lectura/escritura |  |

### Slots

| Slot | Uso |
| --- | --- |
| default | Contenido extra bajo el transcript.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-result` | sí `{ transcript, isFinal }` | sí | sí | no |
| `is-speak-end` | no | sí | sí | no |
| `is-error` | sí `{ message }` | sí | sí | no |

### Métodos y propiedades públicas

`listen()`, `stop()`, `speak(text?)`, `cancel()`.

### CSS parts

`bar`, `transcript`

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No es form-associated.

## Comportamiento

Recognition continua con interim. Synthesis via `speechSynthesis.speak`.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)


## Accesibilidad

Botones con `aria-pressed` en dictado; transcript `aria-live`.

## Ejemplo avanzado

```html
<is-speech lang="es-CO"></is-speech>
```

## Errores comunes

- Esperar STT en Firefox.
- No pedir permiso de micrófono.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./speech.js` · `./speech.css`
- Preview: `../../previews/media/is-speech.json`
