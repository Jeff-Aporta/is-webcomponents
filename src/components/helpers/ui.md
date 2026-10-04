---
tag: iswc-ui
tags:
  - iswc-ui
category: helpers
status: public
source: ./ui.js
preview: ./ui.json
---
# `helpers/ui` · `IswcUi`

## Propósito

Primitivas de render para **apps consumidoras** del kit. **No es un custom element**: publica `globalThis.IswcUi` (alias `Ui`) y exports ESM (`html`, `adoptCss`, `define`, …).

## Cuándo usarlo

Apps vanilla (`app-*`, `tk-*`) que montan UI sobre tags `is-*` sin framework, con CSS hermano + `adoptCss`.

## Cuándo no usarlo

No sustituye componentes `is-*`. No reinventar botones, dialogs, tablas, toasts ni iconos con esto.

## Importación

```html
<script type="module" src="…/dist/cdn/all.min.js"></script>
<!-- IswcUi / Ui ya están en globalThis -->
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
      <iswc-button onclick=${() => console.log('ok')}>Hola</iswc-button>
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
| `INTENT` / `DEFAULT_INTENT` | Lista + default (`brand`) del atributo `color` |
| `normalizeIntent` / `ensureDefaultColor` | Normaliza / aplica default brand en un host |
| `setEnumAttr` | Refleja enum a atributo |
| `TONE` / `DEFAULT_TONE` / `normalizeTone` / `setEnumToneAttr` | Mismo contrato para `variant` (peso visual) |

### Slots

No aplica.

### Eventos


| Evento | Descripción |
| --- | --- |

No aplica.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-ui');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### Métodos y propiedades públicas

Ver tabla de API de módulo. Globales: `IswcUi`, `Ui`.

### CSS parts

No aplica.

### Custom states

No aplica.

### CSS custom properties

No declara tokens propios; usa `--iswc-*` del kit en el CSS hermano de la app.

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
- Usar `IswcUi` para pintar UI genérica que ya cubre un `is-*`.

## Reglas para LLM

- Leer este MD y el preview `helpers/iswc-ui.html` antes de inventar API.
- Consumo CDN: `helpers/ui.min.js` o `all.min.js`.
- Dominio = traducir datos → `is-*` + CSS hermano.

## Fuentes

- `./ui.js`
- Preview: `./ui.json`
