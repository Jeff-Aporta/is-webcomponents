---
tag: â€”
category: helpers
status: module
source: ./md-lite.ts
---
# `md-lite` (mÃ³dulo)

## PropÃ³sito

Markdown â†’ HTML **sin npm**. Subconjunto para `<iswc-md-render>` / `<iswc-md-editor>`:
ATX, listas, blockquote, hr, tablas GFM, negrita/cursiva, enlaces, imÃ¡genes,
fences de cÃ³digo y fences `iswc-*` (diagramas). Conserva HTML crudo (`<iswc-*>`, `<div>`â€¦).

## ImportaciÃ³n

```js
import { mdToHtml } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/helpers/md-lite.min.js';

const html = mdToHtml('# Hola\n\n```iswc-flowchart\n{"nodes":[]}\n```');
```

## API

| Export | Uso |
| --- | --- |
| `mdToHtml(src)` | String MD â†’ HTML. Fences de cÃ³digo â†’ `.md-iswc-code`. Fences `iswc-*` â†’ tag diagrama + JSON en `<script type="application/json">`. |


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

## Cadena con hydrate

1. `mdToHtml` pinta marcadores / tags.
2. `hydrateMdEmbeds` (ver `md-hydrate.md`) hace `L.ensure` + upgrade a `<iswc-code>`.

No uses este mÃ³dulo para reinventar un markdown completo; es el motor del kit.
