---
tag: —
category: helpers
status: module
source: ./md-hydrate.ts
---
# `md-hydrate` (módulo)

## Propósito

Carga perezosa de los componentes del kit que pintó el markdown. Recibe los tags que
anotaron los renders por defecto de `md-lite` (los de los hooks del consumidor no cuentan)
y pide al loader solo los que siguen en el árbol:

| Cuándo | Tags |
| --- | --- |
| Al pintar (livianos) | `iswc-callout`, `iswc-divider`, `iswc-scroller`, `iswc-checkbox`, `iswc-copy-button`, `iswc-theme-img` (+ `iswc-icon` que usan en su shadow) |
| Al acercarse a la pantalla (pesados) | `iswc-code`, diagramas `iswc-*`, tags `iswc-*` escritos en HTML embebido |

Un tag ya definido no se pide. El loader (`ISWebComponentsLoader.ensure`) es idempotente:
pedir el mismo tag N veces cuesta una carga.

## Importación

```js
import { mdToHtml } from '…/dist/cdn/helpers/md-lite.min.js';
import { hydrateMdEmbeds } from '…/dist/cdn/helpers/md-hydrate.min.js';

const tags = new Set();
root.innerHTML = mdToHtml(markdown, { tags });
const hidratacion = hydrateMdEmbeds(root, tags);
// al volver a pintar o al desmontar:
hidratacion.cancelar();
```

Requiere `globalThis.ISWebComponentsLoader` (el loader del CDN); sin él, el contenido
de respaldo de cada componente queda visible.

## API

| Export | Uso |
| --- | --- |
| `hydrateMdEmbeds(root, tags)` | Pide lo presente; devuelve `{ listo, enEspera, cancelar }`. |
| `hidratarMd(root, tags, crearVigia)` | Lo mismo con un vigía propio para "en vista". |
| `tagsPresentes(root, tags)` | De los anotados, los que siguen en el árbol. |
| `planHidratacion(presentes)` | Reparto `{ alPintar, enVista }` (con dependencias). |

Usado por `<iswc-md-render>` y la vista previa de `<iswc-md-editor>`. No lo reimplementes.
