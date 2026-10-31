---
tag: iswc-demo
tags:
  - iswc-demo
category: layout
status: public
source: ./demo.ts
preview: ./demo.json
---
# `<iswc-demo>`

## Propósito

Caja de demostración de la galería. Envuelve un ejemplo y ofrece ver código y fuentes.

## Importación

```js
import './demo.js';
```

## Cuándo usarlo

Cuando un demo del kit o de una app necesita mostrar un ejemplo con su caja común, el código y las fuentes.

## Cuándo no usarlo

No es una tarjeta de producto: para eso está `<iswc-card>`. Solo vive en demos y galerías.

## Ejemplo mínimo

```html
<iswc-demo heading="Ejemplo">
  <iswc-button>Hola</iswc-button>
</iswc-demo>
```


## Estilo

Vive en light DOM a propósito, así que no lleva `.scss` propio: su caja la define `src/styles/presentation.scss`.

## Slots

Solo el contenido por defecto: el ejemplo tal cual, sin shadow.

## CSS parts

No expone: no tiene shadow DOM.

## API

| Atributo | Notas |
| --- | --- |
| `heading` | Título de la caja. |

## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-demo');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>

## Comportamiento

Va en light DOM: su caja vive en `styles/presentation.scss`, por eso no tiene `.scss` propio. Al montarse emite `iswc-demo-connected`.

## Accesibilidad

El `heading` da nombre visible al ejemplo. El contenido conserva su propia semántica.

## Reglas para LLM

- Solo en demos y galerías.
- No le añadas un `.scss`: el estilo es de la presentación común.
