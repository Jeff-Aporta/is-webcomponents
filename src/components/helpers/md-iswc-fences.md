---
tag: â€”
category: helpers
status: module
source: ./md-iswc-fences.ts
---
# `md-iswc-fences` (mÃ³dulo)

## PropÃ³sito

Resuelve fences Markdown ` ```iswc-<nombre> ` â†’ tag de diagrama `iswc-*`
(solo lectura). Acepta kind corto (`flowchart`, `er`) o nombre de tag
(`er-diagram`, `sequence-diagram`).

## ImportaciÃ³n

```js
import { resolveIswcFenceTag, escapeJsonForScript } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@SHA/dist/cdn/helpers/md-iswc-fences.min.js';

resolveIswcFenceTag('iswc-flowchart'); // 'iswc-flowchart'
resolveIswcFenceTag('iswc-er');        // 'iswc-er-diagram'
resolveIswcFenceTag('js');             // null
```

## API

| Export | Uso |
| --- | --- |
| `resolveIswcFenceTag(lang)` | Lang del fence â†’ tag, o `null` si no empieza por `iswc-`. |
| `escapeJsonForScript(text)` | Evita romper `</script>` al embeber JSON. |

Kinds mapeados: flowchart, sequence, class, state, er, block, component, mindmap,
gantt, timeline, org-chart, sankey, quadrant, venn, usecase, swimlane, journey
(+ alias con sufijo `-diagram` / `-map` / `-chart`).

Consumido por `md-lite`. No inventar otro mapa de fences en la app.


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
