---
tag: iswc-share-button
tags:
  - iswc-share-button
category: actions
status: public
source: ./share-button.ts
style: ./share-button.css
preview: ./share-button.json
---
# `<iswc-share-button>`

## PropÃ³sito

Comparte tÃ­tulo, texto y URL con las apps nativas (Web Share). Si no hay share, copia al portapapeles.

Este mÃ³dulo registra `<iswc-share-button>`.

## CuÃ¡ndo usarlo

BotÃ³n de compartir enlace, reporte o captura hacia WhatsApp, Mail, etc.

## CuÃ¡ndo no usarlo

No uses este tag para recibir shares: Web Share Target es un campo del manifest de la PWA, no un componente.

## ImportaciÃ³n

```js
import './share-button.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-share-button share-title="PatyIA" text="Mira este reporte" url="https://insoft.com.co"></iswc-share-button>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `share-title` | string | TÃ­tulo del share |
| `text` | string | Texto |
| `url` | string | URL (default location.href) |
| `disabled` | boolean |  |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-share` | Evento personalizado del componente (share). |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-share` | sÃ­ `{ how, url }` | sÃ­ | sÃ­ | no |
| `iswc-error` | no | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-share-button');
el.addEventListener('iswc-share', (e) => {
  console.log('iswc-share', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

`share()`.

### CSS parts

| Part | Uso |
| --- | --- |
| `button` | Personalizable con `::part(button)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No es form-associated.

## Comportamiento

`navigator.share` primero; `AbortError` no emite error; fallback clipboard. Lightbox usa el mismo helper.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/web-share.js`](../_shared/web-share.js)

## Accesibilidad

El control interno es `iswc-button`.

## Ejemplo avanzado

```html
<iswc-share-button share-title="Demo" url="https://jeff-aporta.github.io/is-webcomponents/"></iswc-share-button>
```

## Errores comunes

- Llamar `share()` fuera de un gesto de usuario.
- Confundir Share Target (PWA) con este botÃ³n.

## Reglas para LLM

- Usar este tag; no reimplementar la API nativa a mano si el componente cubre el caso.

## Fuentes

- `./share-button.js` Â· `./share-button.css`
- Preview: `./share-button.json`
