---
tag: is-ui
tags:
  - is-ui
category: helpers
status: public
source: ./ui.js
---
# `helpers/ui` · `IsUi`

## Propósito

Primitivas de render para **apps consumidoras** del kit (no es un custom element).

Publica `globalThis.IsUi` (alias `Ui`) y exporta ESM:

| API | Uso |
| --- | --- |
| `html` | Plantilla etiquetada → `DocumentFragment` |
| `adoptCss` | Carga el `.css` hermano del módulo en el ShadowRoot (**preferido**) |
| `css` | CSS constructable memoizado (solo prototipos / sin archivo hermano) |
| `raw` / `esc` | HTML de confianza / escape |
| `el` | `createElement` con attrs/hijos |
| `define` | `customElements.define` idempotente |
| `crearComponente` | Fábrica shadow + `props` → render (`import.meta.url` o cssText) |
| `jsonScript` | `<script type="application/json">` para config `is-*` |
| `fecha` / `rec` | Formato fecha es-CO / coerce a record |

## CSS por componente (obligatorio en apps)

Mismo contrato que el kit (`adoptCss` + `.css` hermano):

| Fuente | Dist CDN |
| --- | --- |
| `src/components/app/app-files.ts` | `dist/cdn/app-files.js` |
| `src/components/app/app-files.css` | `dist/cdn/app-files.css` (minificado) |

```js
import { adoptCss, define, html } from '…/helpers/ui.min.js';

class AppFiles extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });

  #pintar() {
    while (this.#root.firstChild) this.#root.removeChild(this.#root.firstChild);
    this.#root.append(html`…`);
    // Después del contenido: vaciar el shadow borra los <link>.
    adoptCss(this.#root, import.meta.url);
  }
}
define('app-files', AppFiles);
```

No incrustar bloques `const CSS = \`…\`` en el JS de dominio: el build de la app debe minificar el `.css` hermano hacia `dist/cdn/`.

## Importación

```html
<script type="module" src="…/dist/cdn/all.min.js"></script>
<!-- IsUi ya está en globalThis -->
```

```js
import { html, adoptCss, define } from '…/dist/cdn/helpers/ui.min.js';
```

## Ejemplo

```js
import { html, adoptCss, define } from '…/helpers/ui.min.js';

class MiVista extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  connectedCallback() {
    this.#root.append(html`
      <is-button onclick=${() => console.log('ok')}>Hola</is-button>
    `);
    adoptCss(this.#root, import.meta.url);
  }
}
define('mi-vista', MiVista);
```

## Cuándo usarlo

Apps vanilla (`app-*`, `tk-*`) que montan UI sobre el kit sin framework.

## Cuándo no usarlo

No sustituye componentes `is-*`. No uses esto para reinventar botones, dialogs, tablas, etc.
