---
tag: —
category: helpers
status: module
source: ./md-lite.js
---
# `md-lite` (módulo)

## Propósito

Markdown → HTML **sin npm**. Subconjunto para `<iswc-md-render>` / `<iswc-md-editor>`:
ATX, listas, blockquote, hr, tablas GFM, negrita/cursiva, enlaces, imágenes,
fences de código y fences `iswc-*` (diagramas). Conserva HTML crudo (`<iswc-*>`, `<div>`…).

## Importación

```js
import { mdToHtml } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/helpers/md-lite.min.js';

const html = mdToHtml('# Hola\n\n```iswc-flowchart\n{"nodes":[]}\n```');
```

## API

| Export | Uso |
| --- | --- |
| `mdToHtml(src)` | String MD → HTML. Fences de código → `.md-iswc-code`. Fences `iswc-*` → tag diagrama + JSON en `<script type="application/json">`. |

## Cadena con hydrate

1. `mdToHtml` pinta marcadores / tags.
2. `hydrateMdEmbeds` (ver `md-hydrate.md`) hace `L.ensure` + upgrade a `<iswc-code>`.

No uses este módulo para reinventar un markdown completo; es el motor del kit.
