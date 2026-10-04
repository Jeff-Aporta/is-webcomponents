---
tag: iswc-docx-view
tags:
  - iswc-docx-view
category: files
status: public
source: ./docx-view.js
style: ./docx-view.css
preview: ./docx-view.json
---
# `<iswc-docx-view>`

## Proposito

DOCX view-only (mammoth CDN).

## Importacion

```js
import './docx-view.js';
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
const el = document.querySelector('iswc-docx-view');
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
| `body` | Cuerpo del componente. |
| `root` | Personalizable con `::part(root)`. |
