---
tag: iswc-csv-view
tags:
  - iswc-csv-view
category: files
status: public
source: ./csv-view.js
style: ./csv-view.css
preview: ./csv-view.json
---
# `<iswc-csv-view>`

## Proposito

Tabla CSV solo lectura.

## Importacion

```js
import './csv-view.js';
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
const el = document.querySelector('iswc-csv-view');
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
| `empty` | Personalizable con `::part(empty)`. |
| `root` | Personalizable con `::part(root)`. |
| `stage` | Escenario donde se renderiza el contenido. |
| `table` | Personalizable con `::part(table)`. |
