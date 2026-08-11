---
tag: is-code
tags:
  - is-code
category: code
status: public
source: ./code.js
style: ./code.css
preview: ../../previews/code/is-code.json
---
# `<is-code>`

## Propósito

Editor de código editable al nivel de un IDE ligero: resaltado por lenguaje,
números de línea, word-wrap, temas por JSON, formateo estilo Prettier,
anotaciones externas (highlight de error/advertencia y tooltips de
documentación) y API bidireccional texto ↔ JSON (`code2json` / `json2code`).

Motor: **CodeMirror 5.65.16** (CDN). El kit no usa CodeMirror 6.

Este módulo registra `<is-code>`.

## Cuándo usarlo

- Editar o revisar snippets HTML/CSS/JS/TS/JSX/Python en la UI.
- Mostrar diagnósticos o docs que produce otro sistema (LSP, linter, IA)
  mediante `marks` en el documento JSON.
- Formular campos de código form-associated (`name` + `value`).

## Cuándo no usarlo

- Solo colorear un `<pre>` de documentación: usar `highlight-code.js` /
  `scripts/highlight-pre.js`.
- Markdown / rich text: `<is-md-editor>` / `<is-rte>` / `<is-doc-editor>`.
- Diff o merge de archivos: no cubierto.

## Importación

```js
import './code.js';
// o por CDN: dist/cdn/code/code.min.js
```

## Ejemplo mínimo

```html
<is-code lang="javascript" line-numbers wrap
  value="const n = 1;&#10;console.log(n);"></is-code>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `lang` | string | `javascript` | `javascript` · `typescript` · `jsx` · `tsx` · `html` · `css` · `json` · `python` · `plaintext` (y alias). Extensible con `registerLanguage`. |
| `value` | string | `""` | Código fuente. |
| `document` | string (JSON) | — | Documento `is-code-doc/v1`. Si está presente al conectar, manda sobre `value`. |
| `format` | string (JSON) | ver abajo | Opciones tipo Prettier: `tabWidth`, `useTabs`, `printWidth`, `semi`, `singleQuote`, `trailingComma`, `endOfLine`. |
| `theme-config` | string (JSON) | preset dark/light | Colores por rol (`keyword`, `string`, `gutterForeground`, …). |
| `line-numbers` | boolean/`false` | on | Ausente = con números. `line-numbers="false"` los oculta. |
| `wrap` | boolean | off | Word wrap. |
| `readonly` | boolean | off | Solo lectura (sin caret; se puede seleccionar/copiar). |
| `compact` | boolean | off | Autofit de altura (snippets de docs / CDN). |
| `mode` | `block` \| `inline` | `block` | Inserción en página: bloque a ancho completo o inline en el flujo de texto. En `inline` los números de línea van off salvo `line-numbers` explícito. |
| `disabled` | boolean | off | Deshabilitado (sin cursor). |
| `autofocus` | boolean | off | Foco al montar. |
| `tab-size` | number | `2` | Tamaño de tab visual. |
| `name` | string | — | Nombre form-associated. |
| `placeholder` | string | — | Placeholder CM. |
| `min-height` | CSS length | `12rem` | → `--is-code-min-height`. |
| `radius` | CSS | — | Style-attr → `--is-code-radius`. |

#### Propiedades públicas

| Propiedad | Acceso | Tipo | Descripción |
| --- | --- | --- | --- |
| `value` | rw | string | Código actual. |
| `lang` | rw | string | Lenguaje activo. |
| `lineNumbers` / `wrap` / `readonly` / `disabled` / `autofocus` / `compact` | rw | boolean | Reflejan atributos. |
| `mode` | rw | `'block'` \| `'inline'` | Modo de inserción en página. |
| `tabSize` | rw | number | Refleja `tab-size`. |
| `formatConfig` | rw | object | Opciones de formateo. |
| `themeConfig` | rw | object \| null | Tema JSON. |
| `marks` | rw | array | Anotaciones actuales. |
| `document` | rw | object | `getDocument()` / `setDocument()`. |
| `ready` | ro | boolean | CodeMirror montado. |
| `cm` | ro | CodeMirror \| null | Instancia (escape hatch). |

### Slots

No proyecta light DOM (el texto inicial se lee una vez como semilla si no hay
`value`/`document`).

### Eventos

| Evento | Detail | Cuándo |
| --- | --- | --- |
| `is-ready` | `{ lang, value }` | Editor listo. |
| `is-input` | `{ value, change }` | Cada edición. |
| `is-change` | `{ value, formatted? }` | Edición o `format()`. |
| `is-cursor` | `{ line, ch, index }` | Movimiento de cursor. |
| `is-mark-activate` | `{ mark, phase }` | Hover enter/leave sobre un mark. |
| `is-error` | `{ error }` | Fallo de bootstrap. |

### Métodos y propiedades públicas

| Método | Descripción |
| --- | --- |
| `format()` | Reformatea el buffer con `formatConfig` + `lang`. |
| `getDocument()` / `setDocument(doc)` | Round-trip `is-code-doc/v1`. |
| `code2json(opts?)` / `json2code(doc)` | Conversores texto ↔ JSON. |
| `setMarks(list)` / `clearMarks()` | Anotaciones externas. |
| `focus()` / `refresh()` | Foco y relayout CM. |
| `IsCode.registerLanguage(def)` | Plugin de lenguaje. |
| `IsCode.listLanguages()` | Idiomas registrados. |

### CSS parts

| Part | Elemento |
| --- | --- |
| `root` | Contenedor. |
| `editor` | Host del wrapper CodeMirror. |
| `tooltip` | `<is-tooltip>` de documentación. |
| `seed` | `<textarea>` semilla (oculto). |

### Custom states

| State | Significado |
| --- | --- |
| `blank` | Buffer vacío. |
| `disabled` | Deshabilitado. |
| `readonly` | Solo lectura. |

### CSS custom properties

Tokens de superficie: `--is-code-radius`, `--is-code-border`,
`--is-code-min-height`, `--is-code-font`, `--is-code-font-size`.

Tokens de tema (ver `theme-config`): `--is-code-bg`, `--is-code-fg`,
`--is-code-keyword`, `--is-code-string`, `--is-code-mark-error`, …

### Integración con formularios

Form-associated (`ElementInternals`). Participa en submit/reset vía `name` +
`value`. No incluye validación nativa de sintaxis.

## Comportamiento

- Los modos livianos (js/ts/jsx/html/css/json) reusan la carga de
  `highlight-code` / `code-cm`.
- `python` es plugin **heavy**: descarga `mode/python` al primer uso.
- Los marks que intersectan una edición del usuario se descartan; el sistema
  externo debe reaplicar diagnósticos.
- Sin `theme-config`, el preset sigue `data-theme` del documento
  (`dark` / `light`).

Documento JSON (`is-code-doc/v1`):

```json
{
  "$schema": "is-code-doc/v1",
  "lang": "javascript",
  "value": "function add(a, b) {\n  return a + b;\n}",
  "marks": [
    {
      "id": "t1",
      "from": 9,
      "to": 12,
      "kind": "tooltip",
      "title": "add()",
      "body": "Suma dos números."
    },
    {
      "id": "e1",
      "from": 26,
      "to": 27,
      "kind": "highlight",
      "tone": "warning",
      "message": "Prefer const"
    }
  ],
  "format": { "tabWidth": 2, "semi": true },
  "theme": { "keyword": "#c792ea" }
}
```

## Dependencias y componentes relacionados

- [`../_shared/code-cm.js`](../_shared/code-cm.js)
- [`../_shared/code-langs.js`](../_shared/code-langs.js)
- [`../_shared/code-format.js`](../_shared/code-format.js)
- [`../_shared/code-theme.js`](../_shared/code-theme.js)
- [`../_shared/code-model.js`](../_shared/code-model.js)
- [`../_shared/highlight-code.js`](../_shared/highlight-code.js)
- [`../feedback/tooltip.js`](../feedback/tooltip.js) — tooltips de marks

Tags del módulo: `<is-code>`.

CDN CodeMirror 5 (peer, no empaquetado):

- `https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.min.js`
- modos / addons bajo el mismo scope

Los snippets de la galería (`pre.code`, CDN, «Ver código») se montan como
`<is-code readonly compact>` vía `highlight-code.js` — no hace falta
pintar con `runMode` a mano.

## Accesibilidad

El área editable es el CodeMirror (textarea subyacente + rol de código).
Soporta navegación por teclado del editor. Los marks exponen `title` nativo
y tooltip IS al hover. Respetar `disabled` / `readonly` (`aria-readonly`).
Con `readonly` no hay caret ni línea activa; se puede seleccionar y copiar.

## Ejemplo avanzado

```html
<is-code id="ed" lang="typescript" wrap line-numbers></is-code>
<script type="module">
  const ed = document.getElementById('ed');
  ed.addEventListener('is-ready', () => {
    ed.setDocument({
      $schema: 'is-code-doc/v1',
      lang: 'typescript',
      value: 'const x: number = 1;',
      marks: [
        { from: 6, to: 7, kind: 'tooltip', title: 'x', body: 'number' },
      ],
    });
    ed.format();
  });
</script>
```

## Errores comunes

- Esperar CodeMirror 6 / `@codemirror/*`: el kit fija CM5.
- Pasar `theme-config` malformado: se ignora y queda el preset.
- Confiar en que los marks sobrevivan a ediciones locales: se rebasan o
  invalidan; reaplicar desde el analizador externo.
- Usar el tag sin red (CM se carga de jsDelivr).

## Reglas para LLM

- Reusar `_shared/code-*` y `highlight-code` antes de otro highlighter.
- No inventar langs: registrar con `registerLanguage` o usar built-ins.
- Documentar marks con offsets UTF-16 (como `String` en JS).
- No meter Prettier npm: el formateo es el de `code-format.js`.

## Fuentes

- [JavaScript](./code.js)
- [CSS](./code.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/code/is-code.json)
