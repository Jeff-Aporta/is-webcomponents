---
tag: is-share-button
tags:
  - is-share-button
category: actions
status: public
source: ./share-button.js
style: ./share-button.css
preview: ../../previews/actions/is-share-button.json
---
# `<is-share-button>`

## Propósito

Comparte título, texto y URL con las apps nativas (Web Share). Si no hay share, copia al portapapeles.

Este módulo registra `<is-share-button>`.

## Cuándo usarlo

Botón de compartir enlace, reporte o captura hacia WhatsApp, Mail, etc.

## Cuándo no usarlo

No uses este tag para recibir shares: Web Share Target es un campo del manifest de la PWA, no un componente.

## Importación

```js
import './share-button.js';
```

## Ejemplo mínimo

```html
<is-share-button share-title="PatyIA" text="Mira este reporte" url="https://insoft.com.co"></is-share-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `share-title` | string | Título del share |
| `text` | string | Texto |
| `url` | string | URL (default location.href) |
| `disabled` | boolean |  |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `shareTitle` | lectura/escritura |  |
| `text` | lectura/escritura |  |
| `url` | lectura/escritura |  |
| `disabled` | lectura/escritura |  |

### Slots

| Slot | Uso |
| --- | --- |
| default | Trigger custom opcional.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-share` | sí `{ how, url }` | sí | sí | no |
| `is-error` | no | sí | sí | no |

### Métodos y propiedades públicas

`share()`.

### CSS parts

`button`

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No es form-associated.

## Comportamiento

`navigator.share` primero; `AbortError` no emite error; fallback clipboard. Lightbox usa el mismo helper.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/web-share.js`](../_shared/web-share.js)

## Accesibilidad

El control interno es `is-button`.

## Ejemplo avanzado

```html
<is-share-button share-title="Demo" url="https://jeff-aporta.github.io/is-webcomponents/"></is-share-button>
```

## Errores comunes

- Llamar `share()` fuera de un gesto de usuario.
- Confundir Share Target (PWA) con este botón.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./share-button.js` · `./share-button.css`
- Preview: `../../previews/actions/is-share-button.json`
