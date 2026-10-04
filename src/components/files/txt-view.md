---
tag: iswc-txt-view
tags:
  - iswc-txt-view
category: files
status: public
source: ./txt-view.js
style: ./txt-view.css
preview: ./txt-view.json
---
# `<iswc-txt-view>`

## Proposito

Vista de texto plano con src/content.

## Importacion

```js
import './txt-view.js';
```

## API

Atributos comunes: `src`, `content`, `height`.
Eventos: `iswc-load`, `iswc-error`; editores tambien `iswc-change`.


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-txt-view');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>
