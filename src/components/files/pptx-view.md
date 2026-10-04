---
tag: iswc-pptx-view
tags:
  - iswc-pptx-view
category: files
status: public
source: ./pptx-view.js
style: ./pptx-view.css
preview: ./pptx-view.json
---
# `<iswc-pptx-view>`

## Proposito

PPTX view-only (JSZip / preview CDN).

## Importacion

```js
import './pptx-view.js';
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
const el = document.querySelector('iswc-pptx-view');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>
