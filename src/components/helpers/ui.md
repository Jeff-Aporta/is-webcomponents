---
tag: is-ui
tags:
  - is-ui
category: helpers
status: public
source: ./ui.js
preview: ../../previews/helpers/is-ui.html
---
# `helpers/ui` · `IsUi`

## Propósito

Primitivas de render para **apps consumidoras** del kit. **No es un custom element**: publica `globalThis.IsUi` (alias `Ui`) y exports ESM (`html`, `adoptCss`, `define`, …).

## Cuándo usarlo

Apps vanilla (`app-*`, `tk-*`) que montan UI sobre tags `is-*` sin framework, con CSS hermano + `adoptCss`.

## Cuándo no usarlo

No sustituye componentes `is-*`. No reinventar botones, dialogs, tablas, toasts ni iconos con esto.

## Importación

```html
<script type="module" src="…/dist/cdn/all.min.js"></script>
<!-- IsUi / Ui ya están en globalThis -->
```

```js
import { html, adoptCss, define } from '…/dist/cdn/helpers/ui.min.js';
```

## Ejemplo mínimo

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

## API

### Atributos y propiedades

No aplica (no es custom element). API de módulo:

| API | Uso |
| --- | --- |
| `html` | Plantilla etiquetada → `DocumentFragment` |
| `adoptCss` | Carga el `.css` hermano del módulo en el ShadowRoot (**preferido**) |
| `css` | CSS constructable memoizado (solo prototipos) |
| `raw` / `esc` | HTML de confianza / escape |
| `el` | `createElement` con attrs/hijos |
| `define` | `customElements.define` idempotente |
| `crearComponente` | Fábrica shadow + `props` → render |
| `jsonScript` | `<script type="application/json">` para config `is-*` |
| `fecha` / `rec` | Formato fecha es-CO / coerce a record |

### Slots

No aplica.

### Eventos

No aplica.

### Métodos y propiedades públicas

Ver tabla de API de módulo. Globales: `IsUi`, `Ui`.

### CSS parts

No aplica.

### Custom states

No aplica.

### CSS custom properties

No declara tokens propios; usa `--is-*` del kit en el CSS hermano de la app.

### Integración con formularios

No es form-associated. Los `is-*` que montes dentro sí lo son.

## Comportamiento

- Tras vaciar el shadow (`while (…) removeChild`), vuelve a llamar `adoptCss`: los `<link>` se borran con el contenido.
- `define` es idempotente: no revienta si el tag ya está registrado.
- Preferir `adoptCss(shadow, import.meta.url)` sobre `css(shadow, cssText)`.

## Dependencias y componentes relacionados

Ninguna dependencia de otros `is-*` en el módulo. Las apps lo combinan con el catálogo CDN.

## Accesibilidad

La accesibilidad la aportan los `is-*` montados; no ocultar foco ni reinventar controles nativos.

## Ejemplo avanzado

```js
import { adoptCss, define, html } from '…/helpers/ui.min.js';

class AppFiles extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  #pintar() {
    while (this.#root.firstChild) this.#root.removeChild(this.#root.firstChild);
    this.#root.append(html`…`);
    adoptCss(this.#root, import.meta.url);
  }
}
define('app-files', AppFiles);
```

## Errores comunes

- Embeber `const CSS = \`…\`` gigante en el `.ts` en vez de `.css` hermano.
- Olvidar `adoptCss` después de regenerar el shadow.
- Usar `IsUi` para pintar UI genérica que ya cubre un `is-*`.

## Reglas para LLM

- Leer este MD y el preview `helpers/is-ui.html` antes de inventar API.
- Consumo CDN: `helpers/ui.min.js` o `all.min.js`.
- Dominio = traducir datos → `is-*` + CSS hermano.

## Fuentes

- `./ui.js`
- Preview: `../../previews/helpers/is-ui.html`
