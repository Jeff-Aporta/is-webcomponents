---
tag: iswc-ui
tags:
  - iswc-ui
category: helpers
status: public
source: ./ui.ts
preview: ./ui.json
---
# `helpers/ui` Â· `IswcUi`

## PropÃ³sito

Primitivas de render para **apps consumidoras** del kit. **No es un custom element**: publica `globalThis.IswcUi` (alias `Ui`) y exports ESM (`html`, `adoptCss`, `define`, â€¦).

## CuÃ¡ndo usarlo

Apps vanilla (`app-*`, `tk-*`) que montan UI sobre tags `is-*` sin framework, con CSS hermano + `adoptCss`.

## CuÃ¡ndo no usarlo

No sustituye componentes `is-*`. No reinventar botones, dialogs, tablas, toasts ni iconos con esto.

## ImportaciÃ³n

```html
<script type="module" src="â€¦/dist/cdn/all.min.js"></script>
<!-- IswcUi / Ui ya estÃ¡n en globalThis -->
```

```js
import { html, adoptCss, define } from 'â€¦/dist/cdn/helpers/ui.min.js';
```

## Ejemplo mÃ­nimo

```js
import { html, adoptCss, define } from 'â€¦/helpers/ui.min.js';

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

No aplica (no es custom element). API de mÃ³dulo:

| API | Uso |
| --- | --- |
| `html` | Plantilla etiquetada â†’ `DocumentFragment` |
| `adoptCss` | Carga el `.css` hermano del mÃ³dulo en el ShadowRoot (**preferido**) |
| `css` | CSS constructable memoizado (solo prototipos) |
| `raw` / `esc` | HTML de confianza / escape |
| `el` | `createElement` con attrs/hijos |
| `define` | `customElements.define` idempotente |
| `crearComponente` | FÃ¡brica shadow + `props` â†’ render |
| `jsonScript` | `<script type="application/json">` para config `is-*` |
| `fecha` / `rec` | Formato fecha es-CO / coerce a record |
| `INTENT` / `DEFAULT_INTENT` | Lista + default (`brand`) del atributo `color` |
| `normalizeIntent` / `ensureDefaultColor` | Normaliza / aplica default brand en un host |
| `setEnumAttr` | Refleja enum a atributo |
| `TONE` / `DEFAULT_TONE` / `normalizeTone` / `setEnumToneAttr` | Mismo contrato para `variant` (peso visual) |

### Slots

No aplica.

### Eventos


| Evento | DescripciÃ³n |
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

### MÃ©todos y propiedades pÃºblicas

Ver tabla de API de mÃ³dulo. Globales: `IswcUi`, `Ui`.

### CSS parts

No aplica.

### Custom states

No aplica.

### CSS custom properties

No declara tokens propios; usa `--iswc-*` del kit en el CSS hermano de la app.

### IntegraciÃ³n con formularios

No es form-associated. Los `is-*` que montes dentro sÃ­ lo son.

## Comportamiento

- Tras vaciar el shadow (`while (â€¦) removeChild`), vuelve a llamar `adoptCss`: los `<link>` se borran con el contenido.
- `define` es idempotente: no revienta si el tag ya estÃ¡ registrado.
- Preferir `adoptCss(shadow, import.meta.url)` sobre `css(shadow, cssText)`.

## Dependencias y componentes relacionados

Ninguna dependencia de otros `is-*` en el mÃ³dulo. Las apps lo combinan con el catÃ¡logo CDN.

## Accesibilidad

La accesibilidad la aportan los `is-*` montados; no ocultar foco ni reinventar controles nativos.

## Ejemplo avanzado

```js
import { adoptCss, define, html } from 'â€¦/helpers/ui.min.js';

class AppFiles extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  #pintar() {
    while (this.#root.firstChild) this.#root.removeChild(this.#root.firstChild);
    this.#root.append(html`â€¦`);
    adoptCss(this.#root, import.meta.url);
  }
}
define('app-files', AppFiles);
```

## Errores comunes

- Embeber `const CSS = \`â€¦\`` gigante en el `.ts` en vez de `.css` hermano.
- Olvidar `adoptCss` despuÃ©s de regenerar el shadow.
- Usar `IswcUi` para pintar UI genÃ©rica que ya cubre un `is-*`.

## Reglas para LLM

- Leer este MD y el preview `helpers/iswc-ui.html` antes de inventar API.
- Consumo CDN: `helpers/ui.min.js` o `all.min.js`.
- Dominio = traducir datos â†’ `is-*` + CSS hermano.

## Fuentes

- `./ui.js`
- Preview: `./ui.json`
