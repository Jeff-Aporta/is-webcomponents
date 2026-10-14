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
  'https://cdn.jsdelivr.net/gh/Jeff-Aporta/iswc-root@SHA/dist/cdn/helpers/md-lite.min.js';

const html = mdToHtml('# Hola\n\n```iswc-flowchart\n{"nodes":[]}\n```');
```

## API

| Export | Uso |
| --- | --- |
| `mdToHtml(src, { renderers?, componentes?, tags? })` | String MD → HTML. Por defecto monta componentes del kit (código → `iswc-code` + `iswc-copy-button`, tabla → `iswc-scroller`, aviso → `iswc-callout`, `---` → `iswc-divider`, imagen → `iswc-theme-img`, tarea → `iswc-checkbox`) y anota sus tags en `tags`; `componentes: false` da HTML plano. Fences `iswc-*` → tag diagrama + JSON en `<script type="application/json">`. |


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

## Tabs de imágenes

Un bloque entre dos `---` que solo trae imágenes (dos o más) se pinta como `iswc-tab-group`: una pestaña por imagen, con su `alt` como nombre y en el mismo orden. Los dos `---` no se pintan. En markdown plano (GitHub, Obsidian) el mismo texto se lee como separadores con imágenes, así que la nota sigue siendo legible fuera del kit.

```md
---

![Secuencia](../999-Adjuntos/010-Diagramas/conversacion-turno.svg)
![Secuencia enriquecida](../999-Adjuntos/010-Diagramas/ruta-conversacion-turno.svg)

---
```

Cada bloque es un grupo con `id` estable por documento (`md-tabs-1`, `md-tabs-2`…) y `state`: la pestaña elegida queda en `?s=` y al recargar se conserva. Con una sola imagen, o con texto entre los `---`, son separadores normales. Con `componentes: false` sale una figura por imagen con su nombre (`figcaption`). El hook de `renderers` es `tabs` (`DatosTabsMd`).

## Cadena con hydrate

1. `mdToHtml` pinta marcadores / tags.
2. `hydrateMdEmbeds` (ver `md-hydrate.md`) hace `L.ensure` + upgrade a `<iswc-code>`.

No uses este mÃ³dulo para reinventar un markdown completo; es el motor del kit.
