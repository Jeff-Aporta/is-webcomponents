---
tag: â€”
category: helpers
status: module
source: ./md-editor-api.ts
---
# `md-editor-api` (mÃ³dulo)

## PropÃ³sito

Cliente CRUD ligero para `<iswc-md-editor>`: normaliza documentos, arma
requests GET/PUT/POST/DELETE y mapea campos del backend (`content`/`body`/â€¦).

## ImportaciÃ³n

```js
import {
  normalizeDocument, apiRequest, parseApiConfig, byteLength, formatBytes,
} from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@SHA/dist/cdn/helpers/md-editor-api.min.js';
```

Tipos canÃ³nicos: ver `md-editor-api.d.ts` junto al mÃ³dulo.

## API

| Export | Uso |
| --- | --- |
| `normalizeDocument(raw, cfg?)` | Objeto suelto â†’ `{ content, filename, id, â€¦ }`. |
| `parseApiConfig(input)` | Lee config de endpoints / headers / token / fieldMap. |
| `apiRequest(url, init, cfg)` | `fetch` con headers del config (Bearer, etc.). |
| `byteLength(text)` / `formatBytes(n)` | TamaÃ±o UTF-8 y etiqueta humana. |


## Eventos

| Evento | DescripciÃ³n |
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

## CuÃ¡ndo usarlo

Solo al cablear persistencia del editor MD. La UI es `<iswc-md-editor>`; este
mÃ³dulo es el transporte, no un tag.
