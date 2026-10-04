---
tag: iswc-file-view
tags:
  - iswc-file-view
category: files
status: public
source: ./file-view.js
style: ./file-view.css
preview: ./file-view.json
---
# `<iswc-file-view>`

## Proposito

Shell view: despacha por MIME/nombre.

## Importacion

```js
import './file-view.js';
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
const el = document.querySelector('iswc-file-view');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>
