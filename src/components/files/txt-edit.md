---
tag: iswc-txt-edit
tags:
  - iswc-txt-edit
category: files
status: public
source: ./txt-edit.ts
style: ./txt-edit.css
preview: ./txt-edit.json
---
# `<iswc-txt-edit>`

## Proposito

Editor de texto con iswc-change.

## Importacion

```js
import './txt-edit.js';
```

## API

Atributos comunes: `src`, `content`, `height`.
Eventos: `iswc-load`, `iswc-error`; editores tambien `iswc-change`.


## Eventos

| Evento | DescripciÃ³n |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-txt-edit');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>


### CSS parts

| Part | Uso |
| --- | --- |
| `editor` | Personalizable con `::part(editor)`. |
| `root` | Personalizable con `::part(root)`. |
