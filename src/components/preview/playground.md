---
tag: iswc-playground
tags:
  - iswc-playground
category: preview
status: public
source: ./playground.js
style: ./playground.css
preview: ./playground.json
---
# `<iswc-playground>`

## Proposito

Playground homogeneo (stage + knobs) para galeria y apps. CDN.

## Importacion

```js
import './playground.js';
```

## API

| Atributo | Notas |
| --- | --- |
| `layout` | `split` (default) \| `panel` |
| `title` | Titulo (default Playground) |
| `lede` | Subtitulo |
| `target` | Selector del host en `slot=stage` |
| `spec` | Array de controles (propiedad JS) |

Slots: `stage`, `spec` (`script type=application/json`).

Evento: `iswc-controls-change` `{ def, valor }`.
