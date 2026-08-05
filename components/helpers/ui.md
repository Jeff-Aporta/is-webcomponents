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
| `css` | CSS constructable memoizado en ShadowRoot |
| `raw` / `esc` | HTML de confianza / escape |
| `el` | `createElement` con attrs/hijos |
| `define` | `customElements.define` idempotente |
| `crearComponente` | Fábrica shadow + `props` → render |
| `jsonScript` | `<script type="application/json">` para config `is-*` |
| `fecha` / `rec` | Formato fecha es-CO / coerce a record |

## Importación

```html
<script type="module" src="…/dist/cdn/all.min.js"></script>
<!-- IsUi ya está en globalThis -->
```

```js
import { html, css, define } from '…/dist/cdn/helpers/ui.min.js';
```

## Ejemplo

```js
import { html, css, define } from '…/helpers/ui.min.js';

const CSS = `:host { display: block; }`;

class MiVista extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  constructor() {
    super();
    css(this.#root, CSS);
  }
  connectedCallback() {
    this.#root.append(html`
      <is-button onclick=${() => console.log('ok')}>Hola</is-button>
    `);
  }
}
define('mi-vista', MiVista);
```

## Cuándo usarlo

Apps vanilla (`app-*`, `tk-*`) que montan UI sobre el kit sin framework.

## Cuándo no usarlo

No sustituye componentes `is-*`. No uses esto para reinventar botones, dialogs, tablas, etc.
