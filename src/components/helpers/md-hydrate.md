---
tag: —
category: helpers
status: module
source: ./md-hydrate.js
---
# `md-hydrate` (módulo)

## Propósito

Tras pintar HTML de MD: carga lazy de tags `iswc-*` presentes y sustituye
marcadores `.md-iswc-code` por `<iswc-code>` (inline = `brand-mono`, bloque = theme).

## Importación

```js
import { hydrateMdEmbeds, ensureNeededTags, upgradeCodeMarkers, collectNeededTags } from
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@SHA/dist/cdn/helpers/md-hydrate.min.js';

await hydrateMdEmbeds(host); // ensure + upgrade
```

Requiere `globalThis.ISWebComponentsLoader` con `ensure` / `has` (el loader CDN).

## API

| Export | Uso |
| --- | --- |
| `collectNeededTags(root)` | Lista ordenada de tags `iswc-*` (+ `iswc-code` si hay marcadores). |
| `ensureNeededTags(root)` | `L.ensure(tag)` solo para los que faltan. |
| `upgradeCodeMarkers(root)` | `.md-iswc-code` → `<iswc-code readonly>`. |
| `hydrateMdEmbeds(root)` | `ensureNeededTags` + `upgradeCodeMarkers`. |

Usado por `<iswc-md-render>` y el preview de `<iswc-md-editor>`. No lo reimplementes.


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
