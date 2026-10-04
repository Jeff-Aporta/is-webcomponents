---
tag: —
category: helpers
status: module
source: ./md-editor-api.js
---
# `md-editor-api` (módulo)

## Propósito

Cliente CRUD ligero para `<iswc-md-editor>`: normaliza documentos, arma
requests GET/PUT/POST/DELETE y mapea campos del backend (`content`/`body`/…).

## Importación

```js
import {
  normalizeDocument, apiRequest, parseApiConfig, byteLength, formatBytes,
} from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/helpers/md-editor-api.min.js';
```

Tipos canónicos: ver `md-editor-api.d.ts` junto al módulo.

## API

| Export | Uso |
| --- | --- |
| `normalizeDocument(raw, cfg?)` | Objeto suelto → `{ content, filename, id, … }`. |
| `parseApiConfig(input)` | Lee config de endpoints / headers / token / fieldMap. |
| `apiRequest(url, init, cfg)` | `fetch` con headers del config (Bearer, etc.). |
| `byteLength(text)` / `formatBytes(n)` | Tamaño UTF-8 y etiqueta humana. |


## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-component');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>

## Cuándo usarlo

Solo al cablear persistencia del editor MD. La UI es `<iswc-md-editor>`; este
módulo es el transporte, no un tag.
