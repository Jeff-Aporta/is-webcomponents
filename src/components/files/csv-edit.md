---
tag: iswc-csv-edit
tags:
  - iswc-csv-edit
category: files
status: public
source: ./csv-edit.js
style: ./csv-edit.css
preview: ./csv-edit.json
---
# `<iswc-csv-edit>`

## Proposito

CSV editable + export.

## Importacion

```js
import './csv-edit.js';
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
const el = document.querySelector('iswc-csv-edit');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>
