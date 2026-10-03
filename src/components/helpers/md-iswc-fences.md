---
tag: —
category: helpers
status: module
source: ./md-iswc-fences.js
---
# `md-iswc-fences` (módulo)

## Propósito

Resuelve fences Markdown ` ```iswc-<nombre> ` → tag de diagrama `iswc-*`
(solo lectura). Acepta kind corto (`flowchart`, `er`) o nombre de tag
(`er-diagram`, `sequence-diagram`).

## Importación

```js
import { resolveIswcFenceTag, escapeJsonForScript } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/helpers/md-iswc-fences.min.js';

resolveIswcFenceTag('iswc-flowchart'); // 'iswc-flowchart'
resolveIswcFenceTag('iswc-er');        // 'iswc-er-diagram'
resolveIswcFenceTag('js');             // null
```

## API

| Export | Uso |
| --- | --- |
| `resolveIswcFenceTag(lang)` | Lang del fence → tag, o `null` si no empieza por `iswc-`. |
| `escapeJsonForScript(text)` | Evita romper `</script>` al embeber JSON. |

Kinds mapeados: flowchart, sequence, class, state, er, block, component, mindmap,
gantt, timeline, org-chart, sankey, quadrant, venn, usecase, swimlane, journey
(+ alias con sufijo `-diagram` / `-map` / `-chart`).

Consumido por `md-lite`. No inventar otro mapa de fences en la app.
